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

### Phase 2A — Core 層 permissionLevel Enforcement

**目標**：讓 `permissionLevel` 定義生效，非 owner 無法執行 owner 指令。

**改動範圍**：

1. **`commands-context.ts`**：`buildCommandContext()` 加入 `senderPermissionLevel`
   ```typescript
   // 現在只有 isAuthorizedSender, senderIsOwner, ownerList, senderId
   // 加入：
   senderPermissionLevel: auth.senderPermissionLevel
   ```

2. **`commands-types.ts`**：`HandleCommandsParams` / `CommandContext` type 加 `senderPermissionLevel: PermissionLevel`

3. **command dispatch 入口**（`commands-core.ts` 或 dispatch 點）：在找到匹配指令後、執行 handler 前：
   ```typescript
   const required = command.permissionLevel ?? "user";
   if (!hasMinLevel(ctx.senderPermissionLevel, required)) {
     return replyNoPermission(command.key, required, ctx.senderPermissionLevel);
   }
   ```

4. **`command-auth.ts`**：整合 `resolveEffectivePermissionLevel`（取代現在的自製邏輯），加載 System.Owner.json identity

**風險**：低。現有 permissionLevel 定義已合理，只需接線。需確認 gateway operator (`operator.admin` scope) 是否應該 = owner。

### Phase 2B — Discord Command Visibility

**目標**：非 owner/admin 用戶看不到無權限的 slash commands。

**Discord 原生機制**：
- `defaultMemberPermissions`：設定指令需要的 Discord Permission（如 `ADMINISTRATOR`）
- Server Settings → Integrations → 可 per-role/per-channel override

**實作方式**：

1. **native-command.ts** 的 `createDiscordNativeCommand()`：

   ```typescript
   // owner 指令 → 需要 ADMINISTRATOR permission
   if (spec.permissionLevel === "owner") {
     command.defaultMemberPermissions = "0"; // 只 server admin 可見
   } else if (spec.permissionLevel === "admin") {
     command.defaultMemberPermissions = "MANAGE_GUILD"; // 管理員可見
   }
   // user/guest → 不設定（全員可見）
   ```

2. **NativeCommandSpec 擴展**：傳入 `permissionLevel` 供 builder 使用

3. **Server 端設定**：owner 在 Discord Server Settings → Integrations → OpenClaw Bot → 指定哪些 role 可用哪些指令（fine-grained override）

**注意**：`defaultMemberPermissions` 是 Discord 原生機制，Server admin 可在 UI override。建議 owner-level 指令設成最嚴格（"0" = 沒有人可見），再由 server admin 手動指定可用 role。

**替代方案（更精細）**：Guild Command Permission API v2
- 需要 `applications.commands.permissions.update` scope
- 可以 per-command per-role/per-user 設定
- 但較複雜，建議先用 `defaultMemberPermissions` 方案

### Phase 2C — LINE Rich Menu 分層

**目標**：不同權限等級用戶看到不同選單。

**實作方式**：

1. **建立 3 個 Rich Menu**：
   - `owner-menu`：全功能（含 /config、/restart、/approve、管理工具）
   - `admin-menu`：管理功能（/session、/model、/subagents、agent 管理）
   - `user-menu`：基本功能（/help、/status、對話、TTS）

2. **LINE plugin hook**（`before_agent_start` 或自訂 channel event）：
   - 首次互動時 resolve sender permission level
   - 呼叫 LINE Messaging API `POST /v2/bot/user/{userId}/richmenu/{richMenuId}` 綁定對應 menu
   - Cache binding 避免重複 API call

3. **Rich Menu 建立**：LINE Official Account Manager 或 API 上傳圖片 + 設定 action 區域

4. **Postback 路由**：Rich Menu 按鈕 data 帶 command key → OpenClaw 當 text command 處理

**依賴**：需要 LINE Bot Channel Access Token（long-lived），已在 `.env` 中。

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
| **2A** | Core permissionLevel enforcement | 1 | — |
| **2B** | Discord command visibility（defaultMemberPermissions） | 1 | 2A |
| **2C** | LINE Rich Menu 分層 | 1 | 2A |
| **3** | Self-evolution 基礎（workspace scope + safeBins + 流程驗證） | 2 | 2A |
| **4** | `/evolve` Skill 封裝 | 1-2 | 3 |
| **5** | External CI/CD pipeline | 2-3 | 4（可選） |

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

## 九、Phase 3 執P Prompt（Self-Evolution 基礎）

```
# Phase 3 — Self-Evolution 基礎

## 目標
建立 owner 授權的自我迭代基礎能力：Agent 能讀取自身原始碼、修改、build、test、commit。

## 改動清單

### 1. Workspace 設定
- openclaw.json: tools.workspace 包含 OpenClaw 原始碼目錄
- 或確認 gateway 啟動時 cwd 已是 OpenClaw 根目錄

### 2. Exec SafeBins 預授權
- openclaw.json: tools.exec.safeBins 加入：
  - pnpm（build/test）
  - git（status/add/commit/push）
  - tsc（型別檢查）
- 其餘 exec 仍需 owner approve

### 3. Scope 限制 — 建立 evolve guard
- 新檔：extensions/atomic-memory/src/evolve-guard.ts
- 白名單目錄：extensions/、skills/、_AIDocs/
- 黑名單：src/gateway/、src/config/、.env、System.Owner.json
- write/edit tool hook：檢查目標路徑是否在白名單內

### 4. 流程驗證
- Owner 透過 chat 下令「改善 atomic-memory 的 recall scoring 邏輯」
- Agent 讀取 recall-engine.ts → 分析 → 提出計畫 → 等待 owner 確認
- Owner 確認 → Agent 修改 → exec pnpm build → exec pnpm test
- 測試通過 → exec git commit → 通知 owner
- Owner 確認 → exec gateway restart

### 5. 迭代知識存儲
- 每次 self-evolution 結果存入 atom（類型：project, 含 diff 摘要 + 測試結果）
- 跨 session 累積改善知識

## 驗證
- 非 owner 無法觸發 self-evolution 流程
- 修改被限制在白名單目錄
- build 失敗時自動 revert（git checkout -- <files>）
- 修改記錄可在後續 session 查詢

## 前置
- Phase 2A 已完成（permissionLevel enforcement）
```
