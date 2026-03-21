/**
 * M7: ttl-balance.ts — Dissipative Structure Flow Balance + Observation Overhead
 *
 * Tracks injection/decay rates and predicts steady-state atom count.
 * Monitors signal collection overhead to stay within budget.
 */

import type {
  FlowMetrics,
  BalanceResult,
  CollectionTiming,
  OverheadReport,
} from "./types.js";

// ============================================================================
// Flow Balance
// ============================================================================

const DEFAULT_STEADY_BAND = 0.15;

/**
 * Dissipative structure steady-state equation.
 *
 * N_steady = injectionRate × weightedTTL_sessions
 * weightedTTL = (N_臨/N×30 + N_觀/N×60 + N_固/N×90) × sessionsPerDay
 * imbalanceRatio = |netFlow| / max(injectionRate, decayRate)
 * steady band: imbalanceRatio ≤ 0.15
 */
export function computeFlowBalance(
  metrics: FlowMetrics,
  options?: { steadyBand?: number },
): BalanceResult {
  const steadyBand = options?.steadyBand ?? DEFAULT_STEADY_BAND;
  const { recentCaptures, recentDecays, currentStore, sessionsPerDay } = metrics;

  const injectionRate = recentCaptures.length > 0
    ? recentCaptures.reduce((a, b) => a + b, 0) / recentCaptures.length
    : 0;
  const decayRate = recentDecays.length > 0
    ? recentDecays.reduce((a, b) => a + b, 0) / recentDecays.length
    : 0;

  const netFlow = injectionRate - decayRate;
  const maxRate = Math.max(injectionRate, decayRate);
  const imbalanceRatio = maxRate > 0 ? Math.abs(netFlow) / maxRate : 0;

  const currentSize = currentStore.fixed + currentStore.observed + currentStore.temporary;
  const n = currentSize || 1;

  // Weighted TTL in sessions
  const weightedTTLDays =
    (currentStore.temporary / n) * 30 +
    (currentStore.observed / n) * 60 +
    (currentStore.fixed / n) * 90;
  const weightedTTLSessions = weightedTTLDays * (sessionsPerDay || 1);

  const predictedSteadySize = injectionRate * weightedTTLSessions;

  // Determine state
  let state: BalanceResult["state"];
  if (imbalanceRatio <= steadyBand) {
    state = "steady";
  } else if (netFlow > 0) {
    state = predictedSteadySize > currentSize * 3 ? "explosion-risk" : "growing";
  } else {
    state = currentSize < 5 && decayRate > injectionRate ? "heat-death-risk" : "atrophying";
  }

  // Estimate sessions to critical
  let sessionsToCritical: number | null = null;
  if (state === "explosion-risk" && netFlow > 0) {
    sessionsToCritical = Math.ceil((currentSize * 3 - currentSize) / netFlow);
  } else if (state === "heat-death-risk" && netFlow < 0) {
    sessionsToCritical = Math.ceil(currentSize / Math.abs(netFlow));
  }

  // Generate signal
  let action: BalanceResult["signal"]["action"] = "none";
  let reason = `imbalance=${imbalanceRatio.toFixed(3)}, state=${state}`;
  let urgency: BalanceResult["signal"]["urgency"] = "low";

  if (state === "explosion-risk") {
    action = "reduce-capture";
    reason = `Atom count growing too fast (net +${netFlow.toFixed(1)}/session, predicted ${predictedSteadySize.toFixed(0)} steady)`;
    urgency = "high";
  } else if (state === "heat-death-risk") {
    action = "boost-capture";
    reason = `Atom count shrinking dangerously (net ${netFlow.toFixed(1)}/session, ${currentSize} remaining)`;
    urgency = "high";
  } else if (state === "growing") {
    action = "reduce-capture";
    reason = `Moderate growth (net +${netFlow.toFixed(1)}/session)`;
    urgency = "medium";
  } else if (state === "atrophying") {
    action = "reduce-decay";
    reason = `Moderate atrophy (net ${netFlow.toFixed(1)}/session)`;
    urgency = "medium";
  }

  return {
    injectionRate,
    decayRate,
    netFlow,
    imbalanceRatio,
    state,
    predictedSteadySize,
    currentSize,
    sessionsToCritical,
    signal: { action, reason, urgency },
  };
}

// ============================================================================
// Observation Overhead
// ============================================================================

const DEFAULT_BUDGET_MS = 5000;
const TARGET_PERCENT = 3;

/**
 * Measure and evaluate signal collection overhead.
 *
 * budget cap: 5000ms (default)
 * overhead target: < 3% of session time
 * perturbation = (stateTouchTime/total) × (total/budget), clamped [0,1]
 * adaptive skip: over budget → recommend skipping lowest-priority signals
 */
export function measureObservationOverhead(
  timing: CollectionTiming,
  budgetMs?: number,
): OverheadReport {
  const budget = budgetMs ?? DEFAULT_BUDGET_MS;
  const { sessionDurationMs, signals } = timing;

  const totalMs = signals.reduce((a, s) => a + s.durationMs, 0);
  const overheadPct = sessionDurationMs > 0 ? (totalMs / sessionDurationMs) * 100 : 0;

  const perSignal = signals.map((s) => ({
    name: s.signalName,
    durationMs: s.durationMs,
    percentOfSession: sessionDurationMs > 0 ? (s.durationMs / sessionDurationMs) * 100 : 0,
  }));

  // Perturbation: how much state-touching signals contribute relative to budget
  const stateTouchMs = signals
    .filter((s) => s.touchedAtomStore)
    .reduce((a, s) => a + s.durationMs, 0);
  const perturbation = Math.min(1, totalMs > 0 ? (stateTouchMs / totalMs) * (totalMs / budget) : 0);

  // Skip recommendations: if over budget, recommend dropping lowest-priority signals
  const skipRecommendation: string[] = [];
  if (totalMs > budget) {
    const sorted = [...signals].sort((a, b) => b.priority - a.priority); // highest priority number = lowest priority
    let remaining = totalMs;
    for (const s of sorted) {
      if (remaining <= budget) break;
      skipRecommendation.push(s.signalName);
      remaining -= s.durationMs;
    }
  }

  // Signal
  let action: OverheadReport["signal"]["action"] = "none";
  let reason = `${totalMs}ms / ${budget}ms budget (${overheadPct.toFixed(1)}% of session)`;

  if (totalMs > budget * 2) {
    action = "redesign-signals";
    reason = `Collection time ${totalMs}ms exceeds 2× budget (${budget}ms)`;
  } else if (totalMs > budget) {
    action = "skip-low-priority";
    reason = `Collection time ${totalMs}ms exceeds budget (${budget}ms), recommend skipping: ${skipRecommendation.join(", ")}`;
  } else if (overheadPct > TARGET_PERCENT * 2) {
    action = "increase-budget";
    reason = `Overhead ${overheadPct.toFixed(1)}% exceeds ${TARGET_PERCENT * 2}% target`;
  }

  return {
    perSignal,
    totalCollectionMs: totalMs,
    overheadPercent: overheadPct,
    budgetCapMs: budget,
    withinBudget: totalMs <= budget,
    perturbationScore: perturbation,
    skipRecommendation,
    signal: { action, reason },
  };
}
