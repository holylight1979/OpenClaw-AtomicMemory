// Plugin-SDK surface for user registry types and utilities.
// Extensions can import via "openclaw/plugin-sdk/user-registry".

export type {
  UserRegistryEntry,
  UserRegistry,
  UpsertRegistryParams,
  LookupResult,
} from "../user-registry/types.js";

export { NAME_HISTORY_LIMIT, EMPTY_REGISTRY } from "../user-registry/types.js";

export {
  loadUserRegistry,
  saveUserRegistry,
  invalidateRegistryCache,
  upsertRegistryEntry,
  getRegistryEntry,
  removeRegistryEntry,
  registryKey,
} from "../user-registry/store.js";

export {
  lookupByName,
  lookupByPlatformId,
  formatLookupResult,
} from "../user-registry/lookup.js";
