/**
 * Evolve Guard — Path validation + safety limits for self-evolution (Phase 3).
 *
 * Enforces:
 * - Owner-only access (non-owner cannot trigger code modification)
 * - Whitelist/blacklist path rules (configurable)
 * - Per-pass file/line limits
 * - Build-pass requirement with auto-revert
 *
 * All path comparisons use normalized forward-slash relative paths.
 */

import { resolve, relative } from "node:path";
import { createLogger } from "./logger.js";
import type { AtomicMemoryConfig } from "../config.js";
import type {
  EvolvePathVerdict,
  EvolveBatchVerdict,
  EvolvePassStats,
  EvolveJournalEntry,
} from "./types.js";

const log = createLogger("evolve-guard");

// ============================================================================
// Path Normalization
// ============================================================================

/**
 * Normalize a path to forward-slash relative form.
 * E.g. `E:\OpenClaw\extensions\foo\bar.ts` → `extensions/foo/bar.ts`
 */
function toRelativeForward(filePath: string, sourceDir: string): string {
  const abs = resolve(filePath);
  const base = resolve(sourceDir);
  const rel = relative(base, abs);
  // Convert backslashes (Windows) to forward slashes
  return rel.replace(/\\/g, "/");
}

/**
 * Check if a relative path is under any of the given prefixes.
 */
function matchesAny(relPath: string, prefixes: string[]): boolean {
  const lower = relPath.toLowerCase();
  return prefixes.some((prefix) => {
    const p = prefix.toLowerCase().replace(/\\/g, "/");
    // Exact file match or directory prefix
    return lower === p || lower.startsWith(p.endsWith("/") ? p : p + "/");
  });
}

// ============================================================================
// Single Path Validation
// ============================================================================

export type CodeModificationConfig = AtomicMemoryConfig["selfIteration"]["codeModification"];

/**
 * Validate whether a single file path is allowed for modification.
 */
export function validateEvolvePath(
  filePath: string,
  config: CodeModificationConfig,
): EvolvePathVerdict {
  if (!config.enabled) {
    return { allowed: false, relativePath: "", reason: "codeModification is disabled" };
  }

  if (!config.sourceDir) {
    return { allowed: false, relativePath: "", reason: "sourceDir is not configured" };
  }

  const rel = toRelativeForward(filePath, config.sourceDir);

  // Reject paths that escape sourceDir (../)
  if (rel.startsWith("../") || rel.startsWith("..\\")) {
    return { allowed: false, relativePath: rel, reason: `path escapes sourceDir: ${rel}` };
  }

  // Blacklist takes priority — deny first
  if (matchesAny(rel, config.blockedPaths)) {
    return { allowed: false, relativePath: rel, reason: `blocked path: ${rel}` };
  }

  // Must be within at least one allowed path
  if (!matchesAny(rel, config.allowedPaths)) {
    return { allowed: false, relativePath: rel, reason: `not in allowedPaths: ${rel}` };
  }

  return { allowed: true, relativePath: rel, reason: "" };
}

// ============================================================================
// Batch Validation
// ============================================================================

/**
 * Validate a batch of file paths + enforce per-pass limits.
 */
export function validateEvolveBatch(
  filePaths: string[],
  stats: EvolvePassStats,
  config: CodeModificationConfig,
): EvolveBatchVerdict {
  const reasons: string[] = [];
  const files: EvolvePathVerdict[] = [];

  if (!config.enabled) {
    return { allowed: false, files: [], reasons: ["codeModification is disabled"] };
  }

  // File count limit
  if (filePaths.length > config.maxFilesPerPass) {
    reasons.push(
      `file count ${filePaths.length} exceeds maxFilesPerPass (${config.maxFilesPerPass})`,
    );
  }

  // Line count limit
  const totalLines = stats.linesAdded + stats.linesRemoved;
  if (totalLines > config.maxLinesPerPass) {
    reasons.push(
      `line changes ${totalLines} exceeds maxLinesPerPass (${config.maxLinesPerPass})`,
    );
  }

  // Validate each path
  for (const fp of filePaths) {
    const verdict = validateEvolvePath(fp, config);
    files.push(verdict);
    if (!verdict.allowed) {
      reasons.push(verdict.reason);
    }
  }

  return {
    allowed: reasons.length === 0,
    files,
    reasons,
  };
}

// ============================================================================
// Evolve Guard Context Builder
// ============================================================================

/**
 * Build a system prompt fragment describing the evolve guard constraints.
 * Injected into agent context when self-evolution is active.
 */
export function buildEvolveGuardContext(config: CodeModificationConfig): string {
  if (!config.enabled) return "";

  const allowed = config.allowedPaths.map((p) => `  - ${p}`).join("\n");
  const blocked = config.blockedPaths.map((p) => `  - ${p}`).join("\n");

  return (
    `[Self-Evolution Guard]\n` +
    `Source directory: ${config.sourceDir}\n` +
    `Allowed paths:\n${allowed}\n` +
    `Blocked paths:\n${blocked}\n` +
    `Limits: max ${config.maxFilesPerPass} files, max ${config.maxLinesPerPass} lines per pass\n` +
    `Build required: ${config.requireBuildPass ? "yes" : "no"}\n` +
    `Auto-revert on failure: ${config.autoRevertOnFailure ? "yes" : "no"}\n` +
    `IMPORTANT: All code modifications MUST pass through evolve-guard validation before writing.`
  );
}

// ============================================================================
// Journal Entry Builder
// ============================================================================

/**
 * Create a journal entry for an evolution pass result.
 */
export function createJournalEntry(
  summary: string,
  stats: EvolvePassStats,
  buildResult: "pass" | "fail" | "skipped",
  reverted: boolean,
  filesTouched: string[],
  commitHash?: string,
): EvolveJournalEntry {
  return {
    timestamp: new Date().toISOString(),
    summary,
    stats,
    buildResult,
    reverted,
    commitHash,
    filesTouched,
  };
}

/**
 * Format a journal entry as markdown for atom storage.
 */
export function formatJournalMarkdown(entry: EvolveJournalEntry): string {
  const status = entry.reverted ? "REVERTED" : entry.buildResult === "pass" ? "OK" : "FAILED";
  const commit = entry.commitHash ? ` (${entry.commitHash.slice(0, 9)})` : "";
  const files = entry.filesTouched.map((f) => `  - ${f}`).join("\n");

  return (
    `- [${status}] ${entry.timestamp.slice(0, 19)} — ${entry.summary}${commit}\n` +
    `  +${entry.stats.linesAdded}/-${entry.stats.linesRemoved} in ${entry.stats.filesModified} file(s)\n` +
    (files ? `${files}\n` : "")
  );
}

// ============================================================================
// Permission Check Helper
// ============================================================================

/**
 * Check whether a sender is authorized to trigger self-evolution.
 * Only the owner can trigger code modification.
 */
export function canTriggerEvolution(
  senderIsOwner: boolean | undefined,
  config: CodeModificationConfig,
): { allowed: boolean; reason: string } {
  if (!config.enabled) {
    return { allowed: false, reason: "Self-evolution is not enabled in configuration." };
  }
  if (!config.sourceDir) {
    return { allowed: false, reason: "sourceDir is not configured." };
  }
  if (senderIsOwner !== true) {
    return { allowed: false, reason: "Only the owner can trigger self-evolution." };
  }
  return { allowed: true, reason: "" };
}
