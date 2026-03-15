/**
 * Scope Classifier — Determine atom scope from intent and fact content.
 *
 * G1-B: Cross-group command routing.
 * Memory commands (記住/忘記/更新) → user scope (propagates across groups).
 * Group settings (自動回覆/語言) → group scope (stays in current group).
 * Everything else → global scope (follows memoryIsolation setting).
 */

import type { AtomScope, ExtractedFact, IntentType } from "./types.js";

// ============================================================================
// Group-setting patterns — commands that should stay in the current group
// ============================================================================

const GROUP_SETTING_PATTERNS = [
  /自動回覆/,
  /auto[- ]?reply/i,
  /這個群/,
  /本群/,
  /群組設定/,
  /group setting/i,
  /語言設定/,
  /language setting/i,
  /頻道設定/,
  /channel setting/i,
];

// ============================================================================
// User-personal patterns — facts about the sender themselves
// ============================================================================

const USER_PERSONAL_PATTERNS = [
  /^(我|user|使用者)/,
  /my\s+/i,
  /我的/,
  /我叫/,
  /我住/,
  /我喜歡/,
  /我討厭/,
  /我偏好/,
  /i am\b/i,
  /i live\b/i,
  /i like\b/i,
  /i prefer\b/i,
  /i hate\b/i,
];

/**
 * Determine the scope for a captured fact based on intent and content.
 *
 * Rules:
 * 1. memory-store intent + personal pattern → 'user' (cross-group)
 * 2. memory-store intent + group setting pattern → 'group'
 * 3. memory-store intent + other → 'user' (default for explicit memory commands)
 * 4. command intent + group setting pattern → 'group'
 * 5. command intent + other → 'group' (commands are group-local by default)
 * 6. All other intents → 'global' (follows memoryIsolation setting)
 */
export function classifyScope(
  intent: IntentType,
  factText: string,
  prompt?: string,
): AtomScope {
  const textToCheck = prompt ?? factText;

  // Explicit memory commands → user-scoped by default
  if (intent === "memory-store") {
    // Unless it's clearly a group setting
    if (GROUP_SETTING_PATTERNS.some((p) => p.test(textToCheck))) {
      return "group";
    }
    return "user";
  }

  // Command intent → group-scoped by default
  if (intent === "command") {
    // Unless it's personal (e.g. "設定我的語言")
    if (USER_PERSONAL_PATTERNS.some((p) => p.test(textToCheck))) {
      return "user";
    }
    return "group";
  }

  // For all other intents (info-request, task, social, general, memory-query):
  // Check if the fact content is clearly personal
  if (isPersonalFact(factText)) {
    return "user";
  }

  return "global";
}

/**
 * Check if a fact text describes personal information about the sender.
 * Used to auto-scope LLM-extracted facts as 'user' even without explicit memory intent.
 */
function isPersonalFact(text: string): boolean {
  // Facts where who="user" or text starts with personal patterns
  return USER_PERSONAL_PATTERNS.some((p) => p.test(text));
}

/**
 * Determine recall scope — what scope of atoms to search for a given intent.
 *
 * Returns the set of scopes that should be included in recall results:
 * - memory-query → ['global', 'user'] (cross-group, skip group-only atoms from other groups)
 * - memory-store → ['global', 'user'] (need to check for duplicates across groups)
 * - command → ['global', 'group'] (group settings + shared knowledge)
 * - other → ['global', 'user', 'group'] (all visible atoms)
 */
export function getRecallScopes(intent: IntentType): AtomScope[] {
  switch (intent) {
    case "memory-query":
    case "memory-store":
      return ["global", "user"];
    case "command":
      return ["global", "group"];
    default:
      return ["global", "user", "group"];
  }
}
