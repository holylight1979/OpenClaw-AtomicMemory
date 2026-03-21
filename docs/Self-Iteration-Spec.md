# Self-Iteration Spec — TypeScript 介面與演算法規格

> 2026-03-21 | 配合 `Self-Iteration-Architecture.md` 第六章跨領域理論落地
> 目標：拿著這份 spec，下個 session 直接開寫程式碼，零歧義

---

## 共用型別

```typescript
// 已存在於 types.ts，此處列出供 spec 參照
type Confidence = "[臨]" | "[觀]" | "[固]";
type MaturityPhase = "learning" | "stable" | "mature";
type SignalType = "S1" | "S2" | "S3" | "S4" | "S5" | "S6" | "S7" | "S8" | "S9";

// MetricsSnapshot（擴充 healthScore + entropy）
type MetricsSnapshot = {
  timestamp: string;
  wisdomBlindSpots: number;
  recallAvgScore: number;
  recallEmptyRate: number;
  pitfallCount: number;
  staleAtomRate: number;
  oscillatingCount: number;
  correctionRate: number;
  healthScore?: number;        // NEW: Lyapunov (§6.1.2)
  tierEntropy?: number;        // NEW: S9 (§6.1.3)
  orderParameter?: number;     // NEW: SOC (§6.3.1)
  metacognitionScore?: number; // NEW: (§6.4.1)
};
```

---

## M1: `convergence-health.ts` — 不動點收斂 + Lyapunov 健康分數

> 對應 Architecture §6.1.1 + §6.1.2

### 型別

```typescript
interface ConvergenceResult {
  converging: boolean;
  /** Contraction ratio — median of successive diff ratios. <1 = converging */
  rate: number;
  /** Estimated fixed point via geometric series: x* ≈ x_n + d_n/(1-r) */
  estimatedFixedPoint: number;
  /** Confidence based on ratio variance consistency (0-1) */
  confidence: number;
  /** Estimated iterations to reach epsilon */
  remainingIterations: number;
}

interface ConvergenceOptions {
  /** Absolute difference threshold (default: 0.01) */
  epsilon: number;
  /** Minimum data points required (default: 4) */
  minWindow: number;
  /** Contraction ratio must be below this (default: 0.95) */
  ratioThreshold: number;
}

interface HealthScoreEntry {
  sessionKey: string;
  timestamp: number;
  score: number;          // 0-100
  rawV: number;           // raw Lyapunov value
  components: Record<string, number>;
}

interface StabilityResult {
  stable: boolean;
  trend: "improving" | "stable" | "degrading" | "oscillating";
  /** Last ΔV (positive = improving, negative = degrading in score terms) */
  deltaV: number;
  avgDeltaV: number;
  consecutiveDegradations: number;
  /** true if degrading > maxDegradations consecutive sessions */
  alert: boolean;
}
```

### 函式

```typescript
/**
 * 判斷 evidence score 時間序列是否收斂到不動點。
 *
 * Algorithm:
 * 1. 計算連續差分 d_i = |h[i] - h[i-1]|
 * 2. 計算差分比值 r_i = d_{i+1} / d_i
 * 3. 取最近 N 個 ratio 的中位數
 * 4. median(r) < ratioThreshold && variance(r) low → converging
 * 5. 估計不動點：x* ≈ x_n + d_n / (1 - r)
 */
export function isConverging(
  history: number[],
  options?: Partial<ConvergenceOptions>,
): ConvergenceResult;

/**
 * Lyapunov-inspired 系統健康分數。
 *
 * Formula: V(x) = Σ w_i · (metric_i - target_i)²
 *          score = 100 · exp(-V)
 *
 * Weight config:
 *   recallAvgScore:   2.0 (invert — higher is better)
 *   recallEmptyRate:  1.8
 *   wisdomBlindSpots: 1.5
 *   correctionRate:   1.5
 *   oscillatingCount: 1.3 (normalize /10)
 *   staleAtomRate:    1.2
 *   pitfallCount:     1.0 (normalize /20)
 */
export function computeHealthScore(
  metrics: MetricsSnapshot,
): { score: number; rawV: number; components: Record<string, number> };

/**
 * 離散 Lyapunov ΔV 穩定性檢查。
 *
 * @param maxDegradations 連續惡化超過此數 → alert (default: 3)
 * @param windowSize 分析窗口大小 (default: 5)
 */
export function checkHealthStability(
  history: HealthScoreEntry[],
  maxDegradations?: number,
  windowSize?: number,
): StabilityResult;
```

### Config

```typescript
// extends selfIteration.autonomousIteration
convergence: {
  epsilon: number;          // default 0.01
  minWindow: number;        // default 4
  ratioThreshold: number;   // default 0.95
};
healthScore: {
  maxDegradations: number;  // default 3
  windowSize: number;       // default 5
};
```

---

## M2: `entropy-signal.ts` — S9 熵信號 + 序參量

> 對應 Architecture §6.1.3 + §6.3.1

### 型別

```typescript
interface TierDistribution {
  tier: "臨" | "觀" | "固";
  count: number;
}

interface CategoryDistribution {
  category: "person" | "topic" | "event" | "place" | "thing";
  count: number;
}

interface EntropyResult {
  tierEntropy: number;          // raw H
  tierNormalized: number;       // H / log2(3), ∈ [0,1]
  categoryEntropy: number;
  categoryNormalized: number;   // H / log2(5)
  /** 0.6×tierNorm + 0.4×catNorm */
  combinedScore: number;
  interpretation: "rigid" | "healthy" | "chaotic";
  details: string;
}

interface OrderResult {
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
}
```

### 函式

```typescript
/**
 * 雙維度 Shannon entropy。
 *
 * H = -Σ p_i · log₂(p_i), normalized by H_max = log₂(n)
 * Combined = 0.6 × tierNorm + 0.4 × catNorm
 * Interpretation: tierNorm < 0.3 → rigid; > 0.85 → chaotic; else → healthy
 */
export function computeAtomEntropy(
  tierDist: TierDistribution[],
  catDist: CategoryDistribution[],
): EntropyResult;

/**
 * 序參量 = 0.5×entropy + 0.5×chaosCenter
 * chaosCenter = p_固×0 + p_觀×0.5 + p_臨×1.0
 * Zone: rigid (<0.3) | edge-of-chaos (0.3-0.6) | chaotic (>0.6)
 */
export function computeOrderParameter(
  tierCounts: TierDistribution,
): OrderResult;
```

### Config

```typescript
entropy: {
  enabled: boolean;            // default true
  rigidThreshold: number;      // default 0.3
  chaoticThreshold: number;    // default 0.85
  tierWeight: number;          // default 0.6
};
orderParameter: {
  rigidBound: number;          // default 0.3
  chaoticBound: number;        // default 0.6
};
```

---

## M3: `identity-checker.ts` — 身份不變量

> 對應 Architecture §6.2.2

### 型別

```typescript
interface AtomSnapshot {
  ref: string;              // "category/id"
  contentHash: string;      // SHA-256
  confidence: Confidence;
  triggers: string[];
  lastModified: string;
}

interface IdentitySnapshot {
  timestamp: string;
  coreAtoms: AtomSnapshot[];
  rules: RuleSnapshot[];
  thresholds: Record<string, number>;
  fingerprint: string;       // hash of entire snapshot
}

interface RuleSnapshot {
  name: string;
  contentHash: string;
  source: string;
}

type DriftSeverity = "none" | "minor" | "significant" | "critical";

interface DriftItem {
  type: "atom-modified" | "atom-removed" | "atom-added"
      | "rule-modified" | "rule-removed" | "threshold-changed";
  ref: string;
  propertyType: "essential" | "constitutional" | "accidental";
  detail: string;
}

interface DriftReport {
  severity: DriftSeverity;
  essentialDrifts: DriftItem[];
  constitutionalDrifts: DriftItem[];
  accidentalDrifts: DriftItem[];
  coreChangeRatio: number;
  evolutionNarrative: string;
}
```

### 函式

```typescript
/**
 * Registry of identity-defining atoms/rules.
 *
 * Default essentials: IDENTITY.md atoms, permission rules, decision gate config.
 * Default constitutional: wisdom classifier rules, OETAV thresholds, evolve-guard paths.
 */
export class CoreAtomRegistry {
  essentialAtoms: Set<string>;
  constitutionalRules: Set<string>;
  constitutionalThresholds: Set<string>;

  markEssential(atomRef: string): void;
  requiresIdentityReview(ref: string): "essential" | "constitutional" | "accidental";
}

/**
 * 比較 current atoms vs baseline，生成漂移報告。
 *
 * severity:
 *   essential drifts > 0 → critical
 *   constitutional > 2 or coreChangeRatio > 0.3 → significant
 *   constitutional > 0 → minor
 *   else → none
 */
export function checkIdentityDrift(
  currentAtoms: AtomSnapshot[],
  baseline: IdentitySnapshot,
  registry: CoreAtomRegistry,
): DriftReport;

/** 建立 baseline snapshot（在系統達 "stable" 時呼叫一次）*/
export function createIdentityBaseline(
  atomStorePath: string,
  registry: CoreAtomRegistry,
): Promise<IdentitySnapshot>;
```

### Config

```typescript
identity: {
  enabled: boolean;            // default true
  checkIntervalSessions: number; // default 10
  essentialAtomRefs: string[];   // manually registered essential refs
};
```

---

## M4: `threshold-balancer.ts` — 反思平衡 + 知行合一

> 對應 Architecture §6.2.3 + §6.5.1 + §6.5.2

### 型別

```typescript
interface ThresholdAdjustment {
  signalType: string;
  oldThreshold: number;
  newThreshold: number;
  direction: "raised" | "lowered" | "unchanged";
  reason: string;
  confidence: number;  // 0-1
}

interface StaleEvidencePolicy {
  gracePeriodCycles: number;  // default 3
  decayRate: number;          // default 0.2
  archiveThreshold: number;   // default 0.3
}

interface ActionUrgencyResult {
  urgency: number;
  decayedScore: number;
  shouldForceDecision: boolean;
}

interface WuWeiConfig {
  maturityPhase: MaturityPhase;
  wuWeiBias: number;
  thresholdMultiplier: number;
}

interface InterventionDecision {
  shouldAct: boolean;
  effectiveScore: number;
  effectiveThreshold: number;
  analogy: string;
}

interface ZhixingReport {
  separations: Array<{
    signalType: string;
    evidenceScore: number;
    cyclesStale: number;
    urgency: number;
    recommendation: "act-now" | "decay-and-archive" | "within-grace";
  }>;
  unityScore: number;  // 0-1, 知行合一程度
}
```

### 函式

```typescript
/**
 * Goodman 雙向調整：
 *   Direction 1: evidence 累積不行動 + 歷史接受率高 → threshold DOWN (max -15%)
 *   Direction 2: 動作被拒/無效 → threshold UP (max +15%)
 * Inertia hurdle: ≥3 data points
 */
export function balanceThresholds(
  evidence: EvidenceBucket[],
  outcomes: OutcomeHistory,
): ThresholdAdjustment[];

/**
 * 王陽明知行合一：
 *   urgency = score × (1 + cycles/gracePeriod)
 *   decayedScore = score × (1-decayRate)^(cycles - gracePeriod)
 *   shouldForceDecision: urgency > 2× originalScore
 */
export function computeActionUrgency(
  evidenceScore: number,
  cyclesSinceEvidence: number,
  policy: StaleEvidencePolicy,
): ActionUrgencyResult;

/**
 * 莊子無為干預偏移：
 *   effectiveScore = rawScore × (1 - wuWeiBias)
 *   effectiveThreshold = baseThreshold × thresholdMultiplier
 *
 * Defaults: learning(0.7/1.5x) | stable(0.4/1.0x) | mature(0.15/0.7x)
 */
export function decideIntervention(
  rawScore: number,
  baseThreshold: number,
  config: WuWeiConfig,
): InterventionDecision;

/** 掃描所有 evidence buckets 的知行分離狀況 */
export function checkZhixingUnity(
  evidence: EvidenceBucket[],
  policy: StaleEvidencePolicy,
): ZhixingReport;
```

### Config

```typescript
thresholdBalancer: {
  enabled: boolean;              // default true
  inertiaThreshold: number;      // default 3 (min data points)
  maxAdjustmentRatio: number;    // default 0.15 (15%)
};
staleEvidence: {
  gracePeriodCycles: number;     // default 3
  decayRate: number;             // default 0.2
  archiveThreshold: number;      // default 0.3
};
wuWei: {
  enabled: boolean;              // default true
  // overrides per maturity phase, otherwise use WU_WEI_DEFAULTS
  overrides?: Partial<Record<MaturityPhase, { wuWeiBias: number; thresholdMultiplier: number }>>;
};
```

---

## M5: `self-critique.ts` — Constitutional AI 批評 + 反辯者 + Reflexion

> 對應 Architecture §6.4.4 + §6.4.6 + 不變量 #13

### 型別

```typescript
interface CritiqueScore {
  safety: number;            // 0-1
  relevance: number;
  reversibility: number;
  evidenceStrength: number;
}

interface CritiqueResult {
  passed: boolean;
  scores: CritiqueScore;
  compositeScore: number;
  issues: string[];
  suggestions: string[];
  reasoning: string;
}

interface DevilsAdvocateResult {
  passed: boolean;
  challenges: Array<{
    claim: string;          // 被挑戰的理論映射
    challenge: string;      // 反辯理由
    severity: "low" | "medium" | "high";
    simpleAlternative?: string; // 更簡單的替代方案
  }>;
  overSpeculationScore: number; // 0-1, 過度推演程度
  verdict: string;
}

interface ReflectionText {
  text: string;
  whatWorked: string[];
  whatFailed: string[];
  whatToTryNext: string[];
  timestamp: string;
  proposalDescription: string;
  outcomeSuccess: boolean;
}

interface ReflectionBuffer {
  entries: ReflectionText[];
  maxEntries: number;  // default 10
}
```

### 函式

```typescript
/**
 * Constitutional AI 4-rubric 提案批評。
 *
 * Composite = 0.35×safety + 0.25×relevance + 0.20×reversibility + 0.20×evidenceStrength
 * Safety veto: safety < 0.5 → composite capped at 0.4 → auto-fail
 * Pass: composite ≥ 0.6 AND safety ≥ 0.5
 * Fail-safe: Ollama 不可用 → block
 */
export async function critiqueProposal(
  proposal: IterationProposal,
  ollamaClient: OllamaClient,
): Promise<CritiqueResult>;

/**
 * 反辯者閘門（不變量 #13）。
 *
 * 挑戰三個面向：
 * (a) 理論前提是否成立？（這個問題真的需要用不動點定理解嗎？）
 * (b) 類比是否牽強？（atom store 真的像熱力學系統嗎？）
 * (c) 有沒有更簡單的解法？（一個 if-else 就夠了嗎？）
 *
 * overSpeculationScore > 0.7 → fail
 * 任何 high-severity challenge → fail
 *
 * 實作：deterministic rule-based（不依賴 LLM）。
 * 規則：
 *   - proposal 引用理論但 evidence < 3 data points → challenge
 *   - proposal 修改 > 3 files 但 evidence 只來自 1 signal type → challenge
 *   - proposal 的 description 含 "based on theory" 但沒有量化 metric → challenge
 */
export function devilsAdvocate(
  proposal: IterationProposal,
  evidence: EvidenceBucket[],
  context: { maturityPhase: MaturityPhase; totalProposals: number },
): DevilsAdvocateResult;

/**
 * Reflexion 反思文字生成（deterministic, no LLM）。
 * Optional LLM path via REFLECTION_PROMPT_TEMPLATE.
 */
export function generateReflectionText(
  outcome: OutcomeResult,
  proposal: IterationProposal,
): ReflectionText;

/** Sliding window buffer management */
export function addReflection(buffer: ReflectionBuffer, reflection: ReflectionText): ReflectionBuffer;

/** 取得反思 context（failure-prioritized, token-budgeted）*/
export function getReflectionContext(buffer: ReflectionBuffer, maxTokenBudget?: number): string;
```

### Critique System Prompt

```
You are a safety reviewer for an AI memory system's self-iteration proposals.

## Scoring Rubric (0.0-1.0 each):
1. SAFETY — data loss / breakage risk?
2. RELEVANCE — evidence supports this change?
3. REVERSIBILITY — easy to undo?
4. EVIDENCE_STRENGTH — multiple data points?

## Response: JSON { safety, relevance, reversibility, evidenceStrength, issues[], suggestions[], reasoning }
```

### Config

```typescript
selfCritique: {
  enabled: boolean;              // default false (opt-in)
  passThreshold: number;         // default 0.6
  safetyVetoThreshold: number;   // default 0.5
};
devilsAdvocate: {
  enabled: boolean;              // default true
  overSpeculationThreshold: number; // default 0.7
};
reflection: {
  enabled: boolean;              // default true
  maxBufferSize: number;         // default 10
  maxContextTokens: number;      // default 500
};
```

---

## M6: `transfer-algorithm.ts` — 記憶鞏固 + ACT-R 動態閾值

> 對應 Architecture §6.4.2 + §6.4.3

### 型別

```typescript
interface TransferCandidate {
  topic: string;
  sessionKeys: string[];
  priority: number;  // 0-1
  scores: {
    recurrence: number;
    schemaConsistency: number;
    salience: number;
    recency: number;
  };
  action: "transfer" | "watch" | "skip";
}

interface TransferPlan {
  candidates: TransferCandidate[];
  readyToTransfer: TransferCandidate[];  // priority > 0.6
  watchList: TransferCandidate[];         // 0.3 < priority ≤ 0.6
}

interface DynamicThreshold {
  threshold: number;
  activation: number;
  spacingQuality: number;  // 0-1
  adjustment: "lower" | "keep" | "raise";
  reason: string;
}
```

### 函式

```typescript
/**
 * CLS 記憶鞏固優先序。
 *
 * priority = 0.40×recurrence + 0.25×salience + 0.20×schemaConsistency + 0.15×recency
 *
 * recurrence = min(1.0, 0.2 × sessionCount)
 * salience = 0.9 if associated with atom modifications, else 0.4
 * schemaConsistency = 0.8 if topic in existing atom triggers, else 0.3
 * recency = exp(-0.1 × daysSinceLastSeen)
 */
export function prioritizeTransfer(
  episodics: EpisodicSummary[],
  existingAtoms: AtomMeta[],
): TransferPlan;

/**
 * ACT-R 動態晉升閾值。
 *
 * Uses existing computeActivation() from actr-scoring.ts.
 * Adds spacing quality check (CV of inter-confirmation gaps).
 *
 * Adjustment rules:
 *   activation > 1.0 + spacing > 0.6 → threshold -1
 *   activation < -0.5 → threshold +1
 *   spacing < 0.3 → threshold +1
 *   else → keep base (2 for [臨]→[觀], 4 for [觀]→[固])
 */
export function computeDynamicThreshold(
  atom: AtomMeta,
  accessLog: AccessEntry[],
): DynamicThreshold;

/**
 * Spacing quality: CV of inter-confirmation gaps + short-gap penalty.
 * 0 = all same timestamp, 1 = perfectly uniform spacing.
 * MIN_GAP = 1 hour (shorter gaps = massed practice, penalized).
 */
export function computeSpacingQuality(accessLog: AccessEntry[]): number;
```

### Config

```typescript
transfer: {
  enabled: boolean;              // default true
  recurrenceWeight: number;      // default 0.40
  salienceWeight: number;        // default 0.25
  schemaWeight: number;          // default 0.20
  recencyWeight: number;         // default 0.15
  transferThreshold: number;     // default 0.6
  watchThreshold: number;        // default 0.3
};
dynamicThreshold: {
  enabled: boolean;              // default true
  activationStrong: number;      // default 1.0
  activationWeak: number;        // default -0.5
  spacingGood: number;           // default 0.6
  spacingPoor: number;           // default 0.3
  minGapMs: number;              // default 3600000 (1 hour)
};
```

---

## M7: `ttl-balance.ts` — 耗散結構 + 觀測開銷

> 對應 Architecture §6.3.2 + §6.3.3

### 型別

```typescript
interface FlowMetrics {
  recentCaptures: number[];    // atoms captured per session (last N)
  recentDecays: number[];      // atoms expired per session (last N)
  currentStore: { fixed: number; observed: number; temporary: number };
  sessionsPerDay: number;
}

interface BalanceResult {
  injectionRate: number;
  decayRate: number;
  netFlow: number;
  imbalanceRatio: number;       // 0 = balanced
  state: "steady" | "growing" | "atrophying" | "heat-death-risk" | "explosion-risk";
  predictedSteadySize: number;
  currentSize: number;
  sessionsToCritical: number | null;
  signal: {
    action: "none" | "reduce-capture" | "reduce-decay" | "boost-capture" | "boost-decay";
    reason: string;
    urgency: "low" | "medium" | "high";
  };
}

interface SignalTiming {
  signalName: string;
  durationMs: number;
  touchedAtomStore: boolean;
  priority: number;  // 1 (highest) - 5 (lowest)
}

interface CollectionTiming {
  sessionDurationMs: number;
  signals: SignalTiming[];
}

interface OverheadReport {
  perSignal: Array<{ name: string; durationMs: number; percentOfSession: number }>;
  totalCollectionMs: number;
  overheadPercent: number;
  budgetCapMs: number;
  withinBudget: boolean;
  perturbationScore: number;    // 0-1
  skipRecommendation: string[];
  signal: {
    action: "none" | "skip-low-priority" | "increase-budget" | "redesign-signals";
    reason: string;
  };
}
```

### 函式

```typescript
/**
 * 耗散結構穩態方程。
 *
 * N_steady = injectionRate × weightedTTL_sessions
 * weightedTTL = (N_臨/N×30 + N_觀/N×60 + N_固/N×90) × sessionsPerDay
 * imbalanceRatio = |netFlow| / max(injectionRate, decayRate)
 * steady band: imbalanceRatio ≤ 0.15
 */
export function computeFlowBalance(metrics: FlowMetrics): BalanceResult;

/**
 * 觀測開銷監控。
 *
 * budget cap: 5000ms
 * overhead target: < 3% of session time
 * perturbation = (stateTouchTime/total) × (total/budget), clamped [0,1]
 * adaptive skip: over budget → skip lowest-priority signals first
 */
export function measureObservationOverhead(
  timing: CollectionTiming,
  budgetMs?: number,
): OverheadReport;
```

### Config

```typescript
flowBalance: {
  enabled: boolean;              // default true
  steadyBand: number;           // default 0.15
  minViableSize: number;        // default 10
  maxViableSize: number;        // default 500
  windowSize: number;           // default 10 (sessions to average)
};
observerOverhead: {
  enabled: boolean;              // default true
  budgetMs: number;             // default 5000
  targetPercent: number;        // default 3
};
```

---

## M8: `metacognition-score.ts` — 元認知綜合分數 + DSPy Effectiveness

> 對應 Architecture §6.4.1 + §6.4.5

### 型別

```typescript
interface MetacognitionInputs {
  blindSpots: string[];
  firstApproachAccuracy: Partial<Record<string, { correct: number; total: number }>>;
  silenceAccuracy: { heldBackOk: number; heldBackMissed: number };
  recallHitRate: number;
  correctionRate: number;
  proposalSuccessRate: number;
  maturityPhase: MaturityPhase;
  totalObservations: number;
}

interface MetacognitionResult {
  score: number;  // 0-1
  components: {
    monitoring: number;
    control: number;
    calibration: number;
    blindSpotPenalty: number;
  };
  confidence: number;
  level: "uncalibrated" | "developing" | "calibrated" | "metacognitive";
}

interface EffectivenessReport {
  compositeScore: number;
  deltas: {
    recallImprovement: number;
    correctionReduction: number;
    firstApproachImprovement: number;
    silenceImprovement: number;
    blindSpotReduction: number;
  };
  outcomeQuality: {
    successRate: number;
    revertRate: number;
    userApprovalRate: number;
  };
  healthChecks: {
    metricCoherence: number;
    suspectedGaming: string[];
  };
  assessment: "improving" | "stable" | "degrading" | "suspicious";
}

interface GodelBoundary {
  classification: "self-verifiable" | "requires-external" | "undecidable";
  rationale: "consistency" | "alignment" | "termination" | "self-reference" | "none";
  explanation: string;
}
```

### 函式

```typescript
/**
 * 元認知綜合分數。
 *
 * score = (0.30×monitoring + 0.25×calibration + 0.30×control - 0.15×blindSpotPenalty) / 0.85
 * monitoring = 0.6×firstApproachRate + 0.4×recallHitRate
 * calibration = 1.0 - correctionRate
 * control = 0.5×silenceRate + 0.5×proposalSuccessRate
 * blindSpotPenalty = min(blindSpots.length × 0.1, 0.4)
 * maturity bonus: mature +0.05, stable +0.02
 */
export function computeMetacognitionScore(
  inputs: MetacognitionInputs,
): MetacognitionResult;

/**
 * DSPy-inspired 迭代效果度量。
 *
 * compositeScore = 0.6 × geometricMean(normalizedDeltas) + 0.4 × outcomeScore
 * Normalization: sigmoid centered at 0 — delta > 0 → > 0.5
 * Anti-Goodhart: geometricMean (one 0 → all 0) + coherence check + gaming detection
 */
export function computeEffectiveness(
  before: MetricsSnapshot,
  after: MetricsSnapshot,
  outcomes: OutcomeEntry[],
): EffectivenessReport;

/**
 * Gödel 邊界分類（§6.2.1）。
 *
 * Decision tree:
 *   affectsDecisionLogic → requires-external (Gödel 2nd)
 *   selfReferential → undecidable (Löb) → block
 *   cascadePotential → requires-external (Halting)
 *   modify-identity/rule/threshold → requires-external (Alignment)
 *   else → self-verifiable → auto
 */
export function classifyVerificationRequirement(
  action: ProposedAction,
): GodelBoundary;
```

### Config

```typescript
metacognition: {
  enabled: boolean;              // default true
  // weights are hardcoded (from MAI research), not configurable
};
effectiveness: {
  enabled: boolean;              // default true
  aggregation: "geometric" | "harmonic"; // default "geometric"
  gamingDetectionThreshold: number;      // default 0.65
};
```

---

## Config 總覽

所有新 config 欄位都在 `selfIteration.autonomousIteration` 下：

```typescript
autonomousIteration: {
  enabled: boolean;
  minMaturityPhase: MaturityPhase;
  evidenceDecayRate: number;
  proposalCooldownDays: number;
  verificationWindowSessions: number;
  thresholds: Partial<Record<SignalType, number>>;
  decisionOverrides: Partial<Record<ActionType, DecisionLevel>>;

  // ── 跨領域理論模組 (NEW) ──
  convergence: { epsilon, minWindow, ratioThreshold };
  healthScore: { maxDegradations, windowSize };
  entropy: { enabled, rigidThreshold, chaoticThreshold, tierWeight };
  orderParameter: { rigidBound, chaoticBound };
  identity: { enabled, checkIntervalSessions, essentialAtomRefs };
  thresholdBalancer: { enabled, inertiaThreshold, maxAdjustmentRatio };
  staleEvidence: { gracePeriodCycles, decayRate, archiveThreshold };
  wuWei: { enabled, overrides? };
  selfCritique: { enabled, passThreshold, safetyVetoThreshold };
  devilsAdvocate: { enabled, overSpeculationThreshold };
  reflection: { enabled, maxBufferSize, maxContextTokens };
  transfer: { enabled, ...weights, transferThreshold, watchThreshold };
  dynamicThreshold: { enabled, activationStrong, activationWeak, spacingGood, spacingPoor, minGapMs };
  flowBalance: { enabled, steadyBand, minViableSize, maxViableSize, windowSize };
  observerOverhead: { enabled, budgetMs, targetPercent };
  metacognition: { enabled };
  effectiveness: { enabled, aggregation, gamingDetectionThreshold };
};
```

---

## 資料結構擴充

```
{atomStorePath}/_iteration/
  ├── state.json              (existing)
  ├── last_review.json        (existing)
  ├── evidence.json           (Phase A — 含 stale cycles)
  ├── entropy-history.json    (Phase A — S9 歷史)
  ├── health-history.json     (Phase D — Lyapunov 歷史)
  ├── identity-baseline.json  (Phase F — 身份快照)
  ├── reflections.json        (Phase D — Reflexion buffer)
  ├── proposals/
  │   ├── pending/            (Phase B)
  │   ├── executed/           (Phase C)
  │   └── rejected/           (Phase C)
  └── snapshots/              (Phase D — MetricsSnapshot)
```

---

## 模組依賴圖

```
                    ┌─ M2 entropy-signal ──────────────┐
                    │                                    │
M1 convergence ─────┤                                    ├──→ signal-collector
    -health         │                                    │     (Phase A)
                    └─ M7 ttl-balance ─────────────────┘
                                                          │
M4 threshold-balancer ──→ iteration-planner (Phase B) ◄───┘
                          │
                          ▼
M5 self-critique ───────→ iteration-executor (Phase C)
                          │
                          ▼
M1 health-score ────────→ outcome-tracker (Phase D)
M8 metacognition ───────→     │
M5 reflection ──────────→     │
                              ▼
M3 identity-checker ────→ Phase F (independent)
M6 transfer-algorithm ──→ Phase F (enhances promotion + cross-session)
```
