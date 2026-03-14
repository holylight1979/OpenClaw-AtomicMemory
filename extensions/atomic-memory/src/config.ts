/**
 * Atomic Memory — Configuration types and defaults.
 */

// ============================================================================
// Ollama Resilience
// ============================================================================

export type OllamaResilienceConfig = {
  /** Retry timeout per attempt in ms. Default: [3000, 10000, 30000] */
  retryTimeouts: number[];
  /** Max consecutive failures before marking as degraded. Default: 2 */
  degradedThreshold: number;
};

export const DEFAULT_OLLAMA_RESILIENCE: OllamaResilienceConfig = {
  retryTimeouts: [3_000, 10_000, 30_000],
  degradedThreshold: 2,
};

// ============================================================================
// Self-Iteration
// ============================================================================

export type SelfIterationConfig = {
  /** Enable self-iteration subsystem. Default: true */
  enabled: boolean;
  /** Number of recent episodics to scan for oscillation. Default: 3 */
  oscillationWindow: number;
  /** Minimum distinct sessions an atom must appear in to flag oscillation. Default: 2 */
  oscillationThreshold: number;
  /** Episodic count between periodic reviews. Default: 25 */
  reviewInterval: number;
};

export const DEFAULT_SELF_ITERATION: SelfIterationConfig = {
  enabled: true,
  oscillationWindow: 3,
  oscillationThreshold: 2,
  reviewInterval: 25,
};
