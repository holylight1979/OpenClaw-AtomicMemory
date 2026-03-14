/**
 * Workspace Fact Reader — Read facts from main LLM's workspace files.
 *
 * Extracted from index.ts for modularity.
 * Reads MEMORY.md, USER.md, and daily memory files from workspace.
 */

import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { classifyFact } from "./classification.js";
import type { Logger } from "./logger.js";
import type { ExtractedFact } from "./types.js";

// ============================================================================
// Test fact detection
// ============================================================================

const TEST_SECTION_PATTERN = /^(testing|test|debug|測試|偵錯|除錯)$/i;

const TEST_CONTENT_PATTERNS = [
  /測試(碼|驗證碼|資料|用的)/,
  /test\s*(code|data|token|key|value)/i,
  /驗證碼/,
  /^XTEST|^ABC\d{3}|MEMORY-OK/i,
];

export function isTestFact(text: string): boolean {
  return TEST_CONTENT_PATTERNS.some((p) => p.test(text));
}

// ============================================================================
// Bullet fact parser
// ============================================================================

/**
 * Parse bullet-point lines (`- ...`) from markdown text into ExtractedFact[].
 * Skips headers, blank lines, metadata lines (bold prefixed like `**Name:**`).
 */
export function parseBulletFacts(content: string): ExtractedFact[] {
  const facts: ExtractedFact[] = [];
  let inTestSection = false;

  for (const line of content.split("\n")) {
    const trimmed = line.trim();

    // Track section headers — skip bullets under test/debug sections
    const headerMatch = trimmed.match(/^#{1,3}\s+(.+)/);
    if (headerMatch) {
      inTestSection = TEST_SECTION_PATTERN.test(headerMatch[1].trim());
      continue;
    }
    if (inTestSection) continue;

    // Only process bullet lines
    if (!trimmed.startsWith("- ")) continue;
    let text = trimmed.slice(2).trim();
    // Skip metadata lines like "**Name:** ..." or "**Timezone:** ..."
    if (/^\*\*[^*]+:\*\*/.test(text)) {
      // Extract the value part after the label
      const match = text.match(/^\*\*[^*]+:\*\*\s*(.+)/);
      if (!match || !match[1] || match[1].trim().length < 5) continue;
      text = match[1].trim();
    }
    if (text.length < 5 || text.length > 300) continue;

    facts.push({
      text,
      category: classifyFact(text),
      confidence: "[臨]",
    });
  }
  return facts;
}

// ============================================================================
// Workspace reader
// ============================================================================

/**
 * Read facts from the main LLM's MEMORY.md and USER.md files.
 * These files live in `{workspaceDir}/workspace/` and are maintained
 * by the primary LLM (GPT-5.4), so their quality is much higher
 * than local qwen3:1.7b extraction.
 */
export async function readFactsFromWorkspace(
  workspaceDir: string | undefined,
  log?: Logger,
): Promise<ExtractedFact[]> {
  if (!workspaceDir) {
    log?.info("no workspaceDir in context, skipping workspace read");
    return [];
  }

  // workspaceDir is already the workspace path (e.g. E:\.openclaw\workspace)
  // Do NOT append another "workspace" subdirectory
  const wsDir = workspaceDir;
  log?.info(`readFactsFromWorkspace wsDir=${wsDir}`);
  const facts: ExtractedFact[] = [];

  for (const filename of ["MEMORY.md", "USER.md"]) {
    const fullPath = join(wsDir, filename);
    try {
      const content = await readFile(fullPath, "utf-8");
      const parsed = parseBulletFacts(content);
      log?.info(`parsed ${parsed.length} facts from ${fullPath}`);
      facts.push(...parsed);
    } catch (err) {
      log?.warn(`failed to read ${fullPath}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Also read daily memory files (workspace/memory/YYYY-MM-DD.md)
  // GPT-5.4 writes new facts here, not in MEMORY.md directly
  const memoryDir = join(wsDir, "memory");
  try {
    const entries = await readdir(memoryDir);
    const mdFiles = entries.filter((f) => f.endsWith(".md")).sort().reverse(); // newest first
    // Only read the 3 most recent files to avoid excessive processing
    for (const filename of mdFiles.slice(0, 3)) {
      const fullPath = join(memoryDir, filename);
      try {
        const content = await readFile(fullPath, "utf-8");
        const parsed = parseBulletFacts(content);
        log?.info(`parsed ${parsed.length} facts from ${fullPath}`);
        facts.push(...parsed);
      } catch (err) {
        log?.warn(`failed to read ${fullPath}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  } catch {
    // memory/ directory may not exist, that's fine
    log?.info("no memory/ directory in workspace, skipping daily files");
  }

  return facts;
}
