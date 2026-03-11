/**
 * Vector Client — ChromaDB HTTP client for atom chunk indexing and search.
 *
 * Uses ChromaDB's REST API via the `chromadb` npm package.
 * Shares the same ChromaDB server as Claude Code but uses a separate collection.
 */

import type { AtomChunk, VectorResult } from "./types.js";
import type { OllamaClient } from "./ollama-client.js";

// ChromaDB types (from chromadb npm package)
type ChromaClient = {
  getOrCreateCollection: (params: {
    name: string;
    metadata?: Record<string, string>;
  }) => Promise<ChromaCollection>;
  heartbeat: () => Promise<number>;
};

type ChromaCollection = {
  upsert: (params: {
    ids: string[];
    embeddings: number[][];
    metadatas: Array<Record<string, string | number>>;
    documents: string[];
  }) => Promise<void>;
  query: (params: {
    queryEmbeddings: number[][];
    nResults: number;
    include?: string[];
  }) => Promise<{
    ids: string[][];
    distances: number[][] | null;
    metadatas: Array<Array<Record<string, string | number>>> | null;
    documents: Array<string[]> | null;
  }>;
  delete: (params: { where: Record<string, string> }) => Promise<void>;
  count: () => Promise<number>;
  peek: (params?: { limit: number }) => Promise<{ ids: string[] }>;
};

// Lazy-load chromadb to avoid import errors if not installed
let chromadbImport: Promise<{
  ChromaClient: new (params: { path: string }) => ChromaClient;
}> | null = null;

function loadChromaDB() {
  if (!chromadbImport) {
    // Dynamic import — try multiple resolution strategies for Jiti compatibility
    chromadbImport = (async () => {
      // Strategy 1: direct dynamic import
      try {
        return await (Function('return import("chromadb")')() as Promise<typeof chromadbImport extends Promise<infer T> ? T : never>);
      } catch { /* fall through */ }
      // Strategy 2: require from plugin's node_modules
      try {
        const { createRequire } = await import("node:module");
        const req = createRequire(import.meta.url ?? __filename);
        return req("chromadb") as Awaited<NonNullable<typeof chromadbImport>>;
      } catch { /* fall through */ }
      // Strategy 3: absolute path
      try {
        const path = await import("node:path");
        const absPath = path.resolve(__dirname ?? ".", "../node_modules/chromadb");
        return await (Function('p', 'return import(p)')(absPath) as Promise<Awaited<NonNullable<typeof chromadbImport>>>);
      } catch { /* fall through */ }
      throw new Error("Failed to load chromadb module");
    })();
  }
  return chromadbImport!;
}

export class VectorClient {
  private client: ChromaClient | null = null;
  private collection: ChromaCollection | null = null;
  private initPromise: Promise<void> | null = null;

  constructor(
    private readonly chromaUrl: string = "http://localhost:8000",
    private readonly collectionName: string = "openclaw_atoms",
    private readonly ollama: OllamaClient,
  ) {}

  // ==========================================================================
  // Initialization
  // ==========================================================================

  private async ensureInitialized(): Promise<void> {
    if (this.collection) return;
    if (this.initPromise) return this.initPromise;
    this.initPromise = this.doInitialize().catch((err) => {
      // Clear cached promise so next call retries instead of returning the same rejection
      this.initPromise = null;
      throw err;
    });
    return this.initPromise;
  }

  private async doInitialize(): Promise<void> {
    const { ChromaClient } = await loadChromaDB();
    this.client = new ChromaClient({ path: this.chromaUrl });
    this.collection = await this.client.getOrCreateCollection({
      name: this.collectionName,
      metadata: { "hnsw:space": "cosine" },
    });
  }

  // ==========================================================================
  // Index operations
  // ==========================================================================

  /**
   * Index a batch of atom chunks.
   * Embeds text via Ollama and upserts into ChromaDB.
   */
  async index(chunks: AtomChunk[]): Promise<void> {
    if (chunks.length === 0) return;
    await this.ensureInitialized();

    const texts = chunks.map((c) => c.text);
    const embeddings = await this.ollama.embedBatch(texts);

    // Batch upsert (ChromaDB handles dedup by ID)
    const BATCH_SIZE = 100;
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      const batchEmbeddings = embeddings.slice(i, i + BATCH_SIZE);

      await this.collection!.upsert({
        ids: batch.map((c) => c.chunkId),
        embeddings: batchEmbeddings,
        metadatas: batch.map((c) => ({
          atomName: c.atomName,
          category: c.category,
          confidence: c.confidence,
          section: c.section,
          lastUsed: c.lastUsed,
          confirmations: c.confirmations,
          triggers: c.triggers,
          tags: c.tags,
          sourceUserId: c.sourceUserId ?? "",
        })),
        documents: batch.map((c) => c.text),
      });
    }
  }

  /**
   * Delete all chunks belonging to a specific atom.
   */
  async deleteAtom(atomName: string): Promise<void> {
    await this.ensureInitialized();
    await this.collection!.delete({ where: { atomName } });
  }

  /**
   * Full reindex: delete all chunks and re-index from provided atoms.
   */
  async reindex(chunks: AtomChunk[]): Promise<void> {
    await this.ensureInitialized();

    // Get all existing IDs and delete them
    const count = await this.collection!.count();
    if (count > 0) {
      const existing = await this.collection!.peek({ limit: count });
      if (existing.ids.length > 0) {
        // ChromaDB delete by IDs — delete in batches
        // Unfortunately ChromaDB JS client doesn't support delete by IDs directly,
        // so we recreate the collection
        const { ChromaClient } = await loadChromaDB();
        this.client = new ChromaClient({ path: this.chromaUrl });
        // Delete and recreate collection
        try {
          await (this.client as unknown as { deleteCollection: (params: { name: string }) => Promise<void> })
            .deleteCollection({ name: this.collectionName });
        } catch {
          // Collection might not exist
        }
        this.collection = await this.client.getOrCreateCollection({
          name: this.collectionName,
          metadata: { "hnsw:space": "cosine" },
        });
      }
    }

    // Index all chunks
    await this.index(chunks);
  }

  // ==========================================================================
  // Search
  // ==========================================================================

  /**
   * Vector search for chunks similar to the query.
   * Returns results sorted by score (cosine similarity).
   */
  async search(queryVec: number[], topK: number = 5, minScore: number = 0.55): Promise<VectorResult[]> {
    await this.ensureInitialized();

    const results = await this.collection!.query({
      queryEmbeddings: [queryVec],
      nResults: topK * 2, // Fetch extra to filter by minScore
      include: ["metadatas", "documents", "distances"],
    });

    if (!results.ids[0] || results.ids[0].length === 0) return [];

    const mapped: VectorResult[] = [];

    for (let i = 0; i < results.ids[0].length; i++) {
      const distance = results.distances?.[0]?.[i] ?? 1;
      // ChromaDB cosine distance: distance = 1 - cosine_similarity
      // So score = 1 - distance
      const score = 1 - distance;

      if (score < minScore) continue;

      const meta = results.metadatas?.[0]?.[i] ?? {};

      mapped.push({
        chunkId: results.ids[0][i],
        text: results.documents?.[0]?.[i] ?? "",
        section: String(meta.section ?? ""),
        atomName: String(meta.atomName ?? ""),
        category: String(meta.category ?? "thing") as VectorResult["category"],
        confidence: String(meta.confidence ?? "[臨]") as VectorResult["confidence"],
        lastUsed: String(meta.lastUsed ?? ""),
        confirmations: Number(meta.confirmations ?? 0),
        score,
      });
    }

    // Sort by score descending
    mapped.sort((a, b) => b.score - a.score);

    return mapped.slice(0, topK);
  }

  // ==========================================================================
  // Health
  // ==========================================================================

  /**
   * Check if ChromaDB is reachable.
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.ensureInitialized();
      await this.client!.heartbeat();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the number of indexed chunks.
   */
  async count(): Promise<number> {
    await this.ensureInitialized();
    return this.collection!.count();
  }
}
