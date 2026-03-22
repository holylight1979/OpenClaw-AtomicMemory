# OpenClaw 自我迭代使用指南

> Owner-only 功能。需先啟用 `selfIteration.codeModification.enabled = true`。

## 啟用條件

```jsonc
// openclaw.json → plugins.entries.atomic-memory.config
{
  "selfIteration": {
    "codeModification": {
      "enabled": true,
      "sourceDir": "E:/OpenClaw",          // OpenClaw 原始碼根目錄（絕對路徑）
      "allowedPaths": ["extensions/", "skills/", "_AIDocs/"],
      "blockedPaths": ["src/gateway/", "src/config/", ".env", "System.Owner.json"],
      "maxFilesPerPass": 10,
      "maxLinesPerPass": 500,
      "requireBuildPass": true,
      "autoRevertOnFailure": true
    }
  }
}
```

## 工具一覽

| 工具 | 類型 | 說明 |
|------|------|------|
| `self_analyze` | 唯讀 | 讀原始碼 + git log + 自動 recall 架構知識 |
| `self_propose` | 唯讀 | 驗證路徑 vs evolve guard + 讀目標檔案 |
| `self_apply` | 寫入 | 驗證 → build → commit（失敗可 auto-revert） |
| `self_journal` | 寫入 | 記錄迭代結果到 atomic memory |

## /iterate 指令

Chat 中直接使用，Owner-only。

```
/iterate status                          — OETAV 觀測+決策儀表板
/iterate approve <id>                    — 核准 pending proposal
/iterate reject <id> [reason]            — 拒絕 pending proposal
/iterate history                         — 已執行 proposals + outcome 驗證結果
/iterate analyze extensions/atomic-memory/src/recall-engine.ts
/iterate propose 改善 scoring 邏輯
/iterate apply 優化 recall scoring 權重
/iterate journal 調整了 ACT-R weight 從 0.15 到 0.20
```

### status — OETAV 觀測儀表板

顯示完整 OETAV 狀態：Maturity Phase、Health（Lyapunov）、Evidence（9 信號）、Thresholds（Goodman）、Proposals（pending）、Executed/Outcomes、知行合一。不需 `codeModification.enabled`。

### approve / reject — 審核提案

系統透過 OETAV 循環自動產生提案，`auto` 級別會自動執行，`confirm` 級別需 owner 核准：
- `approve <id>` — 立即執行該提案的 action
- `reject <id> [reason]` — 記錄拒絕原因，供 Goodman threshold 調整

Session 開始時，若有 pending proposals 會自動提醒。

### history — 執行歷史

顯示已執行的 proposals + outcome 驗證結果（improved/degraded/neutral）+ blocked proposals。

### analyze — 分析原始碼

讀取指定路徑的檔案 + git 歷史 + 自動查詢 atomic memory 中的相關架構知識。

### propose — 準備提案

驗證目標檔案是否在 allowedPaths 內、不在 blockedPaths 中，並讀取現有內容。引導使用 `self_propose` tool 指定具體檔案。

### apply — 驗證 + build + commit

前提：你已經用 Agent 的編輯能力修改了檔案。`apply` 做的是：
1. 偵測未 commit 的變更
2. 對每個檔案做 evolve guard 驗證（白/黑名單 + 上限）
3. 執行 `pnpm build`
4. Build 通過 → `git commit`
5. Build 失敗 + `autoRevertOnFailure` → `git checkout -- .` 自動回滾

成功後自動呼叫 `self_journal` 記錄。

### journal — 手動記錄

記錄一筆迭代筆記到 atomic memory（[臨] 等級 topic atom）。

## 回饋循環

```
self_analyze ──→ auto atom_recall（架構知識注入）
self_apply 成功 ──→ auto self_journal（commit + stats）
self_apply 失敗 ──→ auto recordPitfall（[pitfall] atom）
```

Pitfall atoms 會被未來的 `self_analyze` → `atom_recall` 查到，避免重蹈覆轍。

## 安全機制

1. **Owner-only**：`canTriggerEvolution()` 檢查 — 非 owner 被拒
2. **Evolve Guard**：`validateEvolveBatch()` 檢查白/黑名單 + 檔案數/行數上限
3. **Devil's Advocate**：3 條 deterministic 規則挑戰弱證據提案（預設啟用）
4. **LLM Critique**：Constitutional AI 4-rubric 評分（safety/relevance/reversibility/evidenceStrength），safety veto 機制，Ollama 不可用時自動 block（opt-in: `selfCritique.enabled`）
5. **Build Gate**：`requireBuildPass = true` 時 build 失敗 → 不 commit
6. **Auto-Revert**：`autoRevertOnFailure = true` 時 build 失敗 → 自動回滾
7. **Outcome Tracking**：執行後 ≥5 sessions 自動驗證 baseline vs current metrics
8. **Git 追蹤**：所有變更有 commit，隨時可 revert
9. **Disabled by Default**：`enabled: false` 預設，owner 需明確開啟

## 典型流程

```
Owner: /iterate analyze extensions/atomic-memory/src/recall-engine.ts
Bot:   [分析報告：12 個檔案, 1500 行, 最近 5 個 commit, 相關架構知識...]

Owner: 提高 vector search 的權重到 0.25
Bot:   [使用 self_propose 驗證路徑 → 讀取 recall-engine.ts → 產生 diff 預覽]

Owner: 套用
Bot:   [使用 edit 工具修改 → self_apply 驗證+build+commit → 自動 journal 記錄]
       ✓ Commit: abc123def — +5 -3 in 1 file
```
