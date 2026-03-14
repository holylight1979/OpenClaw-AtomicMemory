/**
 * Promotion Engine — Cross-session confidence promotion and decay.
 *
 * Manages atom lifecycle:
 * - [臨] confirmations ≥ 2 → auto-promote to [觀]
 * - [觀] confirmations ≥ 4 → suggest promote to [固] (not auto)
 * - Stale atoms → archive to _distant/
 */

import type { AtomStore } from "./atom-store.js";
import type { Logger } from "./logger.js";
import type { Confidence, DecayAction, DecayResult, PromotionAction, PromotionResult } from "./types.js";

// Decay thresholds (days since last used)
const DECAY_THRESHOLDS: Record<Confidence, { days: number; action: DecayAction }> = {
  "[臨]": { days: 30, action: "archived" },
  "[觀]": { days: 60, action: "flagged" },
  "[固]": { days: 90, action: "remind" },
};

export class PromotionEngine {
  constructor(private readonly store: AtomStore) {}

  /**
   * Check all atoms for promotion eligibility.
   *
   * Rules:
   * - [臨] with confirmations ≥ 2 → auto-promote to [觀]
   * - [觀] with confirmations ≥ 4 → mark as suggested for [固] (needs user confirmation)
   */
  async checkPromotions(): Promise<PromotionResult[]> {
    const atoms = await this.store.list();
    const results: PromotionResult[] = [];
    const today = new Date().toISOString().slice(0, 10);

    for (const atom of atoms) {
      const atomRef = `${atom.category}/${atom.id}`;

      // [臨] → [觀]: auto-promote at 2+ confirmations
      if (atom.confidence === "[臨]" && atom.confirmations >= 2) {
        await this.store.update(atom.category, atom.id, {
          confidence: "[觀]",
          lastUsed: today,
          appendEvolution: `${today}: 晉升 [臨]→[觀]（${atom.confirmations} 次確認）`,
        });

        results.push({
          atomRef,
          from: "[臨]",
          to: "[觀]",
          action: "promoted",
          confirmations: atom.confirmations,
        });
        continue;
      }

      // [觀] → [固]: suggest only (do not auto-promote)
      if (atom.confidence === "[觀]" && atom.confirmations >= 4) {
        results.push({
          atomRef,
          from: "[觀]",
          to: "[固]",
          action: "suggest",
          confirmations: atom.confirmations,
        });
        continue;
      }

      results.push({
        atomRef,
        from: atom.confidence,
        to: atom.confidence,
        action: "none",
        confirmations: atom.confirmations,
      });
    }

    return results;
  }

  /**
   * Check all atoms for staleness and archive/flag as needed.
   *
   * Rules:
   * - [臨] last-used > 30 days → archive to _distant/
   * - [觀] last-used > 60 days → flag for review
   * - [固] last-used > 90 days → remind but don't act
   */
  async checkDecay(): Promise<DecayResult[]> {
    const atoms = await this.store.list();
    const results: DecayResult[] = [];
    const now = Date.now();

    for (const atom of atoms) {
      const atomRef = `${atom.category}/${atom.id}`;
      const lastUsedMs = atom.lastUsed ? new Date(atom.lastUsed).getTime() : 0;
      const daysSinceUsed = lastUsedMs > 0
        ? Math.floor((now - lastUsedMs) / (1000 * 60 * 60 * 24))
        : 999;

      const threshold = DECAY_THRESHOLDS[atom.confidence];
      if (!threshold || daysSinceUsed < threshold.days) {
        results.push({
          atomRef,
          confidence: atom.confidence,
          daysSinceUsed,
          action: "none",
        });
        continue;
      }

      // Execute decay action
      if (threshold.action === "archived") {
        await this.store.moveToDistant(atom.category, atom.id);
      }

      results.push({
        atomRef,
        confidence: atom.confidence,
        daysSinceUsed,
        action: threshold.action,
      });
    }

    return results;
  }

  /**
   * Immediate promotion check for a single atom (called after consolidation).
   *
   * Rules:
   * - [臨] with confirmations ≥ 2 → auto-promote to [觀]
   * - [觀] with confirmations ≥ 4 → suggest only (returns "suggest", does NOT auto-promote)
   *
   * Returns null if atom not found or no action needed.
   */
  async immediatePromotionCheck(
    atomName: string,
    log?: Logger,
  ): Promise<PromotionResult | null> {
    const slashIdx = atomName.indexOf("/");
    if (slashIdx < 0) return null;

    const category = atomName.slice(0, slashIdx);
    const id = atomName.slice(slashIdx + 1);
    const atom = await this.store.get(category as Parameters<typeof this.store.get>[0], id);
    if (!atom) return null;

    const atomRef = `${atom.category}/${atom.id}`;

    // [臨] → [觀]: auto-promote at 2+ confirmations
    if (atom.confidence === "[臨]" && atom.confirmations >= 2) {
      const today = new Date().toISOString().slice(0, 10);
      await this.store.update(atom.category, atom.id, {
        confidence: "[觀]",
        lastUsed: today,
        appendEvolution: `${today}: 即時晉升 [臨]→[觀]（${atom.confirmations} 次確認, cross-session consolidation）`,
      });

      log?.info(`immediate promotion: ${atomRef} [臨]→[觀] (c:${atom.confirmations})`);

      return {
        atomRef,
        from: "[臨]",
        to: "[觀]",
        action: "promoted",
        confirmations: atom.confirmations,
      };
    }

    // [觀] → [固]: suggest only (do not auto-promote)
    if (atom.confidence === "[觀]" && atom.confirmations >= 4) {
      log?.info(`immediate suggestion: ${atomRef} [觀]→[固] (c:${atom.confirmations})`);

      return {
        atomRef,
        from: "[觀]",
        to: "[固]",
        action: "suggest",
        confirmations: atom.confirmations,
      };
    }

    return null;
  }

  /**
   * Manually promote a specific atom.
   * Used by CLI `openclaw atoms promote` command.
   */
  async promoteAtom(
    category: string,
    id: string,
    targetConfidence: Confidence,
  ): Promise<PromotionResult | null> {
    const atom = await this.store.get(category as Parameters<typeof this.store.get>[0], id);
    if (!atom) return null;

    const today = new Date().toISOString().slice(0, 10);
    const from = atom.confidence;

    await this.store.update(atom.category, atom.id, {
      confidence: targetConfidence,
      lastUsed: today,
      appendEvolution: `${today}: 手動晉升 ${from}→${targetConfidence}`,
    });

    return {
      atomRef: `${atom.category}/${atom.id}`,
      from,
      to: targetConfidence,
      action: "promoted",
      confirmations: atom.confirmations,
    };
  }
}
