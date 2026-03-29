/**
 * User Registry Store — CRUD operations for user-registry.json.
 *
 * Follows the same patterns as pairing-store.ts:
 * - readJsonFileWithFallback for safe reads
 * - writeJsonFileAtomically for atomic writes
 * - resolveStateDir() for storage path
 */

import path from "node:path";
import { readJsonFileWithFallback, writeJsonFileAtomically } from "../plugin-sdk/json-store.js";
import { resolveStateDir } from "../config/paths.js";
import type { UserRegistry, UserRegistryEntry, UpsertRegistryParams } from "./types.js";
import { EMPTY_REGISTRY, NAME_HISTORY_LIMIT } from "./types.js";

const REGISTRY_FILENAME = "user-registry.json";

let cachedRegistry: UserRegistry | null = null;
let cachedRegistryPath: string | null = null;

function resolveRegistryPath(env?: NodeJS.ProcessEnv): string {
  return path.join(resolveStateDir(env), REGISTRY_FILENAME);
}

/** Build the composite key for a registry entry. */
export function registryKey(platform: string, platformId: string): string {
  return `${platform}:${platformId}`;
}

/** Load the registry from disk (cached after first load). */
export async function loadUserRegistry(
  registryPath?: string,
  env?: NodeJS.ProcessEnv,
): Promise<UserRegistry> {
  const filePath = registryPath ?? resolveRegistryPath(env);
  if (cachedRegistry && cachedRegistryPath === filePath) return cachedRegistry;
  const { value } = await readJsonFileWithFallback<UserRegistry>(filePath, EMPTY_REGISTRY);
  // Ensure version field
  if (!value.version || !value.entries) {
    cachedRegistry = EMPTY_REGISTRY;
    cachedRegistryPath = filePath;
    return EMPTY_REGISTRY;
  }
  cachedRegistry = value;
  cachedRegistryPath = filePath;
  return value;
}

/** Persist the registry to disk and update cache. */
export async function saveUserRegistry(
  registry: UserRegistry,
  registryPath?: string,
  env?: NodeJS.ProcessEnv,
): Promise<void> {
  const filePath = registryPath ?? resolveRegistryPath(env);
  await writeJsonFileAtomically(filePath, registry);
  cachedRegistry = registry;
  cachedRegistryPath = filePath;
}

/** Clear cached registry (useful after external edits). */
export function invalidateRegistryCache(): void {
  cachedRegistry = null;
  cachedRegistryPath = null;
}

/**
 * Create or update a user registry entry.
 *
 * - New user: creates entry with current timestamp.
 * - Existing user: updates lastSeenAt, displayName, nickname, lastSeenGroup.
 *   If displayName changed, prepends old name to nameHistory (capped at NAME_HISTORY_LIMIT).
 */
export async function upsertRegistryEntry(
  params: UpsertRegistryParams,
  registryPath?: string,
  env?: NodeJS.ProcessEnv,
): Promise<UserRegistryEntry> {
  const registry = await loadUserRegistry(registryPath, env);
  const key = registryKey(params.platform, params.platformId);
  const now = new Date().toISOString();
  const existing = registry.entries[key];

  if (existing) {
    // Update lastSeenAt
    existing.lastSeenAt = now;

    // Update group if provided
    if (params.groupId) {
      existing.lastSeenGroup = params.groupId;
    }

    // Update nickname if provided (Discord server nickname)
    if (params.nickname !== undefined) {
      existing.nickname = params.nickname;
    }

    // Track display name changes
    if (params.displayName && params.displayName !== existing.displayName) {
      const oldName = existing.displayName;
      existing.displayName = params.displayName;
      // Prepend old name to history (avoid duplicates)
      if (!existing.nameHistory.includes(oldName)) {
        existing.nameHistory.unshift(oldName);
        if (existing.nameHistory.length > NAME_HISTORY_LIMIT) {
          existing.nameHistory = existing.nameHistory.slice(0, NAME_HISTORY_LIMIT);
        }
      }
    }

    registry.entries[key] = existing;
    await saveUserRegistry(registry, registryPath, env);
    return existing;
  }

  // New entry
  const entry: UserRegistryEntry = {
    platform: params.platform,
    platformId: params.platformId,
    displayName: params.displayName,
    nickname: params.nickname,
    nameHistory: [],
    firstSeenAt: now,
    lastSeenAt: now,
    lastSeenGroup: params.groupId,
  };

  registry.entries[key] = entry;
  await saveUserRegistry(registry, registryPath, env);
  return entry;
}

/** Get a specific entry by platform + platformId. */
export async function getRegistryEntry(
  platform: string,
  platformId: string,
  registryPath?: string,
  env?: NodeJS.ProcessEnv,
): Promise<UserRegistryEntry | undefined> {
  const registry = await loadUserRegistry(registryPath, env);
  return registry.entries[registryKey(platform, platformId)];
}

/** Remove a specific entry from the registry. */
export async function removeRegistryEntry(
  platform: string,
  platformId: string,
  registryPath?: string,
  env?: NodeJS.ProcessEnv,
): Promise<boolean> {
  const registry = await loadUserRegistry(registryPath, env);
  const key = registryKey(platform, platformId);
  if (!(key in registry.entries)) return false;
  delete registry.entries[key];
  await saveUserRegistry(registry, registryPath, env);
  return true;
}
