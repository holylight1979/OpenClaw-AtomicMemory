# OpenClaw Workspace — 變更記錄

> 保留最近的變更。較舊記錄見 `_CHANGELOG_ARCHIVE.md`。

---

## 2026-02-27 — 修復 Gateway 啟動失敗（config enum 值錯誤）

- `tools.exec.security`: `"allow"` → `"full"`（合法值: deny/allowlist/full）
- `tools.exec.ask`: `"never"` → `"off"`（合法值: off/on-miss/always）
- 原因：先前「全面解鎖」改動寫入了不存在的 enum 值，Gateway 配置驗證失敗拒絕啟動

## 2026-02-27 — 全面解鎖 OpenClaw 自修改權限

- `tools.deny`: 移除 `group:fs`、`group:automation`、`group:runtime`、`gateway`、`cron`、`canvas`、`nodes`，僅保留 `sessions_spawn`、`sessions_send`
- `tools.fs.workspaceOnly`: `true` → `false`（允許存取 workspace 外檔案）
- `tools.exec.security`: `deny` → `allow`（解鎖指令執行）
- `tools.elevated.enabled`: `false` → `true`（啟用提權操作）
- 安全模型從「config deny 補償 sandbox off」轉為「全面放權 + 行為觀察」

## 2026-02-27 — 原子記憶格式套用到 Claude Code auto-memory

- Claude Code 分類記憶檔改為正式 atom 格式（Scope/Confidence/Source/Last-used/Trigger/Privacy + 知識 + 行動）
- `decisions.md`、`pitfalls.md`、`bridge.md` 全部加上 atom 元資料
- `MEMORY.md` 改為 Atom Index，含 Trigger 表供按需載入判斷
- 同步策略套用到 OpenClaw：AGENTS.md（CHANGELOG 滾動淘汰 + 記憶瘦身原則）、HEARTBEAT.md（自動維護任務）、Extra_Efficiently_TokenSafe.md（[固] 決策記錄）

## 2026-02-27 — 記憶系統重構

- Claude auto-memory (`MEMORY.md`) 瘦身：136 行 → ~30 行（索引+高頻事實）
- 拆分為分類檔按需載入：`decisions.md`、`pitfalls.md`、`bridge.md`
- CHANGELOG 滾動淘汰：保留最近條目，舊條目移至 `_CHANGELOG_ARCHIVE.md`
- 預估 token 節省：每 session 自動載入從 ~5,000 tokens 降至 ~1,500 tokens

## 2026-02-27 — 設定同步到 GitHub

- Bridge server + notify MCP + 2 新 plugin（computer-use, claude-bridge）上傳
- Claude Code 設定參考檔：`hooks.json`、`mcp-servers.json`
- openclaw.json 模板加入新 plugin、.env.example 加入 GATEWAY_TOKEN/BRIDGE_TOKEN
- 秘密安全檢查通過（notify MCP 的硬編碼 ID 改為 env var + placeholder）

## 2026-02-27 — OpenClawPanel Bug Fixes（啟停修正）

- Gateway/Bridge 停不掉 → `KillByPort` + `Get-CimInstance Win32_Process` + `taskkill /T /F`
- ngrok 啟動失敗: macOS binary → 直接指定 `ngrok.exe` 完整路徑

## 2026-02-27 — Plugin 圖片格式修正 + Control Panel + Bridge

- Plugin 圖片回傳改為 OpenAI `image_url` + data URL 格式
- OpenClawPanel: .NET 9 WinForms 控制面板（深色主題、三服務狀態）
- LINE → Claude Code Bridge: bridge server:3847 + computer-use/claude-bridge plugins + MCP + hooks
