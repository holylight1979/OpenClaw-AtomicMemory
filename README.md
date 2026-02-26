# OpenClaw-AtomicMemory

OpenClaw AI Agent 的完整配置包，包含跨平台通訊（Discord + LINE）、原子記憶系統、自訂 Plugin、Claude Code 工作流設定。

設計為可攜式部署 — 在新機器上由 AI 助手讀取 `INSTALL.md` 即可快速還原相同環境。

---

## 這個 Repo 包含什麼

```
.
├── INSTALL.md                    # AI 可執行的部署指南（主要入口）
├── .env.example                  # 秘密值模板（token / ID）
│
├── dotopenclaw/                  # ~/.openclaw/ 的設定
│   ├── openclaw.json             # 主設定（secrets 已替換為 {{placeholder}}）
│   └── extensions/
│       └── discord-reader/       # 自訂 plugin：跨頻道讀取 Discord 訊息
│
├── workspace/                    # OpenClaw Workspace（Agent 人格 + 知識庫）
│   ├── AGENTS.md                 # Agent 行為規範
│   ├── SOUL.md                   # Agent 核心人格
│   ├── IDENTITY.md               # Agent 身份定義
│   ├── BOOTSTRAP.md              # 首次啟動引導
│   ├── USER.md                   # 使用者資訊
│   ├── HEARTBEAT.md              # 定期自省規則
│   ├── TOOLS.md                  # 工具使用指引
│   ├── _AIDocs/                  # 專案知識庫（架構文件 + 變更記錄）
│   ├── memory/                   # 決策記憶
│   ├── atoms/                    # 原子記憶（跨平台、分層 scope）
│   ├── skills/atomic-memory/     # 原子記憶 Skill 規格
│   └── ai-kb-framework/          # [submodule] 原子記憶框架
│
├── claude/                       # ~/.claude/ 的設定（Claude Code 專用）
│   ├── CLAUDE.md                 # 全域工作流引擎
│   └── commands/                 # 自訂 slash commands
│
└── scripts/                      # 一鍵啟動/關閉腳本
    ├── OpenClaw-Start.bat
    └── OpenClaw-Stop.bat
```

---

## 快速開始

1. Clone（含 submodule）：
   ```
   git clone --recurse-submodules https://github.com/holylight1979/OpenClaw-AtomicMemory.git
   ```

2. 複製 `.env.example` → `.env`，填入你的 token 和 ID

3. 照 [INSTALL.md](INSTALL.md) 執行部署

---

## 核心功能

### 跨平台通訊
- **Discord**：Bot Token + allowlist + requireMention
- **LINE**：Messaging API + ngrok webhook
- **跨平台讀取**：自訂 `discord-reader` plugin 讓 LINE 使用者也能讀 Discord 訊息

### 原子記憶系統
- 基於 [ai-kb-framework](https://github.com/holylight1979/ai-kb-framework) 的分層記憶
- Scope 層級：global → channel → user → merged
- 跨平台身份映射（Discord + LINE → 統一 session）

### 安全配置
- `tools.deny`：禁用高風險工具群組（automation / runtime / fs）
- `fs.workspaceOnly`：限制檔案存取範圍
- `exec.security: "deny"`：禁止任意指令執行
- `elevated.enabled: false`：禁用提權
- `sandbox.mode: "off"`：無 Docker，以 config 級限制補償

---

## 秘密管理

此 repo 是 **public** 的。所有秘密值已替換為 `{{PLACEHOLDER}}`：

| Placeholder | 說明 |
|-------------|------|
| `{{DISCORD_BOT_TOKEN}}` | Discord Bot Token |
| `{{LINE_CHANNEL_ACCESS_TOKEN}}` | LINE Channel Access Token |
| `{{LINE_CHANNEL_SECRET}}` | LINE Channel Secret |
| `{{DISCORD_SERVER_ID}}` | Discord Server (Guild) ID |
| `{{DISCORD_USER_ID}}` | Discord User ID |
| `{{LINE_USER_ID}}` | LINE User ID |
| `{{GATEWAY_TOKEN_FROM_openclaw_doctor}}` | Gateway 認證 token（可由 openclaw 自動生成） |

部署時從 `.env` 讀取實際值並替換。

---

## 升級

```powershell
npm update -g openclaw
openclaw security audit --deep    # 確認 0 CRITICAL
```

詳見 [INSTALL.md 升級注意事項](INSTALL.md#升級注意事項)。

---

## 授權

個人使用配置，依各元件原始授權。
