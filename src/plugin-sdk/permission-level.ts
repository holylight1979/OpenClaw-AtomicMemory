// Plugin-SDK surface for permission level types and utilities.
// Extensions can import via "openclaw/plugin-sdk/permission-level".

export type {
  PermissionLevel,
  SystemIdentity,
  PlatformOwnerEntry,
  PlatformBotEntry,
  PermissionLevelResolveParams,
} from "../channels/permission-level.js";

export {
  hasMinLevel,
  getLevelValue,
  loadSystemIdentity,
  saveSystemIdentity,
  invalidateSystemIdentityCache,
  getCachedSystemIdentity,
  isOwnerByIdentity,
  isAdminByIdentity,
  resolveEffectivePermissionLevel,
} from "../channels/permission-level.js";
