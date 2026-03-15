/**
 * Memory Index — Dynamic MEMORY.md management.
 *
 * Replaces the static workspace MEMORY.md with a code-managed dynamic index.
 * Scoring: +4 per mention (cap 20), -1 per non-mention (floor 0, removed at 0).
 * Updated after every conversation turn (agent_end).
 *
 * Injection priority:
 *   1. Newest (by lastMentioned date)
 *   2. Score ≥ 3, sorted descending
 * Both merged, deduped, with confidence shown.
 */

import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { AtomCategory, Confidence } from "./types.js";
import type { Logger } from "./logger.js";

// ============================================================================
// Constants
// ============================================================================

const MAX_SCORE = 20;
const MIN_SCORE = 0;
const MENTION_BOOST = 4;
const DECAY_RATE = 1;
const INJECT_THRESHOLD = 3;
/** Max "newest" entries to include beyond high-score set. */
const NEWEST_EXTRA = 5;

// ============================================================================
// Types
// ============================================================================

export type MemoryIndexEntry = {
  atomId: string;
  category: AtomCategory;
  score: number; // 0-20
  confidence: Confidence;
  lastMentioned: string; // YYYY-MM-DD
};

export type MemoryIndex = {
  entries: MemoryIndexEntry[];
};

export type TouchedAtom = {
  id: string;
  category: AtomCategory;
  confidence: Confidence;
};

// ============================================================================
// Read / Parse
// ============================================================================

/**
 * Read and parse MEMORY.md from workspace directory.
 * Returns empty index if file doesn't exist.
 */
export async function readMemoryIndex(workspaceDir: string): Promise<MemoryIndex> {
  const filePath = join(workspaceDir, "MEMORY.md");
  try {
    const content = await readFile(filePath, "utf-8");
    return parseMemoryIndex(content);
  } catch {
    return { entries: [] };
  }
}

/**
 * Parse MEMORY.md markdown table into MemoryIndex.
 */
export function parseMemoryIndex(content: string): MemoryIndex {
  const entries: MemoryIndexEntry[] = [];
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    // Match: | atomId | category | score | [confidence] | YYYY-MM-DD |
    const match = trimmed.match(
      /^\|\s*([^|]+?)\s*\|\s*(person|topic|event|place|thing)\s*\|\s*(\d+)\s*\|\s*(\[[^\]]+\])\s*\|\s*(\d{4}-\d{2}-\d{2})\s*\|$/,
    );
    if (!match) continue;
    const [, atomId, category, scoreStr, confidence, lastMentioned] = match;
    entries.push({
      atomId: atomId!.trim(),
      category: category!.trim() as AtomCategory,
      score: parseInt(scoreStr!, 10),
      confidence: confidence!.trim() as Confidence,
      lastMentioned: lastMentioned!.trim(),
    });
  }
  return { entries };
}

// ============================================================================
// Update scoring
// ============================================================================

/**
 * Update MEMORY.md scores after a conversation turn.
 *
 * @param workspaceDir — workspace directory containing MEMORY.md
 * @param touchedAtoms — atoms that were recalled/captured/tool-used this turn
 * @param log — optional logger
 */
export async function updateMemoryIndex(
  workspaceDir: string,
  touchedAtoms: TouchedAtom[],
  log?: Logger,
): Promise<void> {
  const index = await readMemoryIndex(workspaceDir);
  const today = new Date().toISOString().slice(0, 10);
  const touchedIds = new Set(touchedAtoms.map((a) => a.id));

  // Update existing entries
  for (const entry of index.entries) {
    if (touchedIds.has(entry.atomId)) {
      entry.score = Math.min(MAX_SCORE, entry.score + MENTION_BOOST);
      entry.lastMentioned = today;
      // Update confidence from live atom data
      const atom = touchedAtoms.find((a) => a.id === entry.atomId);
      if (atom) entry.confidence = atom.confidence;
    } else {
      entry.score = Math.max(MIN_SCORE, entry.score - DECAY_RATE);
    }
  }

  // Add new atoms not yet in index
  const existingIds = new Set(index.entries.map((e) => e.atomId));
  for (const atom of touchedAtoms) {
    if (!existingIds.has(atom.id)) {
      index.entries.push({
        atomId: atom.id,
        category: atom.category,
        score: MENTION_BOOST,
        confidence: atom.confidence,
        lastMentioned: today,
      });
    }
  }

  // Remove score-0 entries
  index.entries = index.entries.filter((e) => e.score > MIN_SCORE);

  // Sort: score descending, then date descending
  index.entries.sort(
    (a, b) => b.score - a.score || b.lastMentioned.localeCompare(a.lastMentioned),
  );

  await writeMemoryIndex(workspaceDir, index);
  log?.info(`MEMORY.md updated: ${index.entries.length} entries, ${touchedIds.size} touched`);
}

// ============================================================================
// Injection selection
// ============================================================================

/**
 * Get entries eligible for injection into bootstrap/recall context.
 *
 * Returns union of:
 *   1. Score ≥ 3 (sorted by score desc)
 *   2. Newest N entries not already in set 1 (sorted by date desc)
 */
export function getInjectableEntries(index: MemoryIndex): MemoryIndexEntry[] {
  // High score entries
  const highScore = index.entries.filter((e) => e.score >= INJECT_THRESHOLD);
  const highScoreIds = new Set(highScore.map((e) => e.atomId));

  // Newest entries not already in high-score set
  const newest = [...index.entries]
    .filter((e) => !highScoreIds.has(e.atomId))
    .sort((a, b) => b.lastMentioned.localeCompare(a.lastMentioned))
    .slice(0, NEWEST_EXTRA);

  // Merge: high-score first (sorted by score), then newest
  return [...highScore, ...newest];
}

// ============================================================================
// Write
// ============================================================================

/**
 * Write MEMORY.md in markdown table format.
 */
async function writeMemoryIndex(workspaceDir: string, index: MemoryIndex): Promise<void> {
  const lines = [
    "# Atom Index",
    "",
    "| Atom | Category | Score | Confidence | Last |",
    "|------|----------|-------|------------|------|",
  ];

  for (const entry of index.entries) {
    lines.push(
      `| ${entry.atomId} | ${entry.category} | ${entry.score} | ${entry.confidence} | ${entry.lastMentioned} |`,
    );
  }

  lines.push(""); // trailing newline
  const filePath = join(workspaceDir, "MEMORY.md");
  await writeFile(filePath, lines.join("\n"), "utf-8");
}
