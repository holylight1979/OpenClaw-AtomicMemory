# 決策記憶 — 效率與 Token 節省

> 三層分類：[固] 穩定決策 / [觀] 可能演化 / [臨] 單次決策
> 定義見全域 `~/.claude/CLAUDE.md`

---

## 工程決策

### [固] LLM 選擇：OpenAI Codex OAuth，不用 Anthropic API
- 原因：Anthropic API 按量付費（使用者無餘額），Claude Max 訂閱禁止第三方 OAuth
- ChatGPT 訂閱允許 Codex OAuth
- 確認次數：2（初選 Anthropic → 碰壁 → 轉 Codex）

### [固] 安全策略：config deny，不靠 prompt
- 原因：context compaction 會靜默丟棄 prompt 級安全指令
- tools.deny 列表 + fs.workspaceOnly 是唯一可靠方式

### [固] 不用 Docker / WSL
- 原因：使用者偏好輕量，公司電腦限制多
- sandbox.mode = "off"，用 config deny 補償

### [固] ngrok 免費方案做 LINE webhook
- 原因：最簡單的方式取得公開 HTTPS URL
- 代價：URL 不固定，重啟要手動更新 LINE Console

### [觀] Gateway 前台執行模式
- 目前未安裝為 Scheduled Task
- 使用者尚未決定是否需要持久服務
- 觸及時確認

---

## 演化日誌

| 日期 | 記憶 | 變更 |
|------|------|------|
| 2026-02-26 | LLM 選擇 | Anthropic API → OpenAI Codex OAuth [臨→固] |
| 2026-02-26 | 安全策略 | 確認 config deny 方針 [觀→固] |
| 2026-02-26 | 不用 Docker | 確認 [固] |
| 2026-02-26 | ngrok 免費方案 | 初始記錄 [固] |
| 2026-02-26 | Gateway 模式 | 初始記錄 [觀] |
| 2026-02-26 | 知識庫建立 | 初始化 _AIDocs 與記憶工作流 |
