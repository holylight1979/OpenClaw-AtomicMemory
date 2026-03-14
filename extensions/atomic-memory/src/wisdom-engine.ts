/**
 * Wisdom Engine — Situation Classifier + Reflection Metrics.
 *
 * Adapted from .claude V2.11 wisdom_engine.py for bot scenarios.
 * Two forces:
 *   1. Situation Classifier — rule-based approach advice (direct/confirm/plan)
 *   2. Reflection Metrics — track first-approach accuracy & silence accuracy
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import type {
  AccuracyCounter,
  IntentType,
  SessionState,
  SituationAdvice,
  SituationApproach,
  WisdomMetrics,
} from "./types.js";
import { createLogger } from "./logger.js";

const log = createLogger("wisdom");

// ============================================================================
// Situation Classifier
// ============================================================================

/** Regex to detect 2+ distinct noun-like entities (CJK names, capitalized words). */
const MULTI_ENTITY_RE =
  /(?:[\u4e00-\u9fff]{2,}[和跟與及][\u4e00-\u9fff]{2,})|(?:[A-Z][a-z]+\s+(?:and|&)\s+[A-Z][a-z]+)/;

/**
 * Classify the situation and recommend an approach for the agent.
 *
 * Rules adapted for bot scenarios (not coding):
 * - greeting/social → direct (no confirmation needed)
 * - memory-query → direct (just recall)
 * - command + long prompt → confirm (complex config request)
 * - task + multiple entities → plan (multi-target action)
 * - otherwise → direct
 */
export function classifySituation(
  prompt: string,
  sessionState: SessionState | undefined,
  intentResult: { intent: IntentType },
): SituationAdvice {
  const { intent } = intentResult;

  if (intent === "greeting" || intent === "social") {
    return { approach: "direct", reason: "social/greeting" };
  }

  if (intent === "memory-query") {
    return { approach: "direct", reason: "memory-query" };
  }

  if (intent === "command" && prompt.length > 200) {
    return {
      approach: "confirm",
      reason: "complex command",
      inject: "[情境:確認] 指令較複雜，建議先確認範圍",
    };
  }

  if (intent === "task" && MULTI_ENTITY_RE.test(prompt)) {
    return {
      approach: "plan",
      reason: "multi-entity task",
      inject: "[情境:規劃] 涉及多個對象，建議先列步驟",
    };
  }

  return { approach: "direct", reason: "default" };
}

// ============================================================================
// Reflection Metrics — Load / Save
// ============================================================================

function emptyMetrics(): WisdomMetrics {
  return {
    firstApproachAccuracy: {},
    silenceAccuracy: { heldBackOk: 0, heldBackMissed: 0 },
    blindSpots: [],
  };
}

/**
 * Load reflection metrics from disk.
 * Returns empty metrics if file doesn't exist or is corrupt.
 */
export async function loadReflectionMetrics(basePath: string): Promise<WisdomMetrics> {
  const filePath = join(basePath, "wisdom", "reflection_metrics.json");
  try {
    const raw = await readFile(filePath, "utf-8");
    const data = JSON.parse(raw) as Partial<WisdomMetrics>;
    // Merge with defaults to ensure all fields exist
    return {
      firstApproachAccuracy: data.firstApproachAccuracy ?? {},
      silenceAccuracy: {
        heldBackOk: data.silenceAccuracy?.heldBackOk ?? 0,
        heldBackMissed: data.silenceAccuracy?.heldBackMissed ?? 0,
      },
      blindSpots: data.blindSpots ?? [],
      lastReflection: data.lastReflection,
    };
  } catch {
    return emptyMetrics();
  }
}

/**
 * Save reflection metrics to disk (atomic write via tmp file).
 */
export async function saveReflectionMetrics(
  basePath: string,
  metrics: WisdomMetrics,
): Promise<void> {
  const dir = join(basePath, "wisdom");
  const filePath = join(dir, "reflection_metrics.json");
  const tmpPath = filePath + ".tmp";
  try {
    await mkdir(dir, { recursive: true });
    await writeFile(tmpPath, JSON.stringify(metrics, null, 2), "utf-8");
    // Atomic rename
    const { rename } = await import("node:fs/promises");
    await rename(tmpPath, filePath);
  } catch (err) {
    log.warn(`save error: ${err instanceof Error ? err.message : String(err)}`);
    // Clean up tmp if rename failed
    try { await import("node:fs/promises").then(fs => fs.unlink(tmpPath)); } catch { /* ignore */ }
  }
}

// ============================================================================
// Reflection — Update
// ============================================================================

/**
 * Update reflection metrics based on session state.
 *
 * - firstApproachAccuracy: if same intent appears 2+ times in session → miss
 * - silenceAccuracy: track direct-approach correctness
 * - blindSpots: intent categories with accuracy < 50%
 */
export function updateReflection(
  metrics: WisdomMetrics,
  sessionState: SessionState,
): WisdomMetrics {
  const updated = structuredClone(metrics);

  // ── First Approach Accuracy ──
  // For each intent that appeared in this session, check if it was a "first try" success.
  // If the same intent appeared 2+ times, it means the bot needed multiple attempts → miss.
  for (const [intent, count] of Object.entries(sessionState.intents)) {
    if (count === undefined || count === 0) continue;
    const key = intent as IntentType;
    const bucket: AccuracyCounter = updated.firstApproachAccuracy[key] ?? { correct: 0, total: 0 };
    bucket.total++;
    if (count <= 1) {
      bucket.correct++;
    }
    updated.firstApproachAccuracy[key] = bucket;
  }

  // ── Silence Accuracy ──
  // If most intents were "direct" (no confirmation needed) and turns were low,
  // the bot handled it without unnecessary back-and-forth → heldBackOk.
  // If turns are high relative to unique intents, some direct calls may have been misses.
  const totalIntentTypes = Object.keys(sessionState.intents).length;
  const totalTurns = sessionState.turns;
  if (totalTurns > 0 && totalIntentTypes > 0) {
    // Heuristic: if average turns per intent type ≤ 1.5, silence was appropriate
    const avgTurns = totalTurns / totalIntentTypes;
    if (avgTurns <= 1.5) {
      updated.silenceAccuracy.heldBackOk++;
    } else {
      updated.silenceAccuracy.heldBackMissed++;
    }
  }

  // ── Blind Spot Detection ──
  const blindSpots: string[] = [];
  for (const [intent, counter] of Object.entries(updated.firstApproachAccuracy)) {
    if (!counter || counter.total < 3) continue;
    const rate = counter.correct / counter.total;
    if (rate < 0.5) {
      blindSpots.push(`${intent} 首次正確率 ${(rate * 100).toFixed(0)}%`);
    }
  }
  updated.blindSpots = blindSpots;

  updated.lastReflection = new Date().toISOString();

  return updated;
}

// ============================================================================
// Reflection Summary — For session_start injection
// ============================================================================

/**
 * Generate a reflection summary for context injection.
 * Returns a short warning if blind spots exist, null otherwise.
 */
export function getReflectionSummary(metrics: WisdomMetrics): string | null {
  if (metrics.blindSpots.length === 0) return null;
  // Limit to 2 blind spots, keep it short (≤40 tokens)
  const spots = metrics.blindSpots.slice(0, 2).map(s => `[自知] ${s}`).join("; ");
  return spots;
}
