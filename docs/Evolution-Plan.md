# OpenClaw 進化計畫 — Phase 1 調查報告

> 2026-03-20 | 調查+規劃 session 產出

---

## 一、指令 × 權限等級 矩陣

### 現有指令清單（commands-registry.data.ts）

| # | 指令 | Native Slash | Category | 定義 permissionLevel | 說明 |
|---|------|-------------|----------|---------------------|------|
| 1 | /help | ✓ | status | guest | 顯示可用指令 |
| 2 | /commands | ✓ | status | guest | 列出所有 slash commands |
| 3 | /status | ✓ | status | guest | 顯示目前狀態 |
| 4 | /whoami | ✓ | status | guest | 顯示 sender ID |
| 5 | /context | ✓ | status | (user) | 說明 context 如何建構 |
| 6 | /export-session | ✓ | status | (user) | 匯出 session 為 HTML |
| 7 | /usage | ✓ | options | (user) | 用量/成本摘要 |
| 8 | /think | ✓ | options | (user) | 設定思考層級 |
| 9 | /verbose | ✓ | options | (user) | 切換詳細模式 |
| 10 | /fast | ✓ | options | (user) | 切換快速模式 |
| 11 | /reasoning | ✓ | options | (user) | 切換推理顯示 |
| 12 | /btw | ✓ | tools | (user) | 旁白問題 |
| 13 | /tts | ✓ | media | (user) | 文字轉語音控制 |
| 14 | /skill | ✓ | tools | (user) | 執行 skill |
| 15 | /stop | ✓ | session | (user) | 停止當前 run |
| 16 | /reset | ✓ | session | (user) | 重置 session |
| 17 | /new | ✓ | session | (user) | 開新 session |
| 18 | /compact | ✓ | session | (user) | 壓縮 context |
| 19 | /session | ✓ | session | **admin** | 管理 session 設定 |
| 20 | /subagents | ✓ | management | **admin** | 管理 subagent |
| 21 | /acp | ✓ | management | **admin** | 管理 ACP sessions |
| 22 | /focus | ✓ | management | **admin** | 綁定 thread/topic |
| 23 | /unfocus | ✓ | management | **admin** | 解除綁定 |
| 24 | /agents | ✓ | management | **admin** | 列出 thread agents |
| 25 | /kill | ✓ | management | **admin** | 終止 subagent |
| 26 | /steer | ✓ | management | **admin** | 引導 subagent |
| 27 | /activation | ✓ | management | **admin** | 設定群組啟動模式 |
| 28 | /send | ✓ | management | **admin** | 設定發送政策 |
| 29 | /elevated | ✓ | options | **admin** | 切換 elevated 模式 |
| 30 | /model | ✓ | options | **admin** | 切換模型 |
| 31 | /models | ✓ | options | **admin** | 列出可用模型 |
| 32 | /queue | ✓ | options | **admin** | 調整佇列設定 |
| 33 | /allowlist | ✗(text) | management | **owner** | 管理白名單 |
| 34 | /approve | ✓ | management | **owner** | 審核 exec 請求 |
| 35 | /config | ✓ | management | **owner** | 查看/修改 config |
| 36 | /debug | ✓ | management | **owner** | 設定 debug overrides |
| 37 | /restart | ✓ | tools | **owner** | 重啟 OpenClaw |
| 38 | /exec | ✓ | options | **owner** | 設定 exec 預設值 |
| 39 | /bash | ✗(text) | tools | (user) | 執行 host shell 指令 |
| 40 | /dock_* | ✓ | docks | (user) | 切換 channel dock |

> `(user)` = 未定義 permissionLevel，預設 user

### Atomic Memory Plugin 額外工具（tool，非 slash command）

| 工具 | 權限需求 | 說明 |
|------|---------|------|
| atom_recall | user+ | 查詢記憶 |
| atom_store | admin+ | 儲存記憶 |
| atom_forget | tiered | user 只能刪自己的 [臨]，admin+ 不限 |
| atom_link | owner | 跨平台人物連結 |
| atom_permission | owner | admin 管理 |
| atom_whois | owner | 跨平台人物查詢 |
| atom_clear_test | owner | 清理測試 atoms |

---

## 二、權限架構現況 — 3 個關鍵缺口

### 缺口 1：Core 層不 enforce permissionLevel

**現況**：`commands-registry.data.ts` 定義了每個指令的 `permissionLevel`，`command-auth.ts` 計算了 `senderPermissionLevel`，但 **command handlers 完全不檢查**。

- `CommandContext`（commands-context.ts）只傳 `isAuthorizedSender`（boolean），不傳 `senderPermissionLevel`
- 所有 command handler 只看 `senderIsOwner`（二元），無法區分 admin vs user vs guest
- `hasMinLevel()` 已實作但**零呼叫者**（在 core layer 內）

**影響**：任何通過 allowlist 的人都能執行所有指令，包括 /config、/debug、/restart。

### 缺口 2：Discord 不利用原生 Command Permissions

**現況**：所有 slash commands 註冊時**未設定 `defaultMemberPermissions`**，全部用戶可見。授權只在執行時 application-level 檢查。

**影響**：
- 普通用戶看到 /config、/restart 等高權限指令，點了才被拒→差體驗
- 無法利用 Discord 原生 Server Settings → Integrations → Command Permissions 做 per-role 控制

### 缺口 3：resolveEffectivePermissionLevel 未被 Core 使用

**現況**：`src/channels/permission-level.ts` 有完整的 unified resolution（owner → identity → adminIds → allowlist → guest），但只有 atomic-memory plugin 調用。Core 的 `command-auth.ts` 有自己的一套（`resolveCommandAuthorization`），兩者不互通。

---

## 三、多層級權限實作方案

### 方案概覽

```
Phase 2A: Core 層 enforce permissionLevel（1 session）
Phase 2B: Discord Command Visibility（1 session）
Phase 2C: LINE Rich Menu 分層（1 session）
```

### Phase 2A — Core 層 permissionLevel Enforcement ✅ (2026-03-20)

**目標**：讓 `permissionLevel` 定義生效，非 owner 無法執行 owner 指令。

**已完成**（commit b0b3604 + identity 補完）：

1. ✅ `permission-level.ts`：新建 unified PermissionLevel 型別 + `hasMinLevel()` + `resolveEffectivePermissionLevel()` + `getCachedSystemIdentity()` sync getter
2. ✅ `commands-registry.data.ts`：全部 60+ 指令標註 `permissionLevel`（owner/admin/user/guest）
3. ✅ `command-auth.ts`：`resolveCommandAuthorization()` 整合 `resolveEffectivePermissionLevel()` + `getCachedSystemIdentity()` 傳入 identity（admin 可被正確識別）
4. ✅ `commands-types.ts`：`CommandContext` 加 `senderPermissionLevel: PermissionLevel`
5. ✅ `commands-context.ts`：`buildCommandContext()` 從 auth 傳入 `senderPermissionLevel`
6. ✅ `commands-core.ts`：`handleCommands()` 統一閘門 — `findCommandByTextAlias` + `hasMinLevel` check
7. ✅ `native-command.ts`：Discord dispatch ephemeral 拒絕 + `loadSystemIdentity()` 傳入 identity
8. ✅ gateway operator (`operator.admin` scope) → `senderIsOwner = true` → owner level

### Phase 2B — Discord Command Visibility ✅ (2026-03-21)

**目標**：非 owner/admin 用戶看不到無權限的 slash commands。

**已完成**：

1. ✅ `commands-registry.types.ts`：NativeCommandSpec 加 `permissionLevel?: PermissionLevel`
2. ✅ `commands-registry.ts`：toNativeCommandSpec() 從 ChatCommandDefinition 傳入 permissionLevel
3. ✅ `native-command.ts`：createDiscordNativeCommand() 讀取 NativeCommandSpec.permissionLevel，透過 Carbon `Command.permission` 屬性映射：
   - owner → `PermissionFlagsBits.Administrator`（只有 Discord 管理員可見）
   - admin → `PermissionFlagsBits.ManageGuild`（有 Manage Server 權限可見）
   - user/guest → `undefined`（全員可見）

**設計決策**：計畫原訂 owner 用 `"0"`（字面零 → 無人可見），但 Carbon `serialize()` 對 `0n`（falsy）序列化為 `null`（全員可見），無法達成目的。改用 `Administrator` 效果更佳 — server admin（通常 = owner）自動看到，不需手動到 Integrations 設定。

**雙層保障**：Discord 原生 permission 控制可見性 + Phase 2A server-side gating 硬性攔截，兩層獨立運作。

**DM 指令**：不受影響 — Discord DM 無 guild permission 概念，`defaultMemberPermissions` 只影響 guild 內可見性。

### Phase 2C — LINE Rich Menu 分層 ✅ (2026-03-21)

**目標**：不同權限等級用戶看到不同選單。

**已完成**：

1. ✅ `config-schema.ts`：`LineCommonConfigSchema` 加 `richMenus: { owner?, admin?, user? }` 欄位
2. ✅ `rich-menu-binding.ts`：新建綁定服務 — `ensureRichMenuBinding()` fire-and-forget 呼叫
   - 讀取 `resolveEffectivePermissionLevel()` 解析 sender 權限等級
   - 映射 owner/admin/user/guest → 對應 richMenuId（含 fallback: owner→admin→user）
   - `Map<accountId:userId, { menuId, boundAt }>` 快取，TTL 1hr
   - 錯誤 swallow + logVerbose，不阻塞 messaging
3. ✅ `bot-handlers.ts`：3 個 webhook handler 整合
   - `handleMessageEvent` — DM/群組訊息後 fire-and-forget bind
   - `handleFollowEvent` — 用戶追蹤 bot 時立即 bind
   - `handlePostbackEvent` — Rich Menu 按鈕點擊時 re-validate bind
4. ✅ `scripts/setup-line-rich-menus.ts`：一鍵建立 3 層 Rich Menu
   - owner: /config、/restart、/approve、/debug、/status、/help
   - admin: /session、/model、/subagents、/status、/new、/help
   - user: /help、/status、/new、/tts、/compact、/stop
   - 支援 `--set-default`（設 user menu 為預設）+ `--account <id>`
   - 輸出 richMenuId JSON，直接貼入 openclaw.json

**使用方式**：
```bash
npx tsx scripts/setup-line-rich-menus.ts --set-default
# 將輸出的 richMenuIds 貼入 openclaw.json channels.line.richMenus
```

---

## 四、自我迭代能力 — 技術可行性分析

### 目標

讓 OpenClaw（被 owner 授權後）能：
1. 分析自身程式碼 → 找出改善點
2. 撰寫修改 → 驗證 → 部署
3. 利用原子記憶存儲迭代知識

### 現有基礎

| 能力 | 狀態 | 限制 |
|------|------|------|
| **讀取自身原始碼** | ✓ Agent 有 `read` tool | 無限制 |
| **寫入/編輯檔案** | ✓ Agent 有 `write`/`edit` tool | 需 workspace 包含 src/ |
| **執行 shell 指令** | ✓ `exec` tool | 需 exec approval |
| **Exec Approval** | ✓ 兩階段（request → human approve） | **只路由到人類，無自批准** |
| **Subagent 派生** | ✓ `sessions_spawn` | 繼承 context/config |
| **記憶存儲** | ✓ atomic-memory | 跨 session 持續 |
| **Hot-reload 代碼** | ✗ Jiti cache | 需重啟 gateway |
| **動態載入 Plugin** | ✗ 無 API | 只在啟動時載入 |
| **CI/CD Pipeline** | ✗ 不存在 | 需外建 |

### 可行路線

#### 路線 A：Plugin Tool + Exec（最可行，Phase 3 建議）

```
Owner 下令「改善 X 功能」
  → Agent 讀取 src/ 相關原始碼
  → Agent 分析 + 產生修改計畫（寫入 atom）
  → Agent 用 write/edit tool 修改檔案
  → Agent 用 exec tool 執行 `pnpm build`（需 approval）
  → Agent 用 exec tool 執行 `pnpm test`
  → 測試通過 → Agent 用 exec tool 執行 `git commit + push`
  → Agent 通知 owner 結果
  → Owner 審核 → exec tool `openclaw restart`（或 PM2 restart）
```

**優點**：
- 完全利用現有 tool 系統
- Exec approval 提供安全閘門
- 原子記憶存儲每次迭代的知識

**缺點**：
- 每個 exec 需要人工 approve（可透過 safeBins 預授權常見指令）
- 無 hot-reload，修改後需重啟

**安全機制**：
- Owner-only 觸發（permissionLevel check）
- Exec approval 二次確認
- Git 提供回滾能力
- 可限制 workspace scope（只能改 extensions/、不能改 core）

#### 路線 B：Dedicated Self-Evolution Skill（建議 Phase 4）

建立專用 Skill（`/evolve`），封裝完整流程：

```yaml
# skills/evolve/SKILL.md
name: evolve
description: "Self-improvement pipeline with safety gates"
metadata:
  openclaw:
    permissionLevel: owner
    requires:
      bins: [pnpm, git]
allowed-tools: [read, write, edit, exec, message]
```

Skill 內建：
1. **Code Analysis Agent**：讀取 + 分析目標模組
2. **Plan Generation**：產生修改計畫（人類審核）
3. **Implementation Agent**：執行修改
4. **Test Runner**：`pnpm test` + `pnpm build`
5. **Review Report**：diff 摘要 + 影響分析
6. **Deploy Gate**：owner approve → restart

#### 路線 C：External CI/CD + Webhook（Phase 5 遠期）

```
Agent commit → GitHub Actions trigger
  → Build → Test → Docker image
  → Staging deploy → Health check
  → Owner approve → Production swap
```

**需要**：GitHub repo + Actions 設定 + Docker compose/PM2 config

### 建議路線

**Phase 3 → 路線 A**（最小可行）：利用現有 tool 系統，加上幾個 safeBins 預授權
**Phase 4 → 路線 B**（封裝）：建立 `/evolve` skill，標準化流程
**Phase 5 → 路線 C**（完整）：外部 CI/CD，full automation

### 安全邊界設計

```
┌─────────────────────────────────────────┐
│  Owner 授權層（Phase 2A prerequisite）   │
│  ┌───────────────────────────────────┐  │
│  │  Workspace Scope 限制             │  │
│  │  - 可改：extensions/、skills/     │  │
│  │  - 禁改：src/core、config、.env   │  │
│  │  ┌─────────────────────────────┐  │  │
│  │  │  Exec Approval 閘門         │  │  │
│  │  │  - safeBins: pnpm, git      │  │  │
│  │  │  - 其餘需 owner approve     │  │  │
│  │  │  ┌───────────────────────┐  │  │  │
│  │  │  │  Git 回滾能力         │  │  │  │
│  │  │  │  - 每次修改一個 commit │  │  │  │
│  │  │  │  - 失敗自動 revert    │  │  │  │
│  │  │  └───────────────────────┘  │  │  │
│  │  └─────────────────────────────┘  │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

---

## 五、Phase 拆分清單

| Phase | 目標 | 預估 Sessions | 前置 |
|-------|------|--------------|------|
| **2A** | Core permissionLevel enforcement | 1 | — | ✅ 完成 |
| **2.5** | 敏感資訊過濾（安全核心） | 1 | 2A | ✅ 完成 |
| **2B** | Discord command visibility（defaultMemberPermissions） | 1 | 2A | |
| **2C** | LINE Rich Menu 分層 | 1 | 2A | ✅ 完成 |
| **3** | Self-evolution 基礎（workspace scope + safeBins + 流程驗證） | 2 | 2A+2.5 | |
| **4** | `/evolve` Skill 封裝 | 1-2 | 3 | |
| **5** | External CI/CD pipeline | 2-3 | 4（可選） | |
| **6** | 跨領域理論深度研究 + OETAV 架構設計 | 2 | 4 | ✅ 完成 |

### Phase 2A 的可選前置：統一 permission resolution

目前 `command-auth.ts` 和 `permission-level.ts` 各有一套 resolution 邏輯。建議在 2A 中一併整合：讓 `command-auth.ts` 的 `resolveCommandAuthorization()` 內部呼叫 `resolveEffectivePermissionLevel()`，並補入 System.Owner.json identity 查詢。

---

## 六、Phase 2A 執P Prompt

```
# Phase 2A — Core permissionLevel Enforcement

## 目標
讓 commands-registry.data.ts 中的 permissionLevel 定義生效。非 owner 用戶無法執行 owner 指令。

## 改動清單

### 1. command-auth.ts — 整合 unified permission resolution
- import { resolveEffectivePermissionLevel, loadSystemIdentity } from "../channels/permission-level.js"
- 在 resolveCommandAuthorization() 內，用 resolveEffectivePermissionLevel() 計算 senderPermissionLevel
- 傳入 identity（從 loadSystemIdentity() 取得）
- 移除重複的 owner/admin 判斷邏輯

### 2. commands-context.ts — 傳遞 senderPermissionLevel
- CommandContext type 加 senderPermissionLevel: PermissionLevel
- buildCommandContext() 從 CommandAuthorization 取出並傳入

### 3. commands-types.ts — 更新 HandleCommandsParams
- 加 senderPermissionLevel: PermissionLevel

### 4. command dispatch 入口 — 加入 permission check
- 在指令匹配後、handler 執行前
- const required = command.permissionLevel ?? "user"
- if (!hasMinLevel(ctx.senderPermissionLevel, required)) → 回傳 "權限不足" 訊息
- 訊息格式：「⛔ 此指令需要 {required} 權限，您的權限等級為 {senderLevel}」

### 5. Discord native command dispatch — 同步 check
- native-command.ts 的 dispatchDiscordCommandInteraction() 也需要同樣的 permission check
- 在現有 authorization check 之後、command handler 之前

## 驗證
- owner 可執行 /config、/debug、/restart、/exec
- admin 可執行 /session、/model、/subagents，不能執行 owner 指令
- user 可執行 /help、/status、/new，不能執行 admin/owner 指令
- guest 只能執行 /help、/commands、/status、/whoami

## 注意
- gateway operator (operator.admin scope) 應視為 owner
- 不修改 plugin 層邏輯（atomic-memory 的 permission-guard 繼續獨立運作）
- 讀 _AIDocs/Channels-Routing.md + Evolution-Plan.md 了解全貌
- 完成後更新 _AIDocs + modifications.md + 上 GIT
```

---

## 七、Phase 2B 執P Prompt

```
# Phase 2B — Discord Command Visibility

## 目標
利用 Discord 原生 defaultMemberPermissions，讓非授權用戶看不到高權限 slash commands。

## 改動清單

### 1. native-command.ts — createDiscordNativeCommand()
- 讀取 ChatCommandDefinition.permissionLevel
- owner 指令：defaultMemberPermissions = "0"（預設無人可見，server admin 手動 override）
- admin 指令：defaultMemberPermissions = PermissionFlagsBits.ManageGuild.toString()
- user/guest：不設定（全員可見）

### 2. NativeCommandSpec 擴展
- 加 permissionLevel?: PermissionLevel 欄位
- buildNativeCommandSpecs() 從 ChatCommandDefinition 傳入

### 3. Command 重新部署
- 修改後需重新部署 slash commands 到 Discord（handleDeployRequest）
- 確認 DM 指令不受影響（DM 無 guild permission 概念）

## 驗證
- Discord 普通 member 看不到 /config、/debug、/restart
- Server admin（有 ManageGuild 權限）可看到 /session、/model
- 全員可看到 /help、/status、/new
- DM 指令不受影響

## 前置
- Phase 2A 已完成（permission level 定義已 enforce）

## 注意
- Carbon framework 的 Command class 是否支援 defaultMemberPermissions — 需確認 API
- 如果 Carbon 不支援，可能需要 REST API 直接設定
- 讀 _AIDocs/Evolution-Plan.md 了解全貌
```

---

## 八、Phase 2C 執P Prompt（LINE Rich Menu）

```
# Phase 2C — LINE Rich Menu 權限分層

## 目標
不同權限等級用戶看到不同 Rich Menu。

## 前置調查
1. 確認 LINE Bot 的 Channel Access Token 位置（.env）
2. 確認 LINE plugin 結構（extensions/line/）
3. 確認 Rich Menu API 是否已有封裝

## 改動清單

### 1. Rich Menu 設計（3 層）
- owner-menu：全功能按鈕
- admin-menu：管理功能
- user-menu：基本功能
- 圖片尺寸：2500×1686 或 2500×843

### 2. Rich Menu 建立腳本
- scripts/setup-line-rich-menus.ts
- 用 LINE Messaging API 建立 3 個 menu + 上傳圖片 + 設定 action 區域
- 產出 richMenuId 存入 config

### 3. LINE plugin hook — 自動綁定
- before_agent_start 或 channel event hook
- resolve sender permission level
- 呼叫 LINE API 綁定對應 richMenuId
- cache：Map<userId, { menuId, boundAt }> 避免重複 API call

### 4. openclaw.json 設定
- channels.line.richMenus: { owner: "richmenu-xxx", admin: "...", user: "..." }

## 驗證
- owner 看到全功能 menu
- 新用戶看到 user menu
- admin 被加入後自動切換 menu

## 前置
- Phase 2A 已完成
```

---

## 九、Phase 3 實作完成（Self-Evolution 基礎）— 2026-03-21

> **狀態：✅ 已完成**（基礎設施層，Phase 5 工具套件將建構於此之上）

### 實作內容

#### 1. Exec SafeBins 預授權 ✅
- `openclaw.json` → `tools.exec.safeBins`: `["pnpm", "git", "tsc"]`
- 每個 binary 都有 `safeBinProfiles` 限制（deniedFlags 含 `--force`, `--no-verify`, `--hard` 等危險旗標）

#### 2. Config 擴展 ✅
- `config.ts` → `selfIteration.codeModification` 新增子設定：
  - `enabled` (default: false — opt-in)
  - `sourceDir` — OpenClaw 原始碼根目錄
  - `allowedPaths` (default: `["extensions/", "skills/", "_AIDocs/"]`)
  - `blockedPaths` (default: `["src/gateway/", "src/config/", ".env", "System.Owner.json"]`)
  - `maxFilesPerPass` / `maxLinesPerPass` — 單次改動上限
  - `requireBuildPass` / `autoRevertOnFailure` — build 安全機制

#### 3. Evolve Guard 模組 ✅
- 新檔：`extensions/atomic-memory/src/evolve-guard.ts`
- `validateEvolvePath()` — 單檔白/黑名單驗證
- `validateEvolveBatch()` — 批次驗證 + 檔案數/行數上限
- `canTriggerEvolution()` — owner-only 權限檢查
- `buildEvolveGuardContext()` — 注入 agent system prompt
- `createJournalEntry()` / `formatJournalMarkdown()` — 迭代日誌

#### 4. Plugin 整合 ✅
- `index.ts` → `before_prompt_build` hook：owner 登入且 `codeModification.enabled` 時自動注入 evolve guard context
- types.ts 新增：`EvolvePathVerdict`, `EvolveBatchVerdict`, `EvolvePassStats`, `EvolveJournalEntry`

#### 5. 安全設計
- 黑名單優先於白名單（blockedPaths 先檢查）
- 路徑逃逸偵測（`../` 被拒絕）
- git `--force` / `--no-verify` / `--hard` 被 safeBinProfile 擋住
- `enabled: false` 預設 — 必須 owner 明確啟用

### 尚未實作（留給 Phase 5）
- ~~`self_analyze` / `self_propose` / `self_apply` / `self_journal` 四個工具~~ → Phase 4 已實作
- ~~實際的 build→test→commit→revert pipeline~~ → Phase 4 已實作
- 流程驗證端到端測試
- 分支隔離（git checkout -b self-iterate/xxx）

### 前置
- Phase 2A 已完成（permissionLevel enforcement） ✅

---

## 十、Phase 4 實作完成（/iterate 指令 + 整合收尾）— 2026-03-21

> **狀態：✅ 已完成**（自我迭代工具套件 + 指令封裝 + 回饋循環 + 權限審計）

### 實作內容

#### 1. 自我迭代工具套件 ✅

新檔：`extensions/atomic-memory/src/self-iterate-tools.ts`

| 工具 | 權限 | 功能 | 副作用 |
|------|------|------|--------|
| `self_analyze` | owner | 讀取原始碼 + git log + atom_recall 架構知識 | 無（唯讀） |
| `self_propose` | owner | 驗證目標路徑 vs evolve guard + 讀取檔案內容 | 無（唯讀） |
| `self_apply` | owner | 驗證變更 → build → commit（失敗可 auto-revert） | 寫入（git commit） |
| `self_journal` | owner | 記錄迭代結果到 atomic memory（[臨] atom） | 寫入（atom store） |

所有工具 `canTriggerEvolution()` 權限檢查：owner-only + codeModification.enabled。

#### 2. `/iterate` 指令 ✅

- `api.registerCommand("iterate")` — owner-only chat command
- 子指令：
  - `/iterate analyze <path>` — 分析指定路徑的原始碼
  - `/iterate propose <desc>` — 準備修改提案（引導使用 self_propose tool）
  - `/iterate apply [desc]` — 驗證 + build + commit 當前修改
  - `/iterate journal <summary>` — 手動記錄迭代筆記
- 權限驗證透過 `resolvePermissionLevel()` + System.Owner.json identity

#### 3. 原子記憶回饋循環 ✅

- **self_analyze → auto atom_recall**：分析前自動查詢相關架構知識，注入上下文
- **self_apply 成功 → auto self_journal**：自動記錄 commit hash + diff stats + 描述
- **self_apply 失敗 → pitfall atom**：自動記錄失敗原因為 `[pitfall]` atom（[臨]）
- **pitfall atoms 可被 atom_recall 查詢**：未來迭代可自動查到歷史失敗，避免重蹈覆轍

#### 4. 權限事件審計 ✅

- `atom_permission` 工具的 add/remove 動作自動建立 `[permission-audit]` event atom
- 記錄：操作類型、目標 userId、日期
- Atoms 為 [臨] 級，可被 recall 查詢用於審計追蹤

#### 5. 測試修復 ✅

- `g-int.test.ts` mock config 補齊 `codeModification` + `systemIdentityPath` 欄位
- TypeScript 零錯誤（atomic-memory 範圍內）

### 安全設計

1. 所有工具 `canTriggerEvolution()` gate（owner + enabled check）
2. `self_apply` 路徑驗證透過 `validateEvolveBatch()`（evolve guard）
3. Build 失敗時 `autoRevertOnFailure` 自動 `git checkout -- .`
4. 單次改動上限（maxFilesPerPass + maxLinesPerPass）
5. Pitfall 自動記錄，防止重複失敗

### 前置
- Phase 1 統一權限 ✅
- Phase 2A 指令閘門 ✅
- Phase 2.5 敏感資訊過濾 ✅
- Phase 2B Discord visibility ✅
- Phase 2C LINE Rich Menu ✅
- Phase 3 Self-evolution guard ✅

---

## 十一、Phase 4 Guest 等級實作 — 2026-03-21

> **狀態：✅ 已完成**（guest 權限完整實作 — 攔截 + 申請 + 審核 + 配置）

### 實作內容

#### 1. Guest Level Resolution 修正 ✅

- `permission-guard.ts` `resolvePermissionLevel()` 修正：無 senderId 時返回 `"guest"`（原返回 `"user"`，與 core `resolveEffectivePermissionLevel()` 不一致）
- `buildCapabilityContext()` 已有 guest case，無需修改

#### 2. `/request-access` 指令 ✅

- `commands-registry.data.ts` 新增指令定義（`permissionLevel: "guest"`，category: "status"）
- 新建 `access-request.ts` — 完整 CRUD 儲存模組（submitAccessRequest / approveAccessRequest / denyAccessRequest / listPendingRequests）
- 儲存位置：`{atomStorePath}/_permission/access-requests.json`
- Owner 通知：`before_agent_start` hook 偵測 pending requests → 注入 system context 提醒

#### 3. Owner 審核指令 ✅

| 指令 | 權限 | 功能 |
|------|------|------|
| `/approve-access <senderId>` | owner | 核准 → 自動 `addChannelAllowFromStoreEntry()` 加入 allowlist |
| `/deny-access <senderId>` | owner | 拒絕請求 |
| `/pending-access` | owner | 列出所有 pending 請求 |

`/approve-access` 設計：核准後嘗試自動加入 pairing store allowlist，失敗時 fallback 提示手動 `/allowlist add`。

#### 4. Guest Chat 攔截（Core 層）✅

- `get-reply.ts` 在 `handleInlineActions()` 之後、`runPreparedReply()` 之前插入 guest 檢查
- Guest 非指令訊息 → 直接 return 固定回覆，**不進 LLM pipeline**
- 指令仍由 `handleInlineActions` 正常處理（guest 可執行白名單內指令）

#### 5. Config 支援 ✅

- `config.ts` permission 區段新增 `guestCommands: string[]`
- 預設值：`["help", "commands", "whoami", "status", "request-access"]`
- `plugin-sdk/index.ts` 新增 `addChannelAllowFromStoreEntry` re-export

### 影響檔案（8 個）

| 檔案 | 變更 |
|------|------|
| `extensions/atomic-memory/src/permission-guard.ts` | guest resolution fix |
| `extensions/atomic-memory/src/access-request.ts` | 新建 |
| `extensions/atomic-memory/config.ts` | guestCommands config |
| `extensions/atomic-memory/index.ts` | 4 command handlers + owner notification |
| `extensions/atomic-memory/g-int.test.ts` | mock config 補齊 guestCommands |
| `src/auto-reply/commands-registry.data.ts` | 4 個新指令定義 |
| `src/auto-reply/reply/get-reply.ts` | guest chat 攔截 |
| `src/plugin-sdk/index.ts` | pairing store re-export |

### 前置
- Phase 1 統一權限 ✅
- Phase 2A 指令閘門 ✅
- Phase 3 Self-evolution guard ✅
- Phase 4 /iterate 指令 ✅

---

## 十二、Phase 5 端到端驗證 + 整合測試 — 2026-03-21

> **狀態：✅ 已完成**（Guest 權限流程 E2E 驗證 + 22 個整合測試案例）

### 驗證內容

#### 1. g-int.test.ts 新增 Guest 場景 ✅

3 個 describe 區塊，共 22 個測試案例：

**Guest level resolution（6 tests）**：
- Plugin 層 `resolvePermissionLevel(undefined)` → `"guest"`
- Core 層 `resolveEffectivePermissionLevel({ isInAllowlist: false })` → `"guest"`
- 不在 allowlist 的 sender → `"guest"`（core 層）
- 在 allowlist 的 sender → `"user"`（確認非 guest）
- Guest 無 write access
- Guest capability context 包含正確描述

**Command gate（7 tests）**：
- `hasMinLevel("guest", "guest")` → true（/help, /request-access, /whoami, /status）
- `hasMinLevel("guest", "user")` → false（/model 等）
- `hasMinLevel("guest", "owner")` → false（/allowlist）
- `hasMinLevel("guest", "admin")` → false
- Guest 非指令訊息固定回覆文字驗證

**Access request flow（9 tests）**：
- submit → created
- duplicate pending → rejected
- listPendingRequests → 正確列出
- approve → status=approved, resolvedBy 填入
- deny → status=denied
- approve/deny 不存在的 ID → null
- approved 後可重新申請
- owner notification context 包含 pending sender IDs

#### 2. 過期測試修正 ✅
- Scene 3 "no senderId resolves to 'user'" → 修正為 'guest'（對齊 Phase 4 Guest 行為）

#### 3. 文件同步 ✅
- `_AIDocs/Evolution-Plan.md` 搬移至 `docs/Evolution-Plan.md`（規劃文件不符 _AIDocs 收錄標準）
- `_AIDocs/_INDEX.md` 更新搬遷標記
- `_AIDocs/_CHANGELOG.md` 加入 Phase 5 記錄
- `_AIDocs/Core-AutoReply-Functions.md` 更新 command-auth/commands-core/get-reply 描述含 Guest 攔截
- `_AIDocs/Extensions.md` atomic-memory 描述更新

### 影響檔案（6 個）

| 檔案 | 變更 |
|------|------|
| `extensions/atomic-memory/g-int.test.ts` | +22 tests, 修正 1 stale test |
| `docs/Evolution-Plan.md` | 從 _AIDocs 搬入 + Phase 5 記錄 |
| `_AIDocs/_INDEX.md` | 文件數量更新 + 搬遷標記 |
| `_AIDocs/_CHANGELOG.md` | Phase 5 記錄 |
| `_AIDocs/Core-AutoReply-Functions.md` | Guest 攔截文件 |
| `_AIDocs/Extensions.md` | atomic-memory 描述更新 |

---

## 十三、Phase 6 跨領域理論深度研究 + OETAV 架構設計 — 2026-03-21

> **狀態：✅ 已完成**（架構設計 + 規格書，尚未實作程式碼）

### 目標

以 17 個跨領域理論（數學/控制論、哲學/認識論、複雜系統、AI 認知、東方哲學）加固 OETAV 循環架構，將每個理論洞察轉化為具體 TypeScript 介面與演算法設計。

### 產出文件

| 文件 | 說明 |
|------|------|
| `docs/Self-Iteration-Architecture.md` | OETAV 完整架構（含第六章跨領域理論落地設計、14 條不變量、Phase A-F 計畫） |
| `docs/Self-Iteration-Spec.md` | 8 模組 TypeScript 介面與演算法規格（M1-M8，零歧義實作參照） |

### 8 個新模組（Spec M1-M8）

| 模組 | 檔案 | 對應理論 | Phase |
|------|------|---------|-------|
| M1 | `convergence-health.ts` | 不動點收斂 + Lyapunov 穩定性 | B+D |
| M2 | `entropy-signal.ts` | Shannon 熵 + 自組織臨界性 | A |
| M3 | `identity-checker.ts` | Ship of Theseus 身份不變量 | F |
| M4 | `threshold-balancer.ts` | 反思平衡 + 知行合一 + 無為 | B |
| M5 | `self-critique.ts` | Constitutional AI + Reflexion + 反辯者 | C |
| M6 | `transfer-algorithm.ts` | 記憶鞏固 + ACT-R 增強 | F |
| M7 | `ttl-balance.ts` | 耗散結構 + 觀測者效應 | A+D |
| M8 | `metacognition-score.ts` | 元認知 + Gödel 邊界 + DSPy | D |

### OETAV 實作 Phase 計畫

| Phase | 內容 | 預估 Sessions |
|-------|------|--------------|
| A | Signal Collector + Evidence Accumulator + S9 熵信號 + 觀測開銷 | 1 |
| B | Threshold Evaluator + Proposal Generator + 收斂偵測 + 反思平衡 | 1 |
| C | Auto Executor + Constitutional 批評 + 反辯者 | 1 |
| D | Outcome Tracker + Lyapunov 健康 + DSPy metrics + Reflexion + 元認知 | 1-2 |
| E | Confirm Executor + Code Actions | 1-2 |
| F | Identity Checker + 記憶鞏固增強 + ACT-R 動態閾值 + TTL 平衡 | 1-2 |

```
Phase A ──→ Phase B ──→ Phase C ──→ Phase D ──→ Phase E
                                                  ↑
Phase F（獨立，僅需 atom store + 現有 engines）     │
                                                  └── 可平行
```

### 新增不變量（#12-#14）

| # | 不變量 | 說明 |
|---|--------|------|
| 12 | 身份保持 | auto 動作不得修改 essential atoms |
| 13 | 反辯者閘門 | overSpeculationScore ≥ 0.6 → 降級或拒絕 |
| 14 | 知行合一 | stale evidence（≥ staleCycleThreshold）觸發衰減 |

### 前置條件

- Phase 4 `/iterate` 指令 ✅
- Phase 5 測試驗證 ✅
