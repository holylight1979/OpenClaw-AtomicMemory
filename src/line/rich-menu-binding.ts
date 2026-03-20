/**
 * Rich Menu Binding Service — auto-bind per-user rich menus based on permission level.
 *
 * Resolves the sender's permission level via `resolveEffectivePermissionLevel()`,
 * maps it to one of 3 rich menu tiers (owner / admin / user), and calls the
 * LINE Messaging API to link the correct richMenuId to the user.
 *
 * An in-memory cache avoids redundant API calls within the same process lifetime.
 */

import { loadConfig } from "../config/config.js";
import type { OpenClawConfig } from "../config/types.openclaw.js";
import {
  resolveEffectivePermissionLevel,
  loadSystemIdentity,
  type PermissionLevel,
  type SystemIdentity,
} from "../channels/permission-level.js";
import { logVerbose } from "../globals.js";
import { linkRichMenuToUser } from "./rich-menu.js";
import { resolveLineAccount } from "./accounts.js";
import type { ResolvedLineAccount } from "./types.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RichMenuIds {
  owner?: string;
  admin?: string;
  user?: string;
}

interface CacheEntry {
  menuId: string;
  boundAt: number;
}

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

/** Per-account cache: `Map<"accountId:userId", CacheEntry>` */
const bindingCache = new Map<string, CacheEntry>();

/** Cache entries older than this are re-evaluated. */
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

function cacheKey(accountId: string, userId: string): string {
  return `${accountId}:${userId}`;
}

/** Invalidate cache for a specific user (e.g. when admin list changes). */
export function invalidateRichMenuCache(accountId: string, userId: string): void {
  bindingCache.delete(cacheKey(accountId, userId));
}

/** Invalidate all cached bindings. */
export function invalidateAllRichMenuCache(): void {
  bindingCache.clear();
}

// ---------------------------------------------------------------------------
// Resolution
// ---------------------------------------------------------------------------

function resolveMenuIdForLevel(level: PermissionLevel, richMenus: RichMenuIds): string | undefined {
  switch (level) {
    case "owner":
      return richMenus.owner ?? richMenus.admin ?? richMenus.user;
    case "admin":
      return richMenus.admin ?? richMenus.user;
    case "user":
    case "guest":
      return richMenus.user;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface EnsureRichMenuBindingParams {
  userId: string;
  accountId: string;
  account: ResolvedLineAccount;
  cfg: OpenClawConfig;
  /** Pre-resolved identity (avoids duplicate file reads). */
  identity?: SystemIdentity | null;
  /** Override: if the caller already knows sender is owner. */
  senderIsOwner?: boolean;
}

/**
 * Ensure the correct rich menu is bound to a LINE user.
 * This is designed to be called fire-and-forget from webhook handlers.
 * Errors are swallowed and logged — rich menu binding must never block messaging.
 */
export async function ensureRichMenuBinding(params: EnsureRichMenuBindingParams): Promise<void> {
  try {
    await ensureRichMenuBindingInner(params);
  } catch (err) {
    logVerbose(`line: rich-menu binding error for ${params.userId}: ${String(err)}`);
  }
}

async function ensureRichMenuBindingInner(params: EnsureRichMenuBindingParams): Promise<void> {
  const { userId, accountId, account, cfg } = params;

  // Read richMenus config
  const richMenus: RichMenuIds | undefined = (account.config as Record<string, unknown>)
    .richMenus as RichMenuIds | undefined;
  if (!richMenus || (!richMenus.owner && !richMenus.admin && !richMenus.user)) {
    return; // Not configured — nothing to do
  }

  // Check cache
  const key = cacheKey(accountId, userId);
  const cached = bindingCache.get(key);

  // Resolve permission level
  const identity = params.identity ?? (await loadSystemIdentity());

  // Build allowlist check
  const allowFrom = account.config.allowFrom;
  const normalizedUserId = userId.replace(/^line:(?:user:)?/i, "");
  const isInAllowlist = Array.isArray(allowFrom)
    ? allowFrom.some((entry) => String(entry).replace(/^line:(?:user:)?/i, "") === normalizedUserId)
    : false;

  const level = resolveEffectivePermissionLevel({
    senderIsOwner: params.senderIsOwner,
    senderId: normalizedUserId,
    channel: "line",
    identity,
    adminIds: [],
    isInAllowlist,
  });

  const targetMenuId = resolveMenuIdForLevel(level, richMenus);
  if (!targetMenuId) {
    return; // No menu configured for this level
  }

  // Cache hit — already bound to the correct menu
  if (cached && cached.menuId === targetMenuId && Date.now() - cached.boundAt < CACHE_TTL_MS) {
    return;
  }

  // Call LINE API
  await linkRichMenuToUser(userId, targetMenuId, {
    accountId,
    channelAccessToken: account.channelAccessToken,
  });

  // Update cache
  bindingCache.set(key, { menuId: targetMenuId, boundAt: Date.now() });

  logVerbose(`line: bound rich menu ${targetMenuId} (${level}) to user ${userId}`);
}
