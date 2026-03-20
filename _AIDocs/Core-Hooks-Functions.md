# Hooks 函式級索引

> 掃描日期：2026-03-21 | 檔案數：25 檔 | 總行數：~4,333 行

## 目錄結構

```
src/hooks/
├── bundled/
│   ├── boot-md/handler.ts              (44 行)  gateway 啟動時執行 boot checklist
│   ├── bootstrap-extra-files/handler.ts (73 行)  agent bootstrap 時注入額外檔案
│   ├── command-logger/handler.ts        (68 行)  範例：command 事件寫入審計 log
│   └── session-memory/handler.ts       (371 行)  /new、/reset 時儲存 session 記憶
├── bundled-dir.ts                       (48 行)  解析 bundled hooks 目錄路徑
├── config.ts                            (84 行)  hook 設定解析 + 啟用/eligibility 判斷
├── fire-and-forget.ts                   (11 行)  fire-and-forget Promise 包裝
├── frontmatter.ts                       (81 行)  HOOK.md frontmatter 解析
├── gmail.ts                            (271 行)  Gmail hook 設定常數 + runtime config 解析
├── gmail-ops.ts                        (373 行)  Gmail setup / run CLI 操作
├── gmail-setup-utils.ts                (383 行)  gcloud/gog/tailscale 依賴 + GCP 操作工具
├── gmail-watcher.ts                    (246 行)  Gmail watcher 生命週期（spawn/stop/renew）
├── gmail-watcher-lifecycle.ts           (37 行)  Gmail watcher 啟動 with logs 封裝
├── hooks.ts                             (14 行)  公開 re-export 門面
├── hooks-status.ts                     (146 行)  hook 狀態報告（requirements/eligibility）
├── import-url.ts                        (38 行)  handler module import URL 構建（cache-bust）
├── install.ts                          (472 行)  hook 安裝（npm/archive/path/dir）
├── installs.ts                          (30 行)  hook 安裝記錄寫入 config
├── internal-hooks.ts                   (421 行)  核心事件系統（registry + trigger + type guards）
├── llm-slug-generator.ts              (100 行)  LLM 產生 session 記憶檔名 slug
├── loader.ts                           (256 行)  hook handler 動態載入 + 註冊
├── message-hook-mappers.ts             (273 行)  訊息 hook context 轉換（canonical ↔ internal ↔ plugin）
├── module-loader.ts                     (46 行)  通用 ES module 載入 + export 解析
├── types.ts                             (67 行)  核心型別定義
└── workspace.ts                        (380 行)  workspace hook 探索 + snapshot 構建
```

## 函式清單

### 根目錄

#### `bundled-dir.ts`（48 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `resolveBundledHooksDir` | `() => string \| undefined` | 依序嘗試 env override / exec sibling / dist / src 解析 bundled hooks 目錄 | public API |

#### `config.ts`（84 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `hasBinary` | (re-export from `config-eval`) | 檢查 PATH 上是否有指定 binary | public API |
| `resolveConfigPath` | (re-export from `config-eval`) | 解析 config 物件的 dot-path 值 | public API |
| `resolveRuntimePlatform` | (re-export from `config-eval`) | 取得當前 runtime 平台識別 | public API |
| `isConfigPathTruthy` | `(config: OpenClawConfig \| undefined, pathStr: string) => boolean` | 判斷 config path 是否為 truthy（含預設值） | public API |
| `resolveHookConfig` | `(config: OpenClawConfig \| undefined, hookKey: string) => HookConfig \| undefined` | 從 config.hooks.internal.entries 取得指定 hook 的設定 | public API |
| `shouldIncludeHook` | `(params: { entry: HookEntry; config?: OpenClawConfig; eligibility?: HookEligibilityContext }) => boolean` | 綜合判斷 hook 是否應啟用（disabled + runtime eligibility） | public API |

#### `fire-and-forget.ts`（11 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `fireAndForgetHook` | `(task: Promise<unknown>, label: string, logger?: (msg: string) => void) => void` | 包裝 Promise 為 fire-and-forget，錯誤只 log 不拋 | public API |

#### `frontmatter.ts`（81 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `parseFrontmatter` | `(content: string) => ParsedHookFrontmatter` | 解析 HOOK.md 的 frontmatter block | public API |
| `resolveOpenClawMetadata` | `(frontmatter: ParsedHookFrontmatter) => OpenClawHookMetadata \| undefined` | 從 frontmatter 解析 openclaw metadata（events/requires/install/os） | public API |
| `resolveHookInvocationPolicy` | `(frontmatter: ParsedHookFrontmatter) => HookInvocationPolicy` | 解析 hook 的 enabled/disabled invocation policy | public API |
| `resolveHookKey` | `(hookName: string, entry?: HookEntry) => string` | 取得 hook 的 config key（metadata.hookKey 或 hookName） | public API |

#### `gmail.ts`（271 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `DEFAULT_GMAIL_LABEL` | `"INBOX"` | Gmail 預設 label | internal |
| `DEFAULT_GMAIL_TOPIC` | `"gog-gmail-watch"` | 預設 Pub/Sub topic 名稱 | internal |
| `DEFAULT_GMAIL_SUBSCRIPTION` | `"gog-gmail-watch-push"` | 預設 subscription 名稱 | internal |
| `DEFAULT_GMAIL_SERVE_BIND` | `"127.0.0.1"` | gog serve 預設 bind 地址 | internal |
| `DEFAULT_GMAIL_SERVE_PORT` | `8788` | gog serve 預設 port | internal |
| `DEFAULT_GMAIL_SERVE_PATH` | `"/gmail-pubsub"` | gog serve 預設路徑 | internal |
| `DEFAULT_GMAIL_MAX_BYTES` | `20_000` | Gmail body 最大位元組 | internal |
| `DEFAULT_GMAIL_RENEW_MINUTES` | `720` | Gmail watch 續約間隔（分鐘） | internal |
| `DEFAULT_HOOKS_PATH` | `"/hooks"` | 預設 hooks HTTP 路徑 | internal |
| `GmailHookOverrides` | type | Gmail hook 覆寫選項型別 | internal |
| `GmailHookRuntimeConfig` | type | Gmail hook 完整 runtime 設定型別 | internal |
| `generateHookToken` | `(bytes?: number) => string` | 產生隨機 hex token（預設 24 bytes） | public API |
| `mergeHookPresets` | `(existing: string[] \| undefined, preset: string) => string[]` | 合併 hook presets（去重） | public API |
| `normalizeHooksPath` | `(raw?: string) => string` | 正規化 hooks HTTP path（確保前導 /，移除尾 /） | public API |
| `normalizeServePath` | `(raw?: string) => string` | 正規化 serve path | public API |
| `buildDefaultHookUrl` | `(hooksPath?: string, port?: number) => string` | 組建預設 hook URL（http://127.0.0.1:{port}{path}/gmail） | public API |
| `resolveGmailHookRuntimeConfig` | `(cfg: OpenClawConfig, overrides: GmailHookOverrides) => { ok: true; value: GmailHookRuntimeConfig } \| { ok: false; error: string }` | 合併 config + overrides 解析完整 Gmail runtime config | public API |
| `buildGogWatchStartArgs` | `(cfg: Pick<GmailHookRuntimeConfig, "account" \| "label" \| "topic">) => string[]` | 組建 `gog gmail watch start` 指令參數 | public API |
| `buildGogWatchServeArgs` | `(cfg: GmailHookRuntimeConfig) => string[]` | 組建 `gog gmail watch serve` 指令參數 | public API |
| `buildTopicPath` | `(projectId: string, topicName: string) => string` | 組建 Pub/Sub topic 完整路徑 | public API |
| `parseTopicPath` | `(topic: string) => { projectId: string; topicName: string } \| null` | 解析 `projects/{id}/topics/{name}` 格式 | public API |

#### `gmail-ops.ts`（373 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `GmailSetupOptions` | type | Gmail setup CLI 選項 | internal |
| `GmailRunOptions` | type | Gmail run CLI 選項 | internal |
| `runGmailSetup` | `(opts: GmailSetupOptions) => Promise<void>` | 完整 Gmail hook 設定流程（gcloud/topic/subscription/tailscale/config 寫入） | public API |
| `runGmailService` | `(opts: GmailRunOptions) => Promise<void>` | 啟動 Gmail hook 服務（gog serve + watch renew loop） | public API |

#### `gmail-setup-utils.ts`（383 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `resetGmailSetupUtilsCachesForTest` | `() => void` | 重設 python path 快取（測試用） | internal |
| `resolvePythonExecutablePath` | `() => Promise<string \| undefined>` | 在 PATH 上搜尋並解析 python3/python 真實路徑 | public API |
| `ensureDependency` | `(bin: string, brewArgs: string[]) => Promise<void>` | 確保 binary 存在，macOS 自動 brew install | public API |
| `ensureGcloudAuth` | `() => Promise<void>` | 確保 gcloud 已認證 | public API |
| `runGcloud` | `(args: string[]) => Promise<SpawnResult>` | 執行 gcloud 指令（120s timeout） | public API |
| `ensureTopic` | `(projectId: string, topicName: string) => Promise<void>` | 確保 Pub/Sub topic 存在，不存在則建立 | public API |
| `ensureSubscription` | `(projectId: string, subscription: string, topicName: string, pushEndpoint: string) => Promise<void>` | 確保 Pub/Sub subscription 存在 + 更新 push endpoint | public API |
| `ensureTailscaleEndpoint` | `(params: { mode; path; port?; target?; token? }) => Promise<string>` | 設定 Tailscale serve/funnel 並回傳公開 URL | public API |
| `resolveProjectIdFromGogCredentials` | `() => Promise<string \| null>` | 從 gog credentials.json 反查 GCP project ID | public API |

#### `gmail-watcher.ts`（246 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `isAddressInUseError` | `(line: string) => boolean` | 判斷 stderr 是否為 address-in-use 錯誤 | public API |
| `GmailWatcherStartResult` | type | watcher 啟動結果型別 | internal |
| `startGmailWatcher` | `(cfg: OpenClawConfig) => Promise<GmailWatcherStartResult>` | 啟動 Gmail watcher 服務（spawn gog serve + renew interval） | public API |
| `stopGmailWatcher` | `() => Promise<void>` | 停止 Gmail watcher（SIGTERM → SIGKILL fallback） | public API |
| `isGmailWatcherRunning` | `() => boolean` | 查詢 watcher 是否正在運行 | public API |

#### `gmail-watcher-lifecycle.ts`（37 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `GMailWatcherLog` | type | watcher log 介面 | internal |
| `startGmailWatcherWithLogs` | `(params: { cfg: OpenClawConfig; log: GMailWatcherLog; onSkipped?: () => void }) => Promise<void>` | 帶 log 的 watcher 啟動封裝（支援 env skip） | public API |

#### `hooks.ts`（14 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `*` (re-export) | from `internal-hooks.js` | 全部 re-export internal-hooks 模組 | public API |
| `HookEventType` | type alias → `InternalHookEventType` | 事件類型別名 | public API |
| `HookEvent` | type alias → `InternalHookEvent` | 事件物件型別別名 | public API |
| `HookHandler` | type alias → `InternalHookHandler` | handler 型別別名 | public API |
| `registerHook` | alias → `registerInternalHook` | 註冊 hook handler（公開名稱） | public API |
| `unregisterHook` | alias → `unregisterInternalHook` | 移除 hook handler | public API |
| `clearHooks` | alias → `clearInternalHooks` | 清除所有 hooks | public API |
| `getRegisteredHookEventKeys` | alias → `getRegisteredEventKeys` | 列出已註冊的 event keys | public API |
| `triggerHook` | alias → `triggerInternalHook` | 觸發 hook 事件 | public API |
| `createHookEvent` | alias → `createInternalHookEvent` | 建立 hook 事件物件 | public API |
| `isAgentBootstrapEvent` | (re-export) | 型別守衛：agent:bootstrap 事件 | public API |

#### `hooks-status.ts`（146 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `HookStatusConfigCheck` | type alias → `RequirementConfigCheck` | hook config 檢查結果型別 | internal |
| `HookInstallOption` | type | hook 安裝選項型別 | internal |
| `HookStatusEntry` | type | 單一 hook 狀態報告型別 | internal |
| `HookStatusReport` | type | 完整狀態報告型別 | internal |
| `buildWorkspaceHookStatus` | `(workspaceDir: string, opts?: { config?; managedHooksDir?; entries?; eligibility? }) => HookStatusReport` | 建構 workspace 所有 hooks 的狀態報告 | public API |

#### `import-url.ts`（38 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `buildImportUrl` | `(handlerPath: string, source: HookSource) => string` | 建構 handler import URL（bundled 不 cache-bust，其餘用 mtime+size） | internal |

#### `install.ts`（472 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `HookInstallLogger` | type | 安裝 logger 介面 | internal |
| `InstallHooksResult` | type | 安裝結果（ok + hookPackId + hooks + targetDir / error） | internal |
| `HookNpmIntegrityDriftParams` | type | npm integrity 漂移通知參數 | internal |
| `resolveHookInstallDir` | `(hookId: string, hooksDir?: string) => string` | 解析 hook 安裝目標目錄（含路徑安全檢查） | public API |
| `installHooksFromArchive` | `(params: HookArchiveInstallParams) => Promise<InstallHooksResult>` | 從 archive（tar/zip）安裝 hook | public API |
| `installHooksFromNpmSpec` | `(params: { spec; hooksDir?; timeoutMs?; logger?; mode?; dryRun?; ... }) => Promise<InstallHooksResult>` | 從 npm spec 下載並安裝 hook | public API |
| `installHooksFromPath` | `(params: HookPathInstallParams) => Promise<InstallHooksResult>` | 從本地路徑（目錄或 archive）安裝 hook | public API |

#### `installs.ts`（30 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `HookInstallUpdate` | type | hook 安裝記錄更新型別 | internal |
| `recordHookInstall` | `(cfg: OpenClawConfig, update: HookInstallUpdate) => OpenClawConfig` | 將 hook 安裝記錄寫入 config（immutable 回傳新 config） | public API |

#### `internal-hooks.ts`（421 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `InternalHookEventType` | type = `"command" \| "session" \| "agent" \| "gateway" \| "message"` | 5 種事件類型 | public API |
| `AgentBootstrapHookContext` | type | agent:bootstrap 事件 context | internal |
| `AgentBootstrapHookEvent` | type | agent:bootstrap 完整事件型別 | internal |
| `GatewayStartupHookContext` | type | gateway:startup 事件 context | internal |
| `GatewayStartupHookEvent` | type | gateway:startup 完整事件型別 | internal |
| `MessageReceivedHookContext` | type | message:received 事件 context | internal |
| `MessageReceivedHookEvent` | type | message:received 完整事件型別 | internal |
| `MessageSentHookContext` | type | message:sent 事件 context | internal |
| `MessageSentHookEvent` | type | message:sent 完整事件型別 | internal |
| `MessageTranscribedHookContext` | type | message:transcribed 事件 context | internal |
| `MessageTranscribedHookEvent` | type | message:transcribed 完整事件型別 | internal |
| `MessagePreprocessedHookContext` | type | message:preprocessed 事件 context | internal |
| `MessagePreprocessedHookEvent` | type | message:preprocessed 完整事件型別 | internal |
| `InternalHookEvent` | interface | 通用 hook 事件介面（type/action/sessionKey/context/timestamp/messages） | public API |
| `InternalHookHandler` | type = `(event: InternalHookEvent) => Promise<void> \| void` | handler 函式簽名 | public API |
| `registerInternalHook` | `(eventKey: string, handler: InternalHookHandler) => void` | 以 event key 註冊 handler（globalThis singleton Map） | public API |
| `unregisterInternalHook` | `(eventKey: string, handler: InternalHookHandler) => void` | 移除指定 handler | public API |
| `clearInternalHooks` | `() => void` | 清除所有已註冊 hooks | public API |
| `getRegisteredEventKeys` | `() => string[]` | 列出所有已註冊 event keys | public API |
| `triggerInternalHook` | `(event: InternalHookEvent) => Promise<void>` | 觸發事件：依序呼叫 type handlers + type:action handlers | event emitter |
| `createInternalHookEvent` | `(type: InternalHookEventType, action: string, sessionKey: string, context?: Record<string, unknown>) => InternalHookEvent` | 建立帶預設 timestamp/messages 的事件物件 | public API |
| `isAgentBootstrapEvent` | `(event: InternalHookEvent) => event is AgentBootstrapHookEvent` | 型別守衛：agent:bootstrap | public API |
| `isGatewayStartupEvent` | `(event: InternalHookEvent) => event is GatewayStartupHookEvent` | 型別守衛：gateway:startup | public API |
| `isMessageReceivedEvent` | `(event: InternalHookEvent) => event is MessageReceivedHookEvent` | 型別守衛：message:received | public API |
| `isMessageSentEvent` | `(event: InternalHookEvent) => event is MessageSentHookEvent` | 型別守衛：message:sent | public API |
| `isMessageTranscribedEvent` | `(event: InternalHookEvent) => event is MessageTranscribedHookEvent` | 型別守衛：message:transcribed | public API |
| `isMessagePreprocessedEvent` | `(event: InternalHookEvent) => event is MessagePreprocessedHookEvent` | 型別守衛：message:preprocessed | public API |

#### `llm-slug-generator.ts`（100 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `generateSlugViaLLM` | `(params: { sessionContent: string; cfg: OpenClawConfig }) => Promise<string \| null>` | 用 LLM 從 session 內容產生 1-2 word 檔名 slug | public API |

#### `message-hook-mappers.ts`（273 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `CanonicalInboundMessageHookContext` | type | 標準化入站訊息 context（統一 channel/provider/group 欄位） | internal |
| `CanonicalSentMessageHookContext` | type | 標準化出站訊息 context | internal |
| `deriveInboundMessageHookContext` | `(ctx: FinalizedMsgContext, overrides?: { content?; messageId? }) => CanonicalInboundMessageHookContext` | 從 FinalizedMsgContext 推導標準化入站 context | public API |
| `buildCanonicalSentMessageHookContext` | `(params: { to; content; success; error?; channelId; ... }) => CanonicalSentMessageHookContext` | 建構標準化出站 context | public API |
| `toPluginMessageContext` | `(canonical) => PluginHookMessageContext` | canonical → plugin 訊息 context | public API |
| `toPluginMessageReceivedEvent` | `(canonical: CanonicalInboundMessageHookContext) => PluginHookMessageReceivedEvent` | canonical → plugin message:received 事件 | public API |
| `toPluginMessageSentEvent` | `(canonical: CanonicalSentMessageHookContext) => PluginHookMessageSentEvent` | canonical → plugin message:sent 事件 | public API |
| `toInternalMessageReceivedContext` | `(canonical) => MessageReceivedHookContext` | canonical → internal message:received context | public API |
| `toInternalMessageTranscribedContext` | `(canonical, cfg) => MessageTranscribedHookContext & { cfg }` | canonical → internal message:transcribed context | public API |
| `toInternalMessagePreprocessedContext` | `(canonical, cfg) => MessagePreprocessedHookContext & { cfg }` | canonical → internal message:preprocessed context | public API |
| `toInternalMessageSentContext` | `(canonical) => MessageSentHookContext` | canonical → internal message:sent context | public API |

#### `module-loader.ts`（46 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `resolveFileModuleUrl` | `(params: { modulePath; cacheBust?; nowMs? }) => string` | 將檔案路徑轉為 file:// URL（可加 cache-bust query） | internal |
| `importFileModule` | `(params: { modulePath; cacheBust?; nowMs? }) => Promise<ModuleNamespace>` | 動態 import 檔案模組 | internal |
| `resolveFunctionModuleExport` | `<T>(params: { mod: ModuleNamespace; exportName?; fallbackExportNames? }) => T \| undefined` | 從模組 namespace 解析指定 export 為函式 | internal |

#### `types.ts`（67 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `HookInstallSpec` | type | hook 安裝規格（kind: bundled/npm/git） | internal |
| `OpenClawHookMetadata` | type | hook manifest metadata（events/requires/install/os/emoji） | internal |
| `HookInvocationPolicy` | type | hook 呼叫策略（enabled） | internal |
| `ParsedHookFrontmatter` | type = `Record<string, string>` | 解析後的 frontmatter | internal |
| `Hook` | type | hook 核心描述（name/description/source/filePath/handlerPath） | internal |
| `HookSource` | type = `"openclaw-bundled" \| "openclaw-managed" \| "openclaw-workspace" \| "openclaw-plugin"` | hook 來源 | internal |
| `HookEntry` | type | 完整 hook 條目（hook + frontmatter + metadata + invocation） | internal |
| `HookEligibilityContext` | type | hook 啟用判斷的 remote context | internal |
| `HookSnapshot` | type | hook 快照（名稱 + events 列表） | internal |

#### `workspace.ts`（380 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `loadHookEntriesFromDir` | `(params: { dir: string; source: HookSource; pluginId?: string }) => HookEntry[]` | 從指定目錄載入所有 hook entries | public API |
| `buildWorkspaceHookSnapshot` | `(workspaceDir: string, opts?: { config?; managedHooksDir?; bundledHooksDir?; entries?; eligibility?; snapshotVersion? }) => HookSnapshot` | 建構 workspace hook 快照（已過濾 eligibility） | public API |
| `loadWorkspaceHookEntries` | `(workspaceDir: string, opts?: { config?; managedHooksDir?; bundledHooksDir? }) => HookEntry[]` | 載入 workspace 所有 hook entries（bundled < managed < workspace 優先順序） | public API |

#### `loader.ts`（256 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `loadInternalHooks` | `(cfg: OpenClawConfig, workspaceDir: string, opts?: { managedHooksDir?; bundledHooksDir? }) => Promise<number>` | 動態載入並註冊所有 hook handlers（directory-based + legacy config），回傳已載入數量 | public API |

### bundled/

#### `bundled/boot-md/handler.ts`（44 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `default` (runBootChecklist) | `HookHandler` = `(event: InternalHookEvent) => Promise<void>` | gateway:startup 時對每個 agent 執行 boot checklist | hook handler |

#### `bundled/bootstrap-extra-files/handler.ts`（73 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `default` (bootstrapExtraFilesHook) | `HookHandler` = `(event: InternalHookEvent) => Promise<void>` | agent:bootstrap 時根據 config patterns 注入額外 bootstrap 檔案 | hook handler |

#### `bundled/command-logger/handler.ts`（68 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `default` (logCommand) | `HookHandler` = `(event: InternalHookEvent) => Promise<void>` | command 事件寫入 JSON 審計 log 檔 | hook handler |

#### `bundled/session-memory/handler.ts`（371 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `default` (saveSessionToMemory) | `HookHandler` = `(event: InternalHookEvent) => Promise<void>` | command:new/reset 時讀取 session transcript，用 LLM 產生 slug，寫入 memory .md 檔 | hook handler |

## 呼叫關聯圖

```
外部觸發（gateway/agent/channel）
    │
    ▼
createInternalHookEvent()          ← internal-hooks.ts  建立事件
    │
    ▼
triggerInternalHook(event)         ← internal-hooks.ts  事件分發核心
    │
    ├── handlers.get(event.type)        → type-level handlers
    └── handlers.get(type:action)       → action-level handlers
            │
            ▼
    [已註冊的 HookHandler 依序執行]

============================================================

啟動時載入流程：
loadInternalHooks(cfg, workspaceDir)   ← loader.ts
    │
    ├── loadWorkspaceHookEntries()     ← workspace.ts
    │       │
    │       ├── resolveBundledHooksDir()  ← bundled-dir.ts
    │       ├── loadHooksFromDir()        ← workspace.ts (bundled/managed/workspace/extra)
    │       │       │
    │       │       └── loadHookFromDir()   → parseFrontmatter() → resolveOpenClawMetadata()
    │       │                                    ← frontmatter.ts
    │       └── 優先順序合併：extra < bundled < managed < workspace
    │
    ├── shouldIncludeHook()            ← config.ts
    │       └── evaluateRuntimeEligibility()  ← shared/config-eval.js
    │
    ├── buildImportUrl()               ← import-url.ts
    │       └── bundled → 不 cache-bust ; 其餘 → ?t={mtime}&s={size}
    │
    ├── import(importUrl)              → ES module 動態載入
    │
    ├── resolveFunctionModuleExport()  ← module-loader.ts
    │
    └── registerInternalHook(eventKey, handler)  ← internal-hooks.ts
            │
            └── globalThis singleton Map<string, handler[]>

============================================================

訊息 Hook Context 轉換流：
FinalizedMsgContext
    │
    ▼
deriveInboundMessageHookContext()      ← message-hook-mappers.ts
    │
    ├── toInternalMessageReceivedContext()  → triggerHook("message:received")
    ├── toInternalMessageTranscribedContext() → triggerHook("message:transcribed")
    ├── toInternalMessagePreprocessedContext() → triggerHook("message:preprocessed")
    ├── toPluginMessageReceivedEvent()     → plugin hook system
    └── toPluginMessageContext()           → plugin hook system

buildCanonicalSentMessageHookContext()
    │
    ├── toInternalMessageSentContext()     → triggerHook("message:sent")
    └── toPluginMessageSentEvent()         → plugin hook system

============================================================

Gmail Watcher 生命週期：
startGmailWatcherWithLogs()            ← gmail-watcher-lifecycle.ts
    └── startGmailWatcher(cfg)         ← gmail-watcher.ts
            │
            ├── resolveGmailHookRuntimeConfig()  ← gmail.ts
            ├── ensureTailscaleEndpoint()         ← gmail-setup-utils.ts
            ├── startGmailWatch()      (gog watch start)
            ├── spawnGogServe()        (gog watch serve)
            └── setInterval(renew)     (定期 watch renew)

runGmailSetup() / runGmailService()    ← gmail-ops.ts
    ├── ensureDependency()             ← gmail-setup-utils.ts
    ├── ensureGcloudAuth()             ← gmail-setup-utils.ts
    ├── ensureTopic/ensureSubscription ← gmail-setup-utils.ts
    └── resolveGmailHookRuntimeConfig()← gmail.ts

============================================================

Hook 安裝流程：
installHooksFromNpmSpec()              ← install.ts
    └── installFromValidatedNpmSpecArchive()  → installHooksFromArchive()
            └── withExtractedArchiveRoot()    → installFromResolvedHookDir()

installHooksFromPath()                 ← install.ts
    ├── (directory) → installFromResolvedHookDir()
    └── (archive)  → installHooksFromArchive()

installFromResolvedHookDir()           ← install.ts
    ├── (has package.json) → installHookPackageFromDir()
    └── (no package.json)  → installHookFromDir()

recordHookInstall()                    ← installs.ts  (寫入 config)
```

## 系統歸屬分類

### 核心事件引擎

| 檔案 | 角色 |
|------|------|
| `internal-hooks.ts` | **事件核心**：globalThis singleton registry、5 種事件類型、register/trigger/clear、6 個 type guard |
| `hooks.ts` | **公開門面**：re-export + alias，外部模組統一入口 |
| `loader.ts` | **載入引擎**：directory-based + legacy config handler 動態載入，boundary 安全檢查 |

### Hook 探索與設定

| 檔案 | 角色 |
|------|------|
| `workspace.ts` | hook 掃描（bundled/managed/workspace/extra），4 層優先順序合併 |
| `config.ts` | hook 啟用判斷（eligibility + disabled + runtime platform） |
| `frontmatter.ts` | HOOK.md frontmatter 解析 → metadata/events/requires/install |
| `types.ts` | 核心型別定義 |
| `bundled-dir.ts` | bundled hooks 目錄解析（env/exec/dist/src） |
| `import-url.ts` | handler module import URL 構建（cache-bust 策略） |
| `module-loader.ts` | 通用 ES module import + export 解析 |

### Hook 安裝

| 檔案 | 角色 |
|------|------|
| `install.ts` | 安裝核心（npm spec/archive/path/dir → validate → copy → deps） |
| `installs.ts` | 安裝記錄持久化（寫入 config） |
| `hooks-status.ts` | hook 狀態報告（requirements/missing/eligible） |

### Bundled Hook Handlers（4 個內建 handler）

| 檔案 | 事件 | 說明 |
|------|------|------|
| `bundled/boot-md/handler.ts` | `gateway:startup` | 啟動時對所有 agent 執行 boot checklist |
| `bundled/bootstrap-extra-files/handler.ts` | `agent:bootstrap` | bootstrap 時注入額外檔案 |
| `bundled/command-logger/handler.ts` | `command` | command 事件寫入審計 log（範例 hook） |
| `bundled/session-memory/handler.ts` | `command:new`, `command:reset` | session 重置時保存記憶（LLM slug + transcript） |

### 訊息 Hook 橋接

| 檔案 | 角色 |
|------|------|
| `message-hook-mappers.ts` | FinalizedMsgContext ↔ canonical ↔ internal/plugin 事件轉換層 |

### Gmail Hook 子系統

| 檔案 | 角色 |
|------|------|
| `gmail.ts` | config 常數 + runtime config 解析 + gog CLI args 構建 |
| `gmail-ops.ts` | CLI 操作入口（setup/run） |
| `gmail-setup-utils.ts` | gcloud/gog/tailscale 依賴管理 + GCP Pub/Sub 操作 |
| `gmail-watcher.ts` | watcher 生命週期（spawn/stop/restart/renew） |
| `gmail-watcher-lifecycle.ts` | watcher 啟動 with logs 封裝 |

### 工具

| 檔案 | 角色 |
|------|------|
| `fire-and-forget.ts` | fire-and-forget Promise 包裝工具 |
| `llm-slug-generator.ts` | LLM 產生 session memory 檔名 slug |
