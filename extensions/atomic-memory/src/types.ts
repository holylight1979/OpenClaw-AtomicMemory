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
  /** Source of this result: "atom" (default) or "workspace" (from daily files). */
  source?: "atom" | "workspace";
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

// ============================================================================
// Evolve Guard (Phase 3: Self-Evolution)
// ============================================================================

export type EvolvePathVerdict = {
  allowed: boolean;
  /** Normalized relative path (forward slashes). */
  relativePath: string;
  /** Reason for denial (empty if allowed). */
  reason: string;
};

export type EvolveBatchVerdict = {
  allowed: boolean;
  /** Per-file verdicts. */
  files: EvolvePathVerdict[];
  /** Aggregate denial reasons. */
  reasons: string[];
};

export type EvolvePassStats = {
  filesModified: number;
  linesAdded: number;
  linesRemoved: number;
};

export type EvolveJournalEntry = {
  /** ISO-8601 timestamp. */
  timestamp: string;
  /** What was changed (short description). */
  summary: string;
  /** Diff stats. */
  stats: EvolvePassStats;
  /** Build result: pass / fail / skipped. */
  buildResult: "pass" | "fail" | "skipped";
  /** Whether auto-reverted on failure. */
  reverted: boolean;
  /** Git commit hash (if committed). */
  commitHash?: string;
  /** Files touched (relative paths). */
  filesTouched: string[];
};

// ============================================================================
// OETAV Phase A — Signal & Evidence Types
// ============================================================================

/** 9 signal types observed by the Signal Collector. */
export type SignalType = "S1" | "S2" | "S3" | "S4" | "S5" | "S6" | "S7" | "S8" | "S9";

export const SIGNAL_LABELS: Record<SignalType, string> = {
  S1: "Pitfall Accumulation",
  S2: "Wisdom Blind Spot",
  S3: "Recall Degradation",
  S4: "Oscillation",
  S5: "Recall Quality Drop",
  S6: "Decision Flip",
  S7: "AIDocs Drift",
  S8: "Permission Boundary",
  S9: "Knowledge Entropy",
};

/** A single observed signal from one session. */
export type ObservedSignal = {
  type: SignalType;
  /** ISO-8601 timestamp of observation. */
  timestamp: string;
  /** Severity 0-1. */
  severity: number;
  /** Human-readable description. */
  details: string;
  /** Raw source data for audit. */
  source?: unknown;
};

/** Evidence bucket for one signal type — accumulated across sessions. */
export type EvidenceBucket = {
  signalType: SignalType;
  /** Accumulated score (decayed each session). */
  score: number;
  /** ISO-8601 of last signal observation. */
  lastUpdated: string;
  /** Number of sessions that contributed evidence. */
  sessionCount: number;
  /** Recent signal history (capped). */
  history: Array<{ timestamp: string; severity: number; details: string }>;
  /** Sessions since last evidence was added (for 知行合一). */
  staleCycles: number;
};

/** Persisted evidence store shape. */
export type EvidenceStore = {
  buckets: EvidenceBucket[];
  lastDecaySession: string;
};

// ============================================================================
// M2: Entropy Signal Types
// ============================================================================

export type TierDistribution = {
  tier: "臨" | "觀" | "固";
  count: number;
};

export type CategoryDistribution = {
  category: AtomCategory;
  count: number;
};

export type EntropyResult = {
  tierEntropy: number;
  tierNormalized: number;
  categoryEntropy: number;
  categoryNormalized: number;
  /** 0.6×tierNorm + 0.4×catNorm */
  combinedScore: number;
  interpretation: "rigid" | "healthy" | "chaotic";
  details: string;
};

export type OrderResult = {
  /** 0 = all [固] (rigid), 1 = all [臨] (chaotic) */
  orderParameter: number;
  entropy: number;
  zone: "rigid" | "edge-of-chaos" | "chaotic";
  signal: {
    action: "none" | "increase-decay" | "increase-promotion";
    reason: string;
    urgency: "low" | "medium" | "high";
  };
  proportions: { fixed: number; observed: number; temporary: number };
};

// ============================================================================
// M4: Stale Evidence Policy (used by Evidence Accumulator)
// ============================================================================

export type StaleEvidencePolicy = {
  gracePeriodCycles: number;
  decayRate: number;
  archiveThreshold: number;
};

export type ActionUrgencyResult = {
  urgency: number;
  decayedScore: number;
  shouldForceDecision: boolean;
};

// ============================================================================
// M7: TTL Balance Types
// ============================================================================

export type FlowMetrics = {
  recentCaptures: number[];
  recentDecays: number[];
  currentStore: { fixed: number; observed: number; temporary: number };
  sessionsPerDay: number;
};

export type BalanceResult = {
  injectionRate: number;
  decayRate: number;
  netFlow: number;
  imbalanceRatio: number;
  state: "steady" | "growing" | "atrophying" | "heat-death-risk" | "explosion-risk";
  predictedSteadySize: number;
  currentSize: number;
  sessionsToCritical: number | null;
  signal: {
    action: "none" | "reduce-capture" | "reduce-decay" | "boost-capture" | "boost-decay";
    reason: string;
    urgency: "low" | "medium" | "high";
  };
};

export type SignalTiming = {
  signalName: string;
  durationMs: number;
  touchedAtomStore: boolean;
  priority: number;
};

export type CollectionTiming = {
  sessionDurationMs: number;
  signals: SignalTiming[];
};

export type OverheadReport = {
  perSignal: Array<{ name: string; durationMs: number; percentOfSession: number }>;
  totalCollectionMs: number;
  overheadPercent: number;
  budgetCapMs: number;
  withinBudget: boolean;
  perturbationScore: number;
  skipRecommendation: string[];
  signal: {
    action: "none" | "skip-low-priority" | "increase-budget" | "redesign-signals";
    reason: string;
  };
};

// ============================================================================
// MetricsSnapshot extension
// ============================================================================

export type MetricsSnapshot = {
  sessionKey: string;
  timestamp: string;
  totalAtoms: number;
  tierCounts: { fixed: number; observed: number; temporary: number };
  categoryCounts: Partial<Record<AtomCategory, number>>;
  recallAvgScore?: number;
  recallEmptyRate?: number;
  healthScore?: number;
  tierEntropy?: number;
  orderParameter?: number;
  metacognitionScore?: number;
};
