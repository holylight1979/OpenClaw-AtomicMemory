/**
 * Entity Resolver — Cross-channel entity resolution via alias matching.
 *
 * Resolves sender IDs across channels to existing person atoms.
 * V1: Simple heuristic matching on triggers and sources.
 */

import type { Atom, AtomSource } from "./types.js";

/**
 * Find a person atom that matches the given sender identity.
 *
 * Matching strategies (in priority order):
 * 1. Exact source match: atom.sources contains {channel, senderId}
 * 2. Trigger match: senderId or displayName appears in atom.triggers
 * 3. Fuzzy trigger: partial match on trigger keywords
 *
 * @param senderId - The sender's platform-specific ID
 * @param channel - The messaging channel (whatsapp, telegram, etc.)
 * @param displayName - Optional display name for trigger matching
 * @param personAtoms - List of person-category atoms to search
 */
export function resolveEntity(
  senderId: string,
  channel: string,
  displayName: string | undefined,
  personAtoms: Atom[],
): Atom | null {
  // Strategy 1: Exact source match
  for (const atom of personAtoms) {
    for (const src of atom.sources) {
      if (src.channel === channel && src.senderId === senderId) {
        return atom;
      }
    }
  }

  // Strategy 2: Trigger match on senderId or displayName
  const identifiers = [senderId];
  if (displayName) identifiers.push(displayName);

  for (const atom of personAtoms) {
    for (const trigger of atom.triggers) {
      for (const ident of identifiers) {
        if (
          trigger.toLowerCase() === ident.toLowerCase() ||
          ident.toLowerCase().includes(trigger.toLowerCase())
        ) {
          return atom;
        }
      }
    }
  }

  // Strategy 3: Channel-prefixed trigger (e.g., "telegram:12345")
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
