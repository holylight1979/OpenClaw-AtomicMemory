/**
 * Atomic Memory — Unified Logger
 *
 * Replaces scattered console.log calls with a structured logger.
 * Supports plugging into OpenClaw's api.logger when available.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface Logger {
  debug(msg: string): void;
  info(msg: string): void;
  warn(msg: string): void;
  error(msg: string): void;
}

/**
 * Create a prefixed logger for a specific subsystem.
 *
 * Usage:
 *   const log = createLogger("recall");
 *   log.info("found 3 atoms");
 *   // → [atomic-memory:recall] found 3 atoms
 */
export function createLogger(prefix: string, parent?: Logger): Logger {
  const tag = `[atomic-memory:${prefix}]`;

  if (parent) {
    return {
      debug: (msg) => parent.debug(`${tag} ${msg}`),
      info: (msg) => parent.info(`${tag} ${msg}`),
      warn: (msg) => parent.warn(`${tag} ${msg}`),
      error: (msg) => parent.error(`${tag} ${msg}`),
    };
  }

  return {
    debug: (msg) => console.log(`${tag} ${msg}`),
    info: (msg) => console.log(`${tag} ${msg}`),
    warn: (msg) => console.warn(`${tag} ${msg}`),
    error: (msg) => console.error(`${tag} ${msg}`),
  };
}

/** Silent logger — discards all messages. Useful for tests. */
export const silentLogger: Logger = {
  debug() {},
  info() {},
  warn() {},
  error() {},
};
