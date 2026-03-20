/**
 * Guest Access Request Management
 *
 * Handles the flow where unrecognized (guest) users request access,
 * and owners can approve/deny those requests.
 *
 * Storage: {atomStorePath}/_permission/access-requests.json
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

// ============================================================================
// Types
// ============================================================================

export type AccessRequest = {
  senderId: string;
  platform: string;
  displayName?: string;
  requestedAt: string;
  status: "pending" | "approved" | "denied";
  resolvedAt?: string;
  resolvedBy?: string;
};

type AccessRequestStore = {
  requests: AccessRequest[];
  updatedAt: string;
};

// ============================================================================
// Storage
// ============================================================================

const PERMISSION_DIR = "_permission";
const REQUESTS_FILE = "access-requests.json";

function getFilePath(atomStorePath: string): string {
  return join(atomStorePath, PERMISSION_DIR, REQUESTS_FILE);
}

async function loadStore(atomStorePath: string): Promise<AccessRequestStore> {
  try {
    const raw = await readFile(getFilePath(atomStorePath), "utf-8");
    return JSON.parse(raw) as AccessRequestStore;
  } catch {
    return { requests: [], updatedAt: new Date().toISOString() };
  }
}

async function saveStore(atomStorePath: string, store: AccessRequestStore): Promise<void> {
  const dirPath = join(atomStorePath, PERMISSION_DIR);
  await mkdir(dirPath, { recursive: true });
  store.updatedAt = new Date().toISOString();
  await writeFile(getFilePath(atomStorePath), JSON.stringify(store, null, 2), "utf-8");
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Submit an access request from a guest user.
 * Returns false if a pending request already exists for this senderId.
 */
export async function submitAccessRequest(
  atomStorePath: string,
  senderId: string,
  platform: string,
  displayName?: string,
): Promise<{ created: boolean; alreadyPending: boolean }> {
  const store = await loadStore(atomStorePath);

  // Check for existing pending request
  const existing = store.requests.find(
    (r) => r.senderId === senderId && r.status === "pending",
  );
  if (existing) {
    return { created: false, alreadyPending: true };
  }

  store.requests.push({
    senderId,
    platform,
    displayName,
    requestedAt: new Date().toISOString(),
    status: "pending",
  });

  await saveStore(atomStorePath, store);
  return { created: true, alreadyPending: false };
}

/**
 * Approve an access request. Returns the request if found, null otherwise.
 */
export async function approveAccessRequest(
  atomStorePath: string,
  senderId: string,
  resolvedBy?: string,
): Promise<AccessRequest | null> {
  const store = await loadStore(atomStorePath);
  const request = store.requests.find(
    (r) => r.senderId === senderId && r.status === "pending",
  );
  if (!request) return null;

  request.status = "approved";
  request.resolvedAt = new Date().toISOString();
  request.resolvedBy = resolvedBy;
  await saveStore(atomStorePath, store);
  return request;
}

/**
 * Deny an access request. Returns the request if found, null otherwise.
 */
export async function denyAccessRequest(
  atomStorePath: string,
  senderId: string,
  resolvedBy?: string,
): Promise<AccessRequest | null> {
  const store = await loadStore(atomStorePath);
  const request = store.requests.find(
    (r) => r.senderId === senderId && r.status === "pending",
  );
  if (!request) return null;

  request.status = "denied";
  request.resolvedAt = new Date().toISOString();
  request.resolvedBy = resolvedBy;
  await saveStore(atomStorePath, store);
  return request;
}

/**
 * List all pending access requests.
 */
export async function listPendingRequests(
  atomStorePath: string,
): Promise<AccessRequest[]> {
  const store = await loadStore(atomStorePath);
  return store.requests.filter((r) => r.status === "pending");
}
