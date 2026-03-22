/**
 * OETAV Phase B — Threshold Balancer (Spec M4)
 *
 * Goodman reflective equilibrium: bidirectional threshold adjustment.
 * 莊子無為 (Wu-Wei): maturity-aware intervention bias.
 * 王陽明知行合一 (Zhixing): action urgency tracking.
 *
 * Persists to {atomStorePath}/_iteration/thresholds.json.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import type {
  SignalType,
  EvidenceBucket,
  ThresholdAdjustment,
  ThresholdStore,
  OutcomeHistory,
  WuWeiConfig,
  InterventionDecision,
  ZhixingReport,
  ZhixingEntry,
  StaleEvidencePolicy,
  MaturityPhase,
} from "./types.js";
import { SIGNAL_LABELS } from "./types.js";
import { computeActionUrgency } from "./evidence-accumulator.js";
import type { Logger } from "./logger.js";

// ============================================================================
// Constants
// ============================================================================

const THRESHOLD_FILE = "thresholds.json";
const ITERATION_DIR = "_iteration";

/** Default thresholds per signal type (from Architecture §2.3). */
export const DEFAULT_THRESHOLDS: Record<SignalType, number> = {
  S1: 3.0,   // Pitfall Accumulation
  S2: 5.0,   // Wisdom Blind Spot
  S3: 4.0,   // Recall Degradation (Staleness)
  S4: 0.5,   // Oscillation — near-immediate
  S5: 5.0,   // Recall Quality Drop
  S6: 3.0,   // Decision Flip / Correction
  S7: 3.0,   // AIDocs Drift
  S8: 3.0,   // Permission Boundary
  S9: 4.0,   // Knowledge Entropy
};

/** Minimum sample counts per signal type (from Architecture §2.3). */
export const MIN_SAMPLES: Partial<Record<SignalType, number>> = {
  S1: 3,
  S2: 10,
  S5: 10,
  S6: 3,
  S7: 3,
  S8: 5,
};

/** Wu-Wei defaults per maturity phase (from Spec M4). */
export const WU_WEI_DEFAULTS: Record<MaturityPhase, { wuWeiBias: number; thresholdMultiplier: number }> = {
  learning: { wuWeiBias: 0.7, thresholdMultiplier: 1.5 },
  stable:   { wuWeiBias: 0.4, thresholdMultiplier: 1.0 },
  mature:   { wuWeiBias: 0.15, thresholdMultiplier: 0.7 },
};

const MAX_ADJUSTMENT_RATIO = 0.15;  // ±15%
const INERTIA_THRESHOLD = 3;        // Minimum data points before adjusting
const MAX_ADJUSTMENTS_HISTORY = 50;

// ============================================================================
// Persistence
// ============================================================================

function thresholdPath(atomStorePath: string): string {
  return join(atomStorePath, ITERATION_DIR, THRESHOLD_FILE);
}

export async function loadThresholdStore(atomStorePath: string): Promise<ThresholdStore> {
  try {
    const raw = await readFile(thresholdPath(atomStorePath), "utf-8");
    return JSON.parse(raw) as ThresholdStore;
  } catch {
    return { thresholds: {}, adjustments: [], outcomes: [], lastUpdated: "" };
  }
}

export async function saveThresholdStore(atomStorePath: string, store: ThresholdStore): Promise<void> {
  const filePath = thresholdPath(atomStorePath);
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(store, null, 2), "utf-8");
}

// ============================================================================
// Threshold Resolution
// ============================================================================

/** Get effective threshold for a signal type (persisted override > default). */
export function getThreshold(store: ThresholdStore, signalType: SignalType): number {
  return store.thresholds[signalType] ?? DEFAULT_THRESHOLDS[signalType] ?? 3.0;
}

// ============================================================================
// Goodman Reflective Equilibrium — Bidirectional Threshold Adjustment
// ============================================================================

/**
 * Goodman bidirectional threshold adjustment:
 *   Direction 1: evidence accumulates + historical accept rate high → threshold DOWN (max -15%)
 *   Direction 2: proposals rejected / degraded outcomes → threshold UP (max +15%)
 *   Inertia hurdle: ≥3 data points before any adjustment
 */
export function balanceThresholds(
  evidence: EvidenceBucket[],
  outcomes: OutcomeHistory,
): ThresholdAdjustment[] {
  const adjustments: ThresholdAdjustment[] = [];
  const signalTypes = new Set<SignalType>();

  // Gather all signal types from evidence + outcomes
  for (const bucket of evidence) signalTypes.add(bucket.signalType);
  for (const o of outcomes) signalTypes.add(o.signalType);

  for (const signalType of signalTypes) {
    const baseThreshold = DEFAULT_THRESHOLDS[signalType] ?? 3.0;
    const relevantOutcomes = outcomes.filter((o) => o.signalType === signalType);

    // Inertia: need at least INERTIA_THRESHOLD data points
    if (relevantOutcomes.length < INERTIA_THRESHOLD) {
      adjustments.push({
        signalType,
        oldThreshold: baseThreshold,
        newThreshold: baseThreshold,
        direction: "unchanged",
        reason: `insufficient data (${relevantOutcomes.length}/${INERTIA_THRESHOLD})`,
        confidence: 0,
      });
      continue;
    }

    const acceptCount = relevantOutcomes.filter((o) => o.accepted).length;
    const rejectCount = relevantOutcomes.length - acceptCount;
    const acceptRate = acceptCount / relevantOutcomes.length;

    // Check outcomes quality
    const degradedCount = relevantOutcomes.filter((o) => o.outcome === "degraded").length;
    const improvedCount = relevantOutcomes.filter((o) => o.outcome === "improved").length;

    let direction: ThresholdAdjustment["direction"] = "unchanged";
    let ratio = 0;
    let reason = "";

    if (rejectCount > acceptCount || degradedCount > improvedCount) {
      // Direction 2: raise threshold — too many rejections or degraded outcomes
      ratio = Math.min(MAX_ADJUSTMENT_RATIO, (rejectCount + degradedCount) / relevantOutcomes.length * MAX_ADJUSTMENT_RATIO);
      direction = "raised";
      reason = `${rejectCount} rejections, ${degradedCount} degraded → raise threshold`;
    } else if (acceptRate > 0.7 && improvedCount >= 2) {
      // Direction 1: lower threshold — high accept rate with improvements
      ratio = Math.min(MAX_ADJUSTMENT_RATIO, acceptRate * MAX_ADJUSTMENT_RATIO * 0.5);
      direction = "lowered";
      reason = `${(acceptRate * 100).toFixed(0)}% accept rate, ${improvedCount} improved → lower threshold`;
    }

    const newThreshold = direction === "raised"
      ? baseThreshold * (1 + ratio)
      : direction === "lowered"
        ? baseThreshold * (1 - ratio)
        : baseThreshold;

    const confidence = Math.min(1, relevantOutcomes.length / 10);

    adjustments.push({
      signalType,
      oldThreshold: baseThreshold,
      newThreshold: Math.round(newThreshold * 1000) / 1000,
      direction,
      reason,
      confidence,
    });
  }

  return adjustments;
}

// ============================================================================
// Wu-Wei Intervention Decision
// ============================================================================

/**
 * 莊子無為 intervention bias:
 *   effectiveScore = rawScore × (1 - wuWeiBias)
 *   effectiveThreshold = baseThreshold × thresholdMultiplier
 *   shouldAct = effectiveScore >= effectiveThreshold
 */
export function decideIntervention(
  rawScore: number,
  baseThreshold: number,
  config: WuWeiConfig,
): InterventionDecision {
  const effectiveScore = rawScore * (1 - config.wuWeiBias);
  const effectiveThreshold = baseThreshold * config.thresholdMultiplier;
  const shouldAct = effectiveScore >= effectiveThreshold;

  const analogies: Record<MaturityPhase, string> = {
    learning: "幼苗需要觀察，不急於修剪 (seedling needs watching, not pruning)",
    stable: "水到渠成，順勢而為 (water finds its channel naturally)",
    mature: "老樹知風向，輕觸即應 (old tree knows the wind, responds to light touch)",
  };

  return {
    shouldAct,
    effectiveScore,
    effectiveThreshold,
    analogy: analogies[config.maturityPhase],
  };
}

// ============================================================================
// Zhixing Unity (知行合一)
// ============================================================================

/**
 * Scan all evidence buckets for knowledge-action separation.
 * Evidence that has accumulated without action creates urgency.
 */
export function checkZhixingUnity(
  evidence: EvidenceBucket[],
  policy: StaleEvidencePolicy,
): ZhixingReport {
  const separations: ZhixingEntry[] = [];

  for (const bucket of evidence) {
    if (bucket.score < 0.1) continue; // Skip near-zero buckets

    const { urgency, decayedScore, shouldForceDecision } = computeActionUrgency(
      bucket.score,
      bucket.staleCycles,
      policy,
    );

    let recommendation: ZhixingEntry["recommendation"];
    if (shouldForceDecision || bucket.staleCycles > policy.gracePeriodCycles * 2) {
      recommendation = "act-now";
    } else if (decayedScore < policy.archiveThreshold) {
      recommendation = "decay-and-archive";
    } else {
      recommendation = "within-grace";
    }

    separations.push({
      signalType: bucket.signalType,
      evidenceScore: bucket.score,
      cyclesStale: bucket.staleCycles,
      urgency,
      recommendation,
    });
  }

  // Unity score: 1 = perfect (no separations), 0 = completely separated
  const actNowCount = separations.filter((s) => s.recommendation === "act-now").length;
  const total = separations.length;
  const unityScore = total > 0 ? Math.max(0, 1 - actNowCount / total) : 1;

  return { separations, unityScore };
}

// ============================================================================
// Public API — Full Threshold Evaluation
// ============================================================================

/**
 * Run full threshold evaluation: Goodman balance + persist.
 */
export async function evaluateThresholds(
  atomStorePath: string,
  evidence: EvidenceBucket[],
  maturityPhase: MaturityPhase,
  log?: Logger,
): Promise<{
  store: ThresholdStore;
  adjustments: ThresholdAdjustment[];
  zhixing: ZhixingReport;
}> {
  const store = await loadThresholdStore(atomStorePath);

  // Goodman bidirectional adjustment
  const adjustments = balanceThresholds(evidence, store.outcomes);

  // Apply adjustments to stored thresholds
  for (const adj of adjustments) {
    if (adj.direction !== "unchanged") {
      store.thresholds[adj.signalType] = adj.newThreshold;
    }
  }

  // Append to adjustment history (capped)
  store.adjustments.push(...adjustments.filter((a) => a.direction !== "unchanged"));
  if (store.adjustments.length > MAX_ADJUSTMENTS_HISTORY) {
    store.adjustments = store.adjustments.slice(-MAX_ADJUSTMENTS_HISTORY);
  }

  store.lastUpdated = new Date().toISOString();
  await saveThresholdStore(atomStorePath, store);

  // Zhixing unity check
  const stalePolicy: StaleEvidencePolicy = {
    gracePeriodCycles: 3,
    decayRate: 0.2,
    archiveThreshold: 0.3,
  };
  const zhixing = checkZhixingUnity(evidence, stalePolicy);

  const changed = adjustments.filter((a) => a.direction !== "unchanged");
  log?.info(
    `thresholds evaluated: ${changed.length} adjusted, ` +
    `zhixing unity=${zhixing.unityScore.toFixed(2)} (${zhixing.separations.length} buckets)`,
  );

  return { store, adjustments, zhixing };
}

/**
 * Format threshold summary for /iterate status display.
 */
export async function formatThresholdSummary(atomStorePath: string): Promise<string> {
  const store = await loadThresholdStore(atomStorePath);
  const lines: string[] = [];

  // Show current effective thresholds
  const signalTypes: SignalType[] = ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "S9"];
  for (const st of signalTypes) {
    const effective = getThreshold(store, st);
    const def = DEFAULT_THRESHOLDS[st];
    const label = SIGNAL_LABELS[st] ?? st;
    const diff = effective !== def ? ` (default: ${def})` : "";
    lines.push(`  ${st} ${label}: ${effective.toFixed(2)}${diff}`);
  }

  const recentAdj = store.adjustments.slice(-3);
  if (recentAdj.length > 0) {
    lines.push("");
    lines.push("Recent adjustments:");
    for (const adj of recentAdj) {
      lines.push(`  ${adj.signalType}: ${adj.oldThreshold} → ${adj.newThreshold} (${adj.direction}: ${adj.reason})`);
    }
  }

  return `Thresholds:\n${lines.join("\n")}`;
}
