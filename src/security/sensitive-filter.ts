/**
 * Sensitive Information Filter — Phase 2.5 Security Core
 *
 * Code-level filtering (not prompt-level) to prevent sensitive data leakage.
 * Three layers: tool call interception → tool result filtering → LLM output filtering.
 *
 * Cannot be bypassed by prompt injection — all checks are hardcoded regex + config globs.
 */

import { createSubsystemLogger } from "../logging/subsystem.js";
import type { SecurityConfig } from "../config/types.security.js";

const log = createSubsystemLogger("security/sensitive-filter");

// ---------------------------------------------------------------------------
// 1. Hardcoded sensitive patterns (always active, not configurable)
// ---------------------------------------------------------------------------

/** File path patterns — match against tool params containing file paths. */
const SENSITIVE_PATH_PATTERNS: RegExp[] = [
  /\.env($|\.)/i,
  /secrets?\//i,
  /credentials?\./i,
  /auth-profiles?\.json/i,
  /System\.Owner\.json/i,
  /openclaw\.json/i,
  /\.pem$/i,
  /\.key$/i,
  /id_rsa/i,
  /id_ed25519/i,
];

/** Content patterns — match against tool results and LLM output text. */
const SENSITIVE_CONTENT_PATTERNS: RegExp[] = [
  // Key-value secrets (API keys, tokens, passwords)
  /(?:api[_-]?key|secret|token|password|credential|access[_-]?token)\s*[:=]\s*["']?[A-Za-z0-9+/=_\-.]{16,}/i,
  // Private keys
  /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/,
  // OpenClaw config secrets
  /channelSecret\s*[:=]\s*["']?[A-Za-z0-9+/=_\-.]{10,}/i,
  /channelAccessToken\s*[:=]\s*["']?[A-Za-z0-9+/=_\-.]{10,}/i,
  // Bearer tokens
  /Bearer\s+[A-Za-z0-9+/=_\-.]{20,}/i,
  // Common secret formats
  /sk-[A-Za-z0-9]{20,}/,
  /ghp_[A-Za-z0-9]{36,}/,
  /xoxb-[A-Za-z0-9-]+/,
];

// ---------------------------------------------------------------------------
// 2. Session sender store — tracks owner status per session
// ---------------------------------------------------------------------------

const sessionSenderMap = new Map<string, boolean>();
const MAX_TRACKED_SESSIONS = 512;

export function registerSessionSender(sessionKey: string, isOwner: boolean): void {
  if (sessionSenderMap.size >= MAX_TRACKED_SESSIONS) {
    const oldest = sessionSenderMap.keys().next().value;
    if (oldest) sessionSenderMap.delete(oldest);
  }
  sessionSenderMap.set(sessionKey, isOwner);
}

export function unregisterSessionSender(sessionKey: string): void {
  sessionSenderMap.delete(sessionKey);
}

export function isSessionOwner(sessionKey: string): boolean {
  return sessionSenderMap.get(sessionKey) === true;
}

// ---------------------------------------------------------------------------
// 3. Config-driven patterns (loaded once, cached)
// ---------------------------------------------------------------------------

let configPatterns: RegExp[] = [];
let configPaths: RegExp[] = [];

/**
 * Load additional patterns from openclaw.json security config.
 * Called once at startup or when config changes.
 */
export function loadSecurityConfig(config?: SecurityConfig): void {
  configPatterns = [];
  configPaths = [];
  if (!config) return;
  for (const pat of config.sensitivePatterns ?? []) {
    try {
      configPatterns.push(new RegExp(pat, "i"));
    } catch {
      log.warn(`Invalid sensitivePatterns regex: ${pat}`);
    }
  }
  for (const pat of config.sensitivePaths ?? []) {
    try {
      // Convert glob-like patterns to regex: ** → .*, * → [^/]*, ? → .
      const regexStr = pat
        .replace(/[.+^${}()|[\]\\]/g, "\\$&")
        .replace(/\*\*/g, ".*")
        .replace(/\*/g, "[^/]*")
        .replace(/\?/g, ".");
      configPaths.push(new RegExp(regexStr, "i"));
    } catch {
      log.warn(`Invalid sensitivePaths glob: ${pat}`);
    }
  }
}

// ---------------------------------------------------------------------------
// 4. Core filter functions
// ---------------------------------------------------------------------------

/** Check if a file path matches sensitive patterns. */
export function isSensitivePath(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, "/");
  for (const pattern of SENSITIVE_PATH_PATTERNS) {
    if (pattern.test(normalized)) return true;
  }
  for (const pattern of configPaths) {
    if (pattern.test(normalized)) return true;
  }
  return false;
}

/** Check if text content matches sensitive content patterns. */
export function containsSensitiveContent(text: string): boolean {
  for (const pattern of SENSITIVE_CONTENT_PATTERNS) {
    if (pattern.test(text)) return true;
  }
  for (const pattern of configPatterns) {
    if (pattern.test(text)) return true;
  }
  return false;
}

/** Replace sensitive content in text with [已過濾] placeholders. */
export function redactSensitiveContent(text: string): string {
  let result = text;
  for (const pattern of [...SENSITIVE_CONTENT_PATTERNS, ...configPatterns]) {
    // Use global version for replacement
    const globalPattern = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g");
    result = result.replace(globalPattern, "[已過濾]");
  }
  return result;
}

// ---------------------------------------------------------------------------
// 5. Layer A — before_tool_call: Sensitive path interception
// ---------------------------------------------------------------------------

/**
 * Extract file path from tool params (read, edit, write, exec, etc.)
 */
function extractFilePath(toolName: string, params: unknown): string | undefined {
  if (!params || typeof params !== "object") return undefined;
  const p = params as Record<string, unknown>;
  // read/edit/write tools use file_path or path
  if (p.file_path && typeof p.file_path === "string") return p.file_path;
  if (p.path && typeof p.path === "string") return p.path;
  // exec tool: scan command string for sensitive paths
  if (toolName === "exec" || toolName === "bash") {
    const cmd = (p.command ?? p.cmd) as string | undefined;
    if (typeof cmd === "string") {
      // Check if the command references sensitive files
      for (const pattern of [...SENSITIVE_PATH_PATTERNS, ...configPaths]) {
        if (pattern.test(cmd)) return cmd;
      }
    }
  }
  return undefined;
}

export type SensitivePathCheckResult =
  | { blocked: false }
  | { blocked: true; reason: string };

/**
 * Check if a tool call targets a sensitive path.
 * - Non-owner → block silently
 * - Owner → allow (result will be filtered later in tool_result_persist)
 */
export function checkToolCallSensitivity(
  toolName: string,
  params: unknown,
  senderIsOwner: boolean,
): SensitivePathCheckResult {
  const filePath = extractFilePath(toolName, params);
  if (!filePath) return { blocked: false };

  if (!isSensitivePath(filePath)) return { blocked: false };

  if (senderIsOwner) {
    // Owner: allow tool execution, results will be filtered by tool_result_persist
    return { blocked: false };
  }

  // Non-owner: block silently
  log.info(
    `[sensitive-filter] blocked tool_call: tool=${toolName} (non-owner access to sensitive path)`,
  );
  return {
    blocked: true,
    reason: "", // Silent — empty reason means no message to user
  };
}

// ---------------------------------------------------------------------------
// 6. Layer B — tool_result_persist: Content filtering
// ---------------------------------------------------------------------------

/**
 * Filter sensitive content from a tool result text.
 * - Non-owner: return empty string (silent)
 * - Owner: return path-only notification
 */
export function filterToolResultContent(
  text: string,
  toolName: string,
  params: unknown,
  senderIsOwner: boolean,
): { filtered: boolean; text: string } {
  const filePath = extractFilePath(toolName, params);
  const pathIsSensitive = filePath ? isSensitivePath(filePath) : false;
  const contentIsSensitive = containsSensitiveContent(text);

  if (!pathIsSensitive && !contentIsSensitive) {
    return { filtered: false, text };
  }

  log.info(
    `[sensitive-filter] filtered tool_result: tool=${toolName} owner=${senderIsOwner} ` +
      `path_sensitive=${pathIsSensitive} content_sensitive=${contentIsSensitive}`,
  );

  if (!senderIsOwner) {
    // Non-owner: silent — return empty
    return { filtered: true, text: "" };
  }

  // Owner: tell them the path exists but don't show content
  if (pathIsSensitive && filePath) {
    const normalizedPath = filePath.replace(/\\/g, "/");
    return {
      filtered: true,
      text: `[敏感資訊] 檔案位於 ${normalizedPath}，請親自查閱。內容已過濾。`,
    };
  }

  // Content-only sensitive: redact the specific patterns
  return { filtered: true, text: redactSensitiveContent(text) };
}

// ---------------------------------------------------------------------------
// 7. Layer C — before_message_write: LLM output filtering (last defense)
// ---------------------------------------------------------------------------

/**
 * Scan and redact sensitive content in LLM output text.
 * This is the last defense — catches secrets the LLM "remembers" from context.
 */
export function filterLlmOutput(text: string): { filtered: boolean; text: string } {
  if (!containsSensitiveContent(text)) {
    return { filtered: false, text };
  }

  log.info("[sensitive-filter] filtered llm_output: sensitive content detected in assistant response");
  return { filtered: true, text: redactSensitiveContent(text) };
}

// ---------------------------------------------------------------------------
// 8. Testing helpers
// ---------------------------------------------------------------------------

export const __testing = {
  SENSITIVE_PATH_PATTERNS,
  SENSITIVE_CONTENT_PATTERNS,
  sessionSenderMap,
  extractFilePath,
};
