/**
 * Entity Resolver — Cross-channel entity resolution via alias matching.
 *
 * Resolves sender IDs across channels to existing person atoms.
 * V2: identityLinks-aware resolution + cross-platform person merge.
 */

import type { Atom, AtomSource, Confidence } from "./types.js";
import type { AtomStore } from "./atom-store.js";

/** identityLinks format from OpenClaw session config. */
export type IdentityLinks = Record<string, string[]>;

/**
 * Find a person atom that matches the given sender identity.
 *
 * Matching strategies (in priority order):
 * 1. Exact source match: atom.sources contains {channel, senderId}
 * 2. identityLinks canonical match: sender belongs to same canonical group as atom
 * 3. Trigger match: senderId or displayName appears in atom.triggers
 * 4. Channel-prefixed trigger (e.g., "telegram:12345")
 *
 * @param senderId - The sender's platform-specific ID
 * @param channel - The messaging channel (whatsapp, telegram, etc.)
 * @param displayName - Optional display name for trigger matching
 * @param personAtoms - List of person-category atoms to search
 * @param identityLinks - Optional cross-platform identity mapping
 */
export function resolveEntity(
  senderId: string,
  channel: string,
  displayName: string | undefined,
  personAtoms: Atom[],
  identityLinks?: IdentityLinks,
): Atom | null {
  // Strategy 1: Exact source match
  for (const atom of personAtoms) {
    for (const src of atom.sources) {
      if (src.channel === channel && src.senderId === senderId) {
        return atom;
      }
    }
  }

  // Strategy 2: identityLinks canonical match
  if (identityLinks) {
    const linkedPeerIds = resolveLinkedPeerIds(senderId, channel, identityLinks);
    if (linkedPeerIds.length > 0) {
      for (const atom of personAtoms) {
        for (const src of atom.sources) {
          if (!src.senderId) continue;
          for (const linked of linkedPeerIds) {
            if (src.channel === linked.channel && src.senderId === linked.senderId) {
              return atom;
            }
          }
        }
      }
    }
  }

  // Strategy 3: Trigger match on senderId or displayName
  const identifiers = [senderId];
  if (displayName) identifiers.push(displayName);

  for (const atom of personAtoms) {
    for (const trigger of atom.triggers) {
      for (const ident of identifiers) {
        if (
          trigger.toLowerCase() === ident.toLowerCase()
        ) {
          return atom;
        }
      }
    }
  }

  // Strategy 4: Channel-prefixed trigger (e.g., "telegram:12345")
  const channelPrefixed = `${channel}:${senderId}`;
  for (const atom of personAtoms) {
    for (const trigger of atom.triggers) {
      if (trigger === channelPrefixed) {
        return atom;
      }
    }
  }

  return null;
}

/**
 * Find or auto-create a person atom for a sender.
 * Called on each agent_end to ensure every identified sender has a person atom.
 *
 * - First tries resolveEntity() to find existing match (with identityLinks)
 * - If not found, creates a new person atom with sender identity as triggers
 * - If identityLinks match exists and autoMerge is on, merges cross-platform sources
 * - Always updates lastUsed on the matched/created atom
 */
export async function ensurePersonAtom(
  senderId: string,
  channel: string,
  displayName: string | undefined,
  store: AtomStore,
  identityLinks?: IdentityLinks,
  autoMerge?: boolean,
): Promise<Atom> {
  const personAtoms = await store.list("person");
  const existing = resolveEntity(senderId, channel, displayName, personAtoms, identityLinks);

  if (existing) {
    // Update lastUsed and ensure source is tracked
    const patch: Parameters<AtomStore["update"]>[2] = {
      lastUsed: new Date().toISOString().slice(0, 10),
      sources: [{ channel, senderId }],
    };

    // If identityLinks available + autoMerge, add all linked sources + triggers
    if (identityLinks && autoMerge !== false) {
      const linked = resolveLinkedPeerIds(senderId, channel, identityLinks);
      if (linked.length > 0) {
        patch.sources = [{ channel, senderId }, ...linked];
      }
    }

    await store.update("person", existing.id, patch);
    return (await store.get("person", existing.id)) ?? existing;
  }

  // Create new person atom
  const atomId = (displayName ?? senderId).slice(0, 40).replace(/[<>:"/\\|?*]/g, "").replace(/\s+/g, "-").toLowerCase();
  const triggers: string[] = [];
  if (displayName && displayName.length >= 2) triggers.push(displayName);
  if (senderId.length >= 2 && senderId !== displayName) triggers.push(senderId);
  triggers.push(`${channel}:${senderId}`);

  // Add linked platform triggers + sources
  const sources: AtomSource[] = [{ channel, senderId }];
  if (identityLinks && autoMerge !== false) {
    const linked = resolveLinkedPeerIds(senderId, channel, identityLinks);
    for (const lp of linked) {
      sources.push(lp);
      const prefixed = `${lp.channel}:${lp.senderId}`;
      if (!triggers.includes(prefixed)) triggers.push(prefixed);
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const newAtom: Atom = {
    id: atomId,
    title: displayName ?? senderId,
    category: "person",
    confidence: "[臨]" as Confidence,
    triggers,
    lastUsed: today,
    confirmations: 0,
    tags: ["auto-created"],
    related: [],
    sources,
    scope: "user",
    knowledge: `- ${channel} 使用者: ${displayName ?? senderId}`,
    actions: "",
    evolutionLog: [`${today}: 自動建立 (${channel})`],
  };

  return store.create(newAtom);
}

/**
 * Manually link a person atom to a new platform identity.
 * Adds the new source + channel-prefixed trigger to the existing atom.
 *
 * @returns Updated atom, or null if not found.
 */
export async function linkPersonAcrossPlatforms(
  atomId: string,
  newChannel: string,
  newSenderId: string,
  store: AtomStore,
  newDisplayName?: string,
): Promise<Atom | null> {
  const atom = await store.get("person", atomId);
  if (!atom) return null;

  const today = new Date().toISOString().slice(0, 10);
  const newTriggers = [...atom.triggers];
  const prefixed = `${newChannel}:${newSenderId}`;
  if (!newTriggers.includes(prefixed)) newTriggers.push(prefixed);
  if (newDisplayName && newDisplayName.length >= 2 && !newTriggers.includes(newDisplayName)) {
    newTriggers.push(newDisplayName);
  }

  await store.update("person", atomId, {
    sources: [{ channel: newChannel, senderId: newSenderId }],
    triggers: newTriggers,
    lastUsed: today,
    appendKnowledge: `${newChannel} 身份: ${newDisplayName ?? newSenderId}`,
    appendEvolution: `${today}: 跨平台綁定 ${newChannel}:${newSenderId}`,
  });

  return await store.get("person", atomId);
}

/**
 * Given a senderId + channel, find all other peer IDs in the same canonical group
 * from identityLinks. Returns peer IDs from OTHER channels only.
 */
export function resolveLinkedPeerIds(
  senderId: string,
  channel: string,
  identityLinks: IdentityLinks,
): AtomSource[] {
  const linked: AtomSource[] = [];
  const normalizedSenderId = senderId.trim().toLowerCase();
  const channelPrefixed = `${channel}:${normalizedSenderId}`;

  for (const ids of Object.values(identityLinks)) {
    const normalizedIds = ids.map((id) => id.trim().toLowerCase());

    // Check if this sender belongs to this canonical group
    const isInGroup = normalizedIds.some(
      (id) => id === normalizedSenderId || id === channelPrefixed,
    );
    if (!isInGroup) continue;

    // Collect all OTHER peer IDs from the group
    for (const rawId of ids) {
      const id = rawId.trim().toLowerCase();
      const colonIdx = id.indexOf(":");
      if (colonIdx > 0) {
        const peerChannel = id.slice(0, colonIdx);
        const peerId = id.slice(colonIdx + 1);
        // Skip the current sender's own entry
        if (peerChannel === channel && peerId === normalizedSenderId) continue;
        linked.push({ channel: peerChannel, senderId: peerId });
      } else {
        // Raw ID without channel prefix — skip if it matches current sender
        if (id === normalizedSenderId) continue;
        linked.push({ channel: "unknown", senderId: id });
      }
    }
  }

  return linked;
}

/**
 * Build a source entry from channel + sender info.
 */
export function buildSource(channel: string, senderId?: string): AtomSource {
  return { channel, senderId };
}

/**
 * Merge a new source into an atom's existing sources, avoiding duplicates.
 */
export function mergeSources(existing: AtomSource[], newSource: AtomSource): AtomSource[] {
  const isDuplicate = existing.some(
    (s) => s.channel === newSource.channel && s.senderId === newSource.senderId,
  );
  return isDuplicate ? existing : [...existing, newSource];
}
