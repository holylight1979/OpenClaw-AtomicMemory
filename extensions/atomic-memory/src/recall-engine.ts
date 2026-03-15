/**
 * Recall Engine — Hybrid search: vector + keyword boost + ranked scoring + ACT-R.
 *
 * Ported from searcher.py's ranked_search() and _apply_keyword_boost().
 */

import type { AtomStore } from "./atom-store.js";
import type { OllamaClient } from "./ollama-client.js";
import type { VectorClient } from "./vector-client.js";
import type { Atom, AtomCategory, AtomScope, RecalledAtom, VectorResult } from "./types.js";
import { CONFIDENCE_WEIGHT } from "./types.js";
import { resolveEntity, resolveLinkedPeerIds, type IdentityLinks } from "./entity-resolver.js";
import { computeActivation, recordBatchAccess } from "./actr-scoring.js";
import { createLogger } from "./logger.js";

const log = createLogger("recall");

export type RecallOptions = {
  topK?: number;
  minScore?: number;
  senderId?: string;
  channel?: string;
  displayName?: string;
  /** Memory isolation mode: shared (default), user-scoped, or owner-only. */
  isolationMode?: "shared" | "user-scoped" | "owner-only";
  /** Atom store path for ACT-R scoring. */
  atomStorePath?: string;
  /** ACT-R weight in ranking formula (default 0.15). */
  actrWeight?: number;
  /** Cross-platform identity links for identity-aware isolation. */
  identityLinks?: IdentityLinks;
  /** Enable cross-platform recall (bypass source isolation for linked identities). */
  crossPlatformRecall?: boolean;
  /** G1-B: Which atom scopes to include in results. If unset, all scopes pass. */
  recallScopes?: AtomScope[];
};

export class RecallEngine {
  constructor(
    private readonly store: AtomStore,
    private readonly vectors: VectorClient,
    private readonly ollama: OllamaClient,
  ) {}

  /**
   * Hybrid search: vector similarity + keyword boost + ranked scoring + ACT-R.
   *
   * Steps:
   * 1. Embed query → vector search via ChromaDB
   * 2. Keyword trigger matching from atom store
   * 3. Keyword boost (V2.5): dual-hit +0.1, keyword-only rescue +0.05
   * 4. Ranked scoring: semantic + recency + category + confidence + confirmations
   * 5. ACT-R activation boost
   * 6. Deduplicate by atom (keep highest scoring chunk per atom)
   * 7. Load full atom content for top results
   * 8. Update Last-used + Confirmations++ + ACT-R access log
   */
  async search(query: string, options: RecallOptions = {}): Promise<RecalledAtom[]> {
    const topK = options.topK ?? 5;
    const minScore = options.minScore ?? 0.55;
    const actrWeight = options.actrWeight ?? 0.15;
    const atomStorePath = options.atomStorePath;

    // Phase 1: Vector search
    let vectorResults: VectorResult[] = [];
    try {
      const queryVec = await this.ollama.embed(query);
      vectorResults = await this.vectors.search(queryVec, topK * 3, minScore * 0.5);
      log.info(`vector search returned ${vectorResults.length} results (minScore=${minScore}, preFilter=${(minScore * 0.5).toFixed(2)})`);
      for (const r of vectorResults.slice(0, 5)) {
        log.debug(`  score=${r.score.toFixed(4)} atom=${r.atomName} text="${r.text.slice(0, 50)}"`);
      }
    } catch (err) {
      log.error(`vector search FAILED: ${err}`);
      // Vector search failed — fall back to keyword-only
    }

    // Phase 2: Keyword trigger matching
    const keywordHits = await this.keywordMatch(query);
    log.info(`keyword hits: ${keywordHits.size} (${[...keywordHits].join(", ")})`);

    // Phase 3: Keyword boost (V2.5)
    const boostedResults = this.applyKeywordBoost(vectorResults, keywordHits, query);

    // Phase 4: Ranked scoring (base factors)
    const rankedResults = this.rankResults(boostedResults);

    // Phase 5: ACT-R activation boost
    if (atomStorePath && actrWeight > 0) {
      await this.applyActrBoost(rankedResults, atomStorePath, actrWeight);
    }

    log.info(`after ranking: ${rankedResults.length} results`);
    for (const r of rankedResults.slice(0, 5)) {
      log.debug(`  ranked=${r.score.toFixed(4)} atom=${r.atomName}`);
    }

    // Phase 6: Deduplicate by atom name (keep highest score per atom)
    const deduped = this.deduplicateByAtom(rankedResults);

    // Phase 7: Filter superseded atoms and apply minScore
    const beforeFilter = deduped.filter((r) => r.score >= minScore);
    log.info(`after minScore filter (>=${minScore}): ${beforeFilter.length} of ${deduped.length}`);
    if (deduped.length > 0 && beforeFilter.length === 0) {
      log.warn(`ALL filtered out! Top deduped scores: ${deduped.slice(0, 3).map(r => `${r.score.toFixed(4)}(${r.atomName})`).join(", ")}`);
    }
    const filtered = await this.filterSuperseded(beforeFilter);

    // Phase 8: Load full atoms and update metadata
    const recalled: RecalledAtom[] = [];
    for (const result of filtered.slice(0, topK)) {
      const [category, id] = result.atomName.split("/") as [AtomCategory, string];
      const atom = await this.store.get(category, id);
      if (!atom) continue;

      // G1-B: Per-atom scope filtering
      // 'user' scope → only visible to matching senderId (across all groups)
      // 'group' scope → only visible in matching channel
      // 'global' scope → follows memoryIsolation setting (handled below)
      if (atom.scope === "user" && options.senderId) {
        const hasSenderSource = atom.sources.some(
          (s) => s.senderId === options.senderId,
        );
        let hasLinkedSource = false;
        if (!hasSenderSource && options.identityLinks && options.channel) {
          const linked = resolveLinkedPeerIds(options.senderId, options.channel, options.identityLinks);
          hasLinkedSource = linked.length > 0 && atom.sources.some((s) =>
            linked.some((l) => s.channel === l.channel && s.senderId === l.senderId),
          );
        }
        if (!hasSenderSource && !hasLinkedSource) continue;
      } else if (atom.scope === "user" && !options.senderId) {
        // No sender info — can't verify ownership, skip user-scoped atoms
        continue;
      } else if (atom.scope === "group") {
        // Group-scoped: only visible if current channel matches a source channel
        if (!options.channel) continue;
        const hasChannelSource = atom.sources.some(
          (s) => s.channel === options.channel,
        );
        if (!hasChannelSource) continue;
      }

      // G1-B: Filter by requested recall scopes (intent-aware routing)
      if (options.recallScopes && !options.recallScopes.includes(atom.scope)) {
        continue;
      }

      // Legacy user-scoped isolation for 'global' atoms (backwards-compatible)
      if (atom.scope === "global" && options.isolationMode === "user-scoped" && options.senderId) {
        const isSharedKnowledge = atom.sources.length === 0;
        if (!isSharedKnowledge) {
          const hasSenderSource = atom.sources.some(
            (s) => s.senderId === options.senderId,
          );
          let hasLinkedSource = false;
          if (!hasSenderSource && options.identityLinks && options.channel) {
            const linked = resolveLinkedPeerIds(options.senderId, options.channel, options.identityLinks);
            hasLinkedSource = linked.length > 0 && atom.sources.some((s) =>
              linked.some((l) => s.channel === l.channel && s.senderId === l.senderId),
            );
          }
          if (!hasSenderSource && !hasLinkedSource) continue;
        }
      }

      // Cross-platform recall: when enabled, also find person atoms by identityLinks
      if (options.crossPlatformRecall && options.identityLinks && atom.category === "person") {
        // Person atoms matching linked identities get a boost
        if (options.senderId && options.channel) {
          const linked = resolveLinkedPeerIds(options.senderId, options.channel, options.identityLinks);
          const hasLinked = linked.length > 0 && atom.sources.some((s) =>
            linked.some((l) => s.channel === l.channel && s.senderId === l.senderId),
          );
          if (hasLinked) {
            result.score += 0.10; // Cross-platform identity boost
          }
        }
      }

      // If sender is known, prioritize their person atom
      if (options.senderId && atom.category === "person") {
        const personAtoms = await this.store.list("person");
        const resolved = resolveEntity(
          options.senderId,
          options.channel ?? "",
          options.displayName,
          personAtoms,
          options.identityLinks,
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

    // Phase 9: Record ACT-R access for all recalled atoms (fire-and-forget)
    if (atomStorePath && recalled.length > 0) {
      const atomNames = recalled.map(r => `${r.atom.category}/${r.atom.id}`);
      recordBatchAccess(atomNames, atomStorePath).catch(() => {});
    }

    // Phase 10: Related-Edge Spreading (depth=1, top 2 results only)
    const recalledRefs = new Set(recalled.map(r => `${r.atom.category}/${r.atom.id}`));
    for (const r of recalled.slice(0, 2)) {
      for (const relRef of r.atom.related) {
        if (recalledRefs.has(relRef)) continue;
        const [relCat, relId] = relRef.split("/") as [AtomCategory, string];
        if (!relCat || !relId) continue;
        const relAtom = await this.store.get(relCat, relId);
        if (relAtom) {
          recalled.push({ atom: relAtom, score: r.score * 0.6, matchedChunks: [] });
          recalledRefs.add(relRef);
        }
      }
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
   *
   * ACT-R activation is applied separately via applyActrBoost() which
   * re-normalizes the weights to accommodate the actr weight.
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
  // ACT-R Activation Boost
  // ==========================================================================

  /**
   * Apply ACT-R activation as an additive boost to ranked results.
   *
   * Activation is normalized to [0, 1] range: sigmoid(activation / 3).
   * Final score = (1 - actrWeight) * baseScore + actrWeight * normalizedActivation.
   */
  private async applyActrBoost(
    results: VectorResult[],
    atomStorePath: string,
    actrWeight: number,
  ): Promise<void> {
    const baseWeight = 1 - actrWeight;
    for (const r of results) {
      const activation = await computeActivation(r.atomName, atomStorePath);
      // Normalize activation to [0, 1] via sigmoid(activation / 3)
      const normalized = 1 / (1 + Math.exp(-activation / 3));
      r.score = baseWeight * r.score + actrWeight * normalized;
    }
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
