/**
 * Ollama HTTP Client — Embedding and chat generation via local Ollama instance.
 *
 * Uses Ollama's REST API directly (no SDK dependency).
 * Shared with Claude Code's memory system — same Ollama instance, same models.
 */

export class OllamaClient {
  constructor(
    private readonly baseUrl: string = "http://127.0.0.1:11434",
    private readonly embeddingModel: string = "qwen3-embedding",
    private readonly extractionModel: string = "qwen3:1.7b",
  ) {}

  // ==========================================================================
  // Embedding
  // ==========================================================================

  /**
   * Generate embedding vector for a text string.
   * Uses Ollama's /api/embed endpoint.
   */
  async embed(text: string): Promise<number[]> {
    const response = await fetch(`${this.baseUrl}/api/embed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.embeddingModel,
        input: text,
        keep_alive: "30m",
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      throw new Error(`Ollama embed failed: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as { embeddings: number[][] };
    if (!data.embeddings?.[0]) {
      throw new Error("Ollama returned empty embeddings");
    }

    return data.embeddings[0];
  }

  /**
   * Batch embed multiple texts.
   * Ollama's /api/embed supports array input natively.
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    const response = await fetch(`${this.baseUrl}/api/embed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.embeddingModel,
        input: texts,
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      throw new Error(`Ollama embedBatch failed: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as { embeddings: number[][] };
    return data.embeddings;
  }

  // ==========================================================================
  // Chat / Generation
  // ==========================================================================

  /**
   * Generate a chat completion from Ollama.
   * Used for knowledge extraction and classification.
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
    const timeoutMs = options?.timeoutMs ?? 10_000;

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
