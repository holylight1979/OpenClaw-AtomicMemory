/**
 * Session State Manager — Tracks per-session conversation state.
 *
 * Used by episodic generation, wisdom engine, and blind-spot detection.
 * Auto-cleans stale sessions (2h TTL, scanned every 10min).
 */

import type { IntentType, SessionState } from "./types.js";
import { createLogger } from "./logger.js";

const log = createLogger("session");

const STALE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

export class SessionStateManager {
  private readonly states = new Map<string, SessionState>();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.cleanupTimer = setInterval(() => this.cleanup(), CLEANUP_INTERVAL_MS);
    // Allow Node to exit even if timer is pending
    if (this.cleanupTimer && typeof this.cleanupTimer === "object" && "unref" in this.cleanupTimer) {
      this.cleanupTimer.unref();
    }
  }

  /**
   * Get or create session state for a given session key.
   */
  getOrCreate(
    sessionKey: string,
    opts?: { channel?: string; senderId?: string },
  ): SessionState {
    const existing = this.states.get(sessionKey);
    if (existing) {
      existing.lastActivity = Date.now();
      return existing;
    }

    const now = Date.now();
    const state: SessionState = {
      sessionKey,
      startTime: now,
      lastActivity: now,
      turns: 0,
      intents: {},
      recalledAtoms: [],
      modifiedAtoms: [],
      channel: opts?.channel,
      senderId: opts?.senderId,
    };
    this.states.set(sessionKey, state);
    log.info(`created state for ${sessionKey} (channel=${opts?.channel ?? "?"})`);
    return state;
  }

  /**
   * Record a turn: increment count, update intent distribution, merge recalled atoms.
   */
  recordTurn(
    sessionKey: string,
    intent: IntentType,
    recalledAtomRefs: string[],
  ): void {
    const state = this.states.get(sessionKey);
    if (!state) return;

    state.turns++;
    state.lastActivity = Date.now();
    state.intents[intent] = (state.intents[intent] ?? 0) + 1;
    state.lastIntent = intent;

    for (const ref of recalledAtomRefs) {
      if (!state.recalledAtoms.includes(ref)) {
        state.recalledAtoms.push(ref);
      }
    }
  }

  /**
   * Get session state (or undefined if not tracked).
   */
  getState(sessionKey: string): SessionState | undefined {
    return this.states.get(sessionKey);
  }

  /**
   * Remove stale sessions (no activity for STALE_TTL_MS).
   */
  private cleanup(): void {
    const now = Date.now();
    let removed = 0;
    for (const [key, state] of this.states) {
      if (now - state.lastActivity > STALE_TTL_MS) {
        this.states.delete(key);
        removed++;
      }
    }
    if (removed > 0) {
      log.info(`cleaned ${removed} stale session(s), ${this.states.size} remaining`);
    }
  }

  /**
   * Stop the cleanup interval. Call on plugin shutdown.
   */
  dispose(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}
