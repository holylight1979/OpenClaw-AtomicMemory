/**
 * Recall Engine — Hybrid search: vector + keyword boost + ranked scoring.
 *
 * Ported from searcher.py's ranked_search() and _apply_keyword_boost().
 */

import type { AtomStore } from "./atom-store.js";
import type { OllamaClient } from "./ollama-client.js";
import type { VectorClient } from "./vector-client.js";
import type { Atom, AtomCategory, RecalledAtom, VectorResult } from "./types.js";
import { CONFIDENCE_WEIGHT } from "./types.js";
import { resolveEntity } from "./entity-resolver.js";

export type RecallOptions = {
  topK?: number;
  minScore?: number;
  senderId?: string;
  channel?: string;
  displayName?: string;
};

export class RecallEngine {
  constructor(
    private readonly store: AtomStore,
    private readonly vectors: VectorClient,
    private readonly ollama: OllamaClient,
  ) {}

  /**
   * Hybrid search: vector similarity + keyword boost + ranked scoring.
   *
   * Steps:
   * 1. Embed query → vector search via ChromaDB
   * 2. Keyword trigger matching from atom store
   * 3. Keyword boost (V2.5): dual-hit +0.1, keyword-only rescue +0.05
   * 4. Ranked scoring: semantic + recency + category + confidence + confirmations
   * 5. Deduplicate by atom (keep highest scoring chunk per atom)
   * 6. Load full atom content for top results
   * 7. Update Last-used + Confirmations++
   */
  async search(query: string, options: RecallOptions = {}): Promise<RecalledAtom[]> {
    const topK = options.topK ?? 5;
    const minScore = options.minScore ?? 0.55;

    // Phase 1: Vector search
    let vectorResults: VectorResult[] = [];
    try {
      const queryVec = await this.ollama.embed(query);
      vectorResults = await this.vectors.search(queryVec, topK * 3, minScore * 0.5);
    } catch {
      // Vector search failed — fall back to keyword-only
    }

    // Phase 2: Keyword trigger matching
    const keywordHits = await this.keywordMatch(query);

    // Phase 3: Keyword boost (V2.5)
    const boostedResults = this.applyKeywordBoost(vectorResults, keywordHits, query);

    // Phase 4: Ranked scoring
    const rankedResults = this.rankResults(boostedResults);

    // Phase 5: Deduplicate by atom name (keep highest score per atom)
    const deduped = this.deduplicateByAtom(rankedResults);

    // Phase 6: Filter superseded atoms and apply minScore
    const filtered = await this.filterSuperseded(
      deduped.filter((r) => r.score >= minScore),
    );

    // Phase 7: Load full atoms and update metadata
    const recalled: RecalledAtom[] = [];
    for (const result of filtered.slice(0, topK)) {
      const [category, id] = result.atomName.split("/") as [AtomCategory, string];
      const atom = await this.store.get(category, id);
      if (!atom) continue;

      // If sender is known, prioritize their person atom
      if (options.senderId && atom.category === "person") {
        const personAtoms = await this.store.list("person");
        const resolved = resolveEntity(
          options.senderId,
          options.channel ?? "",
          options.displayName,
          personAtoms,
        );
        if (resolved && resolved.id === atom.id) {
          result.score += 0.15; // Boost sender's own atom
        }
      }

      recalled.push({
        atom,
        score: result.score,
        matchedChunks: [result],
      });

      // Update atom metadata (fire-and-forget)
      this.store.update(category, id, {
        lastUsed: new Date().toISOString().slice(0, 10),
        confirmations: atom.confirmations + 1,
      }).catch(() => {});
    }

    // Sort by final score
    recalled.sort((a, b) => b.score - a.score);
    return recalled;
  }

  // ==========================================================================
  // Keyword matching
  // ==========================================================================

  /**
   * Find atoms whose triggers match keywords in the query.
   * Returns a set of matching atom names.
   */
  private async keywordMatch(query: string): Promise<Set<string>> {
    const hits = new Set<string>();
    const atoms = await this.store.list();
    const queryLower = query.toLowerCase();

    for (const atom of atoms) {
      for (const trigger of atom.triggers) {
        if (queryLower.includes(trigger.toLowerCase())) {
          hits.add(`${atom.category}/${atom.id}`);
          break;
        }
      }
    }

    return hits;
  }

  // ==========================================================================
  // Keyword boost (V2.5)
  // ==========================================================================

  /**
   * Apply keyword boost to vector results.
   * Ported from searcher.py's _apply_keyword_boost().
   *
   * - Vector + keyword dual-hit → score +0.10
   * - Keyword-only rescue (not in vector results) → score +0.05
   */
  private applyKeywordBoost(
    vectorResults: VectorResult[],
    keywordHits: Set<string>,
    _query: string,
  ): VectorResult[] {
    const resultMap = new Map<string, VectorResult>();

    // Index vector results by atom name
    for (const r of vectorResults) {
      const existing = resultMap.get(r.atomName);
      if (!existing || r.score > existing.score) {
        resultMap.set(r.atomName, { ...r });
      }
    }

    // Apply boosts
    for (const atomName of keywordHits) {
      const existing = resultMap.get(atomName);
      if (existing) {
        // Dual-hit: vector + keyword
        existing.score += 0.10;
      } else {
        // Keyword-only rescue: create a synthetic result
        const parts = atomName.split("/");
        resultMap.set(atomName, {
          chunkId: `${atomName}#keyword`,
          text: "",
          section: "",
          atomName,
          category: (parts[0] ?? "thing") as AtomCategory,
          confidence: "[臨]",
          lastUsed: "",
          confirmations: 0,
          score: 0.05 + 0.05, // Base rescue score + keyword boost
        });
      }
    }

    return Array.from(resultMap.values());
  }

  // ==========================================================================
  // Ranked scoring
  // ==========================================================================

  /**
   * Apply multi-factor ranked scoring.
   * Ported from searcher.py's ranked_search() formula:
   *
   *   final = 0.45*Semantic + 0.15*Recency + 0.20*CategoryBoost
   *         + 0.10*Confidence + 0.10*Confirmations
   */
  private rankResults(results: VectorResult[]): VectorResult[] {
    const now = Date.now();

    return results.map((r) => {
      const semantic = r.score;

      // Recency: max(0, 1 - days/90)
      const lastUsedMs = r.lastUsed ? new Date(r.lastUsed).getTime() : 0;
      const daysSince = lastUsedMs > 0 ? (now - lastUsedMs) / (1000 * 60 * 60 * 24) : 90;
      const recency = Math.max(0, 1 - daysSince / 90);

      // Category boost: person and event atoms get higher weight
      const categoryBoost = CATEGORY_BOOST[r.category] ?? 0.5;

      // Confidence weight
      const confidenceScore = CONFIDENCE_WEIGHT[r.confidence] ?? 0.4;

      // Confirmations: log scale, capped at 1.0
      const confirmScore = Math.min(1.0, Math.log2(r.confirmations + 1) / 4);

      const finalScore =
        0.45 * semantic +
        0.15 * recency +
        0.20 * categoryBoost +
        0.10 * confidenceScore +
        0.10 * confirmScore;

      return { ...r, score: finalScore };
    });
  }

  // ==========================================================================
  // Deduplication & filtering
  // ==========================================================================

  /** Keep only the highest-scoring chunk per atom. */
  private deduplicateByAtom(results: VectorResult[]): VectorResult[] {
    const best = new Map<string, VectorResult>();

    for (const r of results) {
      const existing = best.get(r.atomName);
      if (!existing || r.score > existing.score) {
        best.set(r.atomName, r);
      }
    }

    return Array.from(best.values()).sort((a, b) => b.score - a.score);
  }

  /** Filter out atoms that have been superseded by newer atoms. */
  private async filterSuperseded(results: VectorResult[]): Promise<VectorResult[]> {
    // Build a set of superseded atom names
    const allAtoms = await this.store.list();
    const supersededSet = new Set<string>();
    for (const atom of allAtoms) {
      if (atom.supersedes) {
        supersededSet.add(atom.supersedes);
      }
    }

    return results.filter((r) => !supersededSet.has(r.atomName));
  }
}

// Category boost values: person and event get higher recall priority
const CATEGORY_BOOST: Record<AtomCategory, number> = {
  person: 0.8,
  event: 0.7,
  topic: 0.6,
  place: 0.5,
  thing: 0.4,
};
