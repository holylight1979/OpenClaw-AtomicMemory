/**
 * Cross-Session Consolidation — Detect facts that recur across sessions.
 *
 * For each newly captured fact, queries ChromaDB for similar existing atoms.
 * If the same knowledge appears in 2+ distinct sessions, increments confirmations
 * and suggests promotion.
 *
 * V2.11 rules:
 * - 2+ distinct sessions → confirmations += 1, suggest [臨]→[觀]
 * - 4+ distinct sessions → suggest [觀]→[固]
 * - No auto-promotion — only increments confirmations + returns suggestions
 */

import type { AtomStore } from "./atom-store.js";
import type { Logger } from "./logger.js";
import type { OllamaClient } from "./ollama-client.js";
import type { ConsolidationResult, ExtractedFact, VectorResult } from "./types.js";
import type { VectorClient } from "./vector-client.js";

// ============================================================================
// Config
// ============================================================================

const MIN_SCORE = 0.75;
const TOP_K = 3;
const MIN_TEXT_LENGTH = 20;

// ============================================================================
// Core
// ============================================================================

/**
 * For each new fact, search ChromaDB for similar existing atoms.
 * Count how many distinct sessions (by evolutionLog dates) reference
 * the matched atom. If ≥2, increment confirmations and suggest promotion.
 *
 * @param newFacts - Facts just captured in this session
 * @param vectorClient - ChromaDB vector client
 * @param ollama - Ollama client for embedding
 * @param atomStore - Atom file store
 * @param sessionDate - Today's date string (YYYY-MM-DD) to exclude current session
 * @param log - Optional logger
 * @returns Consolidation results for facts that had cross-session matches
 */
export async function consolidateNewFacts(
  newFacts: ExtractedFact[],
  vectorClient: VectorClient,
  ollama: OllamaClient,
  atomStore: AtomStore,
  sessionDate: string,
  log?: Logger,
): Promise<ConsolidationResult[]> {
  const results: ConsolidationResult[] = [];

  for (const fact of newFacts) {
    if (!fact.text || fact.text.length < MIN_TEXT_LENGTH) continue;

    try {
      // Embed the fact text and search for similar chunks
      const queryVec = await ollama.embed(fact.text.slice(0, 200));
      const hits = await vectorClient.search(queryVec, TOP_K, MIN_SCORE);

      if (hits.length === 0) continue;

      // Group hits by atom name (deduplicate chunks from same atom)
      const atomHits = deduplicateByAtom(hits);

      for (const [atomName, bestHit] of atomHits) {
        // Parse category/id from atomName
        const slashIdx = atomName.indexOf("/");
        if (slashIdx < 0) continue;
        const category = atomName.slice(0, slashIdx);
        const id = atomName.slice(slashIdx + 1);

        // Load the full atom to inspect evolutionLog
        const atom = await atomStore.get(category as any, id);
        if (!atom) continue;

        // Count distinct dates in evolutionLog (each date ≈ a session)
        const distinctDates = countDistinctDates(atom.evolutionLog, sessionDate);

        if (distinctDates < 2) continue;

        // Increment confirmations
        const oldConfirmations = atom.confirmations;
        const newConfirmations = oldConfirmations + 1;
        const today = new Date().toISOString().slice(0, 10);

        await atomStore.update(atom.category, atom.id, {
          confirmations: newConfirmations,
          lastUsed: today,
          appendEvolution: `${today}: 跨 session 命中（${distinctDates} sessions, score=${bestHit.score.toFixed(2)}）— confirmations ${oldConfirmations}→${newConfirmations}`,
        });

        // Determine promotion suggestion
        let suggestPromotion: ConsolidationResult["suggestPromotion"];
        if (atom.confidence === "[臨]" && newConfirmations >= 2) {
          suggestPromotion = "to-觀";
        } else if (atom.confidence === "[觀]" && newConfirmations >= 4) {
          suggestPromotion = "to-固";
        }

        const result: ConsolidationResult = {
          atomRef: `${atom.category}/${atom.id}`,
          oldConfirmations,
          newConfirmations,
          suggestPromotion,
        };
        results.push(result);

        log?.info(
          `consolidation: ${result.atomRef} — ${distinctDates} sessions, confirmations ${oldConfirmations}→${newConfirmations}${suggestPromotion ? `, suggest ${suggestPromotion}` : ""}`,
        );
      }
    } catch (err) {
      log?.warn(`consolidation query failed for "${fact.text.slice(0, 40)}": ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return results;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Deduplicate vector hits by atom name, keeping the highest-scoring chunk per atom.
 */
function deduplicateByAtom(hits: VectorResult[]): Map<string, VectorResult> {
  const map = new Map<string, VectorResult>();
  for (const hit of hits) {
    const existing = map.get(hit.atomName);
    if (!existing || hit.score > existing.score) {
      map.set(hit.atomName, hit);
    }
  }
  return map;
}

/**
 * Count distinct YYYY-MM-DD dates in evolution log entries, excluding the current session date.
 *
 * Evolution log lines look like: "2026-03-14: 建立" or "2026-03-10: 更新(...)"
 */
function countDistinctDates(evolutionLog: string[], excludeDate: string): number {
  const datePattern = /^(\d{4}-\d{2}-\d{2})/;
  const dates = new Set<string>();

  for (const line of evolutionLog) {
    const match = line.match(datePattern);
    if (match && match[1] !== excludeDate) {
      dates.add(match[1]);
    }
  }

  return dates.size;
}
