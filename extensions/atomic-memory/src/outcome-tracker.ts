/**
 * OETAV Phase C — Outcome Tracker
 *
 * Tracks execution results by comparing baseline vs current metrics.
 * Writes outcome verdicts back to ThresholdStore for Goodman adjustment.
 *
 * Flow:
 *   1. snapshotMetrics() — capture current state
 *   2. (wait N sessions)
 *   3. verifyOutcome() — compare baseline vs current
 *   4. recordOutcome() — persist verdict + feed back to thresholds
 */

import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";
import type {
  MetricsSnapshot,
  OutcomeResult,
  OutcomeVerdict,
  ExecutedProposalRecord,
  IterationProposal,
  ThresholdStore,
  AtomCategory,
} from "./types.js";
import { ATOM_CATEGORIES, CONFIDENCE_TIERS } from "./types.js";
import type { AtomStore } from "./atom-store.js";
import { loadThresholdStore, saveThresholdStore } from "./threshold-balancer.js";
import type { Logger } from "./logger.js";

// ============================================================================
// Constants
// ============================================================================

const ITERATION_DIR = "_iteration";
const PROPOSALS_DIR = "proposals";
const EXECUTED_DIR = "executed";
const IMPROVEMENT_THRESHOLD = 0.10; // ±10%

/** Metrics relevant to each signal type for outcome verification. */
const SIGNAL_METRIC_MAP: Record<string, string[]> = {
  S1: ["pitfallCount"],
  S2: ["wisdomBlindSpots"],
  S3: ["staleAtomRate", "totalAtoms"],
  S4: ["oscillatingCount"],
  S5: ["recallAvgScore", "recallEmptyRate"],
  S6: ["correctionRate"],
  S7: ["healthScore"],
  S8: ["healthScore"],
  S9: ["tierEntropy", "orderParameter"],
};

// ============================================================================
// Metrics Snapshot
// ============================================================================

/**
 * Take a metrics snapshot from the current atom store state.
 * Reads atom counts, tier distribution, and category distribution.
 */
export async function snapshotMetrics(
  atomStore: AtomStore,
  sessionKey: string,
  extraMetrics?: Partial<MetricsSnapshot>,
): Promise<MetricsSnapshot> {
  const atoms = await atomStore.list();
  const now = new Date().toISOString();

  // Tier counts
  const tierCounts = { fixed: 0, observed: 0, temporary: 0 };
  for (const a of atoms) {
    if (a.confidence === "[固]") tierCounts.fixed++;
    else if (a.confidence === "[觀]") tierCounts.observed++;
    else if (a.confidence === "[臨]") tierCounts.temporary++;
  }

  // Category counts
  const categoryCounts: Partial<Record<AtomCategory, number>> = {};
  for (const a of atoms) {
    categoryCounts[a.category] = (categoryCounts[a.category] ?? 0) + 1;
  }

  // Stale atom rate
  const total = atoms.length;
  const nowMs = Date.now();
  const staleCount = atoms.filter((a) => {
    const days = (nowMs - new Date(a.lastUsed).getTime()) / (1000 * 60 * 60 * 24);
    return (a.confidence === "[臨]" && days > 30) || (a.confidence === "[觀]" && days > 60);
  }).length;

  const snapshot: MetricsSnapshot = {
    sessionKey,
    timestamp: now,
    totalAtoms: total,
    tierCounts,
    categoryCounts,
    staleAtomRate: total > 0 ? staleCount / total : 0,
    ...extraMetrics,
  };

  return snapshot;
}

// ============================================================================
// Outcome Verification
// ============================================================================

/**
 * Compare baseline vs current metrics for a proposal's relevant metrics.
 *
 * Verdict:
 *   improved: any relevant metric improved ≥10% AND none degraded ≥10%
 *   degraded: any relevant metric degraded ≥10%
 *   neutral: otherwise
 */
export function verifyOutcome(
  proposal: IterationProposal,
  baseline: MetricsSnapshot,
  current: MetricsSnapshot,
  sessionsElapsed: number,
): OutcomeResult {
  const relevantMetrics = SIGNAL_METRIC_MAP[proposal.signalType] ?? ["healthScore"];
  const drivers: OutcomeResult["drivers"] = [];

  for (const metric of relevantMetrics) {
    const baseVal = getMetricValue(baseline, metric);
    const curVal = getMetricValue(current, metric);
    if (baseVal === undefined || curVal === undefined) continue;

    // Avoid division by zero
    const changePercent = baseVal !== 0
      ? (curVal - baseVal) / Math.abs(baseVal)
      : curVal > 0 ? 1 : curVal < 0 ? -1 : 0;

    drivers.push({
      metric,
      baselineValue: baseVal,
      currentValue: curVal,
      changePercent,
    });
  }

  // Determine verdict
  let verdict: OutcomeVerdict = "neutral";

  // For "lower is better" metrics (most of them), negative change = improvement
  const lowerIsBetter = new Set([
    "pitfallCount", "wisdomBlindSpots", "staleAtomRate",
    "oscillatingCount", "recallEmptyRate", "correctionRate",
  ]);
  const higherIsBetter = new Set(["recallAvgScore", "healthScore"]);

  let anyImproved = false;
  let anyDegraded = false;

  for (const d of drivers) {
    const isLower = lowerIsBetter.has(d.metric);
    const isHigher = higherIsBetter.has(d.metric);

    if (isLower) {
      if (d.changePercent <= -IMPROVEMENT_THRESHOLD) anyImproved = true;
      if (d.changePercent >= IMPROVEMENT_THRESHOLD) anyDegraded = true;
    } else if (isHigher) {
      if (d.changePercent >= IMPROVEMENT_THRESHOLD) anyImproved = true;
      if (d.changePercent <= -IMPROVEMENT_THRESHOLD) anyDegraded = true;
    }
    // For neutral metrics (tierEntropy, orderParameter), direction depends on context
    // — skip them for simple verdict
  }

  if (anyDegraded) verdict = "degraded";
  else if (anyImproved) verdict = "improved";

  return {
    proposalId: proposal.id,
    verdict,
    drivers,
    verifiedAt: new Date().toISOString(),
    sessionsElapsed,
  };
}

function getMetricValue(snapshot: MetricsSnapshot, metric: string): number | undefined {
  const val = (snapshot as Record<string, unknown>)[metric];
  if (val === undefined || val === null) return undefined;
  const num = Number(val);
  return isNaN(num) ? undefined : num;
}

// ============================================================================
// Outcome Recording
// ============================================================================

/**
 * Record outcome for an executed proposal + feed back to ThresholdStore.
 */
export async function recordOutcome(
  atomStorePath: string,
  record: ExecutedProposalRecord,
  outcome: OutcomeResult,
  log?: Logger,
): Promise<void> {
  // Update executed record with outcome
  record.outcome = outcome;
  record.proposal.status = "verified";

  const dir = join(atomStorePath, ITERATION_DIR, PROPOSALS_DIR, EXECUTED_DIR);
  await mkdir(dir, { recursive: true });
  await writeFile(
    join(dir, `${record.proposal.id}.json`),
    JSON.stringify(record, null, 2),
    "utf-8",
  );

  // Feed outcome to ThresholdStore for Goodman adjustment
  const store = await loadThresholdStore(atomStorePath);
  store.outcomes.push({
    signalType: record.proposal.signalType,
    date: outcome.verifiedAt,
    accepted: true, // It was executed (auto or approved)
    outcome: outcome.verdict,
  });

  // Cap outcome history
  if (store.outcomes.length > 100) {
    store.outcomes = store.outcomes.slice(-100);
  }

  store.lastUpdated = new Date().toISOString();
  await saveThresholdStore(atomStorePath, store);

  log?.info(
    `outcome recorded: ${record.proposal.id} → ${outcome.verdict} ` +
    `(${outcome.drivers.map((d) => `${d.metric}: ${(d.changePercent * 100).toFixed(1)}%`).join(", ")})`,
  );
}

// ============================================================================
// Session Tick — Increment counters + trigger verification
// ============================================================================

/**
 * Called each session_end: increment session counters on executed records
 * and verify outcomes for records that have waited long enough.
 *
 * Returns records that were just verified.
 */
export async function tickAndVerify(
  atomStorePath: string,
  atomStore: AtomStore,
  sessionKey: string,
  extraMetrics?: Partial<MetricsSnapshot>,
  log?: Logger,
): Promise<OutcomeResult[]> {
  const dir = join(atomStorePath, ITERATION_DIR, PROPOSALS_DIR, EXECUTED_DIR);
  let files: string[];
  try {
    files = await readdir(dir);
  } catch {
    return [];
  }

  const results: OutcomeResult[] = [];

  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    let record: ExecutedProposalRecord;
    try {
      const raw = await readFile(join(dir, file), "utf-8");
      record = JSON.parse(raw) as ExecutedProposalRecord;
    } catch { continue; }

    // Skip already verified or non-executed
    if (record.outcome) continue;
    if (record.executionResult.action !== "executed") continue;

    // Increment session counter
    record.sessionsSinceExecution++;

    // Check if ready for verification
    if (record.sessionsSinceExecution >= record.verifyAfterSessions) {
      const baseline = record.executionResult.baselineSnapshot ?? record.proposal.baselineMetrics;
      if (baseline) {
        const current = await snapshotMetrics(atomStore, sessionKey, extraMetrics);
        const outcome = verifyOutcome(
          record.proposal,
          baseline,
          current,
          record.sessionsSinceExecution,
        );
        await recordOutcome(atomStorePath, record, outcome, log);
        results.push(outcome);
        continue; // recordOutcome already saved
      }
    }

    // Save updated counter
    await writeFile(join(dir, file), JSON.stringify(record, null, 2), "utf-8");
  }

  return results;
}
