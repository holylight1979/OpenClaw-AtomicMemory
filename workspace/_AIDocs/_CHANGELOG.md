# OpenClaw Workspace — 變更記錄

> 保留最近的變更。較舊記錄見 `_CHANGELOG_ARCHIVE.md`。

---

## 2026-02-28 — 人員辨識記憶系統 Phase 2（背景辨識 + 通知）

- 新增 `weekly-identity-report` cron job（每週三 21:00 Asia/Taipei，LINE DM 給 owner）
  - 報告內容：新建/更新 person、跨平台配對疑似結果、候選人過期提醒、統計
  - owner 可回覆「確定 A=B」合併人員或「刪除 X」移除候選人
- HEARTBEAT.md 新增第 7 項「候選人背景比對」checklist
  - 每次 heartbeat 掃描近 24h 活躍候選人，執行 5 維特徵比對（語言/時段/話題/互動/名稱）
  - Match >= 70 標記到 _registry.md，14 天未互動自動歸檔

## 2026-02-28 — 修復 LINE 群組訊息靜默丟棄

- **根因**：`groupPolicy: "allowlist"` 需三層設定齊全 — policy + groups.{id} + allowFrom
- 缺少 `allowFrom` 時，`shouldProcessLineEvent()` 在 `effectiveGroupAllow.hasEntries` 檢查失敗 → 靜默丟棄（200 OK 無 log）
- **修復**：`groups.C22f692be7d5db74daa6cdb24882e749e` 加入 `"allowFrom": ["*"]`
- 附帶修復：`~/.openclaw/openclaw.json` 恢復為最小設定（避免與 workspace config 合併衝突）
- 新增 atom `openclaw-config-intelligence.md`：記錄 OpenClaw config 參數語義圖 + 依賴鏈 + 除錯口訣

## 2026-02-27 — 新機部署收尾 + 路徑修正

- Bridge Server: `DEFAULT_CWD` → `E:\OpenClawWorkSpace`、`CLAUDE_CLI` 版本 2.1.59→2.1.61
- Bridge Server: notify 函式改用 `OPENCLAW_CONFIG` 常數（不再硬編碼 `~/.openclaw/`）
- Bridge Server: LINE notify 讀取 key 修正 `line.token` → `line.channelAccessToken`
- ngrok: 3.3.1→3.36.1（舊版被 ngrok 拒絕認證）
- LINE Webhook: 正確路徑為 `/line/webhook`（非 `/channels/line/webhook`）
- LINE 配對: approve sender U556bc083405a12bb3a9d2dbb66983386
- Claude Code hooks: 新增 Stop hook → Bridge → Discord #1476967208461664378 通知
- Start.bat: 路徑修正 + `set OPENCLAW_HOME`，已複製到桌面
- INSTALL.md 路徑勘誤：LINE webhook 路徑應為 `/line/webhook`

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

## 2026-02-27 — 設定同步到 GitHub

- Bridge server + notify MCP + 2 新 plugin（computer-use, claude-bridge）上傳
- Claude Code 設定參考檔：`hooks.json`、`mcp-servers.json`
- openclaw.json 模板加入新 plugin、.env.example 加入 GATEWAY_TOKEN/BRIDGE_TOKEN
- 秘密安全檢查通過（notify MCP 的硬編碼 ID 改為 env var + placeholder）

## 2026-02-28 — 人員辨識記憶系統 Phase 1

- 新增 `atoms/persons/` 語意化路徑結構：`{role}/{alias}/{facet}/`
  - 路徑即 metadata：角色/權限/身份/分類可從路徑推斷
  - owner/holylight/ 完整建立（_profile + personality + principles + interests + relationships + context）
  - user/ 和 _candidates/ 目錄建立
- 新增 `atoms/_identity-map.md`：平台 ID → 人員路徑高速映射（session 啟動最先讀取）
- 新增 `atoms/persons/_registry.md`：人員詳細索引
- 新增 `atoms/events/` 事件系統：多人共享記憶，_active.md 索引 + _event.md 格式
- SKILL.md 新增 3 個 section：§身份映射、§人員辨識（含分類演算法+權限系統+背景比對）、§事件系統
- AGENTS.md 重寫 Loading 規則（_identity-map 最先讀）、新增 Person/Event 載入規則
- _pairing.md 擴充為多人格式（新增候選配對列表）
- 遷移 `merged/holylight/preferences.md` → 拆分到 personality/ + principles/，刪除 merged/ 目錄

