# OpenClaw Workspace — 變更記錄

---

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
