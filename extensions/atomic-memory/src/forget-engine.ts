/**
 * Forget Intent Detection & Contradiction Detection & Delete Propagation
 *
 * Extracted from index.ts for modularity.
 * - detectForgetIntent: identifies user requests to forget/delete memories
 * - detectContradiction: keyword-based negation check (fallback)
 * - detectConflictLLM: LLM-based 4-verdict conflict classification
 * - propagateDelete: full-chain delete with related[] cleanup + vector purge
 */

import type { OllamaClient } from "./ollama-client.js";
import type { AtomCategory, ConflictResult, ConflictVerdict } from "./types.js";
import type { AtomStore } from "./atom-store.js";
import type { VectorClient } from "./vector-client.js";

// ============================================================================
// Forget intent detection (方案 A: hook-level auto-delete)
// ============================================================================

const FORGET_PATTERNS = [
  /忘(記|掉|了)|刪(除|掉)|移除|不要記|別記|去掉/,
  /forget|delete|remove|erase|clear/i,
];

const FORGET_CLEANUP_PATTERNS = [
  /^(請|幫我|可以|麻煩|你)?/,
  /忘(記|掉|了)|刪(除|掉)|移除|不要記|別記|去掉/g,
  /forget|delete|remove|erase|clear/gi,
  /^(這個|那個|有關|關於|about|the|my|我的)\s*/i,
  /(的事|的記憶|的東西|memory|memories|fact|facts)\s*$/i,
  /[。，！？.!?,]/g,
];

/**
 * Detect if a user message is asking to forget/delete a memory.
 * Returns the target keyword to search for deletion.
 */
export function detectForgetIntent(text: string): { isForget: boolean; target: string } {
  // Skip confirmation-style responses (user confirming a previous forget action)
  if (/^(確認|好|對|是|ok|yes|sure|confirm|y|刪|刪吧|刪掉|確認刪除)\s*[。！?.!]?\s*$/i.test(text.trim())) {
    return { isForget: false, target: "" };
  }

  const matched = FORGET_PATTERNS.some((p) => p.test(text));
  if (!matched) return { isForget: false, target: "" };

  // Extract the target: strip forget keywords and common particles
  let target = text;
  for (const pattern of FORGET_CLEANUP_PATTERNS) {
    target = target.replace(pattern, "");
  }
  target = target.trim();

  // Need at least 2 chars to be a meaningful target
  if (target.length >= 2) {
    return { isForget: true, target };
  }
  return { isForget: false, target: "" };
}

// ============================================================================
// Contradiction detection (方案 B: capture-level auto-supersede)
// ============================================================================

const NEGATION_KEYWORDS_ZH = [
  // Compound negations first (longer matches removed before shorter ones)
  "沒有", "不是", "不養", "沒養", "不喜歡", "沒去", "不會", "不要",
  "並非", "其實不", "不再", "已經不", "沒在", "從沒", "從未",
  // Single-char negation particles (catch 不+verb / 沒+verb patterns)
  "不", "沒",
];
const NEGATION_KEYWORDS_EN = [
  "doesn't", "don't", "isn't", "not", "never", "no longer",
  "didn't", "wasn't", "aren't", "haven't", "hasn't",
];

/**
 * Check if a new fact contradicts an existing atom's knowledge.
 * Returns true if the new fact appears to negate the existing knowledge.
 *
 * Strategy: if the new fact contains negation keywords AND shares
 * subject keywords with the existing atom, it's likely a contradiction.
 */
export function detectContradiction(newFact: string, existingKnowledge: string): boolean {
  const hasNegation =
    NEGATION_KEYWORDS_ZH.some((kw) => newFact.includes(kw)) ||
    NEGATION_KEYWORDS_EN.some((kw) => newFact.toLowerCase().includes(kw));

  if (!hasNegation) return false;

  // Extract content words from both texts
  // CJK: use bigram sliding window (Chinese has no spaces, so greedy match
  // produces one giant token that never overlaps)
  const extractWords = (text: string): Set<string> => {
    const words = new Set<string>();
    // CJK bigrams (2-char sliding window)
    const cjkOnly = text.replace(/[^\u4e00-\u9fff]/g, "");
    for (let i = 0; i <= cjkOnly.length - 2; i++) {
      words.add(cjkOnly.slice(i, i + 2));
    }
    // English words (3+ chars, lowercased)
    const en = text.match(/[a-zA-Z]{3,}/g);
    if (en) for (const w of en) words.add(w.toLowerCase());
    return words;
  };

  // Remove negation keywords from the new fact before extracting words
  let cleanedNewFact = newFact;
  for (const kw of [...NEGATION_KEYWORDS_ZH, ...NEGATION_KEYWORDS_EN]) {
    cleanedNewFact = cleanedNewFact.replace(new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "gi"), "");
  }

  const newWords = extractWords(cleanedNewFact);
  const existingWords = extractWords(existingKnowledge);

  // Count overlapping content words
  let overlap = 0;
  for (const w of newWords) {
    if (existingWords.has(w)) overlap++;
  }

  // At least 1 overlapping content word = likely contradiction
  return overlap >= 1;
}

// ============================================================================
// LLM-based 4-verdict conflict detection (V2.1.2)
// ============================================================================

const CONFLICT_SYSTEM_PROMPT = `You are a fact-relationship classifier. Given two facts (A = existing, B = new), output exactly one JSON object with:
- "verdict": one of "agree", "contradict", "extend", "unrelated"
- "confidence": number 0-1
- "reason": brief explanation (≤20 words)

Definitions:
- agree: B says the same thing as A
- contradict: B negates or replaces A (cannot both be true)
- extend: B adds detail to A (both can be true, B is more specific)
- unrelated: A and B are about different topics

Reply with ONLY the JSON object, no markdown fences.`;

/**
 * LLM-based conflict detection with 4 verdicts.
 * Falls back to keyword-based detectContradiction() on timeout or error.
 */
export async function detectConflictLLM(
  newFact: string,
  existingKnowledge: string,
  ollama: OllamaClient,
): Promise<ConflictResult> {
  // Fallback helper
  const fallback = (): ConflictResult => {
    const isContradiction = detectContradiction(newFact, existingKnowledge);
    return {
      verdict: isContradiction ? "contradict" : "unrelated",
      confidence: 0,
      reason: "keyword fallback",
    };
  };

  if (!ollama.isHealthy()) return fallback();

  try {
    const prompt = `A (existing): ${existingKnowledge.slice(0, 200)}\nB (new): ${newFact.slice(0, 200)}`;
    const response = await ollama.chat(
      CONFLICT_SYSTEM_PROMPT,
      prompt,
      { jsonMode: true, temperature: 0.0, maxTokens: 100, timeoutMs: 5_000 },
    );

    const parsed = JSON.parse(response) as { verdict?: string; confidence?: number; reason?: string };
    const validVerdicts: ConflictVerdict[] = ["agree", "contradict", "extend", "unrelated"];
    const verdict = validVerdicts.includes(parsed.verdict as ConflictVerdict)
      ? (parsed.verdict as ConflictVerdict)
      : undefined;

    if (!verdict) return fallback();

    return {
      verdict,
      confidence: typeof parsed.confidence === "number" ? Math.min(1, Math.max(0, parsed.confidence)) : 0.5,
      reason: typeof parsed.reason === "string" ? parsed.reason.slice(0, 80) : "",
    };
  } catch {
    return fallback();
  }
}

// ============================================================================
// Full-chain delete propagation (V2.1.2)
// ============================================================================

export type PropagateDeleteResult = {
  deletedRef: string;
  vectorsDeleted: boolean;
  affectedAtoms: string[];
};

/**
 * Delete an atom and propagate the deletion:
 * 1. Remove from vector DB
 * 2. Scan all atoms' related[] and remove references to the deleted atom
 * 3. Return list of affected atoms
 */
export async function propagateDelete(
  category: AtomCategory,
  id: string,
  store: AtomStore,
  vectors: VectorClient,
  options: { archive?: boolean } = {},
): Promise<PropagateDeleteResult | null> {
  const atomRef = `${category}/${id}`;
  const exists = store.exists(category, id);
  if (!exists) return null;

  // Step 1: Delete or archive the atom itself
  if (options.archive) {
    await store.moveToDistant(category, id);
  } else {
    await store.delete(category, id);
  }

  // Step 2: Delete vector chunks
  let vectorsDeleted = false;
  try {
    await vectors.deleteAtom(atomRef);
    vectorsDeleted = true;
  } catch {
    // Vector DB might be unavailable — non-fatal
  }

  // Step 3: Scan all atoms and remove dangling related[] references
  const affectedAtoms: string[] = [];
  const allAtoms = await store.list();
  for (const atom of allAtoms) {
    if (atom.related.includes(atomRef)) {
      const cleaned = atom.related.filter((r) => r !== atomRef);
      await store.update(atom.category, atom.id, { related: cleaned });
      affectedAtoms.push(`${atom.category}/${atom.id}`);
    }
  }

  return { deletedRef: atomRef, vectorsDeleted, affectedAtoms };
}
