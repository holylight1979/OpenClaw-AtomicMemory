/**
 * Unified Permission Level — shared across Core and Plugin layers.
 *
 * Four tiers: owner > admin > user > guest.
 * Numeric comparison enables implicit inheritance (admin can do everything user can).
 */

import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";

// ============================================================================
// Permission Level Types & Utilities
// ============================================================================

export type PermissionLevel = "owner" | "admin" | "user" | "guest";

const LEVEL_VALUE: Record<PermissionLevel, number> = {
  guest: 0,
  user: 1,
  admin: 2,
  owner: 3,
};

/** Check if sender's level meets the minimum required level. */
export function hasMinLevel(senderLevel: PermissionLevel, requiredLevel: PermissionLevel): boolean {
  return LEVEL_VALUE[senderLevel] >= LEVEL_VALUE[requiredLevel];
}

/** Get numeric value for a permission level (for sorting/comparison). */
export function getLevelValue(level: PermissionLevel): number {
  return LEVEL_VALUE[level];
}

// ============================================================================
// System Identity Registry (System.Owner.json)
// ============================================================================

export type PlatformOwnerEntry = {
  userId: string;
  displayName?: string;
  auto?: boolean;
  authenticatedAt?: string;
};

export type PlatformBotEntry = {
  botUserId: string;
};

export type SystemIdentity = {
  version: number;
  owner: {
    displayName: string;
    platforms: Record<string, PlatformOwnerEntry>;
  };
  bot: {
    displayName: string;
    platforms: Record<string, PlatformBotEntry>;
  };
  admins: Array<{ userId: string; platform?: string; displayName?: string }>;
};

const DEFAULT_IDENTITY_PATH = join(homedir(), ".openclaw", "System.Owner.json");

let cachedIdentity: SystemIdentity | null = null;
let identityLoadedPath: string | null = null;

export async function loadSystemIdentity(
  identityPath?: string,
): Promise<SystemIdentity | null> {
  const filePath = identityPath ?? DEFAULT_IDENTITY_PATH;
  if (cachedIdentity && identityLoadedPath === filePath) return cachedIdentity;
  try {
    const raw = await readFile(filePath, "utf-8");
    const data = JSON.parse(raw) as SystemIdentity;
    if (!data.owner || !data.bot) return null;
    cachedIdentity = data;
    identityLoadedPath = filePath;
    return data;
  } catch {
    return null;
  }
}

export async function saveSystemIdentity(
  identity: SystemIdentity,
  identityPath?: string,
): Promise<void> {
  const filePath = identityPath ?? DEFAULT_IDENTITY_PATH;
  await writeFile(filePath, JSON.stringify(identity, null, 2), "utf-8");
  cachedIdentity = identity;
  identityLoadedPath = filePath;
}

export function invalidateSystemIdentityCache(): void {
  cachedIdentity = null;
  identityLoadedPath = null;
}

export function isOwnerByIdentity(
  senderId: string | undefined,
  channel: string | undefined,
  identity: SystemIdentity | null,
): boolean {
  if (!senderId || !channel || !identity) return false;
  const platformEntry = identity.owner.platforms[channel];
  if (!platformEntry) return false;
  if (platformEntry.auto) return false;
  return platformEntry.userId === senderId && platformEntry.userId.length > 0;
}

export function isAdminByIdentity(
  senderId: string | undefined,
  channel: string | undefined,
  identity: SystemIdentity | null,
): boolean {
  if (!senderId || !identity || !identity.admins.length) return false;
  return identity.admins.some(
    (a) => a.userId === senderId && (!a.platform || a.platform === channel),
  );
}

// ============================================================================
// Unified Permission Level Resolution
// ============================================================================

export type PermissionLevelResolveParams = {
  senderIsOwner?: boolean;
  senderId?: string;
  channel?: string;
  identity?: SystemIdentity | null;
  adminIds?: string[];
  runtimeAdminIds?: string[];
  /** Whether the sender is in any allowFrom or channel allowlist. */
  isInAllowlist?: boolean;
};

/**
 * Resolve the effective permission level for a sender.
 * Used by both Core (command-auth.ts) and Plugin (permission-guard.ts) layers.
 */
export function resolveEffectivePermissionLevel(
  params: PermissionLevelResolveParams,
): PermissionLevel {
  // Owner: explicit flag or System.Owner.json match
  if (params.senderIsOwner === true) return "owner";
  if (params.identity && isOwnerByIdentity(params.senderId, params.channel, params.identity)) {
    return "owner";
  }
  // No sender ID and not owner → guest
  if (!params.senderId) return "guest";
  // Admin: config adminIds + runtime admins + System.Owner.json admins
  const allAdminIds = [...(params.adminIds ?? []), ...(params.runtimeAdminIds ?? [])];
  if (allAdminIds.includes(params.senderId)) return "admin";
  if (isAdminByIdentity(params.senderId, params.channel, params.identity ?? null)) return "admin";
  // User: in any allowlist
  if (params.isInAllowlist) return "user";
  // Guest: not recognized
  return "guest";
}
