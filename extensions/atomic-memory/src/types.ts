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
// Atom Scope (G1-B: cross-group command routing)
// ============================================================================

/** Per-atom visibility scope — determines cross-group propagation behavior. */
export const ATOM_SCOPES = ["global", "user", "group"] as const;
export type AtomScope = (typeof ATOM_SCOPES)[number];

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
  /**
   * Visibility scope (G1-B):
   * - 'global': visible to everyone (default, follows memoryIsolation setting)
   * - 'user': visible only to the originating sender across all groups
   * - 'group': visible only in the originating channel/group
   */
  scope: AtomScope;
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
  /** Primary source user ID for user-scoped filtering. */
  sourceUserId?: string;
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
  /** Who stated or owns this fact (name, "user", or undefined). */
  who?: string;
  /** Subject of the fact (name, object, or undefined). */
  about?: string;
  /** Temporal context if clear (date/time string). */
  when?: string;
  /** Location context if clear (place name). */
  where?: string;
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

// ============================================================================
// Session State (S3: session-state.ts)
// ============================================================================

export type IntentType =
  | "memory-query"
  | "memory-store"
  | "info-request"
  | "task"
  | "social"
  | "greeting"
  | "command"
  | "general";

export type SessionState = {
  sessionKey: string;
  startTime: number;
  lastActivity: number;
  turns: number;
  /** Intent distribution — counts per intent type. */
  intents: Partial<Record<IntentType, number>>;
  /** Atom refs recalled during this session. */
  recalledAtoms: string[];
  /** Atom refs created or updated during this session. */
  modifiedAtoms: string[];
  /** G1-B: Last classified intent (for scope routing in capture flow). */
  lastIntent?: IntentType;
  channel?: string;
  senderId?: string;
};

// ============================================================================
// Episodic Summary (S4: episodic-engine.ts)
// ============================================================================

export type EpisodicSummary = {
  sessionKey: string;
  startTime: number;
  endTime: number;
  turns: number;
  /** Most frequent intent in this session. */
  dominantIntent: IntentType;
  /** Topics discussed (extracted from atom triggers). */
  topicsDiscussed: string[];
  /** Atom refs recalled. */
  atomsRecalled: string[];
  /** Atom refs created or updated. */
  atomsModified: string[];
  channel?: string;
  senderId?: string;
};

// ============================================================================
// Wisdom Metrics (S7: wisdom-engine.ts)
// ============================================================================

export type AccuracyCounter = {
  correct: number;
  total: number;
};

export type WisdomMetrics = {
  firstApproachAccuracy: Partial<Record<IntentType, AccuracyCounter>>;
  silenceAccuracy: {
    heldBackOk: number;
    heldBackMissed: number;
  };
  blindSpots: string[];
  lastReflection?: string;
};

// ============================================================================
// Self-Iteration State (S6: self-iteration.ts)
// ============================================================================

export type MaturityPhase = "learning" | "stable" | "mature";

export type IterationState = {
  /** Number of episodic atoms seen so far. */
  totalEpisodics: number;
  maturityPhase: MaturityPhase;
  /** ISO date of last periodic review. */
  lastReviewDate?: string;
  /** Episodic count at last review. */
  episodicsAtLastReview: number;
};

// ============================================================================
// Cross-Session Consolidation (S5: cross-session.ts)
// ============================================================================

export type ConsolidationResult = {
  atomRef: string;
  oldConfirmations: number;
  newConfirmations: number;
  suggestPromotion?: "to-觀" | "to-固";
};

// ============================================================================
// Situation Classification (S7: wisdom-engine.ts)
// ============================================================================

export type SituationApproach = "direct" | "confirm" | "plan";

export type SituationAdvice = {
  approach: SituationApproach;
  reason: string;
  /** Optional short text to inject into agent context (≤20 tokens). */
  inject?: string;
};

// ============================================================================
// Oscillation Report (S6: self-iteration.ts)
// ============================================================================

export type OscillationReport = {
  oscillatingAtoms: string[];
  shouldPause: boolean;
  reason: string;
};
