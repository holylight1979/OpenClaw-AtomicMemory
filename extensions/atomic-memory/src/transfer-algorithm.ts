/**
 * Transfer Algorithm (M6) — CLS 記憶鞏固 + ACT-R 動態閾值
 *
 * prioritizeTransfer: episodic → TransferPlan (weighted priority)
 * computeDynamicThreshold: ACT-R activation + spacing quality → threshold adjustment
 * computeSpacingQuality: CV of inter-confirmation gaps
 */

import type {
  EpisodicSummary,
  Atom,
  TransferCandidate,
  TransferPlan,
  DynamicThreshold,
  Confidence,
} from "./types.js";
import { computeActivation, type AccessLog } from "./actr-scoring.js";
import { createLogger } from "./logger.js";

const log = createLogger("transfer");

// ============================================================================
// Config type (subset injected from plugin config)
// ============================================================================

export type TransferConfig = {
  recurrenceWeight: number;
  salienceWeight: number;
  schemaWeight: number;
  recencyWeight: number;
  transferThreshold: number;
  watchThreshold: number;
};

export type DynamicThresholdConfig = {
  activationStrong: number;
  activationWeak: number;
  spacingGood: number;
  spacingPoor: number;
  minGapMs: number;
};

// ============================================================================
// Default config values
// ============================================================================

export const DEFAULT_TRANSFER_CONFIG: TransferConfig = {
  recurrenceWeight: 0.40,
  salienceWeight: 0.25,
  schemaWeight: 0.20,
  recencyWeight: 0.15,
  transferThreshold: 0.6,
  watchThreshold: 0.3,
};

export const DEFAULT_DYNAMIC_THRESHOLD_CONFIG: DynamicThresholdConfig = {
  activationStrong: 1.0,
  activationWeak: -0.5,
  spacingGood: 0.6,
  spacingPoor: 0.3,
  minGapMs: 3_600_000, // 1 hour
};

// ============================================================================
// prioritizeTransfer
// ============================================================================

/**
 * CLS 記憶鞏固優先序。
 *
 * priority = w_r×recurrence + w_s×salience + w_sc×schemaConsistency + w_re×recency
 */
export function prioritizeTransfer(
  episodics: EpisodicSummary[],
  existingAtoms: Atom[],
  config: TransferConfig = DEFAULT_TRANSFER_CONFIG,
): TransferPlan {
  // Group episodics by topic
  const topicMap = new Map<string, { sessionKeys: Set<string>; lastSeen: number; hasAtomMod: boolean }>();
  const existingTriggers = new Set<string>();
  for (const atom of existingAtoms) {
    for (const t of atom.triggers) existingTriggers.add(t.toLowerCase());
  }

  for (const ep of episodics) {
    for (const topic of ep.topicsDiscussed) {
      const key = topic.toLowerCase();
      const entry = topicMap.get(key) ?? { sessionKeys: new Set(), lastSeen: 0, hasAtomMod: false };
      entry.sessionKeys.add(ep.sessionKey);
      entry.lastSeen = Math.max(entry.lastSeen, ep.endTime);
      if (ep.atomsModified.length > 0) entry.hasAtomMod = true;
      topicMap.set(key, entry);
    }
  }

  const now = Date.now();
  const candidates: TransferCandidate[] = [];

  for (const [topic, data] of topicMap) {
    const sessionCount = data.sessionKeys.size;
    const recurrence = Math.min(1.0, 0.2 * sessionCount);
    const salience = data.hasAtomMod ? 0.9 : 0.4;
    const schemaConsistency = existingTriggers.has(topic) ? 0.8 : 0.3;
    const daysSinceLastSeen = Math.max(0, (now - data.lastSeen) / 86_400_000);
    const recency = Math.exp(-0.1 * daysSinceLastSeen);

    const priority =
      config.recurrenceWeight * recurrence +
      config.salienceWeight * salience +
      config.schemaWeight * schemaConsistency +
      config.recencyWeight * recency;

    const action: TransferCandidate["action"] =
      priority > config.transferThreshold ? "transfer" :
      priority > config.watchThreshold ? "watch" : "skip";

    candidates.push({
      topic,
      sessionKeys: [...data.sessionKeys],
      priority,
      scores: { recurrence, schemaConsistency, salience, recency },
      action,
    });
  }

  // Sort by priority descending
  candidates.sort((a, b) => b.priority - a.priority);

  return {
    candidates,
    readyToTransfer: candidates.filter((c) => c.action === "transfer"),
    watchList: candidates.filter((c) => c.action === "watch"),
  };
}

// ============================================================================
// computeSpacingQuality
// ============================================================================

/**
 * Spacing quality: CV of inter-confirmation gaps + short-gap penalty.
 * 0 = all same timestamp, 1 = perfectly uniform spacing.
 * MIN_GAP = 1 hour (shorter gaps = massed practice, penalized).
 */
export function computeSpacingQuality(
  timestamps: number[],
  minGapMs: number = DEFAULT_DYNAMIC_THRESHOLD_CONFIG.minGapMs,
): number {
  if (timestamps.length < 2) return 0;

  const sorted = [...timestamps].sort((a, b) => a - b);
  const gaps: number[] = [];
  let shortGapCount = 0;

  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i] - sorted[i - 1];
    gaps.push(gap);
    if (gap < minGapMs) shortGapCount++;
  }

  if (gaps.length === 0) return 0;

  // CV (coefficient of variation) — lower CV = more uniform = better
  const mean = gaps.reduce((s, g) => s + g, 0) / gaps.length;
  if (mean === 0) return 0;

  const variance = gaps.reduce((s, g) => s + (g - mean) ** 2, 0) / gaps.length;
  const cv = Math.sqrt(variance) / mean;

  // CV → quality: CV=0 → 1.0, CV=2 → ~0
  const cvQuality = Math.max(0, 1 - cv / 2);

  // Short-gap penalty: fraction of gaps below minGap
  const shortGapPenalty = shortGapCount / gaps.length;

  // Final: quality minus penalty, clamped
  return Math.max(0, Math.min(1, cvQuality * (1 - shortGapPenalty * 0.5)));
}

// ============================================================================
// computeDynamicThreshold
// ============================================================================

/**
 * ACT-R 動態晉升閾值。
 *
 * Uses computeActivation() + spacing quality.
 * Adjustment rules:
 *   activation > strong + spacing > good → threshold -1
 *   activation < weak → threshold +1
 *   spacing < poor → threshold +1
 *   else → keep base
 */
export async function computeDynamicThreshold(
  atomName: string,
  atomConfidence: Confidence,
  atomStorePath: string,
  accessTimestamps: number[],
  config: DynamicThresholdConfig = DEFAULT_DYNAMIC_THRESHOLD_CONFIG,
): Promise<DynamicThreshold> {
  const baseThreshold = atomConfidence === "[臨]" ? 2 : 4; // [臨]→[觀] = 2, [觀]→[固] = 4

  const activation = await computeActivation(atomName, atomStorePath);
  const spacingQuality = computeSpacingQuality(accessTimestamps, config.minGapMs);

  let adjustment: DynamicThreshold["adjustment"] = "keep";
  let reason = "within normal range";
  let threshold = baseThreshold;

  if (activation > config.activationStrong && spacingQuality > config.spacingGood) {
    adjustment = "lower";
    reason = `strong activation (${activation.toFixed(2)}) + good spacing (${spacingQuality.toFixed(2)})`;
    threshold = Math.max(1, baseThreshold - 1);
  } else if (activation < config.activationWeak) {
    adjustment = "raise";
    reason = `weak activation (${activation.toFixed(2)})`;
    threshold = baseThreshold + 1;
  } else if (spacingQuality < config.spacingPoor) {
    adjustment = "raise";
    reason = `poor spacing quality (${spacingQuality.toFixed(2)}) — massed practice detected`;
    threshold = baseThreshold + 1;
  }

  return { threshold, activation, spacingQuality, adjustment, reason };
}

// ============================================================================
// formatTransferSummary
// ============================================================================

export function formatTransferSummary(plan: TransferPlan): string {
  const lines: string[] = [];
  if (plan.readyToTransfer.length > 0) {
    lines.push(`  Ready (${plan.readyToTransfer.length}):`);
    for (const c of plan.readyToTransfer.slice(0, 5)) {
      lines.push(`    ${c.topic}: priority=${c.priority.toFixed(2)} sessions=${c.sessionKeys.length}`);
    }
  }
  if (plan.watchList.length > 0) {
    lines.push(`  Watch (${plan.watchList.length}):`);
    for (const c of plan.watchList.slice(0, 5)) {
      lines.push(`    ${c.topic}: priority=${c.priority.toFixed(2)} sessions=${c.sessionKeys.length}`);
    }
  }
  if (lines.length === 0) {
    lines.push("  No transfer candidates.");
  }
  return lines.join("\n");
}
