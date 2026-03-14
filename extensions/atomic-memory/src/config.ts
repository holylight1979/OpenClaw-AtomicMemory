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
