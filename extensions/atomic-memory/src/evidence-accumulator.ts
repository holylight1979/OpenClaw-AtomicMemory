/**
 * OETAV Phase A — Evidence Accumulator
 *
 * Accumulates observed signals into evidence buckets across sessions.
 * Implements per-session decay and 知行合一 (action urgency) tracking.
 * Persists to {atomStorePath}/_iteration/evidence.json.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import type {
  ObservedSignal,
  SignalType,
  EvidenceBucket,
  EvidenceStore,
  StaleEvidencePolicy,
  ActionUrgencyResult,
} from "./types.js";
import { SIGNAL_LABELS } from "./types.js";
import type { Logger } from "./logger.js";

// ============================================================================
// Constants
// ============================================================================

const EVIDENCE_FILE = "evidence.json";
const ITERATION_DIR = "_iteration";
const MAX_HISTORY = 50;
const DEFAULT_DECAY_RATE = 0.95;

// ============================================================================
// Persistence
// ============================================================================

function evidencePath(atomStorePath: string): string {
  return join(atomStorePath, ITERATION_DIR, EVIDENCE_FILE);
}

async function loadStore(atomStorePath: string): Promise<EvidenceStore> {
  try {
    const raw = await readFile(evidencePath(atomStorePath), "utf-8");
    return JSON.parse(raw) as EvidenceStore;
  } catch {
    return { buckets: [], lastDecaySession: "" };
  }
}

async function saveStore(atomStorePath: string, store: EvidenceStore): Promise<void> {
  const filePath = evidencePath(atomStorePath);
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(store, null, 2), "utf-8");
}

// ============================================================================
// Bucket helpers
// ============================================================================

function findOrCreateBucket(store: EvidenceStore, signalType: SignalType): EvidenceBucket {
  let bucket = store.buckets.find((b) => b.signalType === signalType);
  if (!bucket) {
    bucket = {
      signalType,
      score: 0,
      lastUpdated: new Date().toISOString(),
      sessionCount: 0,
      history: [],
      staleCycles: 0,
    };
    store.buckets.push(bucket);
  }
  return bucket;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Update evidence buckets with new signals from this session.
 * Each signal increments its bucket's score by its severity (0-1).
 * Buckets without new evidence get staleCycles incremented.
 */
export async function updateEvidence(
  atomStorePath: string,
  signals: ObservedSignal[],
  log?: Logger,
): Promise<EvidenceStore> {
  const store = await loadStore(atomStorePath);
  const now = new Date().toISOString();
  const updatedTypes = new Set<SignalType>();

  for (const signal of signals) {
    const bucket = findOrCreateBucket(store, signal.type);
    bucket.score += signal.severity;
    bucket.sessionCount += 1;
    bucket.lastUpdated = now;
    bucket.staleCycles = 0; // Reset stale counter on new evidence

    // Append to history (capped)
    bucket.history.push({
      timestamp: signal.timestamp,
      severity: signal.severity,
      details: signal.details,
    });
    if (bucket.history.length > MAX_HISTORY) {
      bucket.history = bucket.history.slice(-MAX_HISTORY);
    }

    updatedTypes.add(signal.type);
  }

  // Increment staleCycles for buckets that didn't get new evidence
  for (const bucket of store.buckets) {
    if (!updatedTypes.has(bucket.signalType)) {
      bucket.staleCycles += 1;
    }
  }

  await saveStore(atomStorePath, store);
  log?.info(
    `evidence updated: ${signals.length} signals → ${updatedTypes.size} buckets ` +
    `(${Array.from(updatedTypes).join(", ")})`,
  );
  return store;
}

/**
 * Decay all evidence buckets. Call once per session.
 * score *= decayRate (default 0.95)
 */
export async function decayEvidence(
  atomStorePath: string,
  sessionKey: string,
  decayRate?: number,
  log?: Logger,
): Promise<EvidenceStore> {
  const rate = decayRate ?? DEFAULT_DECAY_RATE;
  const store = await loadStore(atomStorePath);

  for (const bucket of store.buckets) {
    bucket.score *= rate;
    // Clamp very small scores to 0
    if (bucket.score < 0.001) bucket.score = 0;
  }

  store.lastDecaySession = sessionKey;
  await saveStore(atomStorePath, store);
  log?.info(`evidence decayed (rate=${rate}): ${store.buckets.length} buckets`);
  return store;
}

/**
 * 王陽明知行合一: compute action urgency for a stale evidence bucket.
 *
 * urgency = score × (1 + cycles / gracePeriod)
 * decayedScore = score × (1 - decayRate)^(cycles - gracePeriod)  [if cycles > grace]
 * shouldForceDecision: urgency > 2× originalScore
 */
export function computeActionUrgency(
  evidenceScore: number,
  cyclesSinceEvidence: number,
  policy: StaleEvidencePolicy,
): ActionUrgencyResult {
  const { gracePeriodCycles, decayRate, archiveThreshold } = policy;

  const urgency = evidenceScore * (1 + cyclesSinceEvidence / gracePeriodCycles);

  let decayedScore = evidenceScore;
  if (cyclesSinceEvidence > gracePeriodCycles) {
    const excessCycles = cyclesSinceEvidence - gracePeriodCycles;
    decayedScore = evidenceScore * Math.pow(1 - decayRate, excessCycles);
  }

  const shouldForceDecision = urgency > 2 * evidenceScore;

  return { urgency, decayedScore, shouldForceDecision };
}

/** Get all evidence buckets. */
export async function getAllEvidence(atomStorePath: string): Promise<EvidenceBucket[]> {
  const store = await loadStore(atomStorePath);
  return store.buckets;
}

/** Get evidence bucket for a specific signal type. */
export async function getEvidenceByType(
  atomStorePath: string,
  signalType: SignalType,
): Promise<EvidenceBucket | undefined> {
  const store = await loadStore(atomStorePath);
  return store.buckets.find((b) => b.signalType === signalType);
}

/** Format evidence summary for /iterate status display. */
export async function formatEvidenceSummary(atomStorePath: string): Promise<string> {
  const buckets = await getAllEvidence(atomStorePath);
  if (buckets.length === 0) return "No evidence accumulated yet.";

  const lines = buckets
    .filter((b) => b.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((b) => {
      const label = SIGNAL_LABELS[b.signalType] ?? b.signalType;
      const stale = b.staleCycles > 0 ? ` (stale: ${b.staleCycles} cycles)` : "";
      return `  ${b.signalType} ${label}: score=${b.score.toFixed(3)}, sessions=${b.sessionCount}${stale}`;
    });

  return `Evidence Buckets (${buckets.length}):\n${lines.join("\n")}`;
}
