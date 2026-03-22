/**
 * OETAV Phase B — Convergence Health (Spec M1)
 *
 * Banach contraction mapping for evidence score convergence detection,
 * plus Lyapunov-inspired system health scoring.
 *
 * Persists to {atomStorePath}/_iteration/health-history.json.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import type {
  MetricsSnapshot,
  ConvergenceResult,
  ConvergenceOptions,
  HealthScoreEntry,
  HealthHistoryStore,
  StabilityResult,
} from "./types.js";
import type { Logger } from "./logger.js";

// ============================================================================
// Constants
// ============================================================================

const HEALTH_FILE = "health-history.json";
const ITERATION_DIR = "_iteration";
const MAX_HISTORY = 100;

/** Lyapunov weight config — higher weight = more impact on health score. */
const LYAPUNOV_WEIGHTS: Record<string, { weight: number; target: number; invert?: boolean; normalize?: number }> = {
  recallAvgScore:   { weight: 2.0, target: 0.7, invert: true },   // higher is better → invert
  recallEmptyRate:  { weight: 1.8, target: 0.1 },                 // lower is better
  wisdomBlindSpots: { weight: 1.5, target: 0 },                   // lower is better
  correctionRate:   { weight: 1.5, target: 0.05 },                // lower is better
  oscillatingCount: { weight: 1.3, target: 0, normalize: 10 },    // lower is better
  staleAtomRate:    { weight: 1.2, target: 0.1 },                 // lower is better
  pitfallCount:     { weight: 1.0, target: 0, normalize: 20 },    // lower is better
};

const DEFAULT_CONVERGENCE: ConvergenceOptions = {
  epsilon: 0.01,
  minWindow: 4,
  ratioThreshold: 0.95,
};

// ============================================================================
// Persistence
// ============================================================================

function healthPath(atomStorePath: string): string {
  return join(atomStorePath, ITERATION_DIR, HEALTH_FILE);
}

async function loadHealthHistory(atomStorePath: string): Promise<HealthHistoryStore> {
  try {
    const raw = await readFile(healthPath(atomStorePath), "utf-8");
    return JSON.parse(raw) as HealthHistoryStore;
  } catch {
    return { entries: [], lastUpdated: "" };
  }
}

async function saveHealthHistory(atomStorePath: string, store: HealthHistoryStore): Promise<void> {
  const filePath = healthPath(atomStorePath);
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(store, null, 2), "utf-8");
}

// ============================================================================
// Convergence (Banach Contraction)
// ============================================================================

function median(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function variance(arr: number[]): number {
  if (arr.length < 2) return 0;
  const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
  return arr.reduce((s, v) => s + (v - mean) ** 2, 0) / (arr.length - 1);
}

/**
 * Determine if a time series of health scores is converging to a fixed point.
 *
 * Algorithm:
 * 1. Compute successive differences d_i = |h[i] - h[i-1]|
 * 2. Compute diff ratios r_i = d_{i+1} / d_i
 * 3. Take median of ratios
 * 4. median(r) < ratioThreshold && low variance → converging
 * 5. Estimate fixed point: x* ≈ x_n + d_n / (1 - r)
 */
export function isConverging(
  history: number[],
  options?: Partial<ConvergenceOptions>,
): ConvergenceResult {
  const opts = { ...DEFAULT_CONVERGENCE, ...options };

  // Not enough data
  if (history.length < opts.minWindow) {
    return {
      converging: false,
      rate: 1,
      estimatedFixedPoint: history[history.length - 1] ?? 0,
      confidence: 0,
      remainingIterations: Infinity,
    };
  }

  // Successive differences
  const diffs: number[] = [];
  for (let i = 1; i < history.length; i++) {
    diffs.push(Math.abs(history[i] - history[i - 1]));
  }

  // Diff ratios (skip zeros)
  const ratios: number[] = [];
  for (let i = 1; i < diffs.length; i++) {
    if (diffs[i - 1] > opts.epsilon * 0.1) {
      ratios.push(diffs[i] / diffs[i - 1]);
    }
  }

  if (ratios.length === 0) {
    // All diffs near zero — already converged
    return {
      converging: true,
      rate: 0,
      estimatedFixedPoint: history[history.length - 1],
      confidence: 1,
      remainingIterations: 0,
    };
  }

  const rate = median(ratios);
  const ratioVar = variance(ratios);
  const converging = rate < opts.ratioThreshold;

  // Confidence: lower variance in ratios = more consistent contraction
  const confidence = converging ? Math.max(0, Math.min(1, 1 - Math.sqrt(ratioVar))) : 0;

  // Estimate fixed point via geometric series: x* ≈ x_n + d_n / (1 - r)
  const lastVal = history[history.length - 1];
  const lastDiff = diffs[diffs.length - 1];
  const estimatedFixedPoint = rate < 1 ? lastVal + lastDiff / (1 - rate) : lastVal;

  // Remaining iterations: log(epsilon / d_n) / log(r)
  let remainingIterations = Infinity;
  if (converging && lastDiff > opts.epsilon && rate > 0 && rate < 1) {
    remainingIterations = Math.ceil(Math.log(opts.epsilon / lastDiff) / Math.log(rate));
  } else if (lastDiff <= opts.epsilon) {
    remainingIterations = 0;
  }

  return { converging, rate, estimatedFixedPoint, confidence, remainingIterations };
}

// ============================================================================
// Health Score (Lyapunov)
// ============================================================================

/**
 * Compute system health score from a metrics snapshot.
 *
 * Formula: V(x) = Σ w_i · (metric_i - target_i)²
 *          score = 100 · exp(-V)
 */
export function computeHealthScore(
  metrics: MetricsSnapshot,
): { score: number; rawV: number; components: Record<string, number> } {
  const components: Record<string, number> = {};
  let V = 0;

  for (const [key, cfg] of Object.entries(LYAPUNOV_WEIGHTS)) {
    let value = (metrics as Record<string, unknown>)[key];
    if (value === undefined || value === null) continue;
    let numVal = Number(value);
    if (isNaN(numVal)) continue;

    // Normalize if configured
    if (cfg.normalize) numVal = numVal / cfg.normalize;

    // Invert: for metrics where higher is better, invert the deviation
    let deviation: number;
    if (cfg.invert) {
      // Higher is better: deviation = (target - value) clamped to >= 0
      deviation = Math.max(0, cfg.target - numVal);
    } else {
      // Lower is better: deviation = (value - target) clamped to >= 0
      deviation = Math.max(0, numVal - cfg.target);
    }

    const contribution = cfg.weight * deviation * deviation;
    components[key] = contribution;
    V += contribution;
  }

  const score = 100 * Math.exp(-V);
  return { score, rawV: V, components };
}

// ============================================================================
// Stability (Discrete Lyapunov ΔV)
// ============================================================================

/**
 * Check health score stability using discrete Lyapunov ΔV analysis.
 */
export function checkHealthStability(
  history: HealthScoreEntry[],
  maxDegradations = 3,
  windowSize = 5,
): StabilityResult {
  if (history.length < 2) {
    return {
      stable: true,
      trend: "stable",
      deltaV: 0,
      avgDeltaV: 0,
      consecutiveDegradations: 0,
      alert: false,
    };
  }

  // Take the most recent windowSize entries
  const window = history.slice(-windowSize);

  // Compute deltas (score deltas — positive = improving)
  const deltas: number[] = [];
  for (let i = 1; i < window.length; i++) {
    deltas.push(window[i].score - window[i - 1].score);
  }

  const deltaV = deltas[deltas.length - 1] ?? 0;
  const avgDeltaV = deltas.length > 0
    ? deltas.reduce((s, d) => s + d, 0) / deltas.length
    : 0;

  // Count consecutive degradations from the end
  let consecutiveDegradations = 0;
  for (let i = deltas.length - 1; i >= 0; i--) {
    if (deltas[i] < -0.5) {
      consecutiveDegradations++;
    } else {
      break;
    }
  }

  // Detect oscillation: alternating sign changes
  let signChanges = 0;
  for (let i = 1; i < deltas.length; i++) {
    if ((deltas[i] > 0 && deltas[i - 1] < 0) || (deltas[i] < 0 && deltas[i - 1] > 0)) {
      signChanges++;
    }
  }
  const oscillating = deltas.length >= 3 && signChanges >= deltas.length - 1;

  let trend: StabilityResult["trend"];
  if (oscillating) {
    trend = "oscillating";
  } else if (avgDeltaV > 0.5) {
    trend = "improving";
  } else if (avgDeltaV < -0.5) {
    trend = "degrading";
  } else {
    trend = "stable";
  }

  const alert = consecutiveDegradations >= maxDegradations;
  const stable = trend === "stable" || trend === "improving";

  return { stable, trend, deltaV, avgDeltaV, consecutiveDegradations, alert };
}

// ============================================================================
// Public API — Persistence-Aware
// ============================================================================

/**
 * Record a health score entry and persist to history.
 */
export async function recordHealthScore(
  atomStorePath: string,
  metrics: MetricsSnapshot,
  sessionKey: string,
  log?: Logger,
): Promise<{ entry: HealthScoreEntry; stability: StabilityResult; convergence: ConvergenceResult }> {
  const { score, rawV, components } = computeHealthScore(metrics);
  const entry: HealthScoreEntry = {
    sessionKey,
    timestamp: Date.now(),
    score,
    rawV,
    components,
  };

  const store = await loadHealthHistory(atomStorePath);
  store.entries.push(entry);
  if (store.entries.length > MAX_HISTORY) {
    store.entries = store.entries.slice(-MAX_HISTORY);
  }
  store.lastUpdated = new Date().toISOString();
  await saveHealthHistory(atomStorePath, store);

  const scores = store.entries.map((e) => e.score);
  const stability = checkHealthStability(store.entries);
  const convergence = isConverging(scores);

  log?.info(
    `health: score=${score.toFixed(1)}, V=${rawV.toFixed(4)}, ` +
    `trend=${stability.trend}, converging=${convergence.converging} (r=${convergence.rate.toFixed(3)})`,
  );

  return { entry, stability, convergence };
}

/**
 * Get current health history for display.
 */
export async function getHealthHistory(atomStorePath: string): Promise<HealthHistoryStore> {
  return loadHealthHistory(atomStorePath);
}

/**
 * Format health summary for /iterate status display.
 */
export async function formatHealthSummary(atomStorePath: string): Promise<string> {
  const store = await loadHealthHistory(atomStorePath);
  if (store.entries.length === 0) return "No health data yet.";

  const latest = store.entries[store.entries.length - 1];
  const stability = checkHealthStability(store.entries);
  const scores = store.entries.map((e) => e.score);
  const convergence = isConverging(scores);

  const lines = [
    `Health Score: ${latest.score.toFixed(1)}/100 (V=${latest.rawV.toFixed(4)})`,
    `Trend: ${stability.trend}${stability.alert ? " ⚠ ALERT" : ""}`,
    `Convergence: ${convergence.converging ? "yes" : "no"} (ratio=${convergence.rate.toFixed(3)}, ` +
    `confidence=${convergence.confidence.toFixed(2)})`,
    convergence.converging
      ? `  → Fixed point ≈ ${convergence.estimatedFixedPoint.toFixed(1)}, ` +
        `~${convergence.remainingIterations === Infinity ? "∞" : convergence.remainingIterations} iterations`
      : "",
    `History: ${store.entries.length} entries`,
  ];

  return lines.filter(Boolean).join("\n");
}
