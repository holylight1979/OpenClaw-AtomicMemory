/**
 * Blind-Spot Detection — Detect empty or weak recall results.
 *
 * Returns a short context line when recall returns nothing useful,
 * signaling to the agent that it has no relevant memory for this topic.
 */

import type { RecalledAtom } from "./types.js";

/**
 * Detect blind spots in recall results.
 *
 * @param recallResults - Atoms returned from recall engine
 * @param promptLength - Length of the user's prompt (chars)
 * @param minScore - Threshold below which all results are considered weak (default 0.3)
 * @returns Context string to inject, or null if recall looks normal
 */
export function detectBlindSpot(
  recallResults: RecalledAtom[],
  promptLength: number,
  minScore = 0.3,
): string | null {
  // Short prompts (greetings, single words) don't need blind-spot warnings
  if (promptLength <= 20) return null;

  // No results at all — complete blind spot
  if (recallResults.length === 0) {
    return "[memory:blind-spot] No relevant memories found for this topic.";
  }

  // All results below threshold — weak match
  const allWeak = recallResults.every((r) => r.score < minScore);
  if (allWeak) {
    return "[memory:weak-match] Memories found but low confidence — topic may be new.";
  }

  return null;
}
