# OpenClaw MD 文件與設定檔作用對照

> 2026-03-12 深度閱讀產出。涵蓋所有 `.md` 與設定檔的角色、作用位置、協作關係。

---

## 一、完整運作流程

```
[使用者 WhatsApp/Telegram/Slack/Discord/WebChat 發訊]
    → Gateway (ws://127.0.0.1:18789)
        → 去重/Debounce → Binding 路由選 Agent → Session Key 解析 → Queue 管理
    → Agent Run (Agent Loop)
        → System Prompt 組裝（注入 AGENTS.md/SOUL.md/USER.md/TOOLS.md/IDENTITY.md/MEMORY.md）
        → Model Inference (Auth Profile + Failover)
        → Tool Execution (read/write/exec/browser/memory_search)
        → Reply Shaping (Block Streaming/Chunking/NO_REPLY)
        → Compaction (Memory Flush → 摘要壓縮)
    → Channel Reply Delivery → 依來源頻道回覆
```

---

## 二、根目錄設定檔

| 檔案 | 作用 | 讀取者 |
|------|------|--------|
| `fly.toml` | Fly.io 部署：app=openclaw, region, Docker, port 3000, VM 2x shared-cpu, /data 持久磁碟 | Fly.io CLI |
| `fly.private.toml` | Fly.io 私有覆寫（敏感設定） | Fly.io CLI |
| `docker-compose.yml` | Docker 本地部署：openclaw-gateway(18789+18790) + openclaw-cli | docker compose |
| `render.yaml` | Render.com 部署：web service, health /health, port 8080, 1GB disk | Render CLI |
| `pyproject.toml` | Python 工具：Ruff linter(py310) + pytest(skills/ test path) | ruff/pytest |
| `tsconfig.json` | TypeScript：target ES2023, module NodeNext, strict, plugin-sdk path alias | tsc/tsdown |
| `.env.example` | 環境變數範本：Gateway Token + Model API Keys + Channel Tokens + Tool Keys | 使用者複製為 .env |
| `.npmrc` | npm/pnpm 設定 | pnpm install |
| `.oxlintrc.json` | Oxlint 規則 | pnpm check |
| `.oxfmtrc.jsonc` | Oxfmt 格式化 | pnpm check |
| `.markdownlint-cli2.jsonc` | Markdown lint 規則 | CI/pre-commit |
| `.shellcheckrc` | Shell script lint | CI |
| `openclaw.podman.env` | Podman 容器環境變數 | Podman 部署 |

### 部署選擇

- 本地 → `openclaw gateway` 直接啟動
- Docker → `docker-compose.yml`
- Fly.io → `fly.toml`
- Render → `render.yaml`

---

## 三、Workspace MD（每次 Agent Run 注入 System Prompt）

| 檔案 | 角色 | 注入時機 | 控制項 |
|------|------|---------|--------|
| `AGENTS.md` | Agent 操作指令、行為規則 | 每個 session 每 turn | bootstrapMaxChars (20000) |
| `SOUL.md` | Persona、語氣、邊界 | 每個 session | 同上 |
| `USER.md` | 使用者身份、稱呼偏好 | 每個 session | 同上 |
| `IDENTITY.md` | Agent 名稱/風格/emoji | 每個 session | 同上 |
| `TOOLS.md` | 工具使用筆記（引導，不控制可用性） | 每個 session | 可能 TRUNCATED |
| `HEARTBEAT.md` | Heartbeat 排程清單 | Heartbeat run | 保持簡短 |
| `BOOT.md` | Gateway 啟動時執行清單 | Gateway 啟動(hook) | 需 internal hooks |
| `BOOTSTRAP.md` | 首次啟動儀式 | 僅全新 workspace | 完成後刪除 |
| `MEMORY.md` | 長期策展記憶 | 每個 main session | 不進群組 |
| `memory/*.md` | 每日筆記 | 不自動注入，靠 memory_search | — |

---

## 四、根目錄 MD

| 檔案 | 角色 | 發揮位置 |
|------|------|---------|
| `README.md` | 專案主文件：安裝、Quick Start、架構圖、安全模型、子系統列表 | GitHub 首頁、使用者入門 |
| `VISION.md` | 願景+方向：優先級(安全>穩定>UX)、Plugin/MCP 策略、不合併清單 | 貢獻者決策、PR review |
| `CLAUDE.md` | AI Agent 指令 → 指向 AGENTS.md | Claude Code / Copilot |

---

## 五、.agents/ + .agent/

| 檔案 | 角色 | 發揮位置 |
|------|------|---------|
| `.agents/maintainers.md` | 指向外部 maintainer skills repo | GitHub Agent 維護者 |
| `.agent/workflows/update_clawdbot.md` | Upstream Sync SOP：rebase/merge → rebuild → macOS rebuild → Swift 6.2 fix → Telegram 驗證 | Fork 開發者同步上游 |

---

## 六、.pi/prompts/（Pi Agent 內建提示）

| 檔案 | 角色 | 觸發時機 |
|------|------|---------|
| `cl.md` | Changelog 審計：掃描 commits → 比對 CHANGELOG → 找缺失 | Release 前 |
| `is.md` | Issue 分析：讀 GitHub issue → 追蹤程式碼 → 提出修復/實作 | Bug triage |
| `landpr.md` | PR Landing SOP：checkout → rebase → test → squash merge → verify | Maintainer 合併 PR |

---

## 七、.github/instructions/

| 檔案 | 角色 | 發揮位置 |
|------|------|---------|
| `copilot.instructions.md` | Copilot 專案規範：tech stack、anti-redundancy、import convention、code quality | AI 在此 repo 的行為準則 |

---

## 八、docs/concepts/（核心概念，27 支）

| 檔案 | 核心內容 | 發揮位置 |
|------|---------|---------|
| `architecture.md` | Gateway WS 架構、Client/Node 連線、Wire Protocol、Pairing | Gateway 開發、Client 實作 |
| `agent.md` | Agent Runtime：workspace contract、bootstrap 注入、Skills、pi-mono 整合 | Agent 啟動、System Prompt |
| `agent-loop.md` | Agent Loop 生命週期：入口→context→inference→tools→streaming→持久化 | Agent 執行流程 debug |
| `agent-workspace.md` | Workspace 檔案佈局、備份策略 | 初始化 workspace |
| `context.md` | Context Window：token 計算、/context 指令、truncation | Token 最佳化 |
| `memory.md` | 記憶系統：MD 記憶、向量搜尋、QMD、Hybrid Search、MMR、Temporal Decay、Multimodal | 記憶功能開發 |
| `messages.md` | 訊息流：inbound→route→queue→agent→outbound、debounce、streaming | Channel 開發 |
| `session.md` | Session 管理：key 結構、dmScope、maintenance(prune/rotate) | Session 開發 |
| `session-tool.md` | Session 工具：list/history/send/spawn、agent-to-agent、sandbox visibility | 跨 session 通訊 |
| `multi-agent.md` | 多 Agent 路由：binding rules、per-agent workspace/auth/sessions | 多 agent 設定 |
| `model-failover.md` | Model Failover：auth rotation、cooldown、billing disable、fallback chain | Auth 問題 debug |
| `queue.md` | Command Queue：steer/followup/collect、per-session 序列化 | 訊息排隊邏輯 |
| `system-prompt.md` | System Prompt 組裝：各段落結構、bootstrap 注入、promptMode | 修改 prompt |
| `session-pruning.md` | Session 記憶修剪 | Token 最佳化 |
| `compaction.md` | Context 壓縮：auto-compaction、memory flush | 長對話維護 |
| `models.md` | Model 選擇與設定 | 切換 model |
| `model-providers.md` | Provider 整合 | 新增 provider |
| `streaming.md` | Block streaming / chunking | 分段回覆 |
| `presence.md` | Presence 系統 | 狀態顯示 |
| `retry.md` | 重試策略 | 穩定性 debug |
| `oauth.md` | OAuth 認證 | OAuth login |
| `typing-indicators.md` | 打字指示器 | Channel UX |
| `usage-tracking.md` | 用量追蹤 | Token 成本 |
| `markdown-formatting.md` | Markdown 格式化 | Channel 回覆格式 |
| `features.md` | 功能清單 | 功能發現 |
| `timezone.md` | 時區處理 | 設定時區 |
| `typebox.md` | TypeBox schema | Protocol typing |

---

## 九、docs/automation/（6 支）

| 檔案 | 角色 |
|------|------|
| `hooks.md` | Hook event-driven 自動化、discovery、bundled hooks |
| `webhook.md` | 外部 HTTP Webhook |
| `cron-vs-heartbeat.md` | Cron 與 Heartbeat 比較 |
| `gmail-pubsub.md` | Gmail Pub/Sub 整合 |
| `poll.md` | 輪詢機制 |
| `troubleshooting.md` | 自動化問題排解 |

---

## 十、docs/channels/（20+ 支）

每個 channel 一支文件（whatsapp/telegram/discord/slack/signal 等），外加：
- `channel-routing.md` — 路由規則（最具體優先：peer > guild > account > channel > default）
- `group-messages.md` — 群組訊息處理
- `broadcast-groups.md` — 廣播群組（同一 peer 多 agent 回覆）
- `pairing.md` — 設備配對

---

## 十一、Swabble/（語音子專案）

| 檔案 | 角色 |
|------|------|
| `Swabble/README.md` | macOS 26 語音喚醒 daemon（Speech.framework）CLI 說明 |
| `Swabble/docs/spec.md` | 技術規格：pipeline、wake gate、hook executor |
| `Swabble/CHANGELOG.md` | 版本紀錄 |

發揮位置：macOS/iOS 語音喚醒（「clawd」→ 語音轉文字 → hook → agent）

---

## 十二、設定檔協作關係

```
~/.openclaw/openclaw.json           ← 主設定
    ├── .env / ~/.openclaw/.env      ← API Keys + Channel Tokens（最高優先）
    ├── agents/<id>/agent/
    │   └── auth-profiles.json       ← OAuth/API Key（per-agent）
    ├── agents/<id>/sessions/
    │   ├── sessions.json            ← Session store
    │   └── <sessionId>.jsonl        ← Transcript
    └── workspace/                   ← AGENTS.md, SOUL.md, MEMORY.md...
        └── skills/                  ← Workspace skills

extensions/*/openclaw.plugin.json   ← Plugin metadata（Gateway 啟動載入）
fly.toml / docker-compose.yml / render.yaml ← 部署目標選其一
tsconfig.json + pyproject.toml      ← 開發工具鏈
```
