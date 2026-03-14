/**
 * Self-Iteration Engine — Oscillation Detection + Periodic Review + Maturity Phase.
 *
 * Adapted from .claude V2.11 workflow-guardian.py self-iteration subsystem.
 * Monitors atom modification patterns, triggers periodic reviews, and tracks system maturity.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createLogger } from "./logger.js";
import type {
  EpisodicSummary,
  IterationState,
  MaturityPhase,
  OscillationReport,
} from "./types.js";

const log = createLogger("iteration");

// ============================================================================
// Configuration interface (passed from config.ts)
// ============================================================================

export type SelfIterationConfig = {
  enabled: boolean;
  /** Number of recent episodics to scan for oscillation. */
  oscillationWindow: number;
  /** Minimum modification count across sessions to flag oscillation. */
  oscillationThreshold: number;
  /** Episodic count between periodic reviews. */
  reviewInterval: number;
};

// ============================================================================
// Oscillation Detection
// ============================================================================

/**
 * Detect atoms modified repeatedly across recent sessions (oscillation).
 *
 * Scans the `atomsModified` field of recent episodic summaries.
 * If the same atom appears in >= threshold distinct sessions within the window,
 * it's flagged as oscillating → recommend pausing modifications.
 */
export function detectOscillation(
  recentEpisodics: EpisodicSummary[],
  config: SelfIterationConfig,
): OscillationReport {
  const window = config.oscillationWindow;
  const threshold = config.oscillationThreshold;

  // Take only the most recent N episodics
  const scanned = recentEpisodics.slice(0, window);

  // Count how many distinct sessions each atom was modified in
  const atomSessionCount = new Map<string, Set<string>>();

  for (const ep of scanned) {
    for (const atomRef of ep.atomsModified) {
      if (!atomSessionCount.has(atomRef)) {
        atomSessionCount.set(atomRef, new Set());
      }
      atomSessionCount.get(atomRef)!.add(ep.sessionKey);
    }
  }

  // Find atoms that hit the threshold
  const oscillatingAtoms: string[] = [];
  for (const [atomRef, sessions] of atomSessionCount) {
    if (sessions.size >= threshold) {
      oscillatingAtoms.push(atomRef);
    }
  }

  if (oscillatingAtoms.length === 0) {
    return { oscillatingAtoms: [], shouldPause: false, reason: "" };
  }

  const reason =
    `${oscillatingAtoms.length} atom(s) modified in ${threshold}+ sessions ` +
    `within last ${scanned.length} episodics: ${oscillatingAtoms.join(", ")}. ` +
    `暫停修改，等待更多證據再決定方向。`;

  return { oscillatingAtoms, shouldPause: true, reason };
}

// ============================================================================
// Periodic Review
// ============================================================================

type ReviewMarker = {
  date: string;
  episodicCount: number;
};

/**
 * Check if a periodic self-review is due.
 *
 * Reads `{basePath}/_iteration/last_review.json` for the marker,
 * counts current episodics in `{basePath}/episodic/`,
 * and returns a reminder string if the gap >= reviewInterval.
 */
export async function checkPeriodicReview(
  basePath: string,
  config: SelfIterationConfig,
): Promise<string | null> {
  if (!config.enabled) return null;

  const markerPath = join(basePath, "_iteration", "last_review.json");
  let lastCount = 0;

  try {
    const raw = await readFile(markerPath, "utf-8");
    const marker = JSON.parse(raw) as ReviewMarker;
    lastCount = marker.episodicCount ?? 0;
  } catch {
    // No marker yet — first run
  }

  const currentCount = countEpisodicFiles(basePath);
  const gap = currentCount - lastCount;

  if (gap < config.reviewInterval) return null;

  const phase = calculateMaturity(currentCount);
  const phaseDesc = maturityDescription(phase, currentCount);

  return (
    `[自我迭代] 定期檢閱到期（距上次 ${gap} sessions）。` +
    `系統${phaseDesc}。` +
    `建議在適當時機進行近期 session 回顧：掃描 episodic atoms、` +
    `找出重複模式、收攏或晉升規則。`
  );
}

/**
 * Save a review marker after a periodic review is completed.
 */
export async function saveReviewMarker(
  basePath: string,
  episodicCount: number,
): Promise<void> {
  const dir = join(basePath, "_iteration");
  const filePath = join(dir, "last_review.json");
  const tmpPath = filePath + ".tmp";

  try {
    await mkdir(dir, { recursive: true });
    const marker: ReviewMarker = {
      date: new Date().toISOString(),
      episodicCount,
    };
    await writeFile(tmpPath, JSON.stringify(marker, null, 2), "utf-8");
    const { rename } = await import("node:fs/promises");
    await rename(tmpPath, filePath);
    log.info(`review marker saved (episodicCount=${episodicCount})`);
  } catch (err) {
    log.warn(`save review marker error: ${err instanceof Error ? err.message : String(err)}`);
    try {
      await import("node:fs/promises").then((fs) => fs.unlink(tmpPath));
    } catch {
      /* ignore */
    }
  }
}

// ============================================================================
// Maturity Phase
// ============================================================================

/**
 * Calculate system maturity phase based on total episodic count.
 *
 * - learning: < 15  — actively learning new patterns
 * - stable:   15-50 — converging rules, reduce additions
 * - mature:   > 50  — minimal additions, focus on refinement
 */
export function calculateMaturity(totalEpisodics: number): MaturityPhase {
  if (totalEpisodics < 15) return "learning";
  if (totalEpisodics <= 50) return "stable";
  return "mature";
}

function maturityDescription(phase: MaturityPhase, total: number): string {
  switch (phase) {
    case "learning":
      return `學習期（${total}/15 sessions）— 積極學習新模式`;
    case "stable":
      return `穩定期（${total}/50 sessions）— 收斂規則，減少新增`;
    case "mature":
      return `成熟期（${total} sessions）— 極少新增，專注精煉`;
  }
}

// ============================================================================
// Iteration State — Load / Save
// ============================================================================

function emptyState(): IterationState {
  return {
    totalEpisodics: 0,
    maturityPhase: "learning",
    episodicsAtLastReview: 0,
  };
}

/**
 * Load iteration state from `{basePath}/_iteration/state.json`.
 */
export async function loadIterationState(basePath: string): Promise<IterationState> {
  const filePath = join(basePath, "_iteration", "state.json");
  try {
    const raw = await readFile(filePath, "utf-8");
    const data = JSON.parse(raw) as Partial<IterationState>;
    return {
      totalEpisodics: data.totalEpisodics ?? 0,
      maturityPhase: data.maturityPhase ?? "learning",
      lastReviewDate: data.lastReviewDate,
      episodicsAtLastReview: data.episodicsAtLastReview ?? 0,
    };
  } catch {
    return emptyState();
  }
}

/**
 * Save iteration state to `{basePath}/_iteration/state.json`.
 */
export async function saveIterationState(
  basePath: string,
  state: IterationState,
): Promise<void> {
  const dir = join(basePath, "_iteration");
  const filePath = join(dir, "state.json");
  const tmpPath = filePath + ".tmp";

  try {
    await mkdir(dir, { recursive: true });
    await writeFile(tmpPath, JSON.stringify(state, null, 2), "utf-8");
    const { rename } = await import("node:fs/promises");
    await rename(tmpPath, filePath);
  } catch (err) {
    log.warn(`save state error: ${err instanceof Error ? err.message : String(err)}`);
    try {
      await import("node:fs/promises").then((fs) => fs.unlink(tmpPath));
    } catch {
      /* ignore */
    }
  }
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Count .md files in {basePath}/episodic/ directory.
 */
function countEpisodicFiles(basePath: string): number {
  const episodicDir = join(basePath, "episodic");
  if (!existsSync(episodicDir)) return 0;
  return readdirSync(episodicDir).filter((f) => f.endsWith(".md")).length;
}
