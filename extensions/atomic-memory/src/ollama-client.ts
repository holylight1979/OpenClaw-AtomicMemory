/**
 * Ollama HTTP Client — Embedding and chat generation via local Ollama instance.
 *
 * Uses Ollama's REST API directly (no SDK dependency).
 * Shared with Claude Code's memory system — same Ollama instance, same models.
 */

import { createLogger, type Logger } from "./logger.js";
import { DEFAULT_OLLAMA_RESILIENCE, type OllamaResilienceConfig } from "./config.js";

// ============================================================================
// Health State
// ============================================================================

export type HealthStatus = "healthy" | "degraded";

export type HealthState = {
  status: HealthStatus;
  lastError?: Date;
  consecutiveFailures: number;
};

// ============================================================================
// Retry
// ============================================================================

type RetryOpts = {
  timeouts: number[];
  label: string;
};

async function withRetry<T>(
  fn: (timeoutMs: number) => Promise<T>,
  opts: RetryOpts,
  health: HealthState,
  degradedThreshold: number,
  log: Logger,
): Promise<T> {
  const { timeouts, label } = opts;
  let lastError: unknown;

  for (let attempt = 0; attempt < timeouts.length; attempt++) {
    try {
      const result = await fn(timeouts[attempt]);
      // Success — reset health
      health.status = "healthy";
      health.consecutiveFailures = 0;
      return result;
    } catch (err) {
      lastError = err;
      health.consecutiveFailures++;
      health.lastError = new Date();

      if (health.consecutiveFailures >= degradedThreshold) {
        health.status = "degraded";
      }

      if (attempt < timeouts.length - 1) {
        log.warn(
          `${label} attempt ${attempt + 1}/${timeouts.length} failed: ${err instanceof Error ? err.message : String(err)} — retrying with ${timeouts[attempt + 1]}ms timeout`,
        );
      }
    }
  }

  log.error(`${label} all ${timeouts.length} attempts failed`);
  throw lastError;
}

// ============================================================================
// OllamaClient
// ============================================================================

export class OllamaClient {
  private readonly log: Logger;
  private readonly health: HealthState = {
    status: "healthy",
    consecutiveFailures: 0,
  };
  private readonly resilience: OllamaResilienceConfig;

  constructor(
    private readonly baseUrl: string = "http://127.0.0.1:11434",
    private readonly embeddingModel: string = "qwen3-embedding",
    private readonly extractionModel: string = "qwen3:1.7b",
    resilience?: Partial<OllamaResilienceConfig>,
  ) {
    this.log = createLogger("ollama");
    this.resilience = { ...DEFAULT_OLLAMA_RESILIENCE, ...resilience };
  }

  // ==========================================================================
  // Health
  // ==========================================================================

  /** Check if the client is in a healthy state (no consecutive failures). */
  isHealthy(): boolean {
    return this.health.status === "healthy";
  }

  /** Get a snapshot of current health state. */
  getHealthState(): Readonly<HealthState> {
    return { ...this.health };
  }

  // ==========================================================================
  // Embedding
  // ==========================================================================

  /**
   * Generate embedding vector for a text string.
   * Uses Ollama's /api/embed endpoint. Retries on failure.
   */
  async embed(text: string): Promise<number[]> {
    return withRetry(
      async (timeoutMs) => {
        const response = await fetch(`${this.baseUrl}/api/embed`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: this.embeddingModel,
            input: text,
            keep_alive: "30m",
          }),
          signal: AbortSignal.timeout(timeoutMs),
        });

        if (!response.ok) {
          throw new Error(`Ollama embed failed: ${response.status} ${response.statusText}`);
        }

        const data = (await response.json()) as { embeddings: number[][] };
        if (!data.embeddings?.[0]) {
          throw new Error("Ollama returned empty embeddings");
        }

        return data.embeddings[0];
      },
      { timeouts: this.resilience.retryTimeouts, label: "embed" },
      this.health,
      this.resilience.degradedThreshold,
      this.log,
    );
  }

  /**
   * Batch embed multiple texts.
   * Ollama's /api/embed supports array input natively.
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    return withRetry(
      async (timeoutMs) => {
        const response = await fetch(`${this.baseUrl}/api/embed`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: this.embeddingModel,
            input: texts,
          }),
          signal: AbortSignal.timeout(timeoutMs),
        });

        if (!response.ok) {
          throw new Error(`Ollama embedBatch failed: ${response.status} ${response.statusText}`);
        }

        const data = (await response.json()) as { embeddings: number[][] };
        return data.embeddings;
      },
      { timeouts: this.resilience.retryTimeouts, label: "embedBatch" },
      this.health,
      this.resilience.degradedThreshold,
      this.log,
    );
  }

  // ==========================================================================
  // Chat / Generation
  // ==========================================================================

  /**
   * Generate a chat completion from Ollama.
   * Used for knowledge extraction and classification. Retries on failure.
   */
  async chat(
    system: string,
    prompt: string,
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      timeoutMs?: number;
      jsonMode?: boolean;
    },
  ): Promise<string> {
    const model = options?.model ?? this.extractionModel;
    const baseTimeout = options?.timeoutMs ?? 10_000;

    // Scale retry timeouts proportionally if base timeout is larger than default
    const timeouts = this.resilience.retryTimeouts.map((t) => Math.max(t, baseTimeout));

    const body: Record<string, unknown> = {
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      stream: false,
      think: false, // Disable thinking mode — qwen3 consumes all tokens on thinking otherwise
      options: {
        temperature: options?.temperature ?? 0.1,
        num_predict: options?.maxTokens ?? 500,
      },
    };

    // Force JSON output when requested (reduces parse failures)
    if (options?.jsonMode) {
      body.format = "json";
    }

    return withRetry(
      async (timeoutMs) => {
        const response = await fetch(`${this.baseUrl}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(timeoutMs),
        });

        if (!response.ok) {
          throw new Error(`Ollama chat failed: ${response.status} ${response.statusText}`);
        }

        const data = (await response.json()) as { message?: { content?: string } };
        return data.message?.content ?? "";
      },
      { timeouts, label: "chat" },
      this.health,
      this.resilience.degradedThreshold,
      this.log,
    );
  }

  // ==========================================================================
  // Health check
  // ==========================================================================

  /**
   * Check if Ollama is reachable and the required models are available.
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(3_000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Check if a specific model is loaded.
   */
  async hasModel(modelName: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(3_000),
      });
      if (!response.ok) return false;

      const data = (await response.json()) as { models?: Array<{ name: string }> };
      return data.models?.some((m) => m.name.startsWith(modelName)) ?? false;
    } catch {
      return false;
    }
  }
}
