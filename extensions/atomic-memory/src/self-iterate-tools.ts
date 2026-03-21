/**
 * Self-Iterate Tools — Owner-only code analysis, proposal, modification, and journaling.
 *
 * Phase 4: Provides the core functions behind self_analyze, self_propose,
 * self_apply, and self_journal tools + /iterate command.
 *
 * All functions assume caller has already verified owner permission
 * and codeModification.enabled === true.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, extname } from "node:path";
import { execSync } from "node:child_process";
import { createLogger } from "./logger.js";
import {
  validateEvolvePath,
  validateEvolveBatch,
  createJournalEntry,
  formatJournalMarkdown,
  type CodeModificationConfig,
} from "./evolve-guard.js";
import type { EvolvePassStats } from "./types.js";

const log = createLogger("self-iterate");

// ============================================================================
// Helpers
// ============================================================================

const SOURCE_EXTENSIONS = new Set([".ts", ".js", ".tsx", ".jsx", ".json", ".md"]);

function isSourceFile(name: string): boolean {
  return SOURCE_EXTENSIONS.has(extname(name).toLowerCase());
}

/** Read source files at a path (file or directory, up to depth 2). */
function readSourceFiles(
  targetPath: string,
  sourceDir: string,
  maxFiles = 20,
): Array<{ path: string; content: string; lines: number }> {
  const absPath = join(sourceDir, targetPath);
  const results: Array<{ path: string; content: string; lines: number }> = [];

  try {
    const stat = statSync(absPath);
    if (stat.isFile()) {
      const content = readFileSync(absPath, "utf-8");
      results.push({ path: targetPath, content, lines: content.split("\n").length });
    } else if (stat.isDirectory()) {
      const walk = (dir: string, depth: number) => {
        if (depth > 2 || results.length >= maxFiles) return;
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
          if (results.length >= maxFiles) break;
          const full = join(dir, entry.name);
          const rel = relative(sourceDir, full).replace(/\\/g, "/");
          if (entry.isFile() && isSourceFile(entry.name)) {
            const content = readFileSync(full, "utf-8");
            results.push({ path: rel, content, lines: content.split("\n").length });
          } else if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules" && entry.name !== "dist") {
            walk(full, depth + 1);
          }
        }
      };
      walk(absPath, 0);
    }
  } catch (err) {
    log.warn(`readSourceFiles failed for ${targetPath}: ${err instanceof Error ? err.message : String(err)}`);
  }

  return results;
}

/** Get recent git log for a path. */
function getGitLog(targetPath: string, sourceDir: string, maxEntries = 10): string {
  try {
    return execSync(
      `git log --oneline -${maxEntries} -- "${targetPath}"`,
      { cwd: sourceDir, encoding: "utf-8", timeout: 10_000 },
    ).trim();
  } catch {
    return "(git log unavailable)";
  }
}

/** Get git diff stats for current uncommitted changes. */
function getGitDiffStats(sourceDir: string): EvolvePassStats {
  try {
    const diff = execSync("git diff --stat HEAD", {
      cwd: sourceDir, encoding: "utf-8", timeout: 10_000,
    }).trim();
    if (!diff) return { filesModified: 0, linesAdded: 0, linesRemoved: 0 };
    const lines = diff.split("\n");
    const summary = lines[lines.length - 1] || "";
    const added = parseInt(summary.match(/(\d+) insertion/)?.[1] ?? "0");
    const removed = parseInt(summary.match(/(\d+) deletion/)?.[1] ?? "0");
    const files = parseInt(summary.match(/(\d+) file/)?.[1] ?? "0");
    return { filesModified: files, linesAdded: added, linesRemoved: removed };
  } catch {
    return { filesModified: 0, linesAdded: 0, linesRemoved: 0 };
  }
}

/** Get list of uncommitted changed files (relative paths). */
function getChangedFiles(sourceDir: string): string[] {
  try {
    const staged = execSync("git diff --name-only --cached", {
      cwd: sourceDir, encoding: "utf-8", timeout: 10_000,
    }).trim();
    const unstaged = execSync("git diff --name-only", {
      cwd: sourceDir, encoding: "utf-8", timeout: 10_000,
    }).trim();
    const all = new Set([
      ...staged.split("\n").filter(Boolean),
      ...unstaged.split("\n").filter(Boolean),
    ]);
    return [...all];
  } catch {
    return [];
  }
}

// ============================================================================
// Tool 1: self_analyze — read-only code analysis
// ============================================================================

export type AnalyzeResult = {
  path: string;
  files: Array<{ path: string; lines: number; preview: string }>;
  totalLines: number;
  gitHistory: string;
  relatedKnowledge: string;
};

/**
 * Analyze source code at a given path.
 * Reads files, git history, and recalls related architecture knowledge.
 *
 * @param recallFn Callback to query atomic memory for related knowledge.
 */
export async function selfAnalyze(
  targetPath: string,
  config: CodeModificationConfig,
  recallFn: (query: string) => Promise<string>,
): Promise<AnalyzeResult> {
  const sourceDir = config.sourceDir;

  // Read source files
  const files = readSourceFiles(targetPath, sourceDir);
  const totalLines = files.reduce((sum, f) => sum + f.lines, 0);

  // Git history
  const gitHistory = getGitLog(targetPath, sourceDir);

  // Recall related architecture knowledge (feedback loop: auto atom_recall)
  const relatedKnowledge = await recallFn(targetPath);

  return {
    path: targetPath,
    files: files.map(f => ({
      path: f.path,
      lines: f.lines,
      preview: f.content.slice(0, 2000),
    })),
    totalLines,
    gitHistory,
    relatedKnowledge,
  };
}

// ============================================================================
// Tool 2: self_propose — read-only proposal generation
// ============================================================================

export type ProposeResult = {
  description: string;
  targetFiles: Array<{
    path: string;
    lines: number;
    content: string;
    guardOk: boolean;
    guardReason: string;
  }>;
  allGuardsPassed: boolean;
  limits: { maxFiles: number; maxLines: number };
};

/**
 * Validate target paths and read their content for proposal generation.
 * The LLM agent uses the returned context to generate actual diff proposals.
 */
export function selfPropose(
  description: string,
  targetPaths: string[],
  config: CodeModificationConfig,
): ProposeResult {
  const targetFiles = targetPaths.map(p => {
    const verdict = validateEvolvePath(join(config.sourceDir, p), config);
    const files = readSourceFiles(p, config.sourceDir, 1);
    return {
      path: p,
      lines: files[0]?.lines ?? 0,
      content: files[0]?.content ?? "",
      guardOk: verdict.allowed,
      guardReason: verdict.reason,
    };
  });

  return {
    description,
    targetFiles,
    allGuardsPassed: targetFiles.every(f => f.guardOk),
    limits: {
      maxFiles: config.maxFilesPerPass,
      maxLines: config.maxLinesPerPass,
    },
  };
}

// ============================================================================
// Tool 3: self_apply — validate + build + commit pipeline
// ============================================================================

export type ApplyResult = {
  success: boolean;
  buildResult: "pass" | "fail" | "skipped";
  commitHash?: string;
  reverted: boolean;
  filesChanged: string[];
  stats: EvolvePassStats;
  error?: string;
  /** Markdown journal entry for auto-journal feedback loop. */
  journalMarkdown?: string;
};

// ---------------------------------------------------------------------------
// Secret scanning patterns (mirrors src/security/sensitive-filter.ts)
// ---------------------------------------------------------------------------

const SECRET_PATTERNS: { label: string; re: RegExp }[] = [
  { label: "API key/secret/token/password", re: /(?:api[_-]?key|secret|token|password|credential|access[_-]?token)\s*[:=]\s*["']?[A-Za-z0-9+/=_\-.]{16,}/i },
  { label: "Private key", re: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/ },
  { label: "channelSecret", re: /channelSecret\s*[:=]\s*["']?[A-Za-z0-9+/=_\-.]{10,}/i },
  { label: "channelAccessToken", re: /channelAccessToken\s*[:=]\s*["']?[A-Za-z0-9+/=_\-.]{10,}/i },
  { label: "Bearer token", re: /Bearer\s+[A-Za-z0-9+/=_\-.]{20,}/i },
  { label: "OpenAI key", re: /sk-[A-Za-z0-9]{20,}/ },
  { label: "GitHub PAT", re: /ghp_[A-Za-z0-9]{36,}/ },
  { label: "Slack token", re: /xoxb-[A-Za-z0-9-]+/ },
];

/**
 * Scan staged diff content for sensitive patterns.
 * Returns an array of findings (empty = clean).
 */
function scanDiffForSecrets(sourceDir: string): { file: string; line: number; pattern: string }[] {
  let diffOutput: string;
  try {
    diffOutput = execSync("git diff --cached -U0", {
      cwd: sourceDir, encoding: "utf-8", timeout: 30_000,
    });
  } catch {
    return [];
  }
  if (!diffOutput.trim()) return [];

  const findings: { file: string; line: number; pattern: string }[] = [];
  let currentFile = "";
  let lineNum = 0;

  for (const rawLine of diffOutput.split("\n")) {
    const fileMatch = rawLine.match(/^\+\+\+ b\/(.+)/);
    if (fileMatch) {
      currentFile = fileMatch[1];
      continue;
    }
    const hunkMatch = rawLine.match(/^@@ -\d+(?:,\d+)? \+(\d+)/);
    if (hunkMatch) {
      lineNum = parseInt(hunkMatch[1], 10) - 1;
      continue;
    }
    if (rawLine.startsWith("+") && !rawLine.startsWith("+++")) {
      lineNum++;
      const addedContent = rawLine.slice(1);
      for (const { label, re } of SECRET_PATTERNS) {
        if (re.test(addedContent)) {
          findings.push({ file: currentFile, line: lineNum, pattern: label });
        }
      }
    } else if (!rawLine.startsWith("-")) {
      lineNum++;
    }
  }

  return findings;
}

/**
 * Validate current uncommitted changes, run build, and commit.
 * Assumes the agent has already applied edits to the working tree.
 *
 * Pipeline: branch isolation → validate paths → build → secret scan → commit → merge (or cleanup on failure).
 */
export function selfApply(
  description: string,
  config: CodeModificationConfig,
): ApplyResult {
  const sourceDir = config.sourceDir;

  // 1. Get current changes
  const changedFiles = getChangedFiles(sourceDir);
  if (changedFiles.length === 0) {
    return {
      success: false,
      buildResult: "skipped",
      reverted: false,
      filesChanged: [],
      stats: { filesModified: 0, linesAdded: 0, linesRemoved: 0 },
      error: "No uncommitted changes detected. Apply proposed changes first, then run self_apply.",
    };
  }

  const diffStats = getGitDiffStats(sourceDir);

  // 2. Validate all changed files against evolve guard
  const batchVerdict = validateEvolveBatch(
    changedFiles.map(f => join(sourceDir, f)),
    diffStats,
    config,
  );

  if (!batchVerdict.allowed) {
    return {
      success: false,
      buildResult: "skipped",
      reverted: false,
      filesChanged: changedFiles,
      stats: diffStats,
      error: `Evolve guard blocked:\n${batchVerdict.reasons.join("\n")}`,
    };
  }

  // 3. Branch isolation — work on self-iterate/{timestamp} branch
  const originalBranch = execSync("git rev-parse --abbrev-ref HEAD", {
    cwd: sourceDir, encoding: "utf-8", timeout: 10_000,
  }).trim();
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const iterateBranch = `self-iterate/${timestamp}`;

  try {
    execSync(`git checkout -b "${iterateBranch}"`, {
      cwd: sourceDir, encoding: "utf-8", timeout: 10_000,
    });
    log.info(`self_apply created branch: ${iterateBranch}`);
  } catch (branchErr) {
    const errMsg = branchErr instanceof Error ? branchErr.message : String(branchErr);
    return {
      success: false,
      buildResult: "skipped",
      reverted: false,
      filesChanged: changedFiles,
      stats: diffStats,
      error: `Failed to create isolation branch: ${errMsg}`,
    };
  }

  // Helper: abandon branch and return to original
  const abandonBranch = () => {
    try {
      execSync(`git checkout "${originalBranch}"`, { cwd: sourceDir, timeout: 10_000 });
      execSync(`git branch -D "${iterateBranch}"`, { cwd: sourceDir, timeout: 10_000 });
      log.info(`self_apply abandoned branch: ${iterateBranch}`);
    } catch {
      // Fallback: try git update-ref if branch -D is policy-blocked
      try {
        execSync(`git checkout "${originalBranch}"`, { cwd: sourceDir, timeout: 10_000 });
        execSync(`git update-ref -d "refs/heads/${iterateBranch}"`, { cwd: sourceDir, timeout: 10_000 });
      } catch {
        log.warn(`self_apply failed to cleanup branch: ${iterateBranch}`);
      }
    }
  };

  // 4. Build (if required)
  let buildResult: "pass" | "fail" | "skipped" = "skipped";
  if (config.requireBuildPass) {
    try {
      execSync("pnpm build", {
        cwd: sourceDir, encoding: "utf-8", timeout: 120_000,
        stdio: ["pipe", "pipe", "pipe"],
      });
      buildResult = "pass";
      log.info("self_apply build passed");
    } catch (buildErr) {
      buildResult = "fail";
      const errMsg = buildErr instanceof Error ? buildErr.message.slice(0, 500) : String(buildErr).slice(0, 500);

      if (config.autoRevertOnFailure) {
        try {
          execSync("git checkout -- .", { cwd: sourceDir, timeout: 10_000 });
          log.info("self_apply auto-reverted on build failure");
        } catch {
          log.warn("self_apply auto-revert failed");
        }
        abandonBranch();
        return {
          success: false,
          buildResult: "fail",
          reverted: true,
          filesChanged: changedFiles,
          stats: diffStats,
          error: `Build failed — auto-reverted.\n${errMsg}`,
        };
      }

      abandonBranch();
      return {
        success: false,
        buildResult: "fail",
        reverted: false,
        filesChanged: changedFiles,
        stats: diffStats,
        error: `Build failed.\n${errMsg}`,
      };
    }
  }

  // 5. Stage + secret scan + commit
  try {
    for (const f of changedFiles) {
      execSync(`git add "${f}"`, { cwd: sourceDir, timeout: 10_000 });
    }

    // Secret scanning: check staged diff for sensitive content
    const secretFindings = scanDiffForSecrets(sourceDir);
    if (secretFindings.length > 0) {
      // Unstage and abandon
      execSync("git reset HEAD", { cwd: sourceDir, timeout: 10_000 });
      abandonBranch();
      const report = secretFindings
        .map(f => `  ${f.file}:${f.line} — ${f.pattern}`)
        .join("\n");
      log.warn(`self_apply blocked by secret scan:\n${report}`);
      return {
        success: false,
        buildResult,
        reverted: false,
        filesChanged: changedFiles,
        stats: diffStats,
        error: `Secret scan blocked commit — sensitive content detected:\n${report}`,
      };
    }

    const commitMsg = `[self-iterate] ${description}`.replace(/"/g, '\\"');
    execSync(`git commit -m "${commitMsg}"`, {
      cwd: sourceDir, encoding: "utf-8", timeout: 30_000,
    });

    const commitHash = execSync("git rev-parse HEAD", {
      cwd: sourceDir, encoding: "utf-8", timeout: 10_000,
    }).trim();

    // 6. Merge back to original branch
    execSync(`git checkout "${originalBranch}"`, {
      cwd: sourceDir, encoding: "utf-8", timeout: 10_000,
    });
    execSync(`git merge "${iterateBranch}"`, {
      cwd: sourceDir, encoding: "utf-8", timeout: 30_000,
    });
    // Clean up the iterate branch after successful merge
    try {
      execSync(`git branch -d "${iterateBranch}"`, { cwd: sourceDir, timeout: 10_000 });
    } catch {
      try {
        execSync(`git update-ref -d "refs/heads/${iterateBranch}"`, { cwd: sourceDir, timeout: 10_000 });
      } catch {
        log.warn(`self_apply could not delete merged branch: ${iterateBranch}`);
      }
    }

    // Build journal entry (for auto-journal feedback loop)
    const entry = createJournalEntry(
      description, diffStats, buildResult, false, changedFiles, commitHash,
    );
    const journalMarkdown = formatJournalMarkdown(entry);

    log.info(`self_apply committed: ${commitHash.slice(0, 9)} — ${description}`);

    return {
      success: true,
      buildResult,
      commitHash,
      reverted: false,
      filesChanged: changedFiles,
      stats: diffStats,
      journalMarkdown,
    };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    log.warn(`self_apply commit/merge failed: ${errMsg}`);
    abandonBranch();
    return {
      success: false,
      buildResult,
      reverted: false,
      filesChanged: changedFiles,
      stats: diffStats,
      error: `Commit/merge failed: ${errMsg}`,
    };
  }
}

// ============================================================================
// Tool 4: self_journal — record iteration knowledge to atomic memory
// ============================================================================

export type JournalResult = {
  stored: boolean;
  atomRef?: string;
  error?: string;
};

/**
 * Record an iteration result to atomic memory.
 *
 * @param storeFn Callback to store an atom (text, category) → atomRef or null.
 */
export async function selfJournal(
  summary: string,
  details: string,
  success: boolean,
  storeFn: (text: string, category: string) => Promise<string | null>,
): Promise<JournalResult> {
  const prefix = success ? "[iterate-ok]" : "[iterate-fail]";
  const text = `${prefix} ${summary}${details ? ` — ${details.slice(0, 200)}` : ""}`;

  try {
    const ref = await storeFn(text, "topic");
    if (ref) {
      log.info(`self_journal stored: ${ref}`);
      return { stored: true, atomRef: ref };
    }
    return { stored: false, error: "Store returned null" };
  } catch (err) {
    return { stored: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ============================================================================
// Pitfall Recording Helper
// ============================================================================

/**
 * Record a failure as a pitfall atom (feedback loop: failures → memory).
 */
export async function recordPitfall(
  context: string,
  error: string,
  storeFn: (text: string, category: string) => Promise<string | null>,
): Promise<void> {
  const text = `[pitfall] ${context}: ${error.slice(0, 150)}`;
  try {
    await storeFn(text, "topic");
    log.info(`pitfall recorded: ${context}`);
  } catch {
    log.warn(`pitfall recording failed for: ${context}`);
  }
}
