/**
 * Episodic Engine — Conversation summary generation at session end.
 *
 * Rule-based extraction from SessionState (no Ollama needed).
 * Produces episodic atoms stored in {atomStorePath}/episodic/ with TTL-based cleanup.
 */

import { existsSync, mkdirSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { createHash } from "node:crypto";
import { createLogger, type Logger } from "./logger.js";
import type { EpisodicSummary, IntentType, SessionState } from "./types.js";

const log = createLogger("episodic");

// ============================================================================
// Configuration interface (passed from config.ts)
// ============================================================================

export type EpisodicConfig = {
  enabled: boolean;
  minDurationMs: number;
  minTurns: number;
  ttlDays: number;
};

// ============================================================================
// Generate
// ============================================================================

/**
 * Generate an EpisodicSummary from a SessionState, if it meets thresholds.
 * Pure rule-based — no LLM calls.
 */
export function generateEpisodicSummary(
  state: SessionState,
  config: EpisodicConfig,
): EpisodicSummary | null {
  if (!config.enabled) return null;

  const now = Date.now();
  const duration = now - state.startTime;

  if (state.turns < config.minTurns) return null;
  if (duration < config.minDurationMs) return null;

  // Dominant intent: the one with the highest count
  const dominantIntent = resolveDominantIntent(state.intents);

  // Skip pure-recall sessions (only memory-query, no substance)
  if (dominantIntent === "memory-query" && state.modifiedAtoms.length === 0) {
    return null;
  }

  // Topics: merge triggers from recalled + modified atoms (deduplicated)
  const topicsDiscussed = deriveTopics(state);

  return {
    sessionKey: state.sessionKey,
    startTime: state.startTime,
    endTime: now,
    turns: state.turns,
    dominantIntent,
    topicsDiscussed,
    atomsRecalled: [...state.recalledAtoms],
    atomsModified: [...state.modifiedAtoms],
    channel: state.channel,
    senderId: state.senderId,
  };
}

// ============================================================================
// Store
// ============================================================================

/**
 * Persist an EpisodicSummary as a standard atom markdown file.
 * Returns the written file path.
 */
export async function storeEpisodicAtom(
  summary: EpisodicSummary,
  atomStorePath: string,
  parentLog?: Logger,
): Promise<string> {
  const l = parentLog ?? log;
  const episodicDir = join(atomStorePath, "episodic");
  if (!existsSync(episodicDir)) {
    mkdirSync(episodicDir, { recursive: true });
  }

  const dateStr = formatDate(summary.startTime);
  const hash = createHash("md5")
    .update(summary.sessionKey)
    .digest("hex")
    .slice(0, 8);
  const fileName = `${dateStr}-${hash}.md`;
  const filePath = join(episodicDir, fileName);

  // Same-day dedup: if file exists, append counter
  const finalPath = deduplicatePath(filePath);

  const content = serializeEpisodicAtom(summary);
  const tmpPath = finalPath + ".tmp";
  writeFileSync(tmpPath, content, "utf-8");
  // Atomic rename
  const { renameSync } = await import("node:fs");
  renameSync(tmpPath, finalPath);

  l.info(`stored episodic atom: ${basename(finalPath)}`);
  return finalPath;
}

// ============================================================================
// Clean expired
// ============================================================================

/**
 * Delete episodic atoms older than ttlDays.
 * Returns number of files removed.
 */
export async function cleanExpiredEpisodic(
  atomStorePath: string,
  ttlDays: number,
  parentLog?: Logger,
): Promise<number> {
  const l = parentLog ?? log;
  const episodicDir = join(atomStorePath, "episodic");
  if (!existsSync(episodicDir)) return 0;

  const files = readdirSync(episodicDir).filter((f) => f.endsWith(".md"));
  const now = Date.now();
  const ttlMs = ttlDays * 24 * 60 * 60 * 1000;
  let removed = 0;

  for (const file of files) {
    const dateMatch = file.match(/^(\d{4})(\d{2})(\d{2})-/);
    if (!dateMatch) continue;

    const fileDate = new Date(
      parseInt(dateMatch[1]),
      parseInt(dateMatch[2]) - 1,
      parseInt(dateMatch[3]),
    ).getTime();

    if (now - fileDate > ttlMs) {
      try {
        unlinkSync(join(episodicDir, file));
        removed++;
      } catch {
        l.warn(`failed to remove expired episodic: ${file}`);
      }
    }
  }

  if (removed > 0) {
    l.info(`cleaned ${removed} expired episodic atom(s)`);
  }
  return removed;
}

// ============================================================================
// List
// ============================================================================

/**
 * Read all episodic summaries from the episodic/ directory.
 * Parses the markdown frontmatter back into EpisodicSummary objects.
 */
export async function listEpisodicSummaries(
  atomStorePath: string,
  opts?: { since?: Date; limit?: number },
): Promise<EpisodicSummary[]> {
  const episodicDir = join(atomStorePath, "episodic");
  if (!existsSync(episodicDir)) return [];

  const files = readdirSync(episodicDir)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .reverse(); // newest first

  const results: EpisodicSummary[] = [];
  const sinceMs = opts?.since?.getTime() ?? 0;
  const limit = opts?.limit ?? Infinity;

  for (const file of files) {
    if (results.length >= limit) break;

    try {
      const content = await readFile(join(episodicDir, file), "utf-8");
      const summary = parseEpisodicAtom(content);
      if (summary && summary.startTime >= sinceMs) {
        results.push(summary);
      }
    } catch {
      // Skip unreadable files
    }
  }

  return results;
}

// ============================================================================
// Serialization
// ============================================================================

function serializeEpisodicAtom(summary: EpisodicSummary): string {
  const startDate = new Date(summary.startTime).toISOString();
  const endDate = new Date(summary.endTime).toISOString();
  const today = formatDate(summary.startTime);
  const TTL_MS = 24 * 86_400_000; // 24 days in ms
  const expiresAt = formatDate(summary.endTime + TTL_MS);
  const durationMin = Math.round((summary.endTime - summary.startTime) / 60000);

  const intentDist = formatIntentDistribution(summary);
  const topics = summary.topicsDiscussed.length > 0
    ? summary.topicsDiscussed.join(", ")
    : "(none)";

  const lines: string[] = [
    `# Session ${summary.sessionKey.slice(0, 30)}`,
    "",
    `- Scope: project`,
    `- Confidence: [臨]`,
    `- Type: episodic`,
    `- TTL: 24d`,
    `- Expires-at: ${expiresAt}`,
    `- Confirmations: 0`,
    `- Last-used: ${today}`,
    `- Trigger: ${topics}`,
    ...(summary.channel ? [`- Channel: ${summary.channel}`] : []),
    ...(summary.senderId ? [`- Sender: ${summary.senderId}`] : []),
    "",
    "## 摘要",
    "",
    `- Intent: ${summary.dominantIntent}`,
    `- Turns: ${summary.turns} (${durationMin}min)`,
    `- Period: ${startDate} → ${endDate}`,
    ...(intentDist ? [`- Intent distribution: ${intentDist}`] : []),
    "",
    "## 知識",
    "",
    `- Topics discussed: ${topics}`,
    `- Atoms recalled (${summary.atomsRecalled.length}): ${summary.atomsRecalled.slice(0, 10).join(", ") || "(none)"}`,
    `- Atoms modified (${summary.atomsModified.length}): ${summary.atomsModified.slice(0, 10).join(", ") || "(none)"}`,
    "",
    "## 行動",
    "",
    "- TTL 24d 後自動淘汰。需長期保留的知識應遷移至專屬 atom。",
    "",
    "## 演化日誌",
    "",
    `- ${today}: 自動建立（session_end）`,
    "",
  ];

  return lines.join("\n");
}

// ============================================================================
// Parsing (for listEpisodicSummaries)
// ============================================================================

function parseEpisodicAtom(content: string): EpisodicSummary | null {
  try {
    // Extract key fields from markdown
    const sessionKeyMatch = content.match(/^#\s+Session\s+(.+)/m);
    const intentMatch = content.match(/^-\s*Intent:\s*(\S+)/m);
    const turnsMatch = content.match(/^-\s*Turns:\s*(\d+)/m);
    const periodMatch = content.match(
      /^-\s*Period:\s*(\d{4}-\d{2}-\d{2}T[\d:.]+Z?)\s*→\s*(\d{4}-\d{2}-\d{2}T[\d:.]+Z?)/m,
    );
    const channelMatch = content.match(/^-\s*Channel:\s*(.+)/m);
    const senderMatch = content.match(/^-\s*Sender:\s*(.+)/m);
    const topicsMatch = content.match(/^-\s*Topics discussed:\s*(.+)/m);
    const recalledMatch = content.match(/^-\s*Atoms recalled\s*\(\d+\):\s*(.+)/m);
    const modifiedMatch = content.match(/^-\s*Atoms modified\s*\(\d+\):\s*(.+)/m);

    if (!sessionKeyMatch || !periodMatch) return null;

    const startTime = new Date(periodMatch[1]).getTime();
    const endTime = new Date(periodMatch[2]).getTime();
    if (isNaN(startTime) || isNaN(endTime)) return null;

    const parseCsv = (s: string | undefined): string[] =>
      s && s !== "(none)"
        ? s.split(",").map((t) => t.trim()).filter(Boolean)
        : [];

    return {
      sessionKey: sessionKeyMatch[1].trim(),
      startTime,
      endTime,
      turns: turnsMatch ? parseInt(turnsMatch[1], 10) : 0,
      dominantIntent: (intentMatch?.[1] ?? "general") as IntentType,
      topicsDiscussed: parseCsv(topicsMatch?.[1]),
      atomsRecalled: parseCsv(recalledMatch?.[1]),
      atomsModified: parseCsv(modifiedMatch?.[1]),
      channel: channelMatch?.[1]?.trim(),
      senderId: senderMatch?.[1]?.trim(),
    };
  } catch {
    return null;
  }
}

// ============================================================================
// Helpers
// ============================================================================

function resolveDominantIntent(
  intents: Partial<Record<IntentType, number>>,
): IntentType {
  let max = 0;
  let dominant: IntentType = "general";
  for (const [intent, count] of Object.entries(intents)) {
    if ((count ?? 0) > max) {
      max = count ?? 0;
      dominant = intent as IntentType;
    }
  }
  return dominant;
}

function deriveTopics(state: SessionState): string[] {
  // Combine recalled + modified atom refs as topic proxies
  const allRefs = new Set([...state.recalledAtoms, ...state.modifiedAtoms]);
  const topics: string[] = [];
  for (const ref of allRefs) {
    // Extract atom ID from "category/id" format
    const parts = ref.split("/");
    if (parts.length >= 2) {
      topics.push(parts[1]);
    } else {
      topics.push(ref);
    }
  }
  return topics.slice(0, 10);
}

function formatDate(timestamp: number): string {
  const d = new Date(timestamp);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

function formatIntentDistribution(summary: EpisodicSummary): string {
  // Reconstruct approximate distribution from dominantIntent + turns
  // Since we only have the dominant, just output it
  return `${summary.dominantIntent} (dominant)`;
}

function deduplicatePath(filePath: string): string {
  if (!existsSync(filePath)) return filePath;

  const base = filePath.replace(/\.md$/, "");
  for (let i = 2; i <= 19; i++) {
    const candidate = `${base}-${i}.md`;
    if (!existsSync(candidate)) return candidate;
  }
  // Fallback: use timestamp suffix
  const ts = Date.now().toString().slice(-6);
  return `${base}-${ts}.md`;
}
