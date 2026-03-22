/**
 * OETAV Phase B — Iteration Planner
 *
 * Generates IterationProposals from evidence that exceeds thresholds.
 * Phase B: proposals are generated in "pending" status only — no execution.
 *
 * Persists proposals to {atomStorePath}/_iteration/proposals/pending/*.json.
 */

import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type {
  SignalType,
  EvidenceBucket,
  IterationProposal,
  ProposedAction,
  ActionType,
  DecisionLevel,
  MaturityPhase,
  ThresholdStore,
  WuWeiConfig,
  MetricsSnapshot,
} from "./types.js";
import { SIGNAL_LABELS, ACTION_DECISION_LEVEL } from "./types.js";
import {
  getThreshold,
  MIN_SAMPLES,
  WU_WEI_DEFAULTS,
  decideIntervention,
} from "./threshold-balancer.js";
import type { Logger } from "./logger.js";

// ============================================================================
// Constants
// ============================================================================

const ITERATION_DIR = "_iteration";
const PROPOSALS_DIR = "proposals";
const PENDING_DIR = "pending";
const COOLDOWN_DAYS = 7; // Min days between proposals of same signal type

/** Maps signal types to their default proposed action type (from Architecture §2.3). */
const SIGNAL_TO_ACTION: Record<SignalType, ActionType> = {
  S1: "code_fix",         // Pitfall Accumulation → code fix or context inject
  S2: "context_inject",   // Wisdom Blind Spot → context inject or rule update
  S3: "atom_cleanup",     // Recall Degradation / Staleness → atom cleanup
  S4: "atom_pause",       // Oscillation → pause atom
  S5: "config_adjust",    // Recall Quality Drop → config adjust or reindex
  S6: "feedback_atom",    // Decision Flip → feedback atom or rule update
  S7: "docs_update",      // AIDocs Drift → docs update
  S8: "rule_update",      // Permission Boundary → rule update
  S9: "atom_cleanup",     // Knowledge Entropy → atom cleanup (rebalance tiers)
};

// ============================================================================
// Persistence
// ============================================================================

function pendingDir(atomStorePath: string): string {
  return join(atomStorePath, ITERATION_DIR, PROPOSALS_DIR, PENDING_DIR);
}

export async function loadProposals(atomStorePath: string): Promise<IterationProposal[]> {
  const dir = pendingDir(atomStorePath);
  try {
    const files = await readdir(dir);
    const proposals: IterationProposal[] = [];
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      try {
        const raw = await readFile(join(dir, file), "utf-8");
        proposals.push(JSON.parse(raw) as IterationProposal);
      } catch { /* skip corrupt files */ }
    }
    return proposals.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  } catch {
    return [];
  }
}

export async function saveProposal(atomStorePath: string, proposal: IterationProposal): Promise<void> {
  const dir = pendingDir(atomStorePath);
  await mkdir(dir, { recursive: true });
  const filePath = join(dir, `${proposal.id}.json`);
  await writeFile(filePath, JSON.stringify(proposal, null, 2), "utf-8");
}

// ============================================================================
// Cooldown Check
// ============================================================================

function isInCooldown(
  signalType: SignalType,
  existingProposals: IterationProposal[],
  cooldownDays: number,
): boolean {
  const now = Date.now();
  const cooldownMs = cooldownDays * 24 * 60 * 60 * 1000;

  for (const p of existingProposals) {
    if (p.signalType === signalType) {
      const created = new Date(p.createdAt).getTime();
      if (now - created < cooldownMs) return true;
    }
  }
  return false;
}

// ============================================================================
// Proposal Generation
// ============================================================================

function buildProposalSummary(signalType: SignalType, bucket: EvidenceBucket): string {
  const label = SIGNAL_LABELS[signalType] ?? signalType;
  return `[${signalType}] ${label}: evidence score ${bucket.score.toFixed(2)} ` +
    `across ${bucket.sessionCount} sessions`;
}

function buildProposalRationale(bucket: EvidenceBucket): string {
  const recent = bucket.history.slice(-5);
  const lines = [
    `Accumulated evidence score: ${bucket.score.toFixed(3)}`,
    `Session count: ${bucket.sessionCount}`,
    `Stale cycles: ${bucket.staleCycles}`,
    "",
    "Recent signals:",
  ];
  for (const h of recent) {
    lines.push(`  [${h.timestamp}] severity=${h.severity.toFixed(2)}: ${h.details}`);
  }
  return lines.join("\n");
}

function buildProposedAction(signalType: SignalType, bucket: EvidenceBucket): ProposedAction {
  const actionType = SIGNAL_TO_ACTION[signalType];
  const label = SIGNAL_LABELS[signalType] ?? signalType;

  const descriptions: Record<SignalType, string> = {
    S1: `Address ${bucket.sessionCount} accumulated pitfalls — inject context or fix code patterns`,
    S2: `Fill wisdom blind spots detected over ${bucket.sessionCount} sessions`,
    S3: `Clean up stale atoms contributing to recall degradation`,
    S4: `Pause oscillating atoms to prevent further flip-flops`,
    S5: `Adjust recall configuration to improve query quality (avg score dropping)`,
    S6: `Create feedback atom from repeated correction patterns`,
    S7: `Sync _AIDocs with source code to reduce documentation drift`,
    S8: `Review permission boundaries — ${bucket.sessionCount} conflict sessions`,
    S9: `Rebalance atom tier distribution to maintain healthy entropy`,
  };

  return {
    type: actionType,
    description: descriptions[signalType] ?? `Address ${label} signal`,
  };
}

// ============================================================================
// Main Planner
// ============================================================================

export type PlannerConfig = {
  /** Override cooldown days. Default 7. */
  cooldownDays?: number;
  /** Wu-Wei overrides per maturity phase. */
  wuWeiOverrides?: Partial<Record<MaturityPhase, { wuWeiBias: number; thresholdMultiplier: number }>>;
};

/**
 * Generate proposals from evidence that exceeds thresholds.
 *
 * For each evidence bucket:
 * 1. Check cooldown (7 days between same signal type proposals)
 * 2. Check minimum sample count
 * 3. Apply Wu-Wei intervention decision
 * 4. If shouldAct → create IterationProposal (pending status)
 * 5. Classify decision level from action type
 */
export async function generateProposals(
  atomStorePath: string,
  evidence: EvidenceBucket[],
  thresholdStore: ThresholdStore,
  maturityPhase: MaturityPhase,
  baselineMetrics?: MetricsSnapshot,
  config?: PlannerConfig,
  log?: Logger,
): Promise<IterationProposal[]> {
  const cooldownDays = config?.cooldownDays ?? COOLDOWN_DAYS;
  const existingProposals = await loadProposals(atomStorePath);
  const proposals: IterationProposal[] = [];

  for (const bucket of evidence) {
    const st = bucket.signalType;

    // Skip near-zero evidence
    if (bucket.score < 0.1) continue;

    // Cooldown check
    if (isInCooldown(st, existingProposals, cooldownDays)) {
      log?.info(`${st}: skipped (cooldown active)`);
      continue;
    }

    // Minimum sample check
    const minSamples = MIN_SAMPLES[st];
    if (minSamples !== undefined && bucket.sessionCount < minSamples) {
      log?.info(`${st}: skipped (${bucket.sessionCount}/${minSamples} samples)`);
      continue;
    }

    // Get threshold + Wu-Wei config
    const baseThreshold = getThreshold(thresholdStore, st);
    const wuWeiPhaseConfig = config?.wuWeiOverrides?.[maturityPhase] ?? WU_WEI_DEFAULTS[maturityPhase];
    const wuWeiConfig: WuWeiConfig = {
      maturityPhase,
      ...wuWeiPhaseConfig,
    };

    // Intervention decision
    const decision = decideIntervention(bucket.score, baseThreshold, wuWeiConfig);

    if (!decision.shouldAct) {
      log?.info(
        `${st}: below threshold (effective=${decision.effectiveScore.toFixed(2)} ` +
        `< ${decision.effectiveThreshold.toFixed(2)}) — ${decision.analogy}`,
      );
      continue;
    }

    // Build proposal
    const action = buildProposedAction(st, bucket);
    const decisionLevel: DecisionLevel = ACTION_DECISION_LEVEL[action.type] ?? "confirm";

    const proposal: IterationProposal = {
      id: randomUUID(),
      signalType: st,
      createdAt: new Date().toISOString(),
      summary: buildProposalSummary(st, bucket),
      rationale: buildProposalRationale(bucket),
      action,
      decisionLevel,
      baselineMetrics,
      status: "pending",
    };

    proposals.push(proposal);
    await saveProposal(atomStorePath, proposal);

    log?.info(
      `${st}: proposal generated [${decisionLevel}] — ${action.type}: ${action.description.slice(0, 80)}`,
    );
  }

  return proposals;
}

/**
 * Format proposals summary for /iterate status display.
 */
export async function formatProposalsSummary(atomStorePath: string): Promise<string> {
  const proposals = await loadProposals(atomStorePath);
  if (proposals.length === 0) return "No pending proposals.";

  const lines = proposals.map((p) => {
    const label = SIGNAL_LABELS[p.signalType] ?? p.signalType;
    return `  [${p.decisionLevel}] ${p.signalType} ${label}: ${p.action.type} — ${p.summary}`;
  });

  return `Pending Proposals (${proposals.length}):\n${lines.join("\n")}`;
}
