/**
 * Owner Challenge — Hex-based authentication for owner registration.
 *
 * Flow:
 * 1. User expresses intent to become owner (Ollama 90%+ confidence)
 * 2. Bot sends random 5-hex-digit number (no explanation)
 * 3. User must answer within 2 messages:
 *    (a) decimal value + 1
 *    (b) MD5(answer_a - 1)
 * 4. Success → register as owner in System.Owner.json
 * 5. Failure / timeout / 2 wrong → 24hr cooldown
 */

import { createHash, randomBytes } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { Logger } from "./logger.js";

// ============================================================================
// Constants
// ============================================================================

const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours
const CHALLENGE_TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes
const MAX_ATTEMPTS = 2;

// ============================================================================
// Types
// ============================================================================

export type ChallengeState = {
  hex: string;
  expectedAnswer1: number;
  expectedAnswer2: string;
  attemptsLeft: number;
  gotAnswer1: boolean;
  gotAnswer2: boolean;
  createdAt: number;
  senderId: string;
  channel: string;
};

export type VerifyResult = "success" | "partial" | "wrong" | "expired";

type CooldownMap = Record<string, number>; // "channel:senderId" → lockout-until timestamp

// ============================================================================
// In-memory challenge state (per sender per channel)
// ============================================================================

const activeChallenges = new Map<string, ChallengeState>();

function challengeKey(channel: string, senderId: string): string {
  return `${channel}:${senderId}`;
}

function md5(input: string): string {
  return createHash("md5").update(input).digest("hex");
}

// ============================================================================
// Challenge lifecycle
// ============================================================================

/**
 * Generate a new challenge for a sender.
 * Returns the ChallengeState (caller sends state.hex to user).
 */
export function generateChallenge(channel: string, senderId: string): ChallengeState {
  // Random 5-hex-digit (20-bit) number
  const raw = randomBytes(3).toString("hex").slice(0, 5).toUpperCase();
  const decimal = parseInt(raw, 16);
  const answer1 = decimal + 1;
  // MD5(answer1 - 1) = MD5(decimal)
  const answer2 = md5(String(decimal));

  const state: ChallengeState = {
    hex: raw,
    expectedAnswer1: answer1,
    expectedAnswer2: answer2,
    attemptsLeft: MAX_ATTEMPTS,
    gotAnswer1: false,
    gotAnswer2: false,
    createdAt: Date.now(),
    senderId,
    channel,
  };

  activeChallenges.set(challengeKey(channel, senderId), state);
  return state;
}

/**
 * Get the active challenge for a sender, or undefined if none/expired.
 */
export function getActiveChallenge(channel: string, senderId: string): ChallengeState | undefined {
  const key = challengeKey(channel, senderId);
  const state = activeChallenges.get(key);
  if (!state) return undefined;

  // Auto-expire after timeout
  if (Date.now() - state.createdAt > CHALLENGE_TIMEOUT_MS) {
    activeChallenges.delete(key);
    return undefined;
  }
  return state;
}

/**
 * Verify user message against active challenge.
 *
 * Returns:
 * - "success": both answers correct → grant owner
 * - "partial": one answer found, still has attempts
 * - "wrong": attempt consumed, no correct answer found (or attempts exhausted)
 * - "expired": no active challenge or timed out
 */
export function verifyChallenge(
  channel: string,
  senderId: string,
  message: string,
): VerifyResult {
  const key = challengeKey(channel, senderId);
  const state = activeChallenges.get(key);
  if (!state) return "expired";

  if (Date.now() - state.createdAt > CHALLENGE_TIMEOUT_MS) {
    activeChallenges.delete(key);
    return "expired";
  }

  // Check for answers anywhere in message
  const msgLower = message.toLowerCase();
  let foundSomething = false;

  if (!state.gotAnswer1 && message.includes(String(state.expectedAnswer1))) {
    state.gotAnswer1 = true;
    foundSomething = true;
  }
  if (!state.gotAnswer2 && msgLower.includes(state.expectedAnswer2.toLowerCase())) {
    state.gotAnswer2 = true;
    foundSomething = true;
  }

  // Both correct
  if (state.gotAnswer1 && state.gotAnswer2) {
    activeChallenges.delete(key);
    return "success";
  }

  // Consume attempt
  state.attemptsLeft--;
  if (state.attemptsLeft <= 0) {
    activeChallenges.delete(key);
    return "wrong"; // exhausted
  }

  return foundSomething ? "partial" : "wrong";
}

/**
 * Clear any active challenge (e.g. on session end).
 */
export function clearChallenge(channel: string, senderId: string): void {
  activeChallenges.delete(challengeKey(channel, senderId));
}

// ============================================================================
// Cooldown persistence
// ============================================================================

/**
 * Check if sender is on 24hr cooldown after a failed challenge.
 */
export async function isOnCooldown(
  channel: string,
  senderId: string,
  storagePath: string,
): Promise<boolean> {
  const cooldowns = await loadCooldowns(storagePath);
  const key = challengeKey(channel, senderId);
  const until = cooldowns[key];
  if (!until) return false;
  if (Date.now() > until) {
    // Expired — clean up
    delete cooldowns[key];
    await saveCooldowns(storagePath, cooldowns);
    return false;
  }
  return true;
}

/**
 * Set a 24hr cooldown for sender after challenge failure.
 */
export async function setCooldown(
  channel: string,
  senderId: string,
  storagePath: string,
): Promise<void> {
  const cooldowns = await loadCooldowns(storagePath);
  const key = challengeKey(channel, senderId);
  cooldowns[key] = Date.now() + COOLDOWN_MS;
  await saveCooldowns(storagePath, cooldowns);
}

async function loadCooldowns(storagePath: string): Promise<CooldownMap> {
  const filePath = join(storagePath, "_permission", "cooldowns.json");
  try {
    const data = await readFile(filePath, "utf-8");
    return JSON.parse(data) as CooldownMap;
  } catch {
    return {};
  }
}

async function saveCooldowns(storagePath: string, cooldowns: CooldownMap): Promise<void> {
  const dir = join(storagePath, "_permission");
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "cooldowns.json"), JSON.stringify(cooldowns, null, 2), "utf-8");
}

// ============================================================================
// Auth intent detection (keyword pre-filter + Ollama confirmation)
// ============================================================================

const AUTH_INTENT_PATTERNS = [
  /我是\s*owner/i,
  /我(要|想)(認證|驗證|成為|當|做).*(owner|管理|主人|擁有者|最高)/i,
  /最高權限/,
  /owner\s*(認證|驗證|身[份分]|registration)/i,
  /認證\s*(owner|身[份分]|最高)/i,
  /authenticate\s*(me|myself|as\s*owner)/i,
  /verify\s*(me\s*as\s*)?owner/i,
  /claim\s*owner/i,
  /i\s*am\s*(the\s*)?owner/i,
  /grant\s*(me\s*)?owner/i,
  /register\s*(as\s*)?owner/i,
  /成為\s*(owner|主人|擁有者)/i,
];

/**
 * Quick keyword check — returns true if message *might* be an auth intent.
 * This is a pre-filter; Ollama confirms with 90%+ threshold.
 */
export function hasAuthIntentKeywords(message: string): boolean {
  return AUTH_INTENT_PATTERNS.some((p) => p.test(message));
}

/**
 * Confirm auth intent via Ollama (90% confidence threshold).
 * Returns true if Ollama says ≥90% confident this is an owner auth request.
 * Returns false on error / timeout / low confidence.
 */
export async function confirmAuthIntent(
  message: string,
  ollamaBaseUrl: string,
  model: string,
  log?: Logger,
): Promise<boolean> {
  try {
    const prompt =
      `Analyze this message. Is the user clearly requesting to authenticate or register themselves as the system owner or highest-privilege administrator? ` +
      `Reply with ONLY a number 0-100 representing your confidence percentage.\n\n` +
      `Message: "${message.slice(0, 200)}"\n\nConfidence:`;

    const resp = await fetch(`${ollamaBaseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        options: { num_predict: 16, temperature: 0.1 },
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!resp.ok) {
      log?.warn(`Ollama auth intent check HTTP ${resp.status}`);
      return false;
    }

    const data = (await resp.json()) as { response?: string };
    const match = data.response?.match(/(\d+)/);
    if (!match) return false;

    const confidence = parseInt(match[1], 10);
    log?.info(`auth intent confidence: ${confidence}%`);
    return confidence >= 90;
  } catch (err) {
    log?.warn(`Ollama auth intent error: ${err instanceof Error ? err.message : String(err)}`);
    return false;
  }
}
