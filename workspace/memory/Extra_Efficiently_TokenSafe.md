# 決策記憶 — 效率與 Token 節省

> 三層分類：[固] 穩定決策 / [觀] 可能演化 / [臨] 單次決策
> 定義見全域 `~/.claude/CLAUDE.md`

---

## 工程決策

### [固] LLM 選擇：OpenAI Codex OAuth，不用 Anthropic API
- 原因：Anthropic API 按量付費（使用者無餘額），Claude Max 訂閱禁止第三方 OAuth
- ChatGPT 訂閱允許 Codex OAuth
- 確認次數：2（初選 Anthropic → 碰壁 → 轉 Codex）

### [觀] 安全策略：全面放權自修改（2026-02-27 起）
- 原先：config deny + fs.workspaceOnly 補償 sandbox off
- 現行：移除 fs/automation/runtime/gateway/cron/canvas/nodes deny，僅保留 sessions_spawn/sessions_send
- exec.security=allow、elevated.enabled=true、fs.workspaceOnly=false
- 風險意識：無 sandbox + 無 deny = 完全信任 agent 行為，靠 prompt + 觀察控制

### [固] 不用 Docker / WSL
- 原因：使用者偏好輕量，公司電腦限制多
- sandbox.mode = "off"，用 config deny 補償

### [固] ngrok 免費方案做 LINE webhook
- 原因：最簡單的方式取得公開 HTTPS URL
- 代價：URL 不固定，重啟要手動更新 LINE Console

### [固] Gateway 執行模式：Scheduled Task 服務
- 已改用 `openclaw gateway install/start/stop` 原生服務管理
- Start.bat: install → start → ngrok via PowerShell Hidden
- 確認次數：2（前台 → 服務化）

### [固] 控制面板：WinForms (.NET 9)
- 路徑：`C:\OpenClawWorkspace\OpenClawPanel\`
- 用途：GUI 管理 Gateway/Bridge/ngrok 三服務的啟停與狀態
- 選擇 WinForms 原因：使用者指定 WinForm，深色主題簡潔直觀

### [固] 記憶架構：分類按需載入 + 滾動淘汰
- **MEMORY.md 只放高頻事實**（~30 行），不堆積歷史細節
- **完整決策放本檔案**（Extra_Efficiently_TokenSafe.md），按需讀取
- **CHANGELOG 滾動淘汰**：`_CHANGELOG.md` 保留最近 ~8 筆，舊條目移至 `_CHANGELOG_ARCHIVE.md`
- **HEARTBEAT 自動維護**：heartbeat 時檢查 CHANGELOG 條目數量和 MEMORY.md 行數
- 原則：常態載入最小化，細節按需深入
- 確認次數：1（使用者主動提出）

---

## 演化日誌

| 日期 | 記憶 | 變更 |
|------|------|------|
| 2026-02-26 | LLM 選擇 | Anthropic API → OpenAI Codex OAuth [臨→固] |
| 2026-02-26 | 安全策略 | 確認 config deny 方針 [觀→固] |
| 2026-02-26 | 不用 Docker | 確認 [固] |
| 2026-02-26 | ngrok 免費方案 | 初始記錄 [固] |
| 2026-02-26 | Gateway 模式 | 前台 → 服務化 [觀→固] |
| 2026-02-26 | 知識庫建立 | 初始化 _AIDocs 與記憶工作流 |
| 2026-02-27 | LINE→Claude Bridge | 完整實作 bridge+plugins+MCP+hooks [固] |
| 2026-02-27 | 控制面板 | WinForms .NET 9 控制面板 [固] |
| 2026-02-27 | 記憶架構 | 分類按需載入 + CHANGELOG 滾動淘汰 [固] |
| 2026-02-27 | 原子記憶格式 | Claude Code auto-memory 正式套用 atom 格式（Trigger/Confidence/行動段落）[固] |
| 2026-02-27 | 安全策略 | config deny 補償 → 全面放權自修改 [固→觀] |
