/**
 * User Registry Lookup — fuzzy name-to-ID resolution.
 *
 * Match priority: exact > case-insensitive > nickname > history > partial.
 * Used by /promote and /demote commands + LLM tool.
 */

import type { UserRegistry, UserRegistryEntry, LookupResult } from "./types.js";

/**
 * Look up users by display name with fuzzy matching.
 *
 * @param registry  The loaded user registry.
 * @param query     The name to search for.
 * @param platform  Optional: restrict to a specific platform.
 * @returns Matches sorted by score (highest first).
 */
export function lookupByName(
  registry: UserRegistry,
  query: string,
  platform?: string,
): LookupResult[] {
  if (!query.trim()) return [];
  const results: LookupResult[] = [];
  const queryLower = query.toLowerCase().trim();

  for (const [key, entry] of Object.entries(registry.entries)) {
    // Platform filter
    if (platform && entry.platform !== platform) continue;

    const match = scoreMatch(entry, queryLower);
    if (match) {
      results.push({ entry, key, ...match });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}

/**
 * Look up a user directly by platform ID (exact match).
 * Useful when owner provides a raw ID instead of a name.
 */
export function lookupByPlatformId(
  registry: UserRegistry,
  platformId: string,
  platform?: string,
): LookupResult | undefined {
  for (const [key, entry] of Object.entries(registry.entries)) {
    if (platform && entry.platform !== platform) continue;
    if (entry.platformId === platformId) {
      return { entry, key, matchType: "exact", score: 100 };
    }
  }
  return undefined;
}

function scoreMatch(
  entry: UserRegistryEntry,
  queryLower: string,
): { matchType: LookupResult["matchType"]; score: number } | null {
  const nameLower = entry.displayName.toLowerCase();

  // Exact match (case-sensitive)
  if (entry.displayName === queryLower || nameLower === queryLower) {
    return { matchType: "exact", score: 100 };
  }

  // Case-insensitive match
  if (nameLower === queryLower) {
    return { matchType: "case-insensitive", score: 90 };
  }

  // Nickname match (Discord)
  if (entry.nickname) {
    const nickLower = entry.nickname.toLowerCase();
    if (nickLower === queryLower) {
      return { matchType: "nickname", score: 85 };
    }
  }

  // History match
  for (const historicalName of entry.nameHistory) {
    if (historicalName.toLowerCase() === queryLower) {
      return { matchType: "history", score: 70 };
    }
  }

  // Partial match (displayName starts with or contains query)
  if (nameLower.startsWith(queryLower)) {
    return { matchType: "partial", score: 60 };
  }
  if (nameLower.includes(queryLower)) {
    return { matchType: "partial", score: 50 };
  }

  // Partial match on nickname
  if (entry.nickname && entry.nickname.toLowerCase().includes(queryLower)) {
    return { matchType: "partial", score: 45 };
  }

  return null;
}

/**
 * Format a lookup result for display to the owner.
 * e.g. "Holy (line:U556bc...) — exact match"
 */
export function formatLookupResult(result: LookupResult): string {
  const { entry, matchType } = result;
  const idPreview =
    entry.platformId.length > 12
      ? `${entry.platformId.slice(0, 10)}...`
      : entry.platformId;
  const nick = entry.nickname ? ` aka "${entry.nickname}"` : "";
  return `${entry.displayName}${nick} (${entry.platform}:${idPreview}) — ${matchType} match`;
}
