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
- LINE webhook 路徑：`/line/webhook`（非 `/channels/line/webhook`）
- ngrok 版本：v3.36.1（3.3.1 被拒絕，需 ≥3.20.0）

### [固] Gateway 執行模式：Scheduled Task 服務
- 已改用 `openclaw gateway install/start/stop` 原生服務管理
- Start.bat: install → start → ngrok via PowerShell Hidden
- 確認次數：2（前台 → 服務化）

### [固] 控制面板：WinForms (.NET 9)
- 路徑：`E:\OpenClawWorkSpace\OpenClawPanel\`
- 用途：GUI 管理 Gateway/Bridge/ngrok 三服務的啟停與狀態
- 選擇 WinForms 原因：使用者指定 WinForm，深色主題簡潔直觀

### [固] 記憶架構：分類按需載入 + 滾動淘汰
- **MEMORY.md 只放高頻事實**（~30 行），不堆積歷史細節
- **完整決策放本檔案**（Extra_Efficiently_TokenSafe.md），按需讀取
- **CHANGELOG 滾動淘汰**：`_CHANGELOG.md` 保留最近 ~8 筆，舊條目移至 `_CHANGELOG_ARCHIVE.md`
- **HEARTBEAT 自動維護**：heartbeat 時檢查 CHANGELOG 條目數量和 MEMORY.md 行數
- 原則：常態載入最小化，細節按需深入
- 確認次數：1（使用者主動提出）

### [觀] 人員辨識系統 Phase 3：實戰後精修（2026-02-28 起）
- Phase 1+2 已完成：語意化路徑、身份映射、事件系統、cron 週報、heartbeat 候選人比對
- Phase 3 是**觀察驅動**的迭代，觸發條件：
  - **權限精修** → 當 owner 需要收回/開放特定人員的權限時
  - **比對權重調整** → 候選人背景比對出現明顯誤判（false positive/negative）時
  - **Token 預算調整** → 群組對話載入 person atoms 導致回應變慢或 context 壓縮過快時
  - **新增 facet** → 某個 facet 下 atom 累積 >= 5 個且有明顯子分類時，AI 提議拆分
  - **事件系統調整** → 事件格式/生命週期參數在實際使用中不符合需求時
- 計畫細節：`~/.claude/plans/lexical-noodling-rain.md` §Phase 3
- 目標：累積 2-4 週實際互動數據後做首次 review

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
| 2026-02-27 | 新機部署 | E:\OpenClawWorkSpace — Bridge 路徑修正、ngrok 升級、LINE 配對完成 |
| 2026-02-28 | 人員辨識 Phase 1+2 | 語意化路徑+身份映射+事件系統+cron週報+heartbeat比對 完成 [觀] |
| 2026-02-28 | Phase 3 追蹤 | 新增 [觀] 觀察項，觸發條件: 誤判/token壓力/facet溢出/權限需求 |
