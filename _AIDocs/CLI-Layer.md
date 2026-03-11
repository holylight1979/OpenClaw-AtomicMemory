# CLI 入口 + 指令層

## Bootstrap 流程

```
openclaw.mjs
  → Node.js 版本檢查（>=22.12）→ compile cache → warning filter
  → import dist/entry.js

src/entry.ts
  → normalizeWindowsArgv() → parseCliProfileArgs() → applyCliProfileEnv()
  → ensureExperimentalWarningSuppressed()（可能 respawn）
  → tryHandleRootVersionFastPath() / tryHandleRootHelpFastPath()
  → import("./cli/run-main.js").runCli()

src/cli/run-main.ts::runCli()
  → loadDotEnv() + normalizeEnv()
  → ensureOpenClawCliOnPath()
  → tryRouteCli()（9 條 fast-path routes）
  → buildProgram()（Commander）
  → registerPreActionHooks()
  → getPrimaryCommand() → registerCoreCliByName()
  → registerSubCliByName()
  → registerPluginCliCommands()
  → program.parseAsync()
```

## Lazy Loading 機制

指令採 placeholder → re-parse 模式：
1. `registerCoreCliCommands()` 建立 placeholder action
2. 使用者輸入觸發 placeholder → `removeEntryCommands()` → 載入真實指令
3. `reparseProgramFromActionArgs()` 重建 argv 重新解析

## 核心指令（10 個）

| 指令 | 子指令 | 檔案 |
|------|--------|------|
| setup | - | register.setup.ts |
| onboard | - | register.onboard.ts |
| configure | - | register.configure.ts |
| config | get/set/unset/file/validate | config-cli.ts |
| backup | create/verify | register.backup.ts |
| doctor/dashboard/reset/uninstall | - | register.maintenance.ts |
| message | (子指令) | register.message.ts |
| memory | (子指令) | memory-cli.ts |
| agent/agents | agents 有子指令 | register.agent.ts |
| status/health/sessions | sessions 有子指令 | register.status-health-sessions.ts |

## Sub-CLI（27 個）

gateway, daemon, logs, system, models, approvals, nodes, devices, node, sandbox, tui, cron, dns, docs, hooks, webhooks, qr, clawbot, pairing, plugins, channels, directory, security, secrets, skills, update, completion

## Fast-Path Routes（9 條）

health, status, sessions, agents list, memory status, config get, config unset, models list, models status

繞過 Commander 直接派發到實作函式，加速常用指令。

## Profile 系統

- `--profile <name>` → `~/.openclaw-<profile>/`
- `--dev` = `--profile dev` + gateway port 19001
- 環境變數：`OPENCLAW_PROFILE`, `OPENCLAW_STATE_DIR`, `OPENCLAW_CONFIG_PATH`, `OPENCLAW_GATEWAY_PORT`

## Pre-Action Hooks

每個指令執行前：
1. `process.title` 設為 `openclaw-<command>`
2. Config Guard（載入 + 驗證 config）
3. Plugin Registry 載入（需要頻道的指令）
4. 版本 Banner
5. Verbose 模式 + Log Level

## 依賴注入（deps.ts）

`createDefaultDeps()` 回傳 lazy-loaded channel sender：
- WhatsApp, Telegram, Discord, Slack, Signal, iMessage
- 各自從 `deps-send-*.runtime.js` 動態載入

## Windows 特殊處理

- `windows-argv.ts`：清除控制字元、引號、UNC prefix、重複 node.exe
- `normalizeWindowsArgv()`：全域 argv 正規化
