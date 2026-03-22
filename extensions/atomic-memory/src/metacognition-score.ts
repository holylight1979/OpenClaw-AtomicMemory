/**
 * Metacognition Score (M8) — 元認知綜合分數 + DSPy Effectiveness + Gödel Boundary
 *
 * computeMetacognitionScore: weighted metacognition components → score + level
 * computeEffectiveness: before/after metrics → composite score (anti-Goodhart)
 * classifyVerificationRequirement: Gödel boundary classification for proposals
 */

import type {
  MetacognitionInputs,
  MetacognitionResult,
  EffectivenessReport,
  GodelBoundary,
  MetricsSnapshot,
  ProposedAction,
  OutcomeResult,
} from "./types.js";
import { createLogger } from "./logger.js";

const log = createLogger("metacognition");

// ============================================================================
// Config types
// ============================================================================

export type EffectivenessConfig = {
  aggregation: "geometric" | "harmonic";
  gamingDetectionThreshold: number;
};

export const DEFAULT_EFFECTIVENESS_CONFIG: EffectivenessConfig = {
  aggregation: "geometric",
  gamingDetectionThreshold: 0.65,
};

// ============================================================================
// computeMetacognitionScore
// ============================================================================

/**
 * 元認知綜合分數。
 *
 * score = (0.30×monitoring + 0.25×calibration + 0.30×control - 0.15×blindSpotPenalty) / 0.85
 * maturity bonus: mature +0.05, stable +0.02
 * level: <0.3 uncalibrated, <0.5 developing, <0.7 calibrated, ≥0.7 metacognitive
 */
export function computeMetacognitionScore(inputs: MetacognitionInputs): MetacognitionResult {
  // First approach accuracy → weighted average
  let firstApproachRate = 0;
  let faTotal = 0;
  for (const counter of Object.values(inputs.firstApproachAccuracy)) {
    if (counter && counter.total > 0) {
      firstApproachRate += counter.correct;
      faTotal += counter.total;
    }
  }
  firstApproachRate = faTotal > 0 ? firstApproachRate / faTotal : 0.5;

  // Silence rate
  const silenceTotal = inputs.silenceAccuracy.heldBackOk + inputs.silenceAccuracy.heldBackMissed;
  const silenceRate = silenceTotal > 0 ? inputs.silenceAccuracy.heldBackOk / silenceTotal : 0.5;

  // Components
  const monitoring = 0.6 * firstApproachRate + 0.4 * inputs.recallHitRate;
  const calibration = 1.0 - inputs.correctionRate;
  const control = 0.5 * silenceRate + 0.5 * inputs.proposalSuccessRate;
  const blindSpotPenalty = Math.min(inputs.blindSpots.length * 0.1, 0.4);

  // Raw score
  let score = (0.30 * monitoring + 0.25 * calibration + 0.30 * control - 0.15 * blindSpotPenalty) / 0.85;

  // Maturity bonus
  if (inputs.maturityPhase === "mature") score += 0.05;
  else if (inputs.maturityPhase === "stable") score += 0.02;

  // Clamp
  score = Math.max(0, Math.min(1, score));

  // Confidence based on observation count
  const confidence = Math.min(1, inputs.totalObservations / 50);

  // Level classification
  const level: MetacognitionResult["level"] =
    score < 0.3 ? "uncalibrated" :
    score < 0.5 ? "developing" :
    score < 0.7 ? "calibrated" : "metacognitive";

  return {
    score,
    components: { monitoring, control, calibration, blindSpotPenalty },
    confidence,
    level,
  };
}

// ============================================================================
// computeEffectiveness
// ============================================================================

/** Sigmoid normalization centered at 0 — delta > 0 → > 0.5 */
function sigmoid(x: number, scale: number = 5): number {
  return 1 / (1 + Math.exp(-scale * x));
}

/** Geometric mean of positive values. Returns 0 if any value is 0. */
function geometricMean(values: number[]): number {
  if (values.length === 0) return 0;
  if (values.some((v) => v <= 0)) return 0;
  const logSum = values.reduce((s, v) => s + Math.log(v), 0);
  return Math.exp(logSum / values.length);
}

/** Harmonic mean of positive values. */
function harmonicMean(values: number[]): number {
  if (values.length === 0) return 0;
  if (values.some((v) => v <= 0)) return 0;
  const recipSum = values.reduce((s, v) => s + 1 / v, 0);
  return values.length / recipSum;
}

/**
 * DSPy-inspired 迭代效果度量。
 *
 * compositeScore = 0.6 × mean(normalizedDeltas) + 0.4 × outcomeScore
 * Anti-Goodhart: geometricMean (one 0 → all 0) + coherence check + gaming detection
 */
export function computeEffectiveness(
  before: MetricsSnapshot,
  after: MetricsSnapshot,
  outcomes: OutcomeResult[],
  config: EffectivenessConfig = DEFAULT_EFFECTIVENESS_CONFIG,
): EffectivenessReport {
  // Compute deltas (positive = improvement)
  const recallImprovement = (after.recallAvgScore ?? 0) - (before.recallAvgScore ?? 0);
  const correctionReduction = (before.correctionRate ?? 0) - (after.correctionRate ?? 0);
  const firstApproachImprovement = 0; // requires wisdom metrics — not in snapshot
  const silenceImprovement = 0; // same
  const blindSpotReduction = (before.wisdomBlindSpots ?? 0) - (after.wisdomBlindSpots ?? 0);

  const deltas = {
    recallImprovement,
    correctionReduction,
    firstApproachImprovement,
    silenceImprovement,
    blindSpotReduction,
  };

  // Normalize deltas via sigmoid
  const normalizedDeltas = Object.values(deltas).map((d) => sigmoid(d));

  // Aggregate
  const meanFn = config.aggregation === "geometric" ? geometricMean : harmonicMean;
  const aggregatedDelta = meanFn(normalizedDeltas);

  // Outcome quality
  const totalOutcomes = outcomes.length || 1;
  const successRate = outcomes.filter((o) => o.verdict === "improved").length / totalOutcomes;
  const revertRate = outcomes.filter((o) => o.verdict === "degraded").length / totalOutcomes;
  const userApprovalRate = successRate; // simplified: approval ≈ success

  const outcomeScore = successRate * 0.6 + (1 - revertRate) * 0.4;

  // Composite
  const compositeScore = 0.6 * aggregatedDelta + 0.4 * outcomeScore;

  // Health checks
  // Coherence: all deltas should roughly move in same direction
  const deltaValues = Object.values(deltas);
  const positive = deltaValues.filter((d) => d > 0).length;
  const negative = deltaValues.filter((d) => d < 0).length;
  const metricCoherence = deltaValues.length > 0
    ? Math.max(positive, negative) / deltaValues.length
    : 1;

  // Gaming detection: suspiciously perfect scores
  const suspectedGaming: string[] = [];
  if (compositeScore > config.gamingDetectionThreshold && metricCoherence < 0.5) {
    suspectedGaming.push("high-score-low-coherence");
  }
  if (normalizedDeltas.every((d) => d > 0.9)) {
    suspectedGaming.push("all-metrics-near-perfect");
  }

  // Assessment
  const assessment: EffectivenessReport["assessment"] =
    suspectedGaming.length > 0 ? "suspicious" :
    compositeScore > 0.55 ? "improving" :
    compositeScore > 0.45 ? "stable" : "degrading";

  return {
    compositeScore,
    deltas,
    outcomeQuality: { successRate, revertRate, userApprovalRate },
    healthChecks: { metricCoherence, suspectedGaming },
    assessment,
  };
}

// ============================================================================
// classifyVerificationRequirement
// ============================================================================

/** Action types that affect decision logic (Gödel 2nd). */
const DECISION_LOGIC_ACTIONS = new Set([
  "config_adjust", "rule_update", "code_fix",
]);

/** Action types that are self-referential (Löb). */
const SELF_REFERENTIAL_ACTIONS = new Set([
  "identity_change",
]);

/** Action types with cascade potential (Halting). */
const CASCADE_ACTIONS = new Set([
  "core_modify", "security_change",
]);

/** Action types that modify identity/rule/threshold (Alignment). */
const ALIGNMENT_ACTIONS = new Set([
  "identity_change", "rule_update", "config_adjust",
]);

/**
 * Gödel 邊界分類。
 *
 * Decision tree:
 *   affectsDecisionLogic → requires-external (Gödel 2nd)
 *   selfReferential → undecidable (Löb) → block
 *   cascadePotential → requires-external (Halting)
 *   modify identity/rule/threshold → requires-external (Alignment)
 *   else → self-verifiable
 */
export function classifyVerificationRequirement(action: ProposedAction): GodelBoundary {
  const { type } = action;

  if (SELF_REFERENTIAL_ACTIONS.has(type)) {
    return {
      classification: "undecidable",
      rationale: "self-reference",
      explanation: `Action "${type}" modifies the system's own identity — Löb's theorem prevents self-verification.`,
    };
  }

  if (DECISION_LOGIC_ACTIONS.has(type)) {
    return {
      classification: "requires-external",
      rationale: "consistency",
      explanation: `Action "${type}" affects decision logic — Gödel's 2nd incompleteness: system cannot verify its own consistency.`,
    };
  }

  if (CASCADE_ACTIONS.has(type)) {
    return {
      classification: "requires-external",
      rationale: "termination",
      explanation: `Action "${type}" has cascade potential — Halting problem: cannot predict termination of cascading effects.`,
    };
  }

  if (ALIGNMENT_ACTIONS.has(type)) {
    return {
      classification: "requires-external",
      rationale: "alignment",
      explanation: `Action "${type}" modifies rules/thresholds — alignment verification requires external observer.`,
    };
  }

  return {
    classification: "self-verifiable",
    rationale: "none",
    explanation: `Action "${type}" is locally verifiable — no self-reference or cascade risk.`,
  };
}

// ============================================================================
// formatMetacognitionSummary
// ============================================================================

export function formatMetacognitionSummary(
  result: MetacognitionResult,
  effectiveness?: EffectivenessReport,
): string {
  const lines: string[] = [
    `  Score: ${result.score.toFixed(3)} (${result.level}, confidence=${result.confidence.toFixed(2)})`,
    `  Components: monitoring=${result.components.monitoring.toFixed(2)}, ` +
      `calibration=${result.components.calibration.toFixed(2)}, ` +
      `control=${result.components.control.toFixed(2)}, ` +
      `blindSpotPenalty=${result.components.blindSpotPenalty.toFixed(2)}`,
  ];

  if (effectiveness) {
    lines.push(`  Effectiveness: ${effectiveness.compositeScore.toFixed(3)} (${effectiveness.assessment})`);
    if (effectiveness.healthChecks.suspectedGaming.length > 0) {
      lines.push(`  ⚠ Gaming detected: ${effectiveness.healthChecks.suspectedGaming.join(", ")}`);
    }
  }

  return lines.join("\n");
}
