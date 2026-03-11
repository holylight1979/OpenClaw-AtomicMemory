# 基礎設施

## Infra（src/infra/ — 306 files）

### 環境 & 路徑
- `home-dir.ts` — 跨平台 home 目錄解析
- `openclaw-root.ts` — 套件根目錄探索（ancestor traversal + symlink 解析）
- `env.ts` — 環境變數 logging + redaction
- `path-env.ts/path-safety.ts` — PATH 操作 + 安全守衛

### Device Identity & Pairing
- `device-identity.ts` — Ed25519 keypair 產生/儲存 + SHA256 指紋（device ID）
- `device-pairing.ts` — 配對狀態機（250+ 行）：PendingRequest → PairedDevice → AuthToken
- Scope 含意系統：`operator.admin` ⊃ `operator.write` ⊃ `operator.read`

### File System 安全
- `fs-safe.ts`（860 行）— TOCTOU 防護、symlink/hardlink 偵測、atomic write（temp+rename）、Windows ACL（icacls）
- `safe-open-sync.ts` — 同步安全檔案操作

### Process 管理
- `exec-approvals.ts` — 執行白名單系統（safe binary policies）
- `system-run-command.ts` — 指令解析 + shell wrapper 偵測 + 注入偵測
- `retry.ts` — 可設定的 async retry（jitter, 300ms-30s exponential backoff）

### Port & Gateway Lock
- `ports.ts/ports-probe.ts` — Port 可用性檢查
- `gateway-lock.ts`（262 行）— File-based 單 Gateway 協調（PID liveness + port probe）

### 其他
- `backoff.ts` — Exponential backoff 計算
- `bonjour.ts` — mDNS 服務發現
- `clipboard.ts` — 剪貼簿操作
- `archive.ts` — Tar/gzip 壓縮

---

## Security（src/security/ — 29 files）

### Audit 系統
- `audit.ts`（54KB）— Gateway HTTP auth、skill 安全掃描、model 衛生、sandbox hash 驗證
- `audit-channel.ts` — 每頻道安全稽核
- `audit-tool-policy.ts` — Tool 執行政策驗證

### 自動修復
- `fix.ts`（478 行）— chmod credentials 0o600、config policy 修正、allowFrom 填充

### 其他
- `dangerous-tools.ts` — 危險指令白名單（rm, dd, chown）
- `safe-regex.ts` — RegEx DoS 防護
- `secret-equal.ts` — 常數時間密碼比較

---

## Secrets（src/secrets/ — 50 files）

### Runtime Snapshot 系統
- `runtime.ts`（251 行）— `PreparedSecretsRuntimeSnapshot`：不可變快照 + weak-map refresh
- Config-driven 解析：env vars, auth profiles, provider configs

### 收集器
- `runtime-auth-collectors.ts` — Auth profile store 掃描
- `runtime-config-collectors-*.ts` — 各欄位解析（core, channels, TTS, web tools）

---

## Process（src/process/ — 8 files）

- `exec.ts`（336 行）— `runCommandWithTimeout()`：stdin/stdout 處理、no-output timeout、Windows batch 偵測、npm shim 解析（CVE-2024-27980）
- `kill-tree.ts`（105 行）— 跨平台 process tree 終結（Windows: taskkill /T; Unix: SIGTERM→SIGKILL）

---

## Daemon（src/daemon/ — 29 files）

跨平台背景服務管理：
- macOS: launchd plist
- Linux: systemd unit
- Windows: schtasks XML
- 統一 API: install/uninstall/start/stop/isLoaded

---

## Logging（src/logging/ — 15 files）

- `logger.ts`（348 行）— tslog JSON 日誌 + 檔案滾動（date-based, 500MB cap, 24h retention）
- `redact.ts` — PEM blocks, API keys, tokens, passwords 遮罩（prefix…suffix）
- 外部 transport plugin 系統

---

## Shared（src/shared/ — 40 files）

核心型別：ChatMessageContent, DeviceAuthToken, SessionTypes, UsageAggregates, NodeList, Frontmatter

---

## Terminal（src/terminal/ — 13 files）

- `ansi.ts` — ANSI 處理 + `visibleWidth()`（CJK/emoji 全寬計算）
- `palette.ts` — Lobster 主題 8 色
- `table.ts` — 表格格式化
- `safe-text.ts` — 安全文字跳脫（CWE-117 防護）

---

## Utils（src/utils/ — 18 files）

`runWithConcurrency()`, `message-channel.ts`（多頻道 delivery）, `withTimeout()`, `safeJson()`, `shellArgv()`, `maskApiKey()` 等
