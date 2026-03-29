/**
 * /promote and /demote command handlers.
 *
 * Owner-only commands to manage admin roles via the User Registry + System.Owner.json.
 *
 * Usage:
 *   /promote <displayName|platformId>   → user -> admin
 *   /demote  <displayName|platformId>   → admin -> user
 */

import {
  loadSystemIdentity,
  saveSystemIdentity,
  invalidateSystemIdentityCache,
} from "../../channels/permission-level.js";
import { loadUserRegistry, lookupByName, lookupByPlatformId, formatLookupResult } from "../../user-registry/index.js";
import type { LookupResult } from "../../user-registry/index.js";
import type { CommandHandler } from "./commands-types.js";

const PROMOTE_REGEX = /^\/promote\s+(.+)$/i;
const DEMOTE_REGEX = /^\/demote\s+(.+)$/i;

function resolveChannel(params: { command: { channel: string } }): string {
  return params.command.channel;
}

async function resolveTarget(
  query: string,
  channel: string,
): Promise<{ results: LookupResult[]; error?: string }> {
  const registry = await loadUserRegistry();
  // Try name lookup first
  let results = lookupByName(registry, query, channel);

  // If no results on current platform, try cross-platform
  if (results.length === 0) {
    results = lookupByName(registry, query);
  }

  // Try as raw platform ID
  if (results.length === 0) {
    const byId = lookupByPlatformId(registry, query, channel);
    if (byId) {
      results = [byId];
    }
  }

  if (results.length === 0) {
    return { results: [], error: `No user found matching "${query}". Check the name or ID.` };
  }

  return { results };
}

export const handlePromoteCommand: CommandHandler = async (params, allowTextCommands) => {
  if (!allowTextCommands) return null;

  const match = params.command.commandBodyNormalized.match(PROMOTE_REGEX);
  if (!match) return null;

  // Owner-only gate (redundant with permissionLevel but safe)
  if (!params.command.senderIsOwner) {
    return { shouldContinue: false, reply: { text: "\u26d4 Only the owner can promote users." } };
  }

  const query = match[1].trim();
  const channel = resolveChannel(params);
  const { results, error } = await resolveTarget(query, channel);

  if (error) {
    return { shouldContinue: false, reply: { text: `\u274c ${error}` } };
  }

  // Multiple matches — ask owner to be more specific
  if (results.length > 1 && results[0].score === results[1].score) {
    const list = results.slice(0, 5).map((r) => `  \u2022 ${formatLookupResult(r)}`).join("\n");
    return {
      shouldContinue: false,
      reply: { text: `Multiple users match "${query}":\n${list}\nPlease be more specific.` },
    };
  }

  const target = results[0];
  const identity = await loadSystemIdentity();
  if (!identity) {
    return { shouldContinue: false, reply: { text: "\u274c System.Owner.json not found." } };
  }

  // Check if already admin
  const alreadyAdmin = identity.admins.some(
    (a) => a.userId === target.entry.platformId && (!a.platform || a.platform === target.entry.platform),
  );
  if (alreadyAdmin) {
    return {
      shouldContinue: false,
      reply: { text: `${target.entry.displayName} is already an admin.` },
    };
  }

  // Add to admins
  identity.admins.push({
    userId: target.entry.platformId,
    platform: target.entry.platform,
    displayName: target.entry.displayName,
  });
  await saveSystemIdentity(identity);
  invalidateSystemIdentityCache();

  return {
    shouldContinue: false,
    reply: {
      text: `\u2705 Promoted **${target.entry.displayName}** (${target.entry.platform}:${target.entry.platformId}) to admin.`,
    },
  };
};

export const handleDemoteCommand: CommandHandler = async (params, allowTextCommands) => {
  if (!allowTextCommands) return null;

  const match = params.command.commandBodyNormalized.match(DEMOTE_REGEX);
  if (!match) return null;

  // Owner-only gate
  if (!params.command.senderIsOwner) {
    return { shouldContinue: false, reply: { text: "\u26d4 Only the owner can demote admins." } };
  }

  const query = match[1].trim();
  const channel = resolveChannel(params);
  const { results, error } = await resolveTarget(query, channel);

  if (error) {
    return { shouldContinue: false, reply: { text: `\u274c ${error}` } };
  }

  // Multiple matches
  if (results.length > 1 && results[0].score === results[1].score) {
    const list = results.slice(0, 5).map((r) => `  \u2022 ${formatLookupResult(r)}`).join("\n");
    return {
      shouldContinue: false,
      reply: { text: `Multiple users match "${query}":\n${list}\nPlease be more specific.` },
    };
  }

  const target = results[0];
  const identity = await loadSystemIdentity();
  if (!identity) {
    return { shouldContinue: false, reply: { text: "\u274c System.Owner.json not found." } };
  }

  // Find and remove from admins
  const idx = identity.admins.findIndex(
    (a) => a.userId === target.entry.platformId && (!a.platform || a.platform === target.entry.platform),
  );
  if (idx === -1) {
    return {
      shouldContinue: false,
      reply: { text: `${target.entry.displayName} is not an admin.` },
    };
  }

  identity.admins.splice(idx, 1);
  await saveSystemIdentity(identity);
  invalidateSystemIdentityCache();

  return {
    shouldContinue: false,
    reply: {
      text: `\u2705 Demoted **${target.entry.displayName}** from admin to user.`,
    },
  };
};
