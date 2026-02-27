# OpenClaw Workspace — 變更記錄

---

## 2026-02-27 — LINE → Claude Code Bridge + Computer Use

- **Bridge Service** (`scripts/openclaw-bridge-server.js`): 統一 HTTP 後端，127.0.0.1:3847
  - Computer-use endpoints: screenshot, click, type, key, window-focus, window-list, clipboard
  - Claude CLI headless endpoint: `/claude/execute`（備用方案）
  - Notification endpoints: `/notify/discord`, `/notify/line`（直接打 REST API 發訊息）
  - 純 Node.js，零 npm 依賴，Bearer token 認證
- **OpenClaw Plugins**:
  - `computer-use` plugin（7 個桌面操作工具，fetch 到 bridge）
  - `claude-bridge` plugin（inject/observe/execute 3 工具，UI 自動化注入 VS Code Claude）
- **Claude Code MCP Servers**:
  - `@anthropic-ai/computer-use` — 官方 computer-use 工具
  - `@anthropic-ai/browser-use` — 瀏覽器自動化
  - `openclaw-notify` — 自建 MCP，提供 `notify_user` 工具（發 Discord/LINE 通知）
- **Claude Code Hooks**: Stop hook 自動發 Discord 通知（session 結束時）
- **Config 變更**:
  - `openclaw.json`: plugins.allow 加入 computer-use, claude-bridge
  - `~/.claude.json`: 加入 3 個 MCP server
  - `~/.claude/settings.json`: 加入 Stop hook
  - `~/.claude/CLAUDE.md`: 加入「回應語言：繁體中文」
- **Startup scripts**: OpenClaw-Start.bat 加入 bridge 啟動（step 3/4），Stop.bat 加入 bridge 停止
- **TOOLS.md**: 加入觸發指令文件（/vscc, /vsccc, /vscodeclaudecode + 語意判斷）
- 測試通過：health, auth, window-list, screenshot(1.5MB), key, clipboard, window-focus

## 2026-02-26 — 服務化啟停腳本

- Start/Stop bat 改用 `openclaw gateway install/start/stop` 原生服務管理
- ngrok 改用 `PowerShell Start-Process -WindowStyle Hidden`（零視窗）
- 移除手動 `start /b` 和 wmic process hunting（不可靠）
- 建立 `MEMORY.md`（OpenClaw Agent 長期記憶，之前漏建）
- 決策升級：Gateway 執行模式 [觀] → [固] Scheduled Task

## 2026-02-26 — 升級 v2026.2.25 + GitHub Repo

- OpenClaw v2026.2.24 → v2026.2.25（`npm install -g openclaw@latest`）
- Security audit: 0 CRITICAL（3 WARN 皆為既有項目）
- 建立 GitHub repo: `holylight1979/OpenClaw-AtomicMemory`（Public）
- 所有設定、workspace、plugin、Claude Code 設定打包進 repo
- Secrets 用 `{{PLACEHOLDER}}` 替代，`.env.example` 列出所有需填值
- ai-kb-framework 以 git submodule 引入
- 寫 INSTALL.md（AI 可執行部署指南）+ README.md（人+AI 可讀）
- 寫 OpenClaw-Start.bat / OpenClaw-Stop.bat（一鍵啟停）

## 2026-02-26 — 跨頻道讀取 Plugin

- 發現 LINE plugin 不支援 message read（架構層級限制，非 config 問題）
- 工具清單依來源頻道 plugin 能力建立，identityLinks 只合併 session context 不合併工具能力
- 建立自訂 plugin `discord-reader`（`~/.openclaw/extensions/discord-reader/`）
- 直接用 Discord REST API 讀訊息，零外部依賴
- 設定 `plugins.allow: ["line", "discord-reader"]` 解決 CRITICAL 安全警告
- 坑：自訂 plugin 無法 import `@sinclair/typebox` 或 `openclaw/plugin-sdk`，需用原生 JSON Schema + fetch

## 2026-02-26 — 跨平台 Session 與工具修正

- `tools.profile` 設為 `"full"`（移除 "messaging" 後留空會導致 Agent 缺少 message read/search 工具）
- `session.dmScope` 改為 `"per-peer"` + `session.identityLinks`（holylight 跨 LINE/Discord 共用 session）
- `tools.sessions.visibility` 設為 `"agent"`（允許跨 session 工具存取）
- Dashboard 認證：需 gateway token，可用 `openclaw dashboard --no-open` 產生帶 token 的 URL

## 2026-02-26 — 原子記憶系統整合

- 整合 ai-kb-framework 原子記憶概念到 OpenClaw workspace
- 建立 `skills/atomic-memory/SKILL.md`（完整規格：scope、lifecycle、privacy、pairing）
- 建立 `atoms/` 目錄結構（global / users / channels / merged）
- 建立 `atoms/_pairing.md`（holylight 跨平台身份映射）
- 建立 `atoms/global/decisions.md`（工程決策 atoms）
- 建立 `atoms/merged/holylight/preferences.md`（核心偏好 atom）
- 更新 AGENTS.md：Every Session 加入 atom 載入流程、替換決策記憶為原子記憶
- 更新 HEARTBEAT.md：加入 atom staging REFINE 和衰退檢查
- 移除 `tools.profile: "messaging"` 以解鎖 Discord 歷史讀取
- 舊 `project-memory` skill → 備份為 `project-memory.bak`，由 `atomic-memory` 取代

## 2026-02-26 — 初始安裝與知識庫建立

- 安裝 OpenClaw v2026.2.24 (npm global)
- 配置安全強化：tools.deny, fs.workspaceOnly, exec deny, elevated disabled
- Discord 整合完成（allowlist, requireMention, pairing approved）
- LINE 整合完成（ngrok webhook, pairing approved）
- LLM 切換：Anthropic API → OpenAI Codex OAuth (gpt-5.3-codex)
- 建立 _AIDocs 知識庫與決策記憶工作流
- 將專案記憶工作流引入 OpenClaw AGENTS.md
