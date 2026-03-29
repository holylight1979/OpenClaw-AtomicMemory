/**
 * User Registry — tracks platform user identities for name-to-ID resolution.
 *
 * Stored at ~/.openclaw/user-registry.json alongside System.Owner.json.
 * Written on auto-promotion (guest -> user) and updated on every group message.
 */

/** A single known user entry keyed by "{platform}:{platformId}". */
export type UserRegistryEntry = {
  platform: string;
  platformId: string;
  displayName: string;
  /** Discord server nickname (separate from global displayName). */
  nickname?: string;
  /** Historical display names, most recent first. Max length: NAME_HISTORY_LIMIT. */
  nameHistory: string[];
  firstSeenAt: string;
  lastSeenAt: string;
  /** Last group where this user was active. */
  lastSeenGroup?: string;
};

export type UserRegistry = {
  version: 1;
  entries: Record<string, UserRegistryEntry>;
};

export type UpsertRegistryParams = {
  platform: string;
  platformId: string;
  displayName: string;
  nickname?: string;
  groupId?: string;
};

export type LookupResult = {
  entry: UserRegistryEntry;
  key: string;
  matchType: "exact" | "case-insensitive" | "nickname" | "history" | "partial";
  score: number;
};

export const NAME_HISTORY_LIMIT = 7;

export const EMPTY_REGISTRY: UserRegistry = { version: 1, entries: {} };
