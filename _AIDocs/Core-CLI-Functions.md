# CLI 函式級索引

> 掃描日期：2026-03-21 | 檔案數：182 檔 | 總行數：~27,600 行

## 目錄結構

```
src/cli/
├── (root)                    # 核心啟動 + 工具函式 (~40 檔)
├── program/                  # Commander program 建構 + command 註冊 (~20 檔)
│   └── message/              # message 子命令群組 (~11 檔)
├── gateway-cli/              # gateway 子命令群組 (~7 檔)
├── daemon-cli/               # daemon/service 管理 (~16 檔)
├── nodes-cli/                # 遠端 node 控制 (~13 檔)
├── node-cli/                 # 本地 node host (~2 檔)
├── browser-cli-actions-input/# browser action 子命令 (~6 檔)
├── cron-cli/                 # cron 排程管理 (~5 檔)
├── update-cli/               # 自動更新 (~7 檔)
└── shared/                   # 共用 parse 工具 (~1 檔)
```

## 函式清單

---

### Root — Bootstrap / Entry

#### `run-main.ts`（155 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `runCli` | `(argv?: string[]) => Promise<void>` | CLI 主進入點：profile 解析 → dotenv → route → buildProgram → parseAsync | CLI entry |
| `rewriteUpdateFlagArgv` | `(argv: string[]) => string[]` | 將 `--update` flag 改寫為 `update` 子命令 | internal |
| `shouldRegisterPrimarySubcommand` | `(argv: string[]) => boolean` | 判斷是否需要註冊主要子命令（非 help/version 時） | internal |
| `shouldSkipPluginCommandRegistration` | `(params) => boolean` | 判斷是否跳過 plugin command 註冊 | internal |
| `shouldEnsureCliPath` | `(argv: string[]) => boolean` | 決定是否確保 openclaw 在 PATH 中 | internal |
| `isCliMainModule` | `() => boolean` | 判斷當前模組是否為 main module | internal |

#### `program.ts`（2 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `forceFreePort` | re-export from `ports.js` | 釋放指定 port 的佔用程序 | public API |
| `buildProgram` | re-export from `program/build-program.js` | 建構 Commander program 實例 | public API |

#### `route.ts`（47 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `tryRouteCli` | `(argv: string[]) => Promise<boolean>` | 快速路由：跳過 Commander 直接執行 health/status/sessions 等常用命令 | internal |

---

### Root — Argument Parsing

#### `argv.ts`（328 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `hasHelpOrVersion` | `(argv: string[]) => boolean` | 檢查 argv 是否含 -h/--help/-V/--version | internal |
| `hasFlag` | `(argv: string[], name: string) => boolean` | 檢查 argv 中是否有指定 flag | internal |
| `hasRootVersionAlias` | `(argv: string[]) => boolean` | 檢查 root 層級 `-v` alias | internal |
| `isRootVersionInvocation` | `(argv: string[]) => boolean` | 判斷是否為 root --version 呼叫 | internal |
| `isRootHelpInvocation` | `(argv: string[]) => boolean` | 判斷是否為 root --help 呼叫 | internal |
| `getFlagValue` | `(argv: string[], name: string) => string \| null \| undefined` | 取得 flag 的值 | internal |
| `getVerboseFlag` | `(argv: string[], options?) => boolean` | 取得 --verbose/--debug flag | internal |
| `getPositiveIntFlagValue` | `(argv: string[], name: string) => number \| null \| undefined` | 取得正整數 flag 值 | internal |
| `getCommandPath` | `(argv: string[], depth?) => string[]` | 從 argv 萃取命令路徑（不跳 root options） | internal |
| `getCommandPathWithRootOptions` | `(argv: string[], depth?) => string[]` | 從 argv 萃取命令路徑（跳過 --dev/--profile 等 root options） | internal |
| `getPrimaryCommand` | `(argv: string[]) => string \| null` | 取得主要子命令名稱 | internal |
| `getCommandPositionalsWithRootOptions` | `(argv: string[], options) => string[] \| null` | 萃取命令的 positional 參數 | internal |
| `buildParseArgv` | `(params) => string[]` | 建構 Commander parseAsync 需要的 argv 格式 | internal |
| `shouldMigrateState` | `(argv: string[]) => boolean` | 判斷此命令是否需要觸發 state migration | internal |
| `shouldMigrateStateFromPath` | `(path: string[]) => boolean` | 從命令路徑判斷是否需要 migration | internal |

#### `windows-argv.ts`（78 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `normalizeWindowsArgv` | `(argv: string[]) => string[]` | Windows 平台 argv 正規化（移除重複 node.exe 路徑等） | internal |

---

### Root — Profile

#### `profile.ts`（127 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `parseCliProfileArgs` | `(argv: string[]) => CliProfileParseResult` | 解析 --dev/--profile 參數，回傳 profile 名稱和過濾後的 argv | internal |
| `applyCliProfileEnv` | `(params) => void` | 將 profile 寫入 env（OPENCLAW_PROFILE/STATE_DIR/CONFIG_PATH） | internal |

#### `profile-utils.ts`（23 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `isValidProfileName` | `(value: string) => boolean` | 驗證 profile 名稱合法性 | internal |
| `normalizeProfileName` | `(raw?: string) => string \| null` | 正規化 profile 名稱 | internal |

---

### Root — Utilities

#### `cli-utils.ts`（64 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `withManager` | `<T>(params) => Promise<void>` | 通用 manager 生命週期包裝（get → run → close） | internal |
| `runCommandWithRuntime` | `(runtime, action, onError?) => Promise<void>` | 統一 command action 錯誤處理包裝 | internal |
| `resolveOptionFromCommand` | `<T>(command, key) => T \| undefined` | 向上遍歷 Commander chain 取得 option 值 | internal |
| `formatErrorMessage` | re-export from infra | 格式化錯誤訊息 | internal |

#### `cli-name.ts`（30 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `resolveCliName` | `(argv?) => string` | 從 argv 解析 CLI binary 名稱（預設 "openclaw"） | internal |
| `replaceCliName` | `(command: string, cliName?) => string` | 替換命令字串中的 CLI 名稱 | internal |

#### `command-format.ts`（25 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `formatCliCommand` | `(command: string, env?) => string` | 格式化 CLI 命令字串（加入 --profile） | internal |

#### `command-options.ts`（44 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `hasExplicitOptions` | `(command, names) => boolean` | 檢查是否有 CLI 明確傳入的 option | internal |
| `inheritOptionFromParent` | `<T>(command, name) => T \| undefined` | 從 parent command 繼承 option 值 | internal |

#### `help-format.ts`（27 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `formatHelpExample` | `(command, description) => string` | 格式化單一 help example（兩行） | internal |
| `formatHelpExampleLine` | `(command, description) => string` | 格式化單一 help example（inline） | internal |
| `formatHelpExamples` | `(examples, inline?) => string` | 批次格式化 help examples | internal |
| `formatHelpExampleGroup` | `(label, examples, inline?) => string` | 格式化帶標題的 example 群組 | internal |

#### `log-level-option.ts`（12 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `parseCliLogLevelOption` | `(value: string) => LogLevel` | Commander option parser：驗證並解析 log level | internal |

#### `progress.ts`（230 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `createCliProgress` | `(options: ProgressOptions) => ProgressReporter` | 建立 CLI progress reporter（spinner/OSC/line） | internal |
| `withProgress` | `<T>(options, fn) => Promise<T>` | 包裝非同步操作，顯示 progress indicator | internal |
| `withProgressTotals` | `(options, fn) => Promise<void>` | 包裝帶 completed/total 的非同步操作 | internal |

#### `prompt.ts`（21 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `promptYesNo` | `(question, defaultYes?) => Promise<boolean>` | 互動式 Y/N prompt（尊重 --yes flag） | internal |

#### `wait.ts`（8 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `waitForever` | `() => Promise<void>` | 永久保持 event loop 存活 | internal |

#### `ports.ts`（387 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `forceFreePort` | `(port) => Promise<PortProcess[]>` | 殺死佔用指定 port 的程序 | public API |
| `forceFreePortAndWait` | `(port, options) => Promise<ForceFreePortResult>` | 釋放 port 並等待可 bind | internal |
| `waitForPortBindable` | `(port, options) => Promise<number>` | 等待 port 可 bind（返回等待 ms） | internal |

#### `deps.ts`（73 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `createDefaultDeps` | `() => CliDeps` | 建立 lazy-loading channel send function 集合 | internal |

#### `banner.ts`（165 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `formatCliBannerLine` | `(version, options?) => string` | 格式化 banner 單行（版本 + commit + tagline） | internal |
| `formatCliBannerArt` | `(options?) => string` | 格式化 ASCII art banner | internal |
| `emitCliBanner` | `(version, options?) => void` | 輸出 banner 到 stdout（只執行一次） | internal |
| `hasEmittedCliBanner` | `() => boolean` | 查詢 banner 是否已輸出 | internal |

#### `tagline.ts`（286 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `pickTagline` | `(options?) => string` | 隨機選擇/節日主題 tagline | internal |

#### `respawn-policy.ts`（5 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `shouldSkipRespawnForArgv` | `(argv: string[]) => boolean` | 判斷是否跳過 process respawn | internal |

#### `install-spec.ts`（10 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `looksLikeLocalInstallSpec` | `(spec, knownSuffixes) => boolean` | 判斷 install spec 是否為本地路徑 | internal |

---

### Root — Parsers

#### `parse-bytes.ts`（46 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `parseByteSize` | `(raw: string, opts?) => number` | 解析 byte 大小字串（如 "10mb"）為 bytes 數 | internal |

#### `parse-duration.ts`（70 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `parseDurationMs` | `(raw: string, opts?) => number` | 解析時間長度字串（如 "1h30m"）為毫秒 | internal |

#### `parse-timeout.ts`（54 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `parseTimeoutMs` | `(raw: unknown) => number \| undefined` | 解析 timeout 值為毫秒 | internal |
| `parseTimeoutMsWithFallback` | `(raw, fallbackMs, options?) => number` | 解析 timeout 值，帶 fallback | internal |

#### `shared/parse-port.ts`（8 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `parsePort` | `(raw: unknown) => number \| null` | 解析 port 數值 | internal |

---

### Root — Channel / Outbound

#### `channel-auth.ts`（89 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `runChannelLogin` | `(opts, runtime?) => Promise<void>` | 執行 channel login 流程（WhatsApp QR 等） | internal |
| `runChannelLogout` | `(opts, runtime?) => Promise<void>` | 執行 channel logout 流程 | internal |

#### `channel-options.ts`（68 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `resolveCliChannelOptions` | `() => string[]` | 解析可用 channel 選項列表 | internal |
| `formatCliChannelOptions` | `(extra?) => string` | 格式化 channel 選項為 help 字串 | internal |

#### `outbound-send-deps.ts`（11 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `createOutboundSendDeps` | `(deps: CliDeps) => OutboundSendDeps` | 將 CLI deps 轉為 outbound send deps | internal |

#### `outbound-send-mapping.ts`（49 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `createOutboundSendDepsFromCliSource` | `(deps) => OutboundSendDeps` | 將 CLI channel send source 映射為統一 deps | internal |

---

### Root — Secret Resolution

#### `command-secret-gateway.ts`（611 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `resolveCommandSecretRefsViaGateway` | `(params) => Promise<{resolvedConfig, diagnostics}>` | 透過 Gateway RPC 解析 SecretRef 至實際值 | internal |

#### `command-secret-targets.ts`（61 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `getMemoryCommandSecretTargetIds` | `() => string[]` | 取得 memory 命令需要解析的 secret target id 列表 | internal |
| `getQrRemoteCommandSecretTargetIds` | `() => string[]` | 取得 qr 命令需要的 secret target id 列表 | internal |

---

### Root — Plugin

#### `plugin-registry.ts`（39 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `ensurePluginRegistryLoaded` | `() => void` | 確保 plugin registry 已載入（lazy init） | internal |

#### `plugin-install-plan.ts`（84 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `resolveBundledInstallPlanForCatalogEntry` | `(params) => {bundledSource} \| null` | 檢查 plugin 是否可用 bundled source 安裝 | internal |
| `resolveBundledInstallPlanBeforeNpm` | `(params) => {bundledSource, warning} \| null` | npm install 前嘗試 bundled source 路徑 | internal |
| `resolveBundledInstallPlanForNpmFailure` | `(params) => ... \| null` | npm 安裝失敗時 fallback 到 bundled source | internal |

#### `npm-resolution.ts`（118 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `resolvePinnedNpmSpec` | `(params) => {recordSpec, pinWarning?, pinNotice?}` | 解析 pin 版本的 npm spec | internal |
| `mapNpmResolutionMetadata` | `(resolution?) => {...}` | 映射 npm resolution metadata 欄位 | internal |
| `buildNpmInstallRecordFields` | `(params) => {...}` | 建構 npm install record 欄位 | internal |
| `resolvePinnedNpmInstallRecordForCli` | `(params) => {...}` | 完整 npm install record 解析（CLI 用） | internal |

#### `plugins-config.ts`（1 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `setPluginEnabledInConfig` | re-export | 設定 plugin enabled 狀態到 config | internal |

---

### Root — Gateway RPC

#### `gateway-rpc.ts`（47 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `addGatewayClientOptions` | `(cmd: Command) => Command` | 為 command 加上 --url/--token/--timeout 等 gateway 連線選項 | internal |
| `callGatewayFromCli` | `(method, opts, params?, extra?) => Promise<unknown>` | 從 CLI 呼叫 Gateway RPC（帶 progress） | internal |

---

### program/ — Program Build & Registration

#### `program/build-program.ts`（20 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `buildProgram` | `() => Command` | 建構完整 Commander program：context + help + preaction hooks + commands | public API |

#### `program/context.ts`（32 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `ProgramContext` | type | 程式上下文型別（version + channelOptions） | type |
| `createProgramContext` | `() => ProgramContext` | 建立 ProgramContext（lazy channel options） | internal |

#### `program/program-context.ts`（15 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `setProgramContext` | `(program, ctx) => void` | 在 Command 上存入 ProgramContext（Symbol key） | internal |
| `getProgramContext` | `(program) => ProgramContext \| undefined` | 從 Command 取出 ProgramContext | internal |

#### `program/command-registry.ts`（317 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `getCoreCliCommandNames` | `() => string[]` | 列出所有 core CLI command 名稱 | internal |
| `getCoreCliCommandsWithSubcommands` | `() => string[]` | 列出有子命令的 core CLI command 名稱 | internal |
| `registerCoreCliByName` | `(program, ctx, name, argv?) => Promise<boolean>` | 依名稱按需載入並註冊單一 core CLI command | internal |
| `registerCoreCliCommands` | `(program, ctx, argv) => void` | 註冊所有 core CLI commands（lazy placeholder） | internal |
| `registerProgramCommands` | `(program, ctx, argv?) => void` | 註冊所有 commands（core + subcli） | internal |

#### `program/register.subclis.ts`（359 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `getSubCliEntries` | `() => SubCliEntry[]` | 取得所有 subcli 定義 | internal |
| `getSubCliCommandsWithSubcommands` | `() => string[]` | 列出有子命令的 subcli 名稱 | internal |
| `registerSubCliByName` | `(program, name) => Promise<boolean>` | 依名稱按需載入並註冊單一 subcli | internal |
| `registerSubCliCommands` | `(program, argv?) => void` | 註冊所有 subcli commands（lazy placeholder） | internal |
| `loadValidatedConfigForPluginRegistration` | `() => Promise<OpenClawConfig \| null>` | 載入並驗證 config 供 plugin 註冊用 | internal |

#### `program/command-tree.ts`（19 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `removeCommand` | `(program, command) => boolean` | 從 Commander program 中移除指定 command | internal |
| `removeCommandByName` | `(program, name) => boolean` | 依名稱移除 command | internal |

#### `program/action-reparse.ts`（22 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `reparseProgramFromActionArgs` | `(program, actionArgs) => Promise<void>` | lazy command 替換後重新 parse argv | internal |

#### `program/help.ts`（140 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `configureProgramHelp` | `(program, ctx) => void` | 設定 program help 格式、version 輸出、examples | internal |

#### `program/helpers.ts`（32 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `collectOption` | `(value, previous?) => string[]` | Commander option 累加器（--flag a --flag b → [a,b]） | internal |
| `parsePositiveIntOrUndefined` | `(value) => number \| undefined` | 解析正整數或 undefined | internal |
| `resolveActionArgs` | `(actionCommand?) => string[]` | 取得 Commander action 的 args | internal |

#### `program/preaction.ts`（142 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `registerPreActionHooks` | `(program, programVersion) => void` | 註冊 pre-action hooks：banner + verbose + config guard + plugin 載入 | hook handler |

#### `program/config-guard.ts`（122 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `ensureConfigReady` | `(params) => Promise<void>` | 確保 config 有效，否則輸出錯誤並 exit | internal |

#### `program/routes.ts`（270 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `RouteSpec` | type | 快速路由規格（match + run） | type |
| `findRoutedCommand` | `(path: string[]) => RouteSpec \| null` | 從預定義路由表查找匹配的快速路由 | internal |

---

### program/ — Command Registrars（Core）

#### `program/register.setup.ts`（53 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `registerSetupCommand` | `(program) => void` | 註冊 `setup` 命令 | CLI command |

#### `program/register.onboard.ts`（210 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `registerOnboardCommand` | `(program) => void` | 註冊 `onboard` 命令（互動式安裝精靈） | CLI command |

#### `program/register.configure.ts`（31 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `registerConfigureCommand` | `(program) => void` | 註冊 `configure` 命令 | CLI command |

#### `program/register.maintenance.ts`（113 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `registerMaintenanceCommands` | `(program) => void` | 註冊 doctor/dashboard/reset/uninstall 命令 | CLI command |

#### `program/register.message.ts`（68 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `registerMessageCommands` | `(program, ctx) => void` | 註冊 `message` 命令群組（send/broadcast/poll/react/read 等） | CLI command |

#### `program/register.agent.ts`（277 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `registerAgentCommands` | `(program, args) => void` | 註冊 `agent` + `agents` 命令群組（turn/list/bind/add/delete/set-identity） | CLI command |

#### `program/register.status-health-sessions.ts`（216 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `registerStatusHealthSessionsCommands` | `(program) => void` | 註冊 status/health/sessions/sessions cleanup 命令 | CLI command |

#### `program/register.backup.ts`（92 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `registerBackupCommand` | `(program) => void` | 註冊 backup create/verify 命令 | CLI command |

---

### program/message/ — Message Sub-commands

#### `program/message/helpers.ts`（87 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `createMessageCliHelpers` | `(message, channelOptions) => MessageCliHelpers` | 建立 message 命令共用的 helper 集合 | internal |

#### `program/message/register.send.ts`（41 行） — 註冊 `message send`
#### `program/message/register.broadcast.ts`（16 行） — 註冊 `message broadcast`
#### `program/message/register.poll.ts`（32 行） — 註冊 `message poll`
#### `program/message/register.reactions.ts`（33 行） — 註冊 `message react`
#### `program/message/register.read-edit-delete.ts`（50 行） — 註冊 `message read/edit/delete`
#### `program/message/register.pins.ts`（35 行） — 註冊 `message pin/unpin`
#### `program/message/register.permissions-search.ts`（30 行） — 註冊 `message permissions/search`
#### `program/message/register.thread.ts`（55 行） — 註冊 `message thread create/reply`
#### `program/message/register.emoji-sticker.ts`（57 行） — 註冊 `message emoji/sticker` 命令
#### `program/message/register.discord-admin.ts`（157 行） — 註冊 `message role/channel/ban/kick` (Discord admin)

以上每檔皆 export 一個 `registerMessage*Command(s)` 函式，簽名為 `(message: Command, helpers: MessageCliHelpers) => void`，入口類型皆為 **CLI command**。

---

### gateway-cli/ — Gateway Sub-commands

#### `gateway-cli/register.ts`（280 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `registerGatewayCli` | `(program) => void` | 註冊 `gateway` 命令群組（run/status/call/health/probe/discover/usage-cost + service commands） | CLI command |

#### `gateway-cli/run.ts`（508 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `addGatewayRunCommand` | `(cmd: Command) => Command` | 為 command 加上 gateway run 選項（--port/--bind/--token/--force 等）並綁定 action | CLI command |

#### `gateway-cli/run-loop.ts`（252 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `runGatewayLoop` | `(params) => Promise<void>` | Gateway 主執行迴圈：lock + start + SIGTERM/SIGINT/SIGUSR1 handler + restart/drain | internal |

#### `gateway-cli/call.ts`（46 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `GatewayRpcOpts` | type | Gateway RPC 呼叫選項型別 | type |
| `gatewayCallOpts` | `(cmd: Command) => Command` | 加上 gateway call 通用選項 | internal |
| `callGatewayCli` | `(method, opts, params?) => Promise<unknown>` | 從 CLI 呼叫 Gateway method（帶 progress） | internal |

#### `gateway-cli/dev.ts`（130 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `ensureDevGatewayConfig` | `(opts) => Promise<void>` | 確保 dev mode config + workspace 存在 | internal |

#### `gateway-cli/shared.ts`（109 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `parsePort` | re-export | 解析 port | internal |
| `toOptionString` | `(value: unknown) => string \| undefined` | 安全轉換選項值為字串 | internal |
| `describeUnknownError` | `(err: unknown) => string` | 通用錯誤描述 | internal |
| `extractGatewayMiskeys` | `(parsed) => {hasGatewayToken, hasRemoteToken}` | 偵測 config 中誤放的 gateway token key | internal |
| `renderGatewayServiceStopHints` | `(env?) => string[]` | 產生平台相關的 gateway stop 提示 | internal |
| `maybeExplainGatewayServiceStop` | `() => Promise<void>` | 若 service 已載入，輸出 stop 說明 | internal |

#### `gateway-cli/discover.ts`（93 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `parseDiscoverTimeoutMs` | `(raw, fallbackMs) => number` | 解析 discover timeout | internal |
| `pickBeaconHost` | `(beacon) => string \| null` | 從 beacon 選擇最佳 host | internal |
| `pickGatewayPort` | `(beacon) => number` | 從 beacon 選擇 gateway port | internal |
| `dedupeBeacons` | `(beacons) => GatewayBonjourBeacon[]` | 去重 beacon 結果 | internal |
| `renderBeaconLines` | `(beacon, rich) => string[]` | 格式化 beacon 顯示行 | internal |

---

### daemon-cli/ — Service Management

#### `daemon-cli/register.ts`（19 行） — `registerDaemonCli(program)`：註冊 `daemon` 命令
#### `daemon-cli/register-service-commands.ts`（103 行） — `addGatewayServiceCommands(parent, opts)`：加入 install/uninstall/start/stop/restart/status 子命令
#### `daemon-cli/runners.ts`（8 行） — re-export：`runDaemonInstall/Start/Stop/Restart/Uninstall/Status`
#### `daemon-cli/lifecycle.ts`（261 行） — `runDaemonStart/Stop/Restart/Uninstall`：service lifecycle 操作
#### `daemon-cli/lifecycle-core.ts`（477 行） — `runServiceStart/Stop/Restart/Uninstall`：跨平台 service 操作核心邏輯
#### `daemon-cli/install.ts`（122 行） — `runDaemonInstall`：service 安裝流程
#### `daemon-cli/status.ts`（28 行） — `runDaemonStatus`：service 狀態顯示入口
#### `daemon-cli/status.gather.ts`（406 行） — `gatherDaemonStatus`：收集完整 daemon 狀態
#### `daemon-cli/status.print.ts`（328 行） — `printDaemonStatus`：格式化輸出 daemon 狀態
#### `daemon-cli/probe.ts`（41 行） — `probeGatewayStatus`：透過 RPC 探測 gateway 狀態
#### `daemon-cli/response.ts`（110 行） — `buildDaemonServiceSnapshot` / `installDaemonServiceAndEmit`：service 回應格式化
#### `daemon-cli/restart-health.ts`（313 行） — restart 後健康檢查 + port 診斷
#### `daemon-cli/gateway-token-drift.ts`（10 行） — `resolveGatewayTokenForDriftCheck`：取得 drift check 用 token
#### `daemon-cli/shared.ts`（191 行） — daemon 共用工具函式
#### `daemon-cli/types.ts`（28 行） — `GatewayRpcOpts` / `DaemonStatusOptions` / `DaemonInstallOptions` 型別

---

### Sub-CLI Registrars（Root）

以下每檔皆 export 一個 `register*Cli(program)` 函式，入口類型為 **CLI command**：

| 檔案 | 行數 | 說明 |
|------|------|------|
| `config-cli.ts` | 476 | config get/set/unset/file/validate + 完整 config 路徑解析邏輯 |
| `channels-cli.ts` | 256 | channels list/status/capabilities/resolve/logs/add/remove/login/logout |
| `models-cli.ts` | 443 | models list/status/set/scan + aliases/fallbacks/image-fallbacks + auth 管理 |
| `memory-cli.ts` | 817 | memory status/index/search + 完整 memory scan 診斷 |
| `browser-cli.ts` | 55 | browser 命令群組入口（委派子模組） |
| `plugins-cli.ts` | 826 | plugins list/info/install/uninstall/enable/disable/update |
| `exec-approvals-cli.ts` | 482 | approvals list/add/remove/flush |
| `logs-cli.ts` | 329 | logs tail（WebSocket streaming） |
| `hooks-cli.ts` | 821 | hooks list/install/uninstall/enable/disable/status |
| `webhooks-cli.ts` | 197 | webhooks gmail setup/run |
| `skills-cli.ts` | 81 | skills list/info/check |
| `secrets-cli.ts` | 251 | secrets reload/audit/configure |
| `security-cli.ts` | 164 | security audit/fix |
| `update-cli.ts` | 152 | update + update status/wizard |
| `completion-cli.ts` | 665 | completion generate/install（zsh/bash/powershell/fish） |
| `system-cli.ts` | 132 | system event/presence/heartbeat（via gateway RPC） |
| `dns-cli.ts` | 262 | dns zone/sync/status（Tailscale + CoreDNS） |
| `docs-cli.ts` | 23 | docs search |
| `sandbox-cli.ts` | 174 | sandbox list/recreate/explain |
| `devices-cli.ts` | 453 | devices list/approve/summary + pairing |
| `directory-cli.ts` | 268 | directory self/peers/groups（contact lookup） |
| `pairing-cli.ts` | 173 | pairing list/approve |
| `qr-cli.ts` | 271 | qr generate（iOS pairing QR code） |
| `clawbot-cli.ts` | 16 | legacy clawbot aliases（委派 qr-cli） |
| `tui-cli.ts` | 50 | tui（terminal UI） |
| `acp-cli.ts` | 122 | acp serve/connect（Agent Control Protocol） |
| `nodes-cli.ts` | 1 | re-export `nodes-cli/register.ts` |
| `node-cli.ts` | 1 | re-export `node-cli/register.ts` |
| `cron-cli.ts` | 1 | re-export `cron-cli/register.ts` |

config-cli 額外 export 的獨立函式：

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `runConfigGet` | `(opts) => Promise<void>` | 直接執行 config get（供 fast-route 使用） | public API |
| `runConfigUnset` | `(opts) => Promise<void>` | 直接執行 config unset | public API |
| `runConfigFile` | `(opts) => Promise<void>` | 印出 config 檔案路徑 | public API |
| `runConfigValidate` | `(opts?) => Promise<void>` | 驗證 config | public API |

memory-cli 額外 export：

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `runMemoryStatus` | `(opts) => Promise<void>` | 直接執行 memory status（供 fast-route 使用） | public API |

---

### nodes-cli/ — Remote Node Control

#### `nodes-cli/register.ts`（39 行） — `registerNodesCli(program)`：註冊 nodes 命令
#### `nodes-cli/rpc.ts`（96 行） — `nodesCallOpts` / `resolveNodeId` / `callNodeRpc`
#### `nodes-cli/types.ts`（51 行） — `NodesRpcOpts` 等型別
#### `nodes-cli/register.invoke.ts`（468 行） — nodes invoke/exec/run（遠端命令執行）
#### `nodes-cli/register.status.ts`（408 行） — nodes status/list
#### `nodes-cli/register.camera.ts`（265 行） — nodes camera snapshot/stream
#### `nodes-cli/register.canvas.ts`（245 行） — nodes canvas snapshot/draw
#### `nodes-cli/register.screen.ts`（82 行） — nodes screen capture
#### `nodes-cli/register.push.ts`（88 行） — nodes push notification
#### `nodes-cli/register.notify.ts`（57 行） — nodes system notification
#### `nodes-cli/register.location.ts`（81 行） — nodes location query
#### `nodes-cli/register.pairing.ts`（101 行） — nodes pairing list/approve

---

### node-cli/ — Local Node Host

#### `node-cli/register.ts`（110 行） — `registerNodeCli(program)`：註冊 node run/daemon 命令
#### `node-cli/daemon.ts`（283 行） — node host daemon 管理

---

### cron-cli/ — Cron Scheduling

#### `cron-cli/register.ts`（27 行） — `registerCronCli(program)`：註冊 cron 命令群組
#### `cron-cli/register.cron-add.ts`（290 行） — cron add
#### `cron-cli/register.cron-edit.ts`（352 行） — cron edit
#### `cron-cli/register.cron-simple.ts`（109 行） — cron list/remove/enable/disable/run
#### `cron-cli/shared.ts`（273 行） — cron 共用格式化 + RPC 工具

---

### update-cli/ — Auto-update

#### `update-cli/update-command.ts`（974 行） — 核心 update 邏輯（npm/download/verify/apply）
#### `update-cli/wizard.ts`（151 行） — 互動式 update wizard
#### `update-cli/status.ts`（128 行） — update channel 狀態查詢
#### `update-cli/shared.ts`（279 行） — update 共用型別 + 工具
#### `update-cli/progress.ts`（198 行） — download progress rendering
#### `update-cli/restart-helper.ts`（175 行） — 更新後 restart 邏輯
#### `update-cli/suppress-deprecations.ts`（16 行） — 抑制 Node deprecation 警告

---

### browser-cli-* — Browser Sub-commands

#### `browser-cli-shared.ts`（84 行） — `callBrowserRequest`/`callBrowserResize` gateway RPC 包裝
#### `browser-cli-manage.ts`（527 行） — start/stop/restart/tabs/open/close/focus/profiles/status
#### `browser-cli-inspect.ts`（160 行） — screenshot/snapshot/dom/accessibility
#### `browser-cli-state.ts`（276 行） — resize/devtools/network/stealth/cache/cookies/storage
#### `browser-cli-state.cookies-storage.ts`（229 行） — cookies/storage CRUD 命令
#### `browser-cli-debug.ts`（232 行） — console/evaluate/network-log/performance
#### `browser-cli-extension.ts`（140 行） — extension install/list/uninstall
#### `browser-cli-actions-observe.ts`（116 行） — observe/extract/read-text
#### `browser-cli-actions-input/register.ts`（16 行） — 入口 re-export
#### `browser-cli-actions-input/register.element.ts`（195 行） — click/type/select/scroll
#### `browser-cli-actions-input/register.navigation.ts`（70 行） — goto/back/forward/reload
#### `browser-cli-actions-input/register.files-downloads.ts`（201 行） — upload/download
#### `browser-cli-actions-input/register.form-wait-eval.ts`（128 行） — fill-form/wait-for/evaluate
#### `browser-cli-actions-input/shared.ts`（100 行） — browser action 共用工具
#### `browser-cli-resize.ts`（37 行） — resize 輸出包裝
#### `browser-cli-examples.ts`（34 行） — help examples 常數

---

### 其他

#### `nodes-media-utils.ts`（35 行） — `asRecord`/`asString`/`asNumber`/`asBoolean`/`resolveTempPathParts`
#### `nodes-camera.ts`（233 行） — camera snapshot payload 解析 + 檔案儲存
#### `nodes-canvas.ts`（24 行） — canvas snapshot payload 解析
#### `nodes-screen.ts`（38 行） — screen record payload 解析
#### `nodes-run.ts`（25 行） — `parseEnvPairs`/`parseTimeout` 工具
#### `skills-cli.format.ts`（332 行） — skills list/info/check 格式化輸出
#### `completion-fish.ts`（41 行） — fish shell completion 產生器
#### `daemon-cli-compat.ts`（99 行） — daemon legacy compatibility layer
#### `program.test-mocks.ts`（78 行） — 測試用 mock program
#### `program.nodes-test-helpers.ts`（13 行） — 測試 helper
#### `browser-cli-test-helpers.ts`（19 行） — 測試 helper
#### `requirements-test-fixtures.ts`（18 行） — 測試 fixture
#### `test-runtime-capture.ts`（33 行） — 測試用 runtime capture

---

## 呼叫關聯圖

### 啟動鏈

```
runCli() (run-main.ts)
  ├─ parseCliProfileArgs() → applyCliProfileEnv()     // profile 解析
  ├─ normalizeWindowsArgv()                             // Windows argv 正規化
  ├─ tryRouteCli() (route.ts)                           // 快速路由嘗試
  │    ├─ findRoutedCommand() (program/routes.ts)       //   查路由表
  │    │    → routeHealth/routeStatus/routeSessions/... //   直接執行 command
  │    └─ prepareRoutedCommand()                        //   banner + config guard + plugins
  │         ├─ emitCliBanner()
  │         ├─ ensureConfigReady()
  │         └─ ensurePluginRegistryLoaded()
  └─ buildProgram() (program/build-program.ts)          // 完整 Commander 路徑
       ├─ createProgramContext()
       ├─ configureProgramHelp()
       ├─ registerPreActionHooks()                      //   preaction: banner + config guard + plugins
       └─ registerProgramCommands()
            ├─ registerCoreCliCommands()                 //   core: setup/onboard/configure/config/...
            │    └─ registerLazyCoreCommand()            //     lazy placeholder → reparseProgramFromActionArgs
            └─ registerSubCliCommands()                  //   subcli: gateway/daemon/models/...
                 └─ registerLazyCommand()                //     lazy placeholder → reparseProgramFromActionArgs
```

### Command 執行鏈

```
Commander parseAsync
  → preaction hook (preaction.ts)
      ├─ emitCliBanner()
      ├─ setVerbose()
      ├─ ensureConfigReady()    // config-guard.ts
      └─ ensurePluginRegistryLoaded()  // 只對需要 channel 的命令
  → command action handler
      → runCommandWithRuntime() // 統一錯誤處理
          → 實際 command 邏輯（來自 ../../commands/*.ts）
```

### Gateway RPC 鏈

```
CLI command (e.g. gateway call / system event / nodes invoke)
  → callGatewayFromCli() (gateway-rpc.ts)
     └─ callGateway() (../../gateway/call.ts)
  OR
  → callGatewayCli() (gateway-cli/call.ts)
     └─ callGateway()
```

### Secret Resolution 鏈

```
memory-cli / qr-cli
  → resolveCommandSecretRefsViaGateway() (command-secret-gateway.ts)
      ├─ getMemoryCommandSecretTargetIds() / getQrRemoteCommandSecretTargetIds()
      └─ callGateway("secrets.resolve", ...)
```

---

## 系統歸屬分類

### Bootstrap / Entry
`run-main.ts` `program.ts` `route.ts`

### Commander Program Building
`program/build-program.ts` `program/context.ts` `program/program-context.ts` `program/command-registry.ts` `program/register.subclis.ts` `program/command-tree.ts` `program/action-reparse.ts` `program/help.ts` `program/helpers.ts` `program/preaction.ts` `program/config-guard.ts` `program/routes.ts`

### Argument Parsing
`argv.ts` `windows-argv.ts` `profile.ts` `profile-utils.ts` `parse-bytes.ts` `parse-duration.ts` `parse-timeout.ts` `shared/parse-port.ts` `log-level-option.ts`

### CLI Utilities
`cli-utils.ts` `cli-name.ts` `command-format.ts` `command-options.ts` `help-format.ts` `progress.ts` `prompt.ts` `wait.ts` `banner.ts` `tagline.ts` `respawn-policy.ts` `install-spec.ts`

### Gateway Control
`gateway-cli.ts` `gateway-cli/register.ts` `gateway-cli/run.ts` `gateway-cli/run-loop.ts` `gateway-cli/call.ts` `gateway-cli/dev.ts` `gateway-cli/shared.ts` `gateway-cli/discover.ts` `gateway-rpc.ts`

### Service Management (Daemon)
`daemon-cli.ts` `daemon-cli/register.ts` `daemon-cli/register-service-commands.ts` `daemon-cli/runners.ts` `daemon-cli/lifecycle.ts` `daemon-cli/lifecycle-core.ts` `daemon-cli/install.ts` `daemon-cli/status.ts` `daemon-cli/status.gather.ts` `daemon-cli/status.print.ts` `daemon-cli/probe.ts` `daemon-cli/response.ts` `daemon-cli/restart-health.ts` `daemon-cli/gateway-token-drift.ts` `daemon-cli/shared.ts` `daemon-cli/types.ts` `daemon-cli-compat.ts`

### Messaging
`program/register.message.ts` `program/message/helpers.ts` `program/message/register.*.ts` (11 檔)

### Agent Management
`program/register.agent.ts`

### Status / Health / Sessions
`program/register.status-health-sessions.ts`

### Channel Management
`channels-cli.ts` `channel-auth.ts` `channel-options.ts` `outbound-send-deps.ts` `outbound-send-mapping.ts` `deps.ts`

### Config Management
`config-cli.ts` `program/register.configure.ts` `program/register.setup.ts` `program/register.onboard.ts`

### Memory Search
`memory-cli.ts` `command-secret-gateway.ts` `command-secret-targets.ts`

### Model Management
`models-cli.ts`

### Plugin System
`plugins-cli.ts` `plugins-config.ts` `plugin-registry.ts` `plugin-install-plan.ts` `npm-resolution.ts`

### Browser Automation
`browser-cli.ts` `browser-cli-shared.ts` `browser-cli-manage.ts` `browser-cli-inspect.ts` `browser-cli-state.ts` `browser-cli-state.cookies-storage.ts` `browser-cli-debug.ts` `browser-cli-extension.ts` `browser-cli-actions-observe.ts` `browser-cli-actions-input/*.ts` `browser-cli-resize.ts` `browser-cli-examples.ts`

### Remote Node Control
`nodes-cli.ts` `nodes-cli/register.ts` `nodes-cli/register.*.ts` `nodes-cli/rpc.ts` `nodes-cli/types.ts` `nodes-cli/cli-utils.ts` `nodes-cli/format.ts` `nodes-cli/pairing-render.ts` `nodes-cli/a2ui-jsonl.ts` `nodes-run.ts` `nodes-camera.ts` `nodes-canvas.ts` `nodes-screen.ts` `nodes-media-utils.ts`

### Local Node Host
`node-cli.ts` `node-cli/register.ts` `node-cli/daemon.ts`

### Cron Scheduling
`cron-cli.ts` `cron-cli/register.ts` `cron-cli/register.cron-add.ts` `cron-cli/register.cron-edit.ts` `cron-cli/register.cron-simple.ts` `cron-cli/shared.ts`

### Security & Secrets
`security-cli.ts` `secrets-cli.ts`

### Update / Self-update
`update-cli.ts` `update-cli/update-command.ts` `update-cli/wizard.ts` `update-cli/status.ts` `update-cli/shared.ts` `update-cli/progress.ts` `update-cli/restart-helper.ts` `update-cli/suppress-deprecations.ts`

### Misc Sub-CLIs
`exec-approvals-cli.ts` `logs-cli.ts` `hooks-cli.ts` `webhooks-cli.ts` `skills-cli.ts` `skills-cli.format.ts` `system-cli.ts` `dns-cli.ts` `docs-cli.ts` `sandbox-cli.ts` `devices-cli.ts` `directory-cli.ts` `pairing-cli.ts` `qr-cli.ts` `clawbot-cli.ts` `tui-cli.ts` `acp-cli.ts` `completion-cli.ts` `completion-fish.ts` `ports.ts`

### Maintenance / Backup
`program/register.maintenance.ts` `program/register.backup.ts`

### Test Helpers (非生產)
`program.test-mocks.ts` `program.nodes-test-helpers.ts` `browser-cli-test-helpers.ts` `requirements-test-fixtures.ts` `test-runtime-capture.ts` `daemon-cli/test-helpers/lifecycle-core-harness.ts`
