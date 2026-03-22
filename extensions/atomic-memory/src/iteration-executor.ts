/**
 * OETAV Phase C — Iteration Executor
 *
 * Decision gate + action execution for iteration proposals.
 *   - auto: execute immediately (atom_cleanup, atom_pause, docs_update, etc.)
 *   - confirm: store as pending, inject reminder at next session_start
 *   - block: record as blocked, display only in /iterate status
 *
 * Persists executed proposals to {atomStorePath}/_iteration/proposals/executed/*.json.
 */

import { readFile, writeFile, mkdir, readdir, unlink } from "node:fs/promises";
import { join } from "node:path";
import type {
  IterationProposal,
  ExecutionResult,
  ExecutedProposalRecord,
  MetricsSnapshot,
  EvidenceBucket,
  MaturityPhase,
} from "./types.js";
import { ACTION_DECISION_LEVEL } from "./types.js";
import { devilsAdvocate } from "./self-critique.js";
import type { AtomStore } from "./atom-store.js";
import type { Logger } from "./logger.js";

// ============================================================================
// Constants
// ============================================================================

const ITERATION_DIR = "_iteration";
const PROPOSALS_DIR = "proposals";
const PENDING_DIR = "pending";
const EXECUTED_DIR = "executed";
const VERIFY_AFTER_SESSIONS = 5;

// ============================================================================
// Persistence
// ============================================================================

function executedDir(atomStorePath: string): string {
  return join(atomStorePath, ITERATION_DIR, PROPOSALS_DIR, EXECUTED_DIR);
}

function pendingDir(atomStorePath: string): string {
  return join(atomStorePath, ITERATION_DIR, PROPOSALS_DIR, PENDING_DIR);
}

export async function loadExecutedRecords(atomStorePath: string): Promise<ExecutedProposalRecord[]> {
  const dir = executedDir(atomStorePath);
  try {
    const files = await readdir(dir);
    const records: ExecutedProposalRecord[] = [];
    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      try {
        const raw = await readFile(join(dir, file), "utf-8");
        records.push(JSON.parse(raw) as ExecutedProposalRecord);
      } catch { /* skip corrupt */ }
    }
    return records.sort((a, b) =>
      a.executionResult.executedAt.localeCompare(b.executionResult.executedAt),
    );
  } catch {
    return [];
  }
}

async function saveExecutedRecord(
  atomStorePath: string,
  record: ExecutedProposalRecord,
): Promise<void> {
  const dir = executedDir(atomStorePath);
  await mkdir(dir, { recursive: true });
  await writeFile(
    join(dir, `${record.proposal.id}.json`),
    JSON.stringify(record, null, 2),
    "utf-8",
  );
}

async function removePendingProposal(atomStorePath: string, proposalId: string): Promise<void> {
  try {
    await unlink(join(pendingDir(atomStorePath), `${proposalId}.json`));
  } catch { /* may not exist */ }
}

async function updatePendingProposal(
  atomStorePath: string,
  proposal: IterationProposal,
): Promise<void> {
  const dir = pendingDir(atomStorePath);
  await mkdir(dir, { recursive: true });
  await writeFile(
    join(dir, `${proposal.id}.json`),
    JSON.stringify(proposal, null, 2),
    "utf-8",
  );
}

// ============================================================================
// Auto Action Implementations
// ============================================================================

async function executeAtomCleanup(
  atomStore: AtomStore,
  proposal: IterationProposal,
  log?: Logger,
): Promise<string> {
  // Archive stale [臨] atoms that haven't been used in 30+ days
  const atoms = await atomStore.list();
  const now = Date.now();
  let archived = 0;

  for (const atom of atoms) {
    if (atom.confidence !== "[臨]") continue;
    const lastUsedMs = new Date(atom.lastUsed).getTime();
    const daysSince = (now - lastUsedMs) / (1000 * 60 * 60 * 24);
    if (daysSince >= 30) {
      await atomStore.moveToDistant(atom.category, atom.id);
      archived++;
    }
  }

  log?.info(`atom_cleanup: archived ${archived} stale [臨] atoms`);
  return `Archived ${archived} stale [臨] atoms (>30 days unused).`;
}

async function executeAtomPause(
  atomStore: AtomStore,
  proposal: IterationProposal,
  log?: Logger,
): Promise<string> {
  // Mark oscillating atoms by appending evolution log entry
  const targets = proposal.action.targets ?? [];
  let paused = 0;

  for (const target of targets) {
    const [category, id] = target.split("/") as [string, string];
    if (!category || !id) continue;
    const atom = await atomStore.get(category as any, id);
    if (!atom) continue;

    const today = new Date().toISOString().slice(0, 10);
    await atomStore.update(atom.category, atom.id, {
      appendEvolution: `${today}: ⏸ 暫停修改（震盪偵測 — 自我迭代自動處理）`,
      tags: [...new Set([...atom.tags, "paused"])],
    });
    paused++;
  }

  log?.info(`atom_pause: paused ${paused} oscillating atoms`);
  return `Paused ${paused} oscillating atom(s) — tagged with "paused".`;
}

async function executeAtomCreate(
  atomStore: AtomStore,
  proposal: IterationProposal,
  log?: Logger,
): Promise<string> {
  // Create a new [臨] observation atom based on the proposal
  const id = `iterate-${proposal.signalType}-${Date.now()}`;
  const today = new Date().toISOString().slice(0, 10);

  await atomStore.create({
    id,
    title: `[iterate] ${proposal.summary.slice(0, 60)}`,
    category: "topic",
    confidence: "[臨]",
    triggers: [proposal.signalType],
    lastUsed: today,
    confirmations: 0,
    tags: ["auto-created", "self-iteration"],
    related: [],
    sources: [],
    scope: "global",
    knowledge: `- ${proposal.rationale.slice(0, 300)}`,
    actions: "",
    evolutionLog: [`${today}: 自我迭代自動建立（${proposal.signalType}）`],
  });

  log?.info(`atom_create: created topic/${id}`);
  return `Created [臨] atom: topic/${id}`;
}

async function executeContextInject(
  proposal: IterationProposal,
  log?: Logger,
): Promise<string> {
  // Context inject is lightweight — record the intent; actual injection
  // happens via the existing context-formatter when the atom is recalled.
  log?.info(`context_inject: noted for ${proposal.signalType}`);
  return `Context injection noted for ${proposal.signalType}. Will be applied via recall.`;
}

async function executeDocsUpdate(
  proposal: IterationProposal,
  log?: Logger,
): Promise<string> {
  // Docs update: flag for next session. Actual _AIDocs sync
  // requires Claude (file edits) — we record the intent.
  log?.info(`docs_update: flagged for ${proposal.signalType}`);
  return `Docs update flagged: ${proposal.action.description.slice(0, 100)}. Will be addressed in next session.`;
}

async function executeFeedbackAtom(
  atomStore: AtomStore,
  proposal: IterationProposal,
  log?: Logger,
): Promise<string> {
  // Create or strengthen a feedback atom
  return executeAtomCreate(atomStore, proposal, log);
}

async function executeVectorReindex(
  proposal: IterationProposal,
  log?: Logger,
): Promise<string> {
  // Vector reindex is a no-side-effect operation — flag it
  log?.info(`vector_reindex: flagged`);
  return `Vector reindex flagged. Will rebuild on next session start.`;
}

/** Dispatch auto action to the appropriate handler. */
async function dispatchAutoAction(
  atomStore: AtomStore,
  proposal: IterationProposal,
  log?: Logger,
): Promise<string> {
  switch (proposal.action.type) {
    case "atom_cleanup":
      return executeAtomCleanup(atomStore, proposal, log);
    case "atom_pause":
      return executeAtomPause(atomStore, proposal, log);
    case "atom_create":
      return executeAtomCreate(atomStore, proposal, log);
    case "context_inject":
      return executeContextInject(proposal, log);
    case "docs_update":
      return executeDocsUpdate(proposal, log);
    case "feedback_atom":
      return executeFeedbackAtom(atomStore, proposal, log);
    case "vector_reindex":
      return executeVectorReindex(proposal, log);
    default:
      return `Unknown auto action: ${proposal.action.type}`;
  }
}

// ============================================================================
// Main Executor
// ============================================================================

export type ExecutorConfig = {
  /** Enable devil's advocate gate before execution. Default: true. */
  devilsAdvocateEnabled?: boolean;
  /** Over-speculation threshold. Default: 0.7. */
  overSpeculationThreshold?: number;
  /** Sessions to wait before outcome verification. Default: 5. */
  verifyAfterSessions?: number;
};

/**
 * Execute a proposal based on its decision level.
 *
 * - auto: run devil's advocate → execute action → save to executed/
 * - confirm: save to pending/ (unchanged) for user review
 * - block: record as blocked in executed/ (no action taken)
 */
export async function executeProposal(
  proposal: IterationProposal,
  atomStore: AtomStore,
  atomStorePath: string,
  evidence: EvidenceBucket[],
  maturityPhase: MaturityPhase,
  sessionKey: string,
  baselineSnapshot?: MetricsSnapshot,
  config?: ExecutorConfig,
  log?: Logger,
): Promise<ExecutionResult> {
  const now = new Date().toISOString();
  const level = ACTION_DECISION_LEVEL[proposal.action.type] ?? "confirm";

  // ── Block level: record and stop ──
  if (level === "block") {
    proposal.status = "rejected";
    const result: ExecutionResult = {
      proposalId: proposal.id,
      action: "blocked",
      executedAt: now,
      details: `Blocked: ${proposal.action.type} requires manual intervention.`,
    };

    await saveExecutedRecord(atomStorePath, {
      proposal,
      executionResult: result,
      executedAtSession: sessionKey,
      verifyAfterSessions: 0,
      sessionsSinceExecution: 0,
    });
    await removePendingProposal(atomStorePath, proposal.id);

    log?.info(`${proposal.id}: blocked (${proposal.action.type})`);
    return result;
  }

  // ── Confirm level: store as pending ──
  if (level === "confirm") {
    proposal.status = "pending";
    await updatePendingProposal(atomStorePath, proposal);

    log?.info(`${proposal.id}: stored as pending (${proposal.action.type})`);
    return {
      proposalId: proposal.id,
      action: "stored-pending",
      executedAt: now,
      details: `Awaiting owner approval: ${proposal.action.description.slice(0, 100)}`,
    };
  }

  // ── Auto level: devil's advocate gate → execute ──

  // Devil's advocate check (Invariant #13)
  const daEnabled = config?.devilsAdvocateEnabled ?? true;
  if (daEnabled) {
    const totalProposals = (await loadExecutedRecords(atomStorePath)).length;
    const daResult = devilsAdvocate(
      proposal,
      evidence,
      { maturityPhase, totalProposals },
      config?.overSpeculationThreshold,
    );

    if (!daResult.passed) {
      proposal.status = "rejected";
      const result: ExecutionResult = {
        proposalId: proposal.id,
        action: "blocked",
        executedAt: now,
        details: `Devil's advocate blocked: ${daResult.verdict}`,
      };

      await saveExecutedRecord(atomStorePath, {
        proposal,
        executionResult: result,
        executedAtSession: sessionKey,
        verifyAfterSessions: 0,
        sessionsSinceExecution: 0,
      });
      await removePendingProposal(atomStorePath, proposal.id);

      log?.info(`${proposal.id}: blocked by devil's advocate — ${daResult.verdict}`);
      return result;
    }
  }

  // Execute auto action
  let details: string;
  let error: string | undefined;

  try {
    details = await dispatchAutoAction(atomStore, proposal, log);
    proposal.status = "executed";
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
    details = `Execution failed: ${error}`;
    proposal.status = "pending"; // Keep pending on failure
    log?.warn(`${proposal.id}: execution failed — ${error}`);
  }

  const result: ExecutionResult = {
    proposalId: proposal.id,
    action: error ? "stored-pending" : "executed",
    executedAt: now,
    details,
    baselineSnapshot,
    error,
  };

  if (!error) {
    await saveExecutedRecord(atomStorePath, {
      proposal,
      executionResult: result,
      executedAtSession: sessionKey,
      verifyAfterSessions: config?.verifyAfterSessions ?? VERIFY_AFTER_SESSIONS,
      sessionsSinceExecution: 0,
    });
    await removePendingProposal(atomStorePath, proposal.id);
  }

  return result;
}

// ============================================================================
// Approve / Reject — Owner interaction
// ============================================================================

/**
 * Approve a pending proposal — execute its action immediately.
 */
export async function approveProposal(
  proposalId: string,
  atomStore: AtomStore,
  atomStorePath: string,
  sessionKey: string,
  baselineSnapshot?: MetricsSnapshot,
  log?: Logger,
): Promise<ExecutionResult> {
  const dir = pendingDir(atomStorePath);
  const filePath = join(dir, `${proposalId}.json`);
  let proposal: IterationProposal;

  try {
    const raw = await readFile(filePath, "utf-8");
    proposal = JSON.parse(raw) as IterationProposal;
  } catch {
    return {
      proposalId,
      action: "blocked",
      executedAt: new Date().toISOString(),
      error: `Proposal ${proposalId} not found in pending.`,
    };
  }

  // Execute the action
  let details: string;
  let error: string | undefined;

  try {
    details = await dispatchAutoAction(atomStore, proposal, log);
    proposal.status = "executed";
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
    details = `Execution failed: ${error}`;
  }

  const now = new Date().toISOString();
  const result: ExecutionResult = {
    proposalId: proposal.id,
    action: error ? "stored-pending" : "executed",
    executedAt: now,
    details,
    baselineSnapshot,
    error,
  };

  if (!error) {
    proposal.status = "approved";
    await saveExecutedRecord(atomStorePath, {
      proposal,
      executionResult: result,
      executedAtSession: sessionKey,
      verifyAfterSessions: VERIFY_AFTER_SESSIONS,
      sessionsSinceExecution: 0,
    });
    await removePendingProposal(atomStorePath, proposalId);
    log?.info(`approved: ${proposalId} — ${details}`);
  }

  return result;
}

/**
 * Reject a pending proposal — remove from pending, record as rejected.
 */
export async function rejectProposal(
  proposalId: string,
  atomStorePath: string,
  reason: string,
  log?: Logger,
): Promise<ExecutionResult> {
  const dir = pendingDir(atomStorePath);
  const filePath = join(dir, `${proposalId}.json`);
  let proposal: IterationProposal;

  try {
    const raw = await readFile(filePath, "utf-8");
    proposal = JSON.parse(raw) as IterationProposal;
  } catch {
    return {
      proposalId,
      action: "blocked",
      executedAt: new Date().toISOString(),
      error: `Proposal ${proposalId} not found in pending.`,
    };
  }

  proposal.status = "rejected";
  const now = new Date().toISOString();

  const result: ExecutionResult = {
    proposalId: proposal.id,
    action: "blocked",
    executedAt: now,
    details: `Rejected by owner: ${reason}`,
  };

  await saveExecutedRecord(atomStorePath, {
    proposal,
    executionResult: result,
    executedAtSession: "",
    verifyAfterSessions: 0,
    sessionsSinceExecution: 0,
  });
  await removePendingProposal(atomStorePath, proposalId);

  log?.info(`rejected: ${proposalId} — ${reason}`);
  return result;
}

// ============================================================================
// Session Start — Pending Proposals Reminder
// ============================================================================

/**
 * Check for pending proposals and return a reminder string for session_start injection.
 * Returns null if no pending proposals.
 */
export async function getPendingReminder(atomStorePath: string): Promise<string | null> {
  const dir = pendingDir(atomStorePath);
  let files: string[];
  try {
    files = await readdir(dir);
  } catch {
    return null;
  }

  const pending: IterationProposal[] = [];
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    try {
      const raw = await readFile(join(dir, file), "utf-8");
      const p = JSON.parse(raw) as IterationProposal;
      if (p.status === "pending") pending.push(p);
    } catch { /* skip */ }
  }

  if (pending.length === 0) return null;

  const lines = pending.map(
    (p) => `  • [${p.action.type}] ${p.summary.slice(0, 80)} (id: ${p.id.slice(0, 8)})`,
  );

  return `[自我迭代] ${pending.length} 個改善提案等待審核：\n${lines.join("\n")}\n使用 /iterate approve <id> 或 /iterate reject <id> 處理。`;
}

// ============================================================================
// Status Formatting
// ============================================================================

/**
 * Format executed proposals + outcomes + blocked for /iterate status.
 */
export async function formatExecutedSummary(atomStorePath: string): Promise<string> {
  const records = await loadExecutedRecords(atomStorePath);
  if (records.length === 0) return "No executed proposals.";

  const executed = records.filter((r) => r.executionResult.action === "executed");
  const blocked = records.filter((r) => r.executionResult.action === "blocked");

  const lines: string[] = [];

  if (executed.length > 0) {
    lines.push(`Executed (${executed.length}):`);
    for (const r of executed.slice(-10)) {
      const outcome = r.outcome
        ? ` → ${r.outcome.verdict}`
        : ` (awaiting verification, ${r.sessionsSinceExecution}/${r.verifyAfterSessions} sessions)`;
      lines.push(`  ${r.proposal.signalType} ${r.proposal.action.type}: ${r.executionResult.details?.slice(0, 60) ?? ""}${outcome}`);
    }
  }

  if (blocked.length > 0) {
    lines.push("");
    lines.push(`Blocked (${blocked.length}):`);
    for (const r of blocked.slice(-5)) {
      lines.push(`  ${r.proposal.signalType} ${r.proposal.action.type}: ${r.executionResult.details?.slice(0, 80) ?? ""}`);
    }
  }

  return lines.join("\n");
}
