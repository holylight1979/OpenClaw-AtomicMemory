/**
 * ACT-R Base-Level Activation Scoring
 *
 * Implements the ACT-R memory activation equation: B_i = ln(Σ t_k^{-0.5})
 * where t_k is the time since the k-th access in seconds.
 *
 * Ported from workflow-guardian.py's compute_activation().
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, dirname } from "node:path";
import { createLogger } from "./logger.js";

const log = createLogger("actr");

// ============================================================================
// Types
// ============================================================================

/** Access log: maps atom name → array of Unix timestamps (ms). */
export type AccessLog = Record<string, number[]>;

/** Max timestamps to retain per atom. */
const MAX_TIMESTAMPS = 50;

/** Sentinel value for atoms with no access history. */
const NO_HISTORY_ACTIVATION = -10.0;

// ============================================================================
// In-memory cache + file path
// ============================================================================

let cachedLog: AccessLog | null = null;
let logFilePath: string | null = null;
let dirty = false;
let loadingPromise: Promise<AccessLog> | null = null;

function getLogPath(atomStorePath: string): string {
  return join(atomStorePath, "_actr", "access-log.json");
}

// ============================================================================
// Load / Save
// ============================================================================

async function loadLog(atomStorePath: string): Promise<AccessLog> {
  const path = getLogPath(atomStorePath);
  if (cachedLog && logFilePath === path) return cachedLog;

  // Serialize concurrent loads to prevent read-modify-write races
  if (loadingPromise && logFilePath === path) return loadingPromise;

  logFilePath = path;
  loadingPromise = (async () => {
    try {
      const raw = await readFile(path, "utf-8");
      cachedLog = JSON.parse(raw) as AccessLog;
    } catch {
      cachedLog = {};
    }
    dirty = false;
    loadingPromise = null;
    return cachedLog;
  })();

  return loadingPromise;
}

async function saveLog(atomStorePath: string): Promise<void> {
  if (!dirty || !cachedLog) return;
  const path = getLogPath(atomStorePath);
  try {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, JSON.stringify(cachedLog, null, 2), "utf-8");
    dirty = false;
  } catch (err) {
    log.error(`failed to save access log: ${err}`);
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Compute ACT-R base-level activation for an atom.
 * B_i = ln(Σ t_k^{-0.5}) where t_k = seconds since access k.
 *
 * Returns NO_HISTORY_ACTIVATION (-10.0) if no access history exists.
 */
export async function computeActivation(atomName: string, atomStorePath: string): Promise<number> {
  const accessLog = await loadLog(atomStorePath);
  const timestamps = accessLog[atomName];
  if (!timestamps || timestamps.length === 0) return NO_HISTORY_ACTIVATION;

  const now = Date.now();
  let total = 0;
  for (const ts of timestamps) {
    const elapsed = Math.max((now - ts) / 1000, 1.0); // seconds, min 1s
    total += elapsed ** -0.5;
  }

  return total > 0 ? Math.log(total) : NO_HISTORY_ACTIVATION;
}

/**
 * Record a single access for an atom. Keeps at most MAX_TIMESTAMPS entries.
 * Call flushAccessLog() after batch operations to persist.
 */
export async function recordAccess(atomName: string, atomStorePath: string): Promise<void> {
  const accessLog = await loadLog(atomStorePath);
  if (!accessLog[atomName]) accessLog[atomName] = [];
  accessLog[atomName].push(Date.now());
  // Trim to most recent MAX_TIMESTAMPS
  if (accessLog[atomName].length > MAX_TIMESTAMPS) {
    accessLog[atomName] = accessLog[atomName].slice(-MAX_TIMESTAMPS);
  }
  dirty = true;
}

/**
 * Record access for multiple atoms at once.
 * Persists to disk after all records are added.
 */
export async function recordBatchAccess(atomNames: string[], atomStorePath: string): Promise<void> {
  const accessLog = await loadLog(atomStorePath);
  const now = Date.now();
  for (const name of atomNames) {
    if (!accessLog[name]) accessLog[name] = [];
    accessLog[name].push(now);
    if (accessLog[name].length > MAX_TIMESTAMPS) {
      accessLog[name] = accessLog[name].slice(-MAX_TIMESTAMPS);
    }
  }
  dirty = true;
  await saveLog(atomStorePath);
}

/**
 * Flush any pending access log changes to disk.
 * Call this after recordAccess() calls when not using recordBatchAccess().
 */
export async function flushAccessLog(atomStorePath: string): Promise<void> {
  await saveLog(atomStorePath);
}
