/**
 * OETAV Phase A — Signal Collector
 *
 * Passive observation layer: collects 9 signal types from existing subsystems
 * at session_end. Does NOT make decisions — only records observations.
 */

import type {
  ObservedSignal,
  SignalType,
  DecayResult,
  OscillationReport,
  WisdomMetrics,
  SessionState,
  CollectionTiming,
  SignalTiming,
  TierDistribution,
  CategoryDistribution,
} from "./types.js";
import { computeAtomEntropy, computeOrderParameter } from "./entropy-signal.js";
import { measureObservationOverhead } from "./ttl-balance.js";
import type { Logger } from "./logger.js";

// ============================================================================
// Types
// ============================================================================

export type SignalCollectorParams = {
  sessionState: SessionState;
  decayResults: DecayResult[];
  oscillationReport: OscillationReport;
  wisdomMetrics: WisdomMetrics | null;
  atomStorePath: string;
  /** Pitfall count from self-iterate journal (S1). */
  recentPitfallCount?: number;
  /** Recall stats from this session (S3/S5). */
  recallStats?: { avgScore: number; emptyRate: number; totalQueries: number };
  /** Recent owner rejection count for similar proposals (S6). */
  recentRejectionCount?: number;
  /** AIDocs drift detected files count (S7). */
  aidocsDriftCount?: number;
  /** Permission conflict count this session (S8). */
  permissionConflictCount?: number;
  /** Tier/category distributions for entropy (S9). */
  tierDist?: TierDistribution[];
  catDist?: CategoryDistribution[];
  /** Entropy config overrides. */
  entropyConfig?: { rigidThreshold?: number; chaoticThreshold?: number; tierWeight?: number };
  orderConfig?: { rigidBound?: number; chaoticBound?: number };
};

export type CollectAllResult = {
  signals: ObservedSignal[];
  timing: CollectionTiming;
  overhead: ReturnType<typeof measureObservationOverhead>;
};

// ============================================================================
// Signal Collectors (S1-S9)
// ============================================================================

function now(): string {
  return new Date().toISOString();
}

/** S1: Pitfall Accumulation — self_apply failures. */
function collectS1(params: SignalCollectorParams): ObservedSignal | null {
  const count = params.recentPitfallCount ?? 0;
  if (count === 0) return null;
  return {
    type: "S1",
    timestamp: now(),
    severity: Math.min(1, count / 5),
    details: `${count} pitfalls recorded recently`,
  };
}

/** S2: Wisdom Blind Spot — intents with < 50% accuracy. */
function collectS2(params: SignalCollectorParams): ObservedSignal | null {
  const metrics = params.wisdomMetrics;
  if (!metrics || metrics.blindSpots.length === 0) return null;
  return {
    type: "S2",
    timestamp: now(),
    severity: Math.min(1, metrics.blindSpots.length / 3),
    details: `Blind spots: ${metrics.blindSpots.join(", ")}`,
    source: metrics.blindSpots,
  };
}

/** S3: Recall Degradation — high empty rate. */
function collectS3(params: SignalCollectorParams): ObservedSignal | null {
  const stats = params.recallStats;
  if (!stats || stats.totalQueries === 0) return null;
  if (stats.emptyRate < 0.3) return null; // Only signal if > 30% empty
  return {
    type: "S3",
    timestamp: now(),
    severity: Math.min(1, stats.emptyRate),
    details: `Recall empty rate ${(stats.emptyRate * 100).toFixed(0)}% (${stats.totalQueries} queries)`,
  };
}

/** S4: Oscillation — atoms modified across multiple sessions. */
function collectS4(params: SignalCollectorParams): ObservedSignal | null {
  const report = params.oscillationReport;
  if (!report.shouldPause || report.oscillatingAtoms.length === 0) return null;
  return {
    type: "S4",
    timestamp: now(),
    severity: Math.min(1, report.oscillatingAtoms.length / 3),
    details: report.reason,
    source: report.oscillatingAtoms,
  };
}

/** S5: Recall Quality Drop — average score trending low. */
function collectS5(params: SignalCollectorParams): ObservedSignal | null {
  const stats = params.recallStats;
  if (!stats || stats.totalQueries === 0) return null;
  if (stats.avgScore > 0.5) return null; // Only signal if below threshold
  return {
    type: "S5",
    timestamp: now(),
    severity: Math.min(1, 1 - stats.avgScore),
    details: `Recall avg score ${stats.avgScore.toFixed(3)} (${stats.totalQueries} queries)`,
  };
}

/** S6: Decision Flip — owner rejections of similar proposals. */
function collectS6(params: SignalCollectorParams): ObservedSignal | null {
  const count = params.recentRejectionCount ?? 0;
  if (count < 2) return null;
  return {
    type: "S6",
    timestamp: now(),
    severity: Math.min(1, count / 5),
    details: `${count} similar proposals rejected by owner`,
  };
}

/** S7: AIDocs Drift — docs out of sync with source code. */
function collectS7(params: SignalCollectorParams): ObservedSignal | null {
  const count = params.aidocsDriftCount ?? 0;
  if (count === 0) return null;
  return {
    type: "S7",
    timestamp: now(),
    severity: Math.min(1, count / 5),
    details: `${count} AIDocs files may be out of date`,
  };
}

/** S8: Permission Boundary — permission conflict patterns. */
function collectS8(params: SignalCollectorParams): ObservedSignal | null {
  const count = params.permissionConflictCount ?? 0;
  if (count === 0) return null;
  return {
    type: "S8",
    timestamp: now(),
    severity: Math.min(1, count / 3),
    details: `${count} permission conflicts this session`,
  };
}

/** S9: Knowledge Entropy — computed from tier/category distribution. */
function collectS9(params: SignalCollectorParams): ObservedSignal | null {
  const { tierDist, catDist } = params;
  if (!tierDist || !catDist || tierDist.length === 0) return null;

  const entropy = computeAtomEntropy(tierDist, catDist, params.entropyConfig);
  const order = computeOrderParameter(tierDist, params.orderConfig);

  // Severity: distance from healthy edge-of-chaos zone
  let severity = 0;
  if (entropy.interpretation === "rigid") {
    severity = Math.min(1, (0.3 - entropy.tierNormalized) / 0.3);
  } else if (entropy.interpretation === "chaotic") {
    severity = Math.min(1, (entropy.tierNormalized - 0.85) / 0.15);
  }
  // edge-of-chaos zone deviations from center
  if (order.zone !== "edge-of-chaos") {
    severity = Math.max(severity, 0.3);
  }

  return {
    type: "S9",
    timestamp: now(),
    severity,
    details: `${entropy.details}; OP=${order.orderParameter.toFixed(3)} (${order.zone})`,
    source: { entropy, order },
  };
}

// ============================================================================
// Main Collector
// ============================================================================

const COLLECTORS: Array<{
  type: SignalType;
  fn: (params: SignalCollectorParams) => ObservedSignal | null;
  priority: number;
  touchesAtomStore: boolean;
}> = [
  { type: "S1", fn: collectS1, priority: 2, touchesAtomStore: false },
  { type: "S2", fn: collectS2, priority: 3, touchesAtomStore: false },
  { type: "S3", fn: collectS3, priority: 2, touchesAtomStore: false },
  { type: "S4", fn: collectS4, priority: 1, touchesAtomStore: false },
  { type: "S5", fn: collectS5, priority: 3, touchesAtomStore: false },
  { type: "S6", fn: collectS6, priority: 4, touchesAtomStore: false },
  { type: "S7", fn: collectS7, priority: 4, touchesAtomStore: false },
  { type: "S8", fn: collectS8, priority: 4, touchesAtomStore: false },
  { type: "S9", fn: collectS9, priority: 2, touchesAtomStore: true },
];

/**
 * Collect all signals for this session. Returns observed signals + overhead report.
 * Signals that produce null (no observation) are silently skipped.
 */
export function collectAll(params: SignalCollectorParams, log?: Logger): CollectAllResult {
  const sessionDurationMs = params.sessionState.lastActivity - params.sessionState.startTime;
  const signals: ObservedSignal[] = [];
  const timings: SignalTiming[] = [];

  for (const collector of COLLECTORS) {
    const start = Date.now();
    try {
      const signal = collector.fn(params);
      const elapsed = Date.now() - start;
      timings.push({
        signalName: collector.type,
        durationMs: elapsed,
        touchedAtomStore: collector.touchesAtomStore,
        priority: collector.priority,
      });
      if (signal) signals.push(signal);
    } catch (err) {
      const elapsed = Date.now() - start;
      timings.push({
        signalName: collector.type,
        durationMs: elapsed,
        touchedAtomStore: collector.touchesAtomStore,
        priority: collector.priority,
      });
      log?.warn(`signal ${collector.type} failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const timing: CollectionTiming = { sessionDurationMs, signals: timings };
  const overhead = measureObservationOverhead(timing);

  return { signals, timing, overhead };
}
