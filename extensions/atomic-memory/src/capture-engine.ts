/**
 * Capture Engine — LLM knowledge extraction + write gate quality filter.
 *
 * Extracts structured facts (人事時地物) from conversations via Ollama,
 * then applies quality scoring and deduplication before writing atoms.
 *
 * Ported from workflow-guardian.py's _llm_extract_knowledge()
 * and memory-write-gate.py's evaluate().
 */

import type { AtomStore } from "./atom-store.js";
import type { OllamaClient } from "./ollama-client.js";
import type { VectorClient } from "./vector-client.js";
import { classifyFact } from "./classification.js";
import type { AtomCategory, DedupResult, DedupVerdict, ExtractedFact, WriteGateResult } from "./types.js";

// ============================================================================
// Extraction prompt
// ============================================================================

const EXTRACTION_SYSTEM_PROMPT = `Extract reusable factual knowledge from the AI assistant conversation below.
Output a JSON array (always an array, even for a single item). Each item:
- "text": concise fact (≤150 chars)
- "category": one of person | topic | event | place | thing
- "who": who stated or owns this fact (name, "user", or null)
- "about": subject of the fact (name, object, or null)
- "when": temporal context if clear (date/time string, or null)
- "where": location context if clear (place name, or null)

Extract: personal info, preferences, contacts, decisions, schedules, locations, relationships, resources.
Skip: greetings, vague guesses, one-time reactions.
No facts → output [].
Example: [{"text":"User lives in Taipei","category":"place","who":"user","about":"user","when":null,"where":"Taipei"}]`;

// ============================================================================
// Write Gate scoring rules
// ============================================================================

type WriteGateRule = {
  label: string;
  score: number;
  test: (text: string) => boolean;
};

const WRITE_GATE_RULES: WriteGateRule[] = [
  {
    label: "length > 30 chars",
    score: 0.25,
    test: (t) => t.length > 30,
  },
  {
    label: "contains proper noun or number",
    score: 0.15,
    test: (t) =>
      /[A-Z][a-z]{2,}/.test(t) || // English proper noun
      /[\u4e00-\u9fff]{2,4}/.test(t) || // CJK name
      /\d{3,}/.test(t), // Number with 3+ digits
  },
  {
    label: "explicit user trigger",
    score: 0.35,
    test: (t) =>
      /記住|remember|我的.{1,6}是|my\s+\w+\s+is|以後都/i.test(t),
  },
  {
    label: "contains concrete value",
    score: 0.15,
    test: (t) =>
      /\d{4}[/-]\d{1,2}[/-]\d{1,2}/.test(t) || // Date
      /\+?\d[\d\s-]{7,}/.test(t) || // Phone
      /[\w.-]+@[\w.-]+\.\w+/.test(t) || // Email
      /https?:\/\/\S+/.test(t) || // URL
      /\d+[fF樓]/.test(t), // Floor
  },
  {
    label: "not transient",
    score: 0.10,
    test: (t) => !/等一下|稍後|待會|later|in a moment|hold on/i.test(t),
  },
  {
    label: "CJK operational fact (noun+verb+object)",
    score: 0.10,
    test: (t) =>
      // CJK subject (2+ chars) + multi-char verb + object (2+ chars)
      // Uses word-level verbs to avoid false positives on short casual phrases
      /[\u4e00-\u9fff]{2,6}(?:決定|使用|設定|安裝|部署|啟動|關閉|更新|刪除|建立|負責|管理|選擇|修改|執行|處理|開發|維護|購買|搬到|住在|工作|喜歡|擅長|偏好)[\u4e00-\u9fff]{2,10}/.test(t),
  },
  {
    label: "transient/temporary content",
    score: -0.10,
    test: (t) =>
      /\b(timeout|retry|retries)\b|暫時|臨時|測試|test[ing]*\b/i.test(t),
  },
];

// ============================================================================
// Prompt injection patterns (ported from memory-lancedb)
// ============================================================================

const PROMPT_INJECTION_PATTERNS = [
  /ignore (all|any|previous|above|prior) instructions/i,
  /do not follow (the )?(system|developer)/i,
  /system prompt/i,
  /developer message/i,
  /<\s*(system|assistant|developer|tool|function|relevant-memories|atomic-memories)\b/i,
  /\b(run|execute|call|invoke)\b.{0,40}\b(tool|command)\b/i,
];

function looksLikePromptInjection(text: string): boolean {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return false;
  return PROMPT_INJECTION_PATTERNS.some((p) => p.test(normalized));
}

// ============================================================================
// CaptureEngine
// ============================================================================

export class CaptureEngine {
  constructor(
    private readonly store: AtomStore,
    private readonly vectors: VectorClient,
    private readonly ollama: OllamaClient,
    private readonly maxChars: number = 3000,
    private readonly maxItems: number = 3,
  ) {}

  // ==========================================================================
  // LLM Extraction
  // ==========================================================================

  /**
   * Extract facts from conversation messages using Ollama LLM.
   * Filters out system/injected content before extraction.
   */
  async extractFromConversation(messages: unknown[], logger?: { info: (msg: string) => void; warn: (msg: string) => void }): Promise<ExtractedFact[]> {
    const conversationText = this.extractConversationText(messages);
    logger?.info(`atomic-memory: conversation text length: ${conversationText.length}`);
    if (conversationText.length < 20) return [];

    // Truncate to maxChars
    const truncated = conversationText.slice(0, this.maxChars);

    try {
      const response = await this.ollama.chat(
        EXTRACTION_SYSTEM_PROMPT,
        truncated,
        {
          jsonMode: true,
          temperature: 0.1,
          maxTokens: 500,
          timeoutMs: 15_000,
        },
      );

      logger?.info(`atomic-memory: ollama response (first 200): ${response.slice(0, 200)}`);
      return this.parseExtractionResponse(response);
    } catch (err) {
      logger?.warn(`atomic-memory: extraction LLM error: ${err instanceof Error ? err.message : String(err)}`);
      return [];
    }
  }

  /**
   * Extract text content from message objects.
   * Handles both string content and content block arrays.
   * Only processes user and assistant messages.
   */
  private extractConversationText(messages: unknown[]): string {
    const texts: string[] = [];

    for (const msg of messages) {
      if (!msg || typeof msg !== "object") continue;
      const msgObj = msg as Record<string, unknown>;

      const role = msgObj.role;
      if (role !== "user" && role !== "assistant") continue;

      const content = msgObj.content;

      if (typeof content === "string") {
        // Skip injected memory context
        if (content.includes("<relevant-memories>") || content.includes("<atomic-memories>")) {
          continue;
        }
        texts.push(content);
        continue;
      }

      if (Array.isArray(content)) {
        for (const block of content) {
          if (
            block &&
            typeof block === "object" &&
            "type" in block &&
            (block as Record<string, unknown>).type === "text" &&
            "text" in block &&
            typeof (block as Record<string, unknown>).text === "string"
          ) {
            const text = (block as Record<string, unknown>).text as string;
            if (!text.includes("<relevant-memories>") && !text.includes("<atomic-memories>")) {
              texts.push(text);
            }
          }
        }
      }
    }

    return texts.join("\n\n");
  }

  /**
   * Parse the JSON response from Ollama extraction.
   * Validates structure and applies prompt injection filtering.
   */
  private parseExtractionResponse(response: string): ExtractedFact[] {
    try {
      // Try parsing as JSON
      let parsed: unknown;
      try {
        parsed = JSON.parse(response);
      } catch {
        // Try extracting JSON array from response
        const match = response.match(/\[[\s\S]*\]/);
        if (!match) return [];
        parsed = JSON.parse(match[0]);
      }

      // Ollama may return a single object instead of array — wrap it
      let items: unknown[];
      if (Array.isArray(parsed)) {
        items = parsed;
      } else if (parsed && typeof parsed === "object" && "text" in (parsed as Record<string, unknown>)) {
        items = [parsed];
      } else {
        return [];
      }

      const facts: ExtractedFact[] = [];
      for (const item of items.slice(0, this.maxItems)) {
        if (!item || typeof item !== "object") continue;
        const obj = item as Record<string, unknown>;

        const text = typeof obj.text === "string" ? obj.text.trim() : "";
        if (text.length < 5 || text.length > 200) continue;

        // Skip prompt injection attempts
        if (looksLikePromptInjection(text)) continue;

        // Use LLM-provided category or fall back to rule-based
        const rawCategory = typeof obj.category === "string" ? obj.category : "";
        const validCategories: AtomCategory[] = ["person", "topic", "event", "place", "thing"];
        const category = validCategories.includes(rawCategory as AtomCategory)
          ? (rawCategory as AtomCategory)
          : classifyFact(text);

        // Extract optional relational dimensions (who/about/when/where)
        const who = typeof obj.who === "string" && obj.who !== "null" ? obj.who.trim() : undefined;
        const about = typeof obj.about === "string" && obj.about !== "null" ? obj.about.trim() : undefined;
        const when = typeof obj.when === "string" && obj.when !== "null" ? obj.when.trim() : undefined;
        const where = typeof obj.where === "string" && obj.where !== "null" ? obj.where.trim() : undefined;

        facts.push({
          text,
          category,
          confidence: "[臨]", // All extracted facts start as temporary
          ...(who ? { who } : {}),
          ...(about ? { about } : {}),
          ...(when ? { when } : {}),
          ...(where ? { where } : {}),
        });
      }

      return facts;
    } catch {
      return [];
    }
  }

  // ==========================================================================
  // Write Gate
  // ==========================================================================

  /**
   * Evaluate quality of an extracted fact.
   * Returns action: "add" (≥0.50), "ask" (0.30-0.50), or "skip" (<0.30).
   */
  evaluateQuality(fact: ExtractedFact): WriteGateResult {
    let quality = 0;
    const reasons: string[] = [];

    for (const rule of WRITE_GATE_RULES) {
      if (rule.test(fact.text)) {
        quality += rule.score;
        reasons.push(`${rule.score >= 0 ? "+" : ""}${rule.score}: ${rule.label}`);
      }
    }

    // Clamp to [0, 1]
    quality = Math.min(1, Math.max(0, quality));

    let action: WriteGateResult["action"];
    if (quality >= 0.50) {
      action = "add";
    } else if (quality >= 0.30) {
      action = "ask";
    } else {
      action = "skip";
    }

    return { action, quality, reasons };
  }

  // ==========================================================================
  // Deduplication
  // ==========================================================================

  /**
   * Check if a fact text is a duplicate or similar to an existing atom.
   *
   * - score > 0.95 → duplicate, skip
   * - 0.80-0.95  → similar, suggest update
   * - < 0.80     → new, continue
   */
  async checkDuplicate(text: string): Promise<DedupResult> {
    try {
      const queryVec = await this.ollama.embed(text);
      const results = await this.vectors.search(queryVec, 1, 0.50);

      if (results.length === 0) {
        return { verdict: "new" as DedupVerdict };
      }

      const top = results[0];
      let verdict: DedupVerdict;

      if (top.score > 0.95) {
        verdict = "duplicate";
      } else if (top.score >= 0.80) {
        verdict = "similar";
      } else {
        verdict = "new";
      }

      return {
        verdict,
        existingAtom:
          verdict !== "new"
            ? {
                category: top.category,
                id: top.atomName.split("/")[1] ?? top.atomName,
                text: top.text,
              }
            : undefined,
        score: top.score,
      };
    } catch {
      // Vector search failed — treat as new
      return { verdict: "new" as DedupVerdict };
    }
  }
}
