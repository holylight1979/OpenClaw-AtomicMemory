/**
 * Atomic Memory System — Core Types
 *
 * Structured knowledge memory with confidence tiers (人事時地物).
 */

// ============================================================================
// Atom Categories (人事時地物)
// ============================================================================

export const ATOM_CATEGORIES = ["person", "topic", "event", "place", "thing"] as const;
export type AtomCategory = (typeof ATOM_CATEGORIES)[number];

/** Human-readable labels for each category. */
export const CATEGORY_LABELS: Record<AtomCategory, string> = {
  person: "人",
  topic: "事",
  event: "時",
  place: "地",
  thing: "物",
};

// ============================================================================
// Confidence Tiers
// ============================================================================

export const CONFIDENCE_TIERS = ["[固]", "[觀]", "[臨]"] as const;
export type Confidence = (typeof CONFIDENCE_TIERS)[number];

/** Numeric weight for scoring — higher = more trusted. */
export const CONFIDENCE_WEIGHT: Record<Confidence, number> = {
  "[固]": 1.0,
  "[觀]": 0.7,
  "[臨]": 0.4,
};

// ============================================================================
// Atom
// ============================================================================

export type AtomSource = {
  channel: string; // "whatsapp" | "telegram" | "discord" | ...
  senderId?: string;
};

export type Atom = {
  /** Filename slug, e.g. "小明" or "Q2-budget". */
  id: string;
  /** Display title (first H1 in markdown). */
  title: string;
  category: AtomCategory;
  confidence: Confidence;
  /** Keywords that trigger recall via exact match. */
  triggers: string[];
  /** ISO-8601 date string of last access. */
  lastUsed: string;
  /** How many sessions have referenced this atom. */
  confirmations: number;
  tags: string[];
  /** Related atom references, e.g. ["person/老闆", "topic/Q2預算"]. */
  related: string[];
  /** Atom this one supersedes (makes obsolete). */
  supersedes?: string;
  /** Where the knowledge came from. */
  sources: AtomSource[];
  /** Markdown content under ## 知識 */
  knowledge: string;
  /** Markdown content under ## 行動 */
  actions: string;
  /** Lines under ## 演化日誌 */
  evolutionLog: string[];
};

// ============================================================================
// Atom Chunks (for vector indexing)
// ============================================================================

export type AtomChunk = {
  /** Unique chunk id: `{category}/{id}#chunk-{n}` */
  chunkId: string;
  /** The chunk text. */
  text: string;
  /** Section header context, e.g. "## 知識 > ### 基本資訊". */
  section: string;
  /** Atom metadata for filtering / scoring. */
  atomName: string;
  category: AtomCategory;
  confidence: Confidence;
  lastUsed: string;
  confirmations: number;
  triggers: string;
  tags: string;
};

// ============================================================================
// Search & Recall
// ============================================================================

export type VectorResult = {
  chunkId: string;
  text: string;
  section: string;
  atomName: string;
  category: AtomCategory;
  confidence: Confidence;
  lastUsed: string;
  confirmations: number;
  score: number;
};

export type RecalledAtom = {
  atom: Atom;
  /** Final ranked score after hybrid boost. */
  score: number;
  /** Which chunks matched. */
  matchedChunks: VectorResult[];
};

// ============================================================================
// Capture & Write Gate
// ============================================================================

export type ExtractedFact = {
  text: string;
  category: AtomCategory;
  confidence: Confidence;
};

export type WriteGateAction = "add" | "update" | "ask" | "skip";

export type WriteGateResult = {
  action: WriteGateAction;
  quality: number;
  reasons: string[];
};

export type DedupVerdict = "duplicate" | "similar" | "new";

export type DedupResult = {
  verdict: DedupVerdict;
  existingAtom?: { category: AtomCategory; id: string; text: string };
  score?: number;
};

// ============================================================================
// Promotion
// ============================================================================

export type PromotionAction = "promoted" | "suggest" | "none";

export type PromotionResult = {
  atomRef: string; // "category/id"
  from: Confidence;
  to: Confidence;
  action: PromotionAction;
  confirmations: number;
};

export type DecayAction = "archived" | "flagged" | "remind" | "none";

export type DecayResult = {
  atomRef: string;
  confidence: Confidence;
  daysSinceUsed: number;
  action: DecayAction;
};
