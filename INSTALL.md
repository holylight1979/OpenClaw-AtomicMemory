# OpenClaw 快速部署指南（AI 執行用）

> 本文件設計給 Claude Code 或其他 AI 助手閱讀並自主執行。
> 人類也可以照步驟手動操作。

---

## 前提條件

- Windows 10/11
- 使用者已準備好 `.env`（從 `.env.example` 複製並填入真實 token/key）
- 已 clone 此 repo（含 submodule）：
  ```
  git clone --recurse-submodules https://github.com/holylight1979/OpenClaw-AtomicMemory.git
  ```

---

## Step 1：安裝前置軟體

```powershell
# Git（可能已有）
winget install Git.Git

# Node.js via NVM
winget install CoreyButler.NVMforWindows
# !! 裝完後重開 PowerShell，讓 PATH 生效
nvm install 22
nvm use 22

# ngrok（LINE webhook 需要）
winget install ngrok.ngrok
```

> **PATH 注意**：每裝完一個工具都要重開 PowerShell，否則指令找不到。

---

## Step 2：安裝 OpenClaw

```powershell
# 安裝最新版（不鎖版本）
npm install -g openclaw@latest

# 驗證
openclaw --version

# 初始化（如果是全新機器）
openclaw onboard --flow quickstart

# 設定 LLM（使用 OpenAI Codex OAuth，走 ChatGPT 訂閱）
openclaw onboard --auth-choice openai-codex
```

> **重要**：`openclaw onboard` 會自動生成 `meta`、`wizard`、`auth`、`identity` 等欄位。
> 後續 Step 3 合併設定時，保留這些自動生成的欄位，只覆蓋我們自訂的區塊。

---

## Step 3：複製設定

### 3a. 讀取 .env

從 repo 根目錄的 `.env` 讀取所有值（使用者應已從 `.env.example` 建立並填入）：

| 變數名 | 用途 |
|--------|------|
| `DISCORD_BOT_TOKEN` | Discord Bot Token |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Messaging API token |
| `LINE_CHANNEL_SECRET` | LINE Channel Secret |
| `DISCORD_SERVER_ID` | Discord Server (Guild) ID |
| `DISCORD_USER_ID` | Discord User ID |
| `LINE_USER_ID` | LINE User ID |

### 3b. openclaw.json（主設定）

來源：`repo/dotopenclaw/openclaw.json`
目標：`%USERPROFILE%\.openclaw\openclaw.json`

**合併策略（重要！）**：
1. 讀取目標檔案（`openclaw onboard` 已生成的）
2. 保留目標檔案中的 `meta`、`wizard`、`auth` 區塊（這些是自動生成的）
3. 從 repo 模板覆蓋以下區塊：`browser`、`agents`、`tools`、`messages`、`commands`、`session`、`channels`、`gateway`、`plugins`
4. 替換所有 `{{PLACEHOLDER}}` 為 `.env` 中的實際值
5. `gateway.auth.token`：執行 `openclaw doctor` 讓它自動生成，或填入自訂值

```
合併後的 JSON 結構：
{
  "meta": { ... },           ← 保留 onboard 生成的
  "wizard": { ... },         ← 保留 onboard 生成的
  "auth": { ... },           ← 保留 onboard 生成的
  "browser": { ... },        ← 從 repo 覆蓋
  "agents": { ... },         ← 從 repo 覆蓋（注意 workspace 路徑可能要改）
  "tools": { ... },          ← 從 repo 覆蓋
  "messages": { ... },       ← 從 repo 覆蓋
  "commands": { ... },       ← 從 repo 覆蓋
  "session": { ... },        ← 從 repo 覆蓋（替換 placeholder）
  "channels": { ... },       ← 從 repo 覆蓋（替換 placeholder）
  "gateway": { ... },        ← 從 repo 覆蓋（token 另外處理）
  "plugins": { ... }         ← 從 repo 覆蓋
}
```

**需要依新機器調整的值**：
- `agents.defaults.workspace`：改為新機器的 workspace 路徑（例如 `C:\OpenClawWorkspace`）

### 3c. 自訂 Plugin

```powershell
# 複製 discord-reader plugin
Copy-Item -Recurse repo\dotopenclaw\extensions\* "$env:USERPROFILE\.openclaw\extensions\"
```

### 3d. Workspace 檔案

```powershell
# 複製所有 workspace 內容到 OpenClaw workspace 目錄
# 目標路徑應與 openclaw.json 中 agents.defaults.workspace 一致
Copy-Item -Recurse repo\workspace\* C:\OpenClawWorkspace\

# 初始化 submodule（如果 clone 時沒加 --recurse-submodules）
cd C:\OpenClawWorkspace\ai-kb-framework
git submodule update --init
```

### 3e. Claude Code 全域設定

```powershell
# CLAUDE.md（全域工作流引擎）
Copy-Item repo\claude\CLAUDE.md "$env:USERPROFILE\.claude\CLAUDE.md"

# 自訂指令
Copy-Item -Recurse repo\claude\commands\* "$env:USERPROFILE\.claude\commands\"

# Hooks（session 結束時通知 Discord）
# 需要合併到 ~/.claude/settings.json 的 "hooks" key
# hooks.json 內有 {{BRIDGE_TOKEN}} 和 {{DISCORD_CHANNEL_ID}}，需替換為實際值

# MCP Servers（computer-use, browser-use, openclaw-notify）
# 需要合併到 ~/.claude.json 的 "mcpServers" key
# 注意：openclaw-notify 的 args 路徑需改為本機實際 workspace 路徑
```

> **hooks.json / mcp-servers.json**：這兩個檔案是範本，不能直接複製覆蓋。
> 需要讀取目標檔案，將 repo 內容合併進去，並替換 placeholder。
> 詳見 `repo/claude/hooks.json` 和 `repo/claude/mcp-servers.json` 內的 `_comment`。

### 3f. 啟動腳本

```powershell
# 複製到桌面或其他方便的位置
Copy-Item repo\scripts\*.bat "$env:USERPROFILE\Desktop\"
```

---

## Step 4：安裝 LINE Plugin

```powershell
openclaw plugins install @openclaw/line
```

---

## Step 5：啟動 + 配對

### 5a. 啟動 ngrok

```powershell
ngrok http 18789
```

記下 ngrok 產生的 HTTPS URL（例如 `https://xxxx.ngrok-free.app`）。

### 5b. 設定 LINE Webhook

到 [LINE Developers Console](https://developers.line.biz/) → 你的 Messaging API Channel → Webhook URL：
- 填入：`https://xxxx.ngrok-free.app/channels/line/webhook`
- 開啟 "Use webhook"

> **注意**：ngrok 免費方案每次重啟 URL 會變，需要重新設定。

### 5c. 啟動 Gateway

```powershell
openclaw gateway
```

或雙擊桌面上的 `OpenClaw-Start.bat`（會同時啟動 ngrok + gateway）。

### 5d. 配對裝置

首次使用時，需要透過 DM 配對：

```powershell
# Discord：DM bot 任意訊息 → 取得配對碼
openclaw pairing approve discord <PAIRING_CODE>

# LINE：DM bot 任意訊息 → 取得配對碼
openclaw pairing approve line <PAIRING_CODE>
```

---

## Step 6：驗證

```powershell
# 整體狀態
openclaw status --all
# 預期：Gateway OK, Discord OK, LINE OK（LINE 的 WARN 是顯示 bug，實際可用）

# 安全審計
openclaw security audit --deep
# 預期：0 CRITICAL

# 跨平台功能測試
# 從 LINE 傳：「請讀取 Discord 頻道 #一般 最近的 5 條訊息」
# → 如果成功回傳 Discord 訊息內容，表示 discord-reader plugin 正常運作
```

---

## 升級注意事項

| 檔案 | 升級時被 openclaw 覆蓋？ | 處理方式 |
|------|------------------------|---------|
| `openclaw.json` | 可能（`openclaw onboard` 會改） | 升級後 merge 新欄位，保留自訂區塊 |
| `extensions/*` | 不會 | 安全，直接覆蓋 |
| `workspace/*.md` | 不會 | 安全，直接覆蓋 |
| `atoms/*` | 不會 | 安全，直接覆蓋 |
| `skills/*` | 不會 | 安全，直接覆蓋 |
| `~/.claude/CLAUDE.md` | 不會（Claude Code 的） | 安全，直接覆蓋 |
| `auth-profiles.json` | 會（onboard 重建） | 不進 repo，每台機器自己生成 |
| `identity/device.json` | 會（自動生成） | 不進 repo |

升級流程：
```powershell
npm update -g openclaw
# 如果 openclaw 要求重新 onboard，選「不覆蓋現有設定」
openclaw security audit --deep    # 確認 0 CRITICAL
openclaw status --all              # 確認服務正常
```

---

## 故障排除

| 問題 | 解法 |
|------|------|
| `openclaw` 指令找不到 | `npm prefix -g` 查路徑，加入 PATH，重開 PowerShell |
| LINE 顯示 WARN "token not configured" | 這是顯示 bug，實際可用。重啟 gateway 即可 |
| ngrok URL 變了 | 重啟 ngrok 後到 LINE Developers Console 更新 Webhook URL |
| Discord bot 無回應 | 確認 `requireMention: true` → 群組內需 @mention 才觸發 |
| Dashboard 無法連線 | 需要 gateway token：`openclaw dashboard --no-open` 取得帶 token 的 URL |
| Plugin CRITICAL 警告 | 確認 `plugins.allow` 列出所有信任的 plugin ID |
| 自訂 plugin 載入失敗 | 確認 `openclaw.plugin.json` 存在且格式正確 |
