# OpenClaw 真正的自我迭代架構設計

> 2026-03-21 | 深度研究 session 產出
> 前置：Evolution-Plan Phase 1-6 全部完成

---

## 一、問題定義

### 現狀：工具輔助迭代（Tool-Assisted Iteration）

現有系統透過 `/iterate` 指令提供 4 個工具（analyze/propose/apply/journal），但本質上是：

```
Owner 想到要改 → /iterate 指令 → AI 執行 → Owner 驗收
```

**人類是觀察者、決策者、觸發者。AI 只是執行者。**

### 目標：自主觀測迭代（Autonomous Observational Iteration）

```
系統持續觀測自身 → 累積證據 → 越過閾值 → 產生提案 → 決策閘門 → 執行 → 驗證結果
```

**系統自己是觀察者。人類仍是最終決策者（針對高風險動作），但低風險改善可自主完成。**

### 關鍵區別

| 面向 | 工具輔助 | 自主觀測 |
|------|---------|---------|
| 觸發源 | 人類意圖 | 系統觀測到的信號 |
| 時機 | Owner 有空時 | 持續、每 session 累積 |
| 範圍 | Owner 指定 | 系統自己判斷優先序 |
| 回饋 | 單次（改了就結束） | 閉環（改了追蹤效果） |

---

## 二、核心架構：OETAV 循環

```
  ┌──────────────────────────────────────────────────────────────┐
  │                                                              │
  ▼                                                              │
┌────────────┐   ┌────────────┐   ┌────────────┐   ┌─────────┐  │
│  Observe   │──▶│  Evidence   │──▶│  Threshold  │──▶│  Action  │  │
│ 觀測信號   │   │  累積證據   │   │  評估閾值   │   │  執行    │  │
└────────────┘   └────────────┘   └────────────┘   └────┬────┘  │
                                                        │       │
                                                        ▼       │
                                                   ┌─────────┐  │
                                                   │ Verify   │──┘
                                                   │ 驗證結果 │
                                                   └─────────┘
```

### 2.1 Observe — 信號收集器

**觸發時機**：session_end hook（每個 session 結束自動執行）

從現有引擎被動收集 9 類信號：

| # | 信號類型 | 資料來源 | 收集方式 |
|---|---------|---------|---------|
| S1 | Pitfall 累積 | atom_store `[pitfall]` atoms | 計數同區域的 pitfall atoms |
| S2 | Wisdom 盲區 | wisdom/reflection_metrics.json | firstApproachAccuracy < 50% |
| S3 | Atom 腐朽波 | promotion.checkDecay() 結果 | 統計 archived + flagged 數量 |
| S4 | 震盪偵測 | detectOscillation() 結果 | 直接取 oscillatingAtoms |
| S5 | Recall 品質 | before_agent_start recall 結果 | 追蹤 avg score + empty rate |
| S6 | 使用者糾正 | session state + episodic | 同類 intent 多次修正 |
| S7 | _AIDocs 漂移 | git diff stats | src/ 改動 vs _AIDocs 改動比 |
| S8 | 最佳實踐浮現 | cross-session consolidation | 同模式 5+ sessions 命中 |
| S9 | 知識熵 | atom store tier/category 分佈 | Shannon entropy 正規化 (§6.1.3) |

**關鍵設計**：信號收集器**不做決策**，只記錄觀測。每個信號是一個結構化紀錄：

```typescript
type ObservedSignal = {
  type: SignalType;           // S1-S9
  timestamp: string;          // ISO-8601
  sessionKey: string;
  severity: "low" | "medium" | "high";
  data: Record<string, unknown>;  // 信號特有資料
  context: string;            // 人類可讀描述
};
```

### 2.2 Evidence — 證據累積器

**持久化**：`{atomStorePath}/_iteration/evidence.json`

每個信號類型維護一個證據桶（evidence bucket）：

```typescript
type EvidenceBucket = {
  signalType: SignalType;
  /** 加權證據分數 — 新信號 +1，每天衰減 0.95 */
  score: number;
  /** 原始信號紀錄（最多保留 20 筆） */
  signals: ObservedSignal[];
  /** 上次產生提案的時間 */
  lastProposalAt?: string;
  /** 此類信號產生的提案被接受/拒絕的歷史 */
  proposalHistory: Array<{
    date: string;
    accepted: boolean;
    outcome?: "improved" | "degraded" | "neutral";
  }>;
};
```

**衰減機制**：
- 每次 session_end 執行衰減：`score *= 0.95 ^ daysSinceLastSignal`
- 避免古老信號永遠佔據證據 — 系統只關心「近期是否持續出現問題」
- 但如果信號持續出現，分數會因新信號加入而維持高位

**學習機制**：
- `proposalHistory` 記錄過去提案的接受率和效果
- 如果某類信號的提案總是被 owner 拒絕 → 提高該類信號的閾值
- 如果某類信號的提案結果總是 degraded → 暫停該信號類型

### 2.3 Threshold — 閾值評估器

**觸發時機**：evidence score 更新後

每個信號類型有獨立閾值，由 config 定義（可被 proposalHistory 動態調整）：

| 信號 | 預設閾值 | 最低樣本數 | 產生提案類型 |
|------|---------|-----------|------------|
| S1 Pitfall | 3.0 | 3 signals | code_fix / context_inject |
| S2 Blind Spot | 5.0 | 10 sessions | context_inject / rule_update |
| S3 Staleness | 4.0 | — | atom_cleanup |
| S4 Oscillation | immediate | — | atom_pause |
| S5 Recall | 5.0 | 10 sessions | config_adjust / reindex |
| S6 Correction | 3.0 | 3 signals | feedback_atom / rule_update |
| S7 Docs Drift | 3.0 | 3 commits | docs_update |
| S8 Best Practice | 5.0 | 5 sessions | atom_create |

當 `bucket.score >= threshold && signals.length >= minSamples` → 產生 `IterationProposal`。

**冷卻機制**：同一信號類型的提案之間最少間隔 7 天（避免轟炸 owner）。

### 2.4 Action — 決策閘門 + 執行器

每個提案（IterationProposal）根據**動作類型**走不同的決策路徑：

```typescript
type IterationProposal = {
  id: string;                    // uuid
  signalType: SignalType;
  createdAt: string;
  /** 提案描述（人類可讀） */
  summary: string;
  /** 詳細理由 + 證據摘要 */
  rationale: string;
  /** 具體要執行的動作 */
  action: ProposedAction;
  /** 決策等級 */
  decisionLevel: "auto" | "confirm" | "block";
  /** 執行前的指標快照 */
  baselineMetrics?: MetricsSnapshot;
  /** 狀態 */
  status: "pending" | "approved" | "rejected" | "executed" | "verified";
};
```

#### 決策邊界矩陣

| 動作類型 | 決策等級 | 範例 | 理由 |
|---------|---------|------|------|
| **atom_cleanup** | auto | 歸檔過期 [臨] atoms | 已有 promotion.checkDecay() 規則 |
| **atom_pause** | auto | 暫停震盪 atom 修改 | 防止更多損害 |
| **atom_create** | auto | 建立 [臨] 觀察 atom | 最低風險，自然淘汰 |
| **context_inject** | auto | 為 blind spot 新增注入提示 | 只影響 prompt 建構 |
| **docs_update** | auto | 更新 _AIDocs 與原始碼同步 | _AIDocs 本就該隨碼更新 |
| **feedback_atom** | auto | 建立/強化 feedback atom | 記錄觀察，不改行為 |
| **vector_reindex** | auto | 重建向量索引 | 無副作用 |
| **config_adjust** | confirm | 調整 recall.minScore 等 | 影響全局行為 |
| **rule_update** | confirm | 修改 wisdom classifier 規則 | 影響決策邏輯 |
| **code_fix** | confirm | 修改 extensions/ 下的程式碼 | 需 evolve-guard + build |
| **core_modify** | block | 修改 src/ 核心程式碼 | 絕對禁止自動 |
| **security_change** | block | 修改權限/密鑰/認證 | 絕對禁止自動 |
| **identity_change** | block | 修改人格/身份設定 | 絕對禁止自動 |

#### 執行流程

**Auto 動作**：
```
proposal 產生 → 立即執行 → 記錄結果 → 進入 Verify
```

**Confirm 動作**：
```
proposal 產生 → 存入 _iteration/proposals/pending/
→ 下次 session_start 注入提醒：「[自我迭代] 有 N 個改善提案等待您審核」
→ Owner 回覆 approve/reject → 執行或記錄拒絕
```

**Block 動作**：
```
proposal 產生 → 記錄為 "blocked" → 不執行、不提醒
→ 只在 /iterate status 時顯示（「系統觀測到 X，但此類動作被禁止自動執行」）
```

### 2.5 Verify — 結果驗證器

**觸發時機**：提案執行後 + 後續 N sessions 的指標收集

```typescript
type MetricsSnapshot = {
  timestamp: string;
  wisdomBlindSpots: number;
  recallAvgScore: number;
  recallEmptyRate: number;
  pitfallCount: number;
  staleAtomRate: number;
  oscillatingCount: number;
  /** 使用者糾正次數（近 5 sessions） */
  correctionRate: number;
};
```

**驗證流程**：
1. 執行前：`baselineMetrics` 快照
2. 執行後等待 5 sessions
3. 再次快照 → 對比
4. 判定：
   - 相關指標改善 ≥10% → `outcome: "improved"` → 增加該信號類型的信心
   - 相關指標惡化 ≥10% → `outcome: "degraded"` → 提高閾值 + 考慮回滾
   - 其他 → `outcome: "neutral"`

**回滾策略**：
- Auto 動作（atom/docs 類）：記錄為 "degraded"，不回滾（影響小）
- Confirm 動作（config/rule/code 類）：
  - `git revert` 回滾 code 變更
  - 還原 config 到快照
  - 通知 owner：「迭代提案 X 執行後指標退化，已回滾」

---

## 三、與現有模組的整合方案

### 3.1 新增模組

| 模組 | 檔案 | 職責 |
|------|------|------|
| SignalCollector | `signal-collector.ts` | session_end 收集 8 類信號 |
| EvidenceAccumulator | `evidence-accumulator.ts` | 累積/衰減/持久化證據 |
| IterationPlanner | `iteration-planner.ts` | 閾值評估 + 提案產生 |
| IterationExecutor | `iteration-executor.ts` | 決策閘門 + 動作執行 |
| OutcomeTracker | `outcome-tracker.ts` | 指標快照 + 驗證 + 回滾 |

### 3.2 現有模組接點

```
┌──────────────────────────────────────────────────────────────┐
│                    index.ts (plugin entry)                     │
│                                                                │
│  session_start:                                                │
│    ├─ [existing] session state init                            │
│    ├─ [existing] wisdom reflection load                        │
│    ├─ [existing] periodic review check                         │
│    └─ [NEW] pending proposals injection                        │
│                                                                │
│  session_end:                                                  │
│    ├─ [existing] promotion check                               │
│    ├─ [existing] decay check ──────────── S3 signal ─┐        │
│    ├─ [existing] wisdom reflection ────── S2 signal ─┤        │
│    ├─ [existing] episodic generation                  │        │
│    ├─ [existing] oscillation detect ───── S4 signal ─┤        │
│    └─ [NEW] SignalCollector.collect() ◀──────────────┘        │
│              │                                                 │
│              ▼                                                 │
│         EvidenceAccumulator.update()                           │
│              │                                                 │
│              ▼                                                 │
│         IterationPlanner.evaluate()                            │
│              │                                                 │
│              ├─ auto proposals ──▶ IterationExecutor.execute() │
│              └─ confirm proposals ──▶ store pending            │
│                                                                │
│  [NEW] /iterate status — 顯示所有觀測、證據、提案              │
│  [NEW] /iterate approve <id> — 手動核准 confirm 提案           │
│  [NEW] /iterate reject <id> — 手動拒絕提案                     │
│  [NEW] /iterate history — 顯示已執行提案及其結果               │
└──────────────────────────────────────────────────────────────┘
```

### 3.3 資料流詳解

#### S1: Pitfall 累積 → code_fix / context_inject

```
[existing] self_apply 失敗 → recordPitfall() → atom_store "[pitfall]"
                                                       │
[NEW] SignalCollector 掃描 atom_store ────────────────────▶ S1 signal
        │
        ▼
同區域 pitfall 3+ → EvidenceAccumulator score += 1
        │
        ▼ score ≥ 3.0
IterationPlanner:
  if pitfalls all in same module:
    → ProposedAction: context_inject (auto)
      「為 {module} 新增已知陷阱提示」
  if pitfalls suggest code pattern:
    → ProposedAction: code_fix (confirm)
      「建議修改 {file}: {description}」
```

#### S2: Wisdom Blind Spot → context_inject

```
[existing] updateReflection() → 更新 firstApproachAccuracy
[existing] getReflectionSummary() → 注入 "[自知] X 首次正確率 Y%"
                                        │
[NEW] SignalCollector 讀取 WisdomMetrics ──▶ S2 signal (accuracy < 50%)
        │
        ▼
持續 10+ sessions → score ≥ 5.0
        │
        ▼
IterationPlanner:
  → ProposedAction: context_inject (auto)
    「為 {intent_type} 新增決策提示到 classifySituation()」
  → ProposedAction: rule_update (confirm)
    「classifySituation() 需新增 {intent_type} 的專用規則」
```

#### S5: Recall 品質退化 → config_adjust / reindex

```
[existing] before_agent_start recall → 返回 RecalledAtom[]
                                           │
[NEW] 追蹤每次 recall 的 avg score + empty ▶ S5 signal
        │
        ▼
avg score 下降 15%+ over 10 sessions → score ≥ 5.0
        │
        ▼
IterationPlanner:
  → ProposedAction: vector_reindex (auto)
  → ProposedAction: config_adjust (confirm)
    「recall.minScore 從 0.40 降至 0.35，增加召回率」
```

#### S7: _AIDocs 漂移 → docs_update

```
[NEW] SignalCollector 在 session_end 執行:
  git log --oneline -5 -- "src/" → 有 N 個 src commit
  git log --oneline -5 -- "_AIDocs/" → 有 M 個 docs commit
  if N > 0 && M == 0 → S7 signal
        │
        ▼
3+ sessions 持續漂移 → score ≥ 3.0
        │
        ▼
IterationPlanner:
  → ProposedAction: docs_update (auto)
    比對 git diff 受影響的 src/ 目錄
    → 對應 Core-*-Functions.md 需更新
    → 使用 self_analyze 讀取變更
    → 自動更新文件
```

### 3.4 Atom Version History（受 OpenAI VersionedPrompt 啟發）

外部研究的一個關鍵發現：所有成功的自我迭代系統都需要**不可變版本歷史**。

現有 atom 有 `evolutionLog` 欄位記錄變更日誌，但缺乏完整的版本快照。建議擴展：

```typescript
// 新增到 types.ts
type AtomVersion = {
  version: number;
  timestamp: string;
  /** 完整的 knowledge 快照 */
  knowledgeSnapshot: string;
  /** 變更描述 */
  changeDescription: string;
  /** 觸發源：manual | auto_iteration | cross_session | capture */
  source: string;
  /** 變更後 N sessions 的指標（由 OutcomeTracker 回填） */
  postChangeMetrics?: {
    recallHitRate: number;     // 此 atom 被 recall 命中的比率
    userCorrectionCount: number; // 使用者糾正次數
    sessionsTracked: number;
  };
};
```

**用途**：
- `revert_to_version(n)` — 精確回滾到任意歷史版本
- 追蹤每次修改的下游效果（是否改善了 recall 命中率？使用者糾正是否減少？）
- 為 IterationPlanner 提供 per-atom 效能數據

**實作策略**：不在 atom markdown 中存版本（會膨脹），改存 `_iteration/versions/{category}/{id}.json`

### 3.5 Config 擴展

```typescript
// 新增到 AtomicMemoryConfig.selfIteration
autonomousIteration: {
  /** Master switch — opt-in. Default false. */
  enabled: boolean;
  /** Minimum maturity phase to enable. Default "stable". */
  minMaturityPhase: MaturityPhase;
  /** Evidence decay rate per day. Default 0.95. */
  evidenceDecayRate: number;
  /** Cooldown days between proposals of same signal type. Default 7. */
  proposalCooldownDays: number;
  /** Sessions to wait before verifying outcome. Default 5. */
  verificationWindowSessions: number;
  /** Per-signal-type threshold overrides. */
  thresholds: Partial<Record<SignalType, number>>;
  /** Decision level overrides (e.g. force "confirm" for normally "auto" actions). */
  decisionOverrides: Partial<Record<ActionType, DecisionLevel>>;
};
```

---

## 四、信號 × 動作 × 決策 完整矩陣

| 信號 | 證據閾值 | 動作 A (auto) | 動作 B (confirm) | 動作 C (block) |
|------|---------|--------------|-----------------|---------------|
| S1 Pitfall | 3.0 / 3 sig | context_inject: 為模組加陷阱提示 | code_fix: 修改程式碼修復根因 | — |
| S2 Blind Spot | 5.0 / 10 sess | context_inject: 加決策提示 | rule_update: 改 classifier | core_modify: 改 intent 分類 |
| S3 Staleness | 4.0 | atom_cleanup: 歸檔+標記 | — | — |
| S4 Oscillation | immediate | atom_pause: 暫停修改 | rule_update: 重構 atom 結構 | — |
| S5 Recall | 5.0 / 10 sess | vector_reindex | config_adjust: 調參數 | — |
| S6 Correction | 3.0 / 3 sig | feedback_atom: 強化 feedback | rule_update: 改行為規則 | identity_change |
| S7 Docs Drift | 3.0 / 3 commit | docs_update: 自動更新 | — | — |
| S8 Best Practice | 5.0 / 5 sess | atom_create: 建 [臨] 觀察 | rule_update: 提升為 [觀] 規則 | — |

---

## 五、安全設計

### 5.1 三層防護

```
Layer 1: Decision Level Gate
  ├─ auto: 只有已證明安全的動作（atom/docs/context）
  ├─ confirm: Owner 必須審核（config/rule/code）
  └─ block: 絕對不執行（core/security/identity）

Layer 2: Evolve Guard (existing)
  ├─ Path whitelist/blacklist
  ├─ Per-pass file/line limits
  └─ Build-pass requirement

Layer 3: Outcome Verification
  ├─ 執行後追蹤指標 5 sessions
  ├─ 退化 → 回滾 + 提高閾值
  └─ 連續 3 次退化 → 暫停該信號類型
```

### 5.2 成熟度閘門

自主迭代只在系統達到足夠成熟度後啟動：

| 成熟度 | 自主迭代能力 |
|--------|------------|
| learning (<15 episodics) | 完全禁止 — 系統還在學習 |
| stable (15-50) | 僅 auto 動作（atom/docs） |
| mature (>50) | auto + confirm 提案 |

### 5.3 緊急停止

- Owner 隨時可 `/iterate disable` 關閉自主迭代
- 任何 auto 動作如果觸發 build failure → 自動停止 + 通知 owner
- 證據累積器有全局上限 — 不會無限累積產生大量提案

### 5.4 不可修改清單（hardcoded）

- `src/gateway/` — 核心閘道
- `src/config/` — 設定架構
- `.env`, `System.Owner.json` — 密鑰/身份
- `src/channels/permission-level.ts` — 權限核心
- `src/auto-reply/commands-core.ts` — 指令閘門
- 任何 `*secret*`, `*credential*`, `*auth*` 路徑

---

## 六、跨領域理論基礎與落地設計

> 以下理論經深度網路研究後，每個都轉化為具體的 TypeScript 介面或演算法。
> 完整介面定義與虛擬碼見 `docs/Self-Iteration-Spec.md`。

### 6.1 數學 / 控制論 → 收斂保證 + 健康指標

#### 6.1.1 不動點定理 → 收斂偵測器

**理論**：Banach 收縮映射定理 — 若映射 T 滿足 `d(T(x), T(y)) ≤ q·d(x,y)`（q<1），則迭代序列收斂到唯一不動點。PageRank（damping=0.85）和 RL Value Iteration（discount γ）都以此為收斂基礎。

**核心公式**：連續差分比值 `r_n = |x_{n+1} - x_n| / |x_n - x_{n-1}|`，若 `median(r) < 1` 且變異數低 → 收斂中。不動點估計：`x* ≈ x_n + d_n / (1 - r)`（幾何級數求和）。

**落地設計**：

```typescript
function isConverging(history: number[], options?: {
  epsilon?: number;        // default 0.01
  minWindow?: number;      // default 4
  ratioThreshold?: number; // default 0.95
}): ConvergenceResult
// → { converging, rate, estimatedFixedPoint, confidence, remainingIterations }
```

**整合點**：`IterationPlanner`（Phase B）— 評估 evidence score 是否已穩定：
- `rate < 0.5` → 快速收斂，可停止觀察此信號
- `rate ∈ [0.95, 1.05)` → 臨界態，需更多資料
- `rate > 1.05` → 發散/振盪，需介入

#### 6.1.2 Lyapunov 穩定性 → 系統健康分數

**理論**：離散 Lyapunov 函數 `V(x)` 滿足 `V(x) > 0` 且 `ΔV = V[k+1] - V[k] ≤ 0` → 系統穩定。用於控制系統監測：若 ΔV 持續 > 0 → 系統不穩定。

**核心公式**：加權二次型 `V(x) = Σ w_i·(metric_i - target_i)²`，轉換為 0-100 分數：`score = 100·exp(-V)`。

**落地設計**：

```typescript
function computeHealthScore(metrics: MetricsSnapshot): {
  score: number;           // 0-100, higher = healthier
  components: Record<string, number>;  // per-metric contribution
  rawV: number;            // raw Lyapunov value (lower = better)
}

function checkHealthStability(history: HealthScoreEntry[], maxDegradations?: number): StabilityResult
// → { stable, trend: 'improving'|'stable'|'degrading'|'oscillating', consecutiveDegradations, alert }
```

**整合點**：`OutcomeTracker`（Phase D）— health score 加入 MetricsSnapshot，連續 3 次 ΔV > 0 觸發 alert，對應不變量 #6（退化保護）。

**權重設定**：recallAvgScore(2.0) > recallEmptyRate(1.8) > wisdomBlindSpots/correctionRate(1.5) > oscillatingCount(1.3) > staleAtomRate(1.2) > pitfallCount(1.0)

#### 6.1.3 資訊熵 → S9: 知識熵信號

**理論**：Shannon entropy `H = -Σ p_i·log₂(p_i)` 量化分佈的不確定性。正規化 `H_norm = H / log₂(n)` ∈ [0,1]。

**落地設計**：雙維度 entropy —

```typescript
function computeAtomEntropy(
  tierDist: TierDistribution[],   // [臨]/[觀]/[固] counts
  catDist: CategoryDistribution[], // person/topic/event/place/thing counts
): EntropyResult
// → { tierNormalized, categoryNormalized, combinedScore, interpretation: 'rigid'|'healthy'|'chaotic' }
```

**健康帶**：
| H_norm (tier) | 狀態 | 典型分佈 (臨:觀:固) | 行動 |
|---|---|---|---|
| < 0.3 | 僵化 rigid | 2:5:43 | 增加探索性知識吸收 |
| 0.4-0.8 | **健康** | 10:15:25 | 正常運作 |
| > 0.85 | 混亂 chaotic | 18:16:16 | 加速晉升/裁汰 |

**整合點**：`SignalCollector`（Phase A）— 每 session_end 計算，作為第 9 個觀測信號。tier entropy 權重 0.6 + category entropy 權重 0.4。

---

### 6.2 哲學 / 認識論 → 邊界約束 + 身份保持

#### 6.2.1 Gödel 不完備 → 外部驗證邊界

**理論**：Gödel 第二定理 — 一致的系統無法證明自身一致性。Löb 定理 — 系統推理自身健全性會形成循環。停機問題 — 自我修改鏈的終止性不可判定。2025 年論文（Nature Scientific Reports）證實「AI ethical compliance is undecidable」。

**三個不可自證的範疇**：
1. **一致性**（Gödel 2nd）：修改自身推理規則後無法驗證結果一致
2. **對齊**（外部事實）：擁有者意圖是系統外部的事實，無法自證
3. **終止性**（停機問題）：自我修改鏈的收斂不可保證

**落地設計**：

```typescript
type VerificationClass = "self-verifiable" | "requires-external" | "undecidable";

function classifyVerificationRequirement(action: ProposedAction): GodelBoundary
// Decision tree:
//   affectsDecisionLogic → requires-external (Gödel 2nd)
//   selfReferential → undecidable (Löb) → maps to "block"
//   cascadePotential → requires-external (Halting)
//   modify-identity/rule/threshold → requires-external (Alignment)
//   otherwise → self-verifiable → maps to "auto"
```

**整合點**：`IterationExecutor`（Phase C）— 在決策閘門加入 `classifyVerificationRequirement()`，為 auto/confirm/block 分類提供原理性依據。`undecidable` 映射到 `block` — 即使 owner confirm 也只是信任決策而非驗證。

#### 6.2.2 Ship of Theseus → 身份不變量檢查器

**理論**：忒修斯之船 — 持續替換組件的系統如何保持身份？功能身份觀：身份由目的和功能定義。敘事身份觀：身份由不間斷的修改記憶鏈維持。本體論區分：essential properties（必有）vs accidental properties（可變）。

**落地設計**：

```typescript
interface CoreAtomRegistry {
  essentialAtoms: Set<string>;       // modification = critical drift
  constitutionalRules: Set<string>;  // modification = significant drift
  constitutionalThresholds: Set<string>;
  requiresIdentityReview(ref: string): "essential" | "constitutional" | "accidental";
}

function checkIdentityDrift(
  currentAtoms: AtomSnapshot[],
  baseline: IdentitySnapshot,
  registry: CoreAtomRegistry,
): DriftReport
// → { severity: 'none'|'minor'|'significant'|'critical', coreChangeRatio, evolutionNarrative }
```

**核心身份原子（預設 essential）**：IDENTITY.md 相關 atoms、CLAUDE.md 核心規則、permission 設定、decision gate 規則。

**整合點**：新增不變量 #12 — **身份保持**：auto 動作不得修改 essential atoms；constitutional atoms 修改需 confirm + drift report。`checkIdentityDrift()` 在 Phase D 的 OutcomeTracker 中每 10 sessions 執行一次。

#### 6.2.3 反思平衡 → 動態閾值調整

**理論**：Rawls 的反思均衡 — 原則（rules）和判斷（inferences）必須雙向調整直到均衡。Goodman：「A rule is amended if it yields an inference we are unwilling to accept; an inference is rejected if it violates a rule we are unwilling to amend.」Bayesian double-hurdle model：慣性門檻 + 幅度門檻。

**落地設計**：

```typescript
function balanceThresholds(
  evidence: EvidenceBucket[],
  outcomes: OutcomeHistory,
): ThresholdAdjustment[]
// 雙向調整：
//   Direction 1 (evidence → threshold DOWN): 證據累積但不行動 + 歷史動作被接受 → 閾值過高
//   Direction 2 (outcomes → threshold UP): 動作被拒/無效 → 閾值過低
// 約束: 慣性門檻 ≥3 data points, 幅度上限 ±15%/cycle
```

**整合點**：`IterationPlanner`（Phase B）— 每次評估閾值前先呼叫 `balanceThresholds()`。與不變量 #6 配合：退化 → 閾值上調（Direction 2）。

---

### 6.3 複雜系統 → 系統動力學

#### 6.3.1 自組織臨界性 → 序參量

**理論**：Per Bak 沙堆模型 — 系統自然演化到臨界點，崩塌大小服從冪律 `P(s) ∝ s^{-τ}`。Langton λ 參數：λ ≈ 0.273 時系統處於「混沌邊緣」— 最具適應性。

**落地設計**：

```typescript
function computeOrderParameter(tierCounts: TierDistribution): OrderResult
// OP = 0.5 × entropy + 0.5 × chaosCenter
// chaosCenter = p_固×0 + p_觀×0.5 + p_臨×1.0
// zone: rigid (<0.3) | edge-of-chaos (0.3-0.6) | chaotic (>0.6)
// signal: rigid → increase-decay; chaotic → increase-promotion
```

**與 S9 的關係**：entropy-signal 計算原始 H_norm，order-parameter 加入方向性（區分「全固」和「全臨」，兩者熵都 = 0 但意義相反）。兩者互補：entropy 是原始指標，OP 是可操作的診斷。

**整合點**：`IterationPlanner`（Phase B）— OP 在 rigid 或 chaotic zone 時自動調整 promotion/decay 參數。

#### 6.3.2 耗散結構 → TTL/注入平衡方程

**理論**：Prigogine 耗散結構 — 開放系統透過持續的能量/物質交換維持遠離平衡的秩序。穩態條件：`dS_internal/dt = -dS_exchange/dt`。映射：注入（capture）= 能量輸入，衰退（TTL decay）= 熵排出。

**穩態方程**：`N_steady = R_inject × T_avg_sessions`（理想 store size = 注入率 × 加權平均 TTL）

**落地設計**：

```typescript
function computeFlowBalance(metrics: FlowMetrics): BalanceResult
// state: "steady" | "growing" | "atrophying" | "heat-death-risk" | "explosion-risk"
// imbalanceRatio = |netFlow| / max(injectionRate, decayRate)
// steady band: imbalanceRatio ≤ 0.15
// sessionsToCritical: 預估多少 session 後達到危險邊界
```

**整合點**：`OutcomeTracker`（Phase D）— 追蹤注入/衰退率趨勢，heat-death-risk 觸發 boost-capture 建議，explosion-risk 觸發 reduce-capture 建議。

#### 6.3.3 觀測者效應 → 信號收集開銷

**理論**：量子觀測者效應的軟體類比 — Heisenbug、probe effect。業界標準：APM 開銷 < 3-5%。三類擾動：時間擾動（延遲）、狀態擾動（觸碰 atom store）、資源擾動（CPU/IO 競爭）。

**落地設計**：

```typescript
function measureObservationOverhead(timing: CollectionTiming): OverheadReport
// budget cap: 5 seconds / overhead target: < 3% of session time
// perturbation score: (state-touch-time / total) × (total / budget), clamped [0,1]
// adaptive skip: 超出 budget 時按 priority 低→高 skip signals
```

**設計原則**：SignalCollector 讀 atom store 時用 snapshot（不觸碰 lastAccessed metadata），計算結果寫入獨立 metrics store。

**整合點**：`SignalCollector`（Phase A）— 每次 collectAll() 結束時自測 overhead，超出 budget 則下次 skip 低優先級信號。

---

### 6.4 AI 認知 → 演算法設計

#### 6.4.1 元認知分數

**理論**：Flavell 框架（知識 + 調控）、Nelson & Narens 雙層模型（monitoring + control）、MGV 框架（Monitor-Generate-Verify, 2025）。核心：系統能多準確地「知道自己知道什麼」？Calibration Error 公式：`ECE = (1/N)·Σ|confidence_i - accuracy_i|`。

**落地設計**：

```typescript
function computeMetacognitionScore(inputs: MetacognitionInputs): MetacognitionResult
// score = 0.30×monitoring + 0.25×calibration + 0.30×control - 0.15×blindSpotPenalty
// monitoring = 0.6×firstApproachRate + 0.4×recallHitRate
// calibration = 1.0 - correctionRate
// control = 0.5×silenceRate + 0.5×proposalSuccessRate
// level: 'uncalibrated' (<0.3) | 'developing' | 'calibrated' | 'metacognitive' (>0.8)
```

**整合點**：`OutcomeTracker`（Phase D）— 元認知分數是 OETAV 的「自我理解品質」指標。低分時系統不應信任自己的閾值判斷 → 提高所有閾值。

#### 6.4.2 ACT-R 記憶鞏固 → 動態晉升閾值

**理論**：Anderson 的 ACT-R 公式 `B_i = ln(Σ t_j^{-0.5})`。Pavlik & Anderson 的 spacing effect：分散確認 > 集中確認。認知科學基準：程序性知識 2-4 次，宣告性知識 5-7 次。

**落地設計**：

```typescript
function computeDynamicThreshold(atom: AtomMeta, accessLog: AccessEntry[]): DynamicThreshold
// spacingQuality: CV of inter-confirmation gaps + short-gap penalty (< 1hr)
// threshold adjustment:
//   activation > 1.0 + spacing > 0.6 → threshold -1 (lower bar, well-reinforced)
//   activation < -0.5 → threshold +1 (raise bar, knowledge fading)
//   spacing < 0.3 → threshold +1 (raise bar, massed practice unreliable)
//   otherwise → keep base (2 for [臨]→[觀], 4 for [觀]→[固])
```

**整合點**：`promotion.ts` 擴充 — `checkPromotions()` 呼叫 `computeDynamicThreshold()` 決定每個 atom 的個別閾值。現有 `actr-scoring.ts` 的 `computeActivation()` 直接複用。

#### 6.4.3 記憶鞏固 → Episodic→Atom 轉移改進

**理論**：互補學習系統（CLS, McClelland 1995）— 海馬迴（快速學習/episodic）→ 新皮層（慢速提取/semantic）。轉移優先序因素：重現頻率、schema 一致性、顯著性（與錯誤相關）、近期性。

**落地設計**：

```typescript
function prioritizeTransfer(episodics: EpisodicSummary[], existingAtoms: AtomMeta[]): TransferPlan
// priority = 0.40×recurrence + 0.25×salience + 0.20×schemaConsistency + 0.15×recency
// recurrence = min(1.0, 0.2 × sessionCount)  // 5+ sessions = 1.0
// salience = 0.9 if associated with atom modifications (error correction), else 0.4
// schemaConsistency = 0.8 if topic overlaps existing atoms, else 0.3
// recency = exp(-0.1 × daysSinceLastSeen)
// action: priority > 0.6 → 'transfer' | 0.3-0.6 → 'watch' | < 0.3 → 'skip'
```

**與現有 cross-session.ts 的差異**：目前只用 cosine > 0.75 偵測重複。此設計加入 salience（error-tagged）、schema consistency、recency decay 三個維度。

**整合點**：Phase F — 增強 `cross-session.ts` 的 consolidation pipeline，在 vector similarity 之後加入多維優先序排序。

#### 6.4.4 Constitutional AI 自我批評 → 提案前置審查

**理論**：Anthropic Constitutional AI（Bai et al., 2022）— 「先 critique 再 revision」比直接 revision 更有效。RLAIF 用 AI 偏好取代人類標注。1-2 rounds critique 已足夠（收益遞減）。

**落地設計**：

```typescript
async function critiqueProposal(
  proposal: IterationProposal,
  ollamaClient: OllamaClient,
): Promise<CritiqueResult>
// 4-rubric scoring: safety(0.35) + relevance(0.25) + reversibility(0.20) + evidenceStrength(0.20)
// safety veto: safety < 0.5 → composite capped at 0.4 → auto-fail
// pass: composite ≥ 0.6 AND safety ≥ 0.5
// fail-safe: Ollama 不可用 → block proposal
```

**整合點**：`IterationExecutor`（Phase C）— confirm 級別的 proposal 在執行前經過 `critiqueProposal()` 審查。opt-in config `selfIteration.selfCritique.enabled`（default: false）。

#### 6.4.5 DSPy 量化框架 → 迭代效果度量

**理論**：Stanford DSPy — metric-driven optimization。Anti-Goodhart 策略：geometric mean（一個 0 → 整體 0）、多維指標互相制衡、監測指標一致性（divergent = gaming）。

**落地設計**：

```typescript
function computeEffectiveness(
  before: MetricsSnapshot,
  after: MetricsSnapshot,
  outcomes: OutcomeEntry[],
): EffectivenessReport
// compositeScore = 0.6 × geometricMean(normalizedDeltas) + 0.4 × outcomeScore
// anti-Goodhart: metricCoherence = 1 - 3×stddev(normalizedDeltas)
// suspectedGaming: 單指標 > 0.65 但其他平均 < 0.52 → flag
// assessment: 'improving' | 'stable' | 'degrading' | 'suspicious'
```

**整合點**：`OutcomeTracker`（Phase D）— 每次 Verify 階段呼叫 `computeEffectiveness()` 替代簡單的 ±10% 比較。

#### 6.4.6 Reflexion → Verify 階段反思文字

**理論**：Shinn et al. (2023) Reflexion — 語言化反思比 scalar reward 更能引導後續改進。三元素：Actor、Evaluator、Self-Reflection。反思文字存入 sliding window memory buffer，注入未來 iteration context。

**落地設計**：

```typescript
function generateReflectionText(
  outcome: OutcomeResult,
  proposal: IterationProposal,
): ReflectionText
// deterministic pattern matching (no LLM dependency)
// output: { whatWorked[], whatFailed[], whatToTryNext[], text }
// storage: ReflectionBuffer sliding window (max 10)
// injection: getReflectionContext() → failure-prioritized, token-budgeted
```

**設計選擇**：用 deterministic pattern matching 而非 LLM 生成反思（省 token、可測試、無 Ollama dependency）。LLM 路徑作為 optional 增強。

**整合點**：`OutcomeTracker`（Phase D）— Verify 成功/失敗都生成 reflection text → 存入 `_iteration/reflections.json` → 下次 proposal 時注入 context。

---

### 6.5 東方哲學 → 設計原則

#### 6.5.1 王陽明 知行合一 → 知行分離偵測

**理論**：「知而不行，只是未知」— 累積證據而不行動等於不真正理解。「致良知」— 知識不是靜態資料庫，而是活的行動傾向。

**落地設計**：

```typescript
function computeActionUrgency(
  evidenceScore: number,
  cyclesSinceEvidence: number,
  policy: StaleEvidencePolicy, // gracePeriodCycles=3, decayRate=0.2, archiveThreshold=0.3
): { urgency: number; decayedScore: number; shouldForceDecision: boolean }
// 知行分離張力：urgency = evidenceScore × (1 + cycles/gracePeriod)
// 強制決策：urgency > 2× originalScore → 必須行動或承認不重要並歸檔
// 證據衰減：decayedScore = score × (1-decayRate)^(cycles - gracePeriod)
```

**整合點**：`EvidenceAccumulator`（Phase A）— 每個 evidence bucket 追蹤 stale cycles。知行分離報告（ZhixingReport）提供 `unityScore`（0-1，知行合一程度）。與 §6.2.3 反思平衡配合：stale evidence 推動閾值下調。

#### 6.5.2 莊子 無為 → 成熟度干預偏移

**理論**：庖丁解牛 — 大師做得更少而非更多，沿自然紋理切割。無為 — 不是不做，而是不強行做。範疇懷疑論 — 蝴蝶夢，分類不是永恆的。

**落地設計**：

```typescript
const WU_WEI_DEFAULTS = {
  learning: { wuWeiBias: 0.7, thresholdMultiplier: 1.5 }, // 觀整頭牛，抑制行動
  stable:   { wuWeiBias: 0.4, thresholdMultiplier: 1.0 }, // 看見結構，沿縫切割
  mature:   { wuWeiBias: 0.15, thresholdMultiplier: 0.7 }, // 以神遇，毫不費力
};

function decideIntervention(rawScore, baseThreshold, config): InterventionDecision
// effectiveScore = rawScore × (1 - wuWeiBias)
// effectiveThreshold = baseThreshold × thresholdMultiplier
// shouldAct = effectiveScore ≥ effectiveThreshold
```

**整合點**：`IterationPlanner`（Phase B）— maturity phase 決定 wuWeiBias，所有閾值乘以 thresholdMultiplier。Learning phase 偏莊子（觀察多行動少），Mature phase 偏王陽明（知行合一）。

**範疇流動性**：`measureCategoryFluidity()` 偵測信號類型之間的重疊 — 「一個 pitfall 可能是 blind-spot 的另一個角度」。

---

## 七、與學術研究 / 業界實踐的對照

> 以下基於 2025 年最新論文和開源實作的深度調研。

### 7.1 SICA — Self-Improving Coding Agent (ICLR 2025)

**來源**：University of Bristol + iGent AI（[arXiv:2504.15228](https://arxiv.org/html/2504.15228v2)）

SICA 的核心是 **archive-driven self-discovery**：
1. 維護所有歷史版本 + 效能分數的 archive
2. 最佳版本作為 meta-agent 分析 archive
3. 推理 agent 產生改善提案 → 開發 agent 實作 → 跑 benchmark
4. 效能提升 → 新版本進入 archive

**SWE-Bench 結果**：17% → 53%（14 個自主發現的改善）

**本設計借鑒**：
- 我們的 `EvidenceBucket.proposalHistory` 等同 SICA 的 archive — 記錄每次迭代的效果
- 我們的 `OutcomeTracker` 等同 SICA 的 benchmark — 用指標驗證改善
- **差異**：SICA 是 coding agent 改自己的 Python；我們是 bot 改自己的記憶/規則/文件

### 7.2 Godel Agent (ACL 2025) — 自我修改的極端案例

**來源**：[arXiv:2410.04444](https://arxiv.org/abs/2410.04444)

Godel Agent 透過 **monkey-patching** 在 runtime 修改自身程式碼，包括修改「修改邏輯」本身。

**關鍵數據**：92% 的試驗過程中出現暫時性效能退化，4% 意外終止。

**本設計的教訓**：
- ⚠️ 自我修改幾乎必然帶來暫時退化 — 我們的 Verify 階段**必須容忍短期波動**
- 我們**不採用**自我修改修改邏輯的路線 — decision gate 和 block list 是 hardcoded 的
- 回滾能力是必要的，不是可選的

### 7.3 OpenAI Self-Evolving Agents Cookbook — 最成熟的生產模式

**來源**：[OpenAI Cookbook GEPA Pattern](https://developers.openai.com/cookbook/examples/partners/self_evolving_agents/autonomous_agent_retraining)

關鍵模式：

1. **VersionedPrompt**：不可變版本歷史 + `revert_to_version()` 回滾
2. **Multi-Grader 評估**：4 個獨立評分者，75% 通過 OR 85% 平均分
3. **Self-Healing Loop**：Generate → Eval → Metrics → Conditional Optimize → Version Promotion
4. **MAX_OPTIMIZATION_RETRIES = 3**：防止 runaway 循環
5. **eval_cache**：避免重複評估

**本設計借鑒**：
- 我們的 atom 已有 confidence tier 晉升機制 — 應擴展為完整 version history
- Multi-grader 模式 → 我們的 OutcomeTracker 應追蹤**多維指標**而非單一分數
- MAX_RETRIES → 加入「同類提案連續失敗 3 次 → 暫停該信號類型」

### 7.4 安全邊界的學術共識

#### Guaranteed Safe AI (Bengio, Russell, Tegmark et al., 2024)

三核心組件：World Model + Safety Specification + Verifier。
關鍵洞察：**安全規格必須定義跨修改操作的不變量**，不只是部署時的規格。

**本設計的不變量** → 見第八章「核心不變量」

#### 安全的非組合性 (2025 形式化證明)

**首個數學證明**：兩個各自安全的 agent 組合後可能達到被禁止的能力。

**對本設計的影響**：
- 即使每個 auto 動作各自安全，它們的組合可能不安全
- → **每 session 限制最多 1 個 auto 動作**（已在第八章不變量 #8）
- → Confirm 動作的驗證應在所有 auto 動作效果穩定後再執行

#### 當前學術現狀的誠實評估

自我迭代 AI 的形式化安全框架**仍不成熟**。ICLR 2026 RSI Workshop 承認這是開放問題。Godel Agent 提出但未實作形式化驗證。

**我們的策略**：不追求形式化證明，改用**工程實務 + 多層防護 + 保守閾值**。

### 7.5 業界共識：Proposal-Gate Pattern

所有成功的自我迭代系統都採用 **proposal-gate**：
- SICA：benchmark 通過才進 archive
- Godel Agent：backtracking on failure
- OpenAI Cookbook：multi-grader 通過才 promote
- MicroAgents：judge phase 驗證才 catalog

**結論**：自我修改永遠是「提案」，永遠需要驗證才能生效。本設計的 Decision Gate 完全對齊此共識。

### 7.6 Anti-Pattern 防護（含新增項）

| Anti-Pattern | 防護機制 | 學術來源 |
|-------------|---------|---------|
| 自我強化偏差（越改越偏離） | 指標驗證 + 退化回滾 | SICA archive |
| 頻繁無意義修改 | 冷卻期 + 閾值 + 成熟度閘門 | OpenAI MAX_RETRIES |
| 修改自己的安全機制 | Hardcoded block list | Godel Agent 教訓 |
| 刪除有價值的資料 | [固] atoms 不可自動刪除 | VersionedPrompt 不可變歷史 |
| 無限自我複製/擴張 | 每 session 最多 1 個 auto 執行 | Non-compositionality proof |
| 暫時退化恐慌 | 容忍 5 sessions 波動期 | Godel Agent 92% 暫時退化 |
| 路徑依賴（壞決策連鎖） | 連續 3 退化 → 暫停信號類型 | SICA path dependency |
| 單一指標最佳化 | 多維指標快照 | OpenAI multi-grader |

---

## 八、分階段實作計畫

### Phase A：Signal Collector + Evidence（1 session）

**目標**：被動觀測層 — 系統開始「看」但不「動」

1. 新建 `signal-collector.ts`
   - 定義 SignalType enum（S1-S9）+ ObservedSignal type
   - 實作 9 個信號收集函式（每個從對應引擎取數據）
   - `collectAll(sessionState, decayResults, oscillationReport, wisdomMetrics)` 彙整

2. 新建 `evidence-accumulator.ts`
   - EvidenceBucket type + 衰減邏輯 + stale cycle 追蹤（§6.5.1 知行合一）
   - 持久化到 `_iteration/evidence.json`
   - `update(signals)` + `getAll()` + `decay()` + `computeActionUrgency()`

3. **新建 `entropy-signal.ts`**
   - `computeAtomEntropy()` — S9 信號的雙維度 Shannon entropy（§6.1.3）
   - `computeOrderParameter()` — 序參量 + edge-of-chaos 偵測（§6.3.1）

4. **新建 `ttl-balance.ts`**
   - `computeFlowBalance()` — 耗散結構穩態方程（§6.3.2）
   - `measureObservationOverhead()` — 觀測開銷監控（§6.3.3）

5. 修改 `index.ts` session_end
   - 在 oscillation detect 之後加入 `SignalCollector.collectAll()`
   - 加入 `EvidenceAccumulator.update()`

6. Config 擴展
   - `selfIteration.autonomousIteration` 子設定

**驗證**：session_end 後 `_iteration/evidence.json` 有累積數據含 S9；`/iterate status` 顯示觀測結果 + entropy + order parameter

### Phase B：Threshold + Proposals（1 session）

**目標**：決策層 — 系統開始「想」但只「說」

1. 新建 `iteration-planner.ts`
   - 閾值評估邏輯
   - 冷卻期檢查
   - `IterationProposal` 產生 + 持久化

2. **新建 `threshold-balancer.ts`**
   - `balanceThresholds()` — 反思平衡動態閾值（§6.2.3）
   - `applyWuWeiBias()` — 成熟度干預偏移（§6.5.2）
   - `computeActionUrgency()` — 知行分離偵測（§6.5.1）

3. **新建 `convergence-health.ts`**（收斂偵測部分）
   - `isConverging()` — 不動點收斂偵測（§6.1.1）
   - Planner 檢查 evidence score 是否已穩定

4. 修改 `index.ts` session_start
   - 讀取 pending proposals → 注入提醒

5. 擴展 `/iterate` 指令
   - `/iterate status` — 顯示觀測 + 證據 + 提案
   - `/iterate approve <id>` — 核准 confirm 提案
   - `/iterate reject <id>` — 拒絕提案

**驗證**：累積足夠證據後自動產生提案；閾值隨 outcomes 動態調整；session_start 可見提醒

### Phase C：Auto Executor（1 session）

**目標**：行動層 — auto 動作可自主執行

1. 新建 `iteration-executor.ts`
   - 依動作類型分發（atom/docs/context/reindex）
   - 每個動作的具體實作
   - 單 session 限制（最多 1 個 auto 執行）
   - `classifyVerificationRequirement()` — Gödel 邊界分類（§6.2.1）

2. **新建 `self-critique.ts`**
   - `critiqueProposal()` — Constitutional AI 提案審查（§6.4.4）
   - `devilsAdvocate()` — 反辯者閘門（不變量 #13）：挑戰理論→實作映射的牽強性
   - confirm 級別提案先經 critique → 再經 devil's advocate → 才執行

3. 整合 session_end 流程
   - Planner 產生 auto proposal → Executor 立即執行

4. Metrics snapshot
   - 執行前快照保存

**驗證**：auto 動作可自動執行；confirm 提案有 critique + devil's advocate report

### Phase D：Outcome Verification（1-2 sessions）

**目標**：閉環 — 系統能驗證自己的改動是好是壞

1. 新建 `outcome-tracker.ts`
   - MetricsSnapshot 採集
   - Before/after 對比邏輯
   - 退化偵測 + 回滾觸發

2. **新建 `convergence-health.ts`**（健康分數部分）
   - `computeHealthScore()` — Lyapunov 健康分數（§6.1.2）
   - `checkHealthStability()` — ΔV 穩定性檢查
   - health score 加入 MetricsSnapshot

3. **新建 `metacognition-score.ts`**
   - `computeMetacognitionScore()` — 元認知綜合分數（§6.4.1）
   - `computeEffectiveness()` — DSPy 量化框架（§6.4.5）
   - `generateReflectionText()` — Reflexion 反思文字（§6.4.6）

4. 整合 session_start
   - 檢查 pending verification（5 sessions 後）
   - 自動對比 + 判定結果
   - 注入 reflection context

5. 反饋回 evidence
   - 成功 → 維持閾值
   - 退化 → 提高閾值 + 記錄
   - 連續 3 退化 → 暫停信號類型

**驗證**：迭代結果有 improved/degraded/neutral 標記 + health score + metacognition level；退化可觸發閾值調整；reflection text 被存儲和注入

### Phase E：Confirm Executor + Code Actions（1-2 sessions）

**目標**：完整能力 — confirm 動作可在 owner 授權後執行

1. Confirm 流程整合
   - Owner approve → 調用 self-iterate-tools（analyze → propose → apply）
   - config_adjust → 修改 + 重載
   - rule_update → 修改 wisdom/classifier

2. 回滾機制
   - Code: git revert
   - Config: JSON snapshot restore
   - Rule: 備份 + 還原

3. `/iterate history` 指令
   - 完整的迭代歷史 + 效果追蹤

**驗證**：端到端流程 — 信號 → 提案 → 審核 → 執行 → 驗證

### Phase F：Identity + Memory Enhancement（1-2 sessions）

**目標**：長期穩定性 — 身份保護 + 記憶品質提升

1. **新建 `identity-checker.ts`**
   - `CoreAtomRegistry` — 核心身份 atom 註冊（§6.2.2）
   - `checkIdentityDrift()` — 定期身份漂移檢查
   - `IdentitySnapshot` baseline 在系統達到 "stable" 時自動建立

2. **新建 `transfer-algorithm.ts`**
   - `prioritizeTransfer()` — CLS 記憶鞏固優先序（§6.4.3）
   - `computeDynamicThreshold()` — ACT-R 動態晉升閾值（§6.4.2）
   - 整合 `promotion.ts` 和 `cross-session.ts`

3. 整合 `ttl-balance.ts`（Phase A 建立）
   - `computeFlowBalance()` 結果回饋到 capture filter 和 TTL config

**驗證**：identity drift report 可見；episodic→atom 轉移有 priority 排序；promotion threshold 按 ACT-R activation + spacing quality 動態調整

**依賴圖**：
```
Phase A ──→ Phase B ──→ Phase C ──→ Phase D ──→ Phase E
                                                    │
Phase F（獨立，僅需 atom store + 現有 engines）     │
                                                    ▼
                                              Full OETAV
```

---

## 九、核心不變量（Invariants）

這些是系統設計的硬性約束，實作時不可違反：

1. **Owner 主權**：任何 confirm/block 動作，Owner 有最終否決權
2. **可逆性**：所有自主執行的動作必須可回滾（VersionedPrompt 模式）
3. **可觀測性**：所有觀測、證據、提案、執行都有持久化紀錄
4. **漸進式**：先觀測 → 再決策 → 最後行動，不跳步
5. **證據驅動**：不基於單次觀測行動，必須累積證據越過閾值
6. **退化保護**：驗證失敗 → 回滾 + 提高門檻，不允許持續退化
7. **成熟度前提**：系統不夠成熟時不啟用，避免過早自我修改
8. **非組合性防護**：auto 動作每 session 最多 1 個，避免多修改組合出意外行為
9. **重試上限**：同類提案連續失敗 3 次 → 暫停該信號類型（MAX_RETRIES）
10. **不可自改安全層**：decision gate、block list、evolve-guard 規則為 hardcoded，不在自我迭代範圍內
11. **暫時退化容忍**：驗證窗口 5 sessions，允許短期波動（Godel Agent 研究顯示 92% 會暫時退化）
12. **身份保持**（§6.2.2）：auto 動作不得修改 essential atoms；constitutional atoms 修改需 confirm + drift report。`checkIdentityDrift()` 每 10 sessions 執行一次
13. **反辯者閘門**（§6.4.4 擴充）：任何基於理論推導的提案，在執行前必須通過「反辯者」檢查 — 驗證理論到實作的映射是否過度推演。反辯者專門挑戰：(a) 理論前提是否成立？(b) 類比是否牽強？(c) 有沒有更簡單的解法？見 Spec §M5 `devilsAdvocate()`
14. **知行合一**（§6.5.1）：evidence bucket stale cycles 超過 grace period (3 cycles) → score 開始衰減 + urgency 增長，超過 2x → 強制決策（行動或歸檔）

---

## 十、預計影響範圍

### 新增檔案（5 + 8 個）

**OETAV 核心（Phase A-E）**：
- `extensions/atomic-memory/src/signal-collector.ts`
- `extensions/atomic-memory/src/evidence-accumulator.ts`
- `extensions/atomic-memory/src/iteration-planner.ts`
- `extensions/atomic-memory/src/iteration-executor.ts`
- `extensions/atomic-memory/src/outcome-tracker.ts`

**跨領域理論模組（Phase A-F）**：
- `extensions/atomic-memory/src/convergence-health.ts` — 不動點收斂 + Lyapunov 健康分數
- `extensions/atomic-memory/src/entropy-signal.ts` — S9 熵信號 + 序參量
- `extensions/atomic-memory/src/identity-checker.ts` — 身份不變量 + 核心 atom 註冊
- `extensions/atomic-memory/src/threshold-balancer.ts` — 反思平衡 + 知行合一
- `extensions/atomic-memory/src/self-critique.ts` — Constitutional AI 批評 + 反辯者 + Reflexion
- `extensions/atomic-memory/src/transfer-algorithm.ts` — 記憶鞏固 + ACT-R 動態閾值
- `extensions/atomic-memory/src/ttl-balance.ts` — 耗散結構 + 觀測開銷
- `extensions/atomic-memory/src/metacognition-score.ts` — 元認知綜合分數

### 修改檔案（3 個）
- `extensions/atomic-memory/index.ts` — hook 整合
- `extensions/atomic-memory/config.ts` — 新增 autonomousIteration config
- `extensions/atomic-memory/src/types.ts` — 新增 types

### 資料結構（_iteration/ 目錄）
```
{atomStorePath}/_iteration/
  ├── state.json              (existing)
  ├── last_review.json        (existing)
  ├── evidence.json           (NEW — 證據累積)
  ├── proposals/
  │   ├── pending/            (NEW — 待審核提案)
  │   ├── executed/           (NEW — 已執行提案)
  │   └── rejected/           (NEW — 已拒絕提案)
  └── snapshots/              (NEW — 指標快照)
```
