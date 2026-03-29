/**
 * User Registry — public API.
 *
 * Tracks platform user identities (ID <-> displayName mapping) for:
 * - Auto-promotion: guest -> user on first group message
 * - Name resolution: /promote and /demote commands
 * - LLM tool: natural language role management
 */

export type {
  UserRegistryEntry,
  UserRegistry,
  UpsertRegistryParams,
  LookupResult,
} from "./types.js";

export { NAME_HISTORY_LIMIT, EMPTY_REGISTRY } from "./types.js";

export {
  loadUserRegistry,
  saveUserRegistry,
  invalidateRegistryCache,
  upsertRegistryEntry,
  getRegistryEntry,
  removeRegistryEntry,
  registryKey,
} from "./store.js";

export {
  lookupByName,
  lookupByPlatformId,
  formatLookupResult,
} from "./lookup.js";
