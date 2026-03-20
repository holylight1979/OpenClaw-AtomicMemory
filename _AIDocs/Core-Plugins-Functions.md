# Plugins 函式級索引

> 掃描日期：2026-03-21 | 檔案數：55 檔 | 總行數：~9573 行

## 目錄結構

```
src/plugins/
├── bundled-dir.ts              (43 行)  — bundled 插件目錄解析
├── bundled-sources.ts          (87 行)  — bundled 插件來源查找
├── cli.ts                      (65 行)  — CLI 子命令註冊
├── commands.ts                (350 行)  — Plugin command registry
├── config-schema.ts            (34 行)  — 空 config schema 工廠
├── config-state.ts            (294 行)  — 插件啟停狀態解析
├── discovery.ts               (738 行)  — 插件自動發現引擎
├── enable.ts                   (25 行)  — 啟用插件 config 操作
├── hook-runner-global.ts      (105 行)  — 全域 singleton hook runner
├── hooks.test-helpers.ts       (50 行)  — 測試用 mock registry
├── hooks.ts                   (763 行)  — Hook runner 核心實作
├── http-path.ts                (15 行)  — HTTP path 正規化
├── http-registry.ts            (93 行)  — HTTP route 動態註冊
├── http-route-overlap.ts       (45 行)  — HTTP route 重疊偵測
├── install.ts                 (573 行)  — 插件安裝（npm/dir/file/archive）
├── installs.ts                 (41 行)  — install record 寫入 config
├── loader.ts                 (1087 行)  — 插件載入器（核心 orchestrator）
├── logger.ts                   (18 行)  — PluginLogger adapter
├── manifest-registry.ts       (325 行)  — manifest 掃描 + 去重 registry
├── manifest.ts                (199 行)  — openclaw.plugin.json 讀取/解析
├── path-safety.ts              (33 行)  — 路徑安全工具
├── provider-discovery.ts       (66 行)  — provider 自動發現
├── provider-validation.ts     (233 行)  — provider 資料正規化
├── provider-wizard.ts         (244 行)  — provider onboarding wizard
├── providers.ts                (26 行)  — provider 查詢入口
├── registry.ts                (636 行)  — PluginRegistry + createApi
├── roots.ts                    (47 行)  — 插件搜尋根路徑解析
├── runtime.ts                  (50 行)  — 全域 active registry 狀態
├── schema-validator.ts        (151 行)  — JSON Schema 驗證（Ajv）
├── services.ts                 (76 行)  — 插件 service 生命週期
├── slots.ts                   (111 行)  — 排他性 slot 選擇（memory/context-engine）
├── source-display.ts           (54 行)  — 插件來源路徑格式化
├── status.ts                   (39 行)  — 插件狀態報告
├── toggle-config.ts            (48 行)  — 啟停 config toggle
├── tools.ts                   (143 行)  — 插件 tool 解析 + 注入
├── types.ts                  (1006 行)  — 所有型別定義
├── uninstall.ts               (238 行)  — 插件卸載
├── update.ts                  (510 行)  — npm 插件更新 + channel sync
├── runtime/
│   ├── gateway-request-scope.ts (48 行)  — AsyncLocalStorage request scope
│   ├── index.ts                 (90 行)  — PluginRuntime 工廠
│   ├── native-deps.ts           (29 行)  — native dependency 提示
│   ├── runtime-channel.ts      (265 行)  — channel runtime 聚合
│   ├── runtime-config.ts        (10 行)  — config runtime
│   ├── runtime-events.ts        (11 行)  — events runtime
│   ├── runtime-logging.ts       (22 行)  — logging runtime
│   ├── runtime-media.ts         (18 行)  — media runtime
│   ├── runtime-system.ts        (15 行)  — system runtime
│   ├── runtime-tools.ts         (12 行)  — tools runtime
│   ├── runtime-whatsapp-login.runtime.ts  (2 行)  — WhatsApp login re-export
│   ├── runtime-whatsapp-outbound.runtime.ts (2 行) — WhatsApp outbound re-export
│   ├── runtime-whatsapp.ts     (112 行)  — WhatsApp lazy-load runtime
│   ├── types.ts                 (64 行)  — PluginRuntime 型別
│   ├── types-channel.ts        (166 行)  — channel runtime 型別
│   └── types-core.ts            (68 行)  — core runtime 型別
└── test-helpers/
    └── fs-fixtures.ts           (33 行)  — 測試用 temp dir 工具
```

## 函式清單

---

### 根目錄（`src/plugins/`）

#### `config-schema.ts`（34 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `emptyPluginConfigSchema` | `() => OpenClawPluginConfigSchema` | 建立空的 plugin config schema（safeParse + jsonSchema） | public API |

#### `enable.ts`（25 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `PluginEnableResult` | type | 啟用結果（config + enabled + reason） | type |
| `enablePluginInConfig` | `(cfg: OpenClawConfig, pluginId: string) => PluginEnableResult` | 在 config 中啟用指定插件，檢查 denylist | public API |

#### `hooks.test-helpers.ts`（50 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `createMockPluginRegistry` | `(hooks: Array<{hookName, handler}>) => PluginRegistry` | 建立含指定 hooks 的 mock registry | internal (test) |
| `TEST_PLUGIN_AGENT_CTX` | `PluginHookAgentContext` | 預設測試用 agent context | internal (test) |
| `addTestHook` | `(params: {registry, pluginId, hookName, handler, priority?}) => void` | 向 registry 追加 typed hook | internal (test) |

#### `hooks.ts`（763 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `HookRunnerLogger` | type | logger 介面（debug?/warn/error） | type |
| `HookRunnerOptions` | type | runner 選項（logger/catchErrors） | type |
| `createHookRunner` | `(registry: PluginRegistry, options?: HookRunnerOptions) => HookRunner` | 建立 hook runner，含所有 24 種 hook 執行方法 | **plugin lifecycle** |
| `HookRunner` | type (ReturnType) | hook runner 物件型別 | type |
| 各 `PluginHook*` types | re-export | 從 types.ts re-export 所有 hook event/result 型別 | type |

HookRunner 提供的 hook 方法（全部為 returned object 的成員）：

| 方法 | 模式 | 說明 |
|------|------|------|
| `runBeforeModelResolve` | modifying (sequential) | 覆寫 model/provider |
| `runBeforePromptBuild` | modifying (sequential) | 注入 system prompt/context |
| `runBeforeAgentStart` | modifying (sequential) | legacy 合併 model+prompt |
| `runLlmInput` | void (parallel) | 觀察 LLM input |
| `runLlmOutput` | void (parallel) | 觀察 LLM output |
| `runAgentEnd` | void (parallel) | agent 結束通知 |
| `runBeforeCompaction` | void (parallel) | compaction 前通知 |
| `runAfterCompaction` | void (parallel) | compaction 後通知 |
| `runBeforeReset` | void (parallel) | session reset 前通知 |
| `runMessageReceived` | void (parallel) | 收到訊息通知 |
| `runMessageSending` | modifying (sequential) | 修改/取消外送訊息 |
| `runMessageSent` | void (parallel) | 訊息已送出通知 |
| `runBeforeToolCall` | modifying (sequential) | 修改/阻擋 tool call |
| `runAfterToolCall` | void (parallel) | tool call 完成通知 |
| `runToolResultPersist` | **sync** (sequential) | 修改 tool result 寫入 |
| `runBeforeMessageWrite` | **sync** (sequential) | 阻擋/修改 message 寫入 JSONL |
| `runSessionStart` | void (parallel) | session 開始通知 |
| `runSessionEnd` | void (parallel) | session 結束通知 |
| `runSubagentSpawning` | modifying (sequential) | subagent 產生前 |
| `runSubagentDeliveryTarget` | modifying (sequential) | subagent 投遞目標解析 |
| `runSubagentSpawned` | void (parallel) | subagent 已產生 |
| `runSubagentEnded` | void (parallel) | subagent 已結束 |
| `runGatewayStart` | void (parallel) | gateway 啟動通知 |
| `runGatewayStop` | void (parallel) | gateway 停止通知 |
| `hasHooks` | utility | 檢查某 hookName 是否有註冊 |
| `getHookCount` | utility | 取得某 hookName 的註冊數 |

#### `http-path.ts`（15 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `normalizePluginHttpPath` | `(path?: string \| null, fallback?: string \| null) => string \| null` | 正規化 HTTP path（確保 `/` 開頭） | internal |

#### `http-registry.ts`（93 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `PluginHttpRouteHandler` | type | HTTP route handler 型別 | type |
| `registerPluginHttpRoute` | `(params: {...}) => () => void` | 動態註冊 HTTP route（返回 unregister 函式），含路徑衝突/重疊檢查 | public API |

#### `http-route-overlap.ts`（45 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `doPluginHttpRoutesOverlap` | `(a, b) => boolean` | 判斷兩個 HTTP route 是否重疊（exact/prefix 交叉比對） | internal |
| `findOverlappingPluginHttpRoute` | `<T>(routes: readonly T[], candidate) => T \| undefined` | 在既有 route 列表中找出重疊的 route | internal |

#### `install.ts`（573 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `PLUGIN_INSTALL_ERROR_CODE` | const object | 安裝錯誤碼常數 | public API |
| `PluginInstallErrorCode` | type | 錯誤碼聯合型別 | type |
| `InstallPluginResult` | type | 安裝結果（ok/error 聯合） | type |
| `PluginNpmIntegrityDriftParams` | type | npm integrity drift 回呼參數 | type |
| `resolvePluginInstallDir` | `(pluginId: string, extensionsDir?: string) => string` | 解析插件安裝目標目錄 | public API |
| `installPluginFromArchive` | `(params: {archivePath, ...}) => Promise<InstallPluginResult>` | 從壓縮檔安裝插件 | public API |
| `installPluginFromDir` | `(params: {dirPath, ...}) => Promise<InstallPluginResult>` | 從目錄安裝插件 | public API |
| `installPluginFromFile` | `(params: {filePath, ...}) => Promise<InstallPluginResult>` | 從單一檔案安裝插件 | public API |
| `installPluginFromNpmSpec` | `(params: {spec, ...}) => Promise<InstallPluginResult>` | 從 npm spec 安裝插件（含 integrity check） | public API |
| `installPluginFromPath` | `(params: {path, ...}) => Promise<InstallPluginResult>` | 自動判斷 dir/archive/file 安裝 | public API |

#### `installs.ts`（41 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `PluginInstallUpdate` | type | 安裝更新記錄型別 | type |
| `buildNpmResolutionInstallFields` | `(resolution?: NpmSpecResolution) => Pick<...>` | 從 npm resolution 建構 install record 欄位 | internal |
| `recordPluginInstall` | `(cfg: OpenClawConfig, update: PluginInstallUpdate) => OpenClawConfig` | 將安裝記錄寫入 config（immutable） | public API |

#### `logger.ts`（18 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `createPluginLoaderLogger` | `(logger: LoggerLike) => PluginLogger` | 將通用 logger 包裝為 PluginLogger | internal |

#### `manifest.ts`（199 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `PLUGIN_MANIFEST_FILENAME` | const `"openclaw.plugin.json"` | manifest 檔名 | public API |
| `PLUGIN_MANIFEST_FILENAMES` | const array | 所有 manifest 候選檔名 | public API |
| `PluginManifest` | type | manifest 結構（id/configSchema/kind/channels/providers/skills...） | type |
| `PluginManifestLoadResult` | type | 載入結果聯合 | type |
| `resolvePluginManifestPath` | `(rootDir: string) => string` | 解析 manifest 檔案路徑 | internal |
| `loadPluginManifest` | `(rootDir: string, rejectHardlinks?: boolean) => PluginManifestLoadResult` | 讀取並解析 openclaw.plugin.json | **plugin lifecycle** |
| `PluginPackageChannel` | type | package.json 中 channel 中繼資料 | type |
| `PluginPackageInstall` | type | package.json 中安裝來源資訊 | type |
| `OpenClawPackageManifest` | type | package.json "openclaw" 欄位結構 | type |
| `DEFAULT_PLUGIN_ENTRY_CANDIDATES` | const array | 預設入口檔案候選（index.ts/js/mjs/cjs） | internal |
| `PackageExtensionResolution` | type | extension 解析結果 | type |
| `PackageManifest` | type | package.json 結構 | type |
| `getPackageManifestMetadata` | `(manifest?: PackageManifest) => OpenClawPackageManifest \| undefined` | 取得 package.json 中的 openclaw 中繼資料 | internal |
| `resolvePackageExtensionEntries` | `(manifest?: PackageManifest) => PackageExtensionResolution` | 解析 openclaw.extensions 入口列表 | internal |

#### `path-safety.ts`（33 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `isPathInside` | `(baseDir: string, targetPath: string) => boolean` | 檢查路徑是否在 base 目錄內 | internal |
| `safeRealpathSync` | `(targetPath: string, cache?: Map) => string \| null` | 安全 realpath（帶快取） | internal |
| `safeStatSync` | `(targetPath: string) => fs.Stats \| null` | 安全 stat（不拋錯） | internal |
| `formatPosixMode` | `(mode: number) => string` | 格式化 POSIX 權限 | internal |

#### `runtime.ts`（50 行）— 全域 Active Registry State

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `setActivePluginRegistry` | `(registry: PluginRegistry, cacheKey?: string) => void` | 設定全域 active registry（Symbol.for 單例） | **plugin lifecycle** |
| `getActivePluginRegistry` | `() => PluginRegistry \| null` | 取得目前 active registry | public API |
| `requireActivePluginRegistry` | `() => PluginRegistry` | 取得或自動建立 active registry | public API |
| `getActivePluginRegistryKey` | `() => string \| null` | 取得目前 registry cache key | internal |
| `getActivePluginRegistryVersion` | `() => number` | 取得 registry 版本號 | internal |

#### `registry.ts`（636 行）— 核心 Registry 工廠 + Plugin API

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `PluginToolRegistration` | type | tool 註冊記錄 | type |
| `PluginCliRegistration` | type | CLI 註冊記錄 | type |
| `PluginHttpRouteRegistration` | type | HTTP route 註冊記錄 | type |
| `PluginChannelRegistration` | type | channel 註冊記錄 | type |
| `PluginProviderRegistration` | type | provider 註冊記錄 | type |
| `PluginHookRegistration` | type | hook 註冊記錄 | type |
| `PluginServiceRegistration` | type | service 註冊記錄 | type |
| `PluginCommandRegistration` | type | command 註冊記錄 | type |
| `PluginRecord` | type | 插件狀態記錄（id/status/tools/hooks/channels...） | type |
| `PluginRegistry` | type | 完整 registry 結構（plugins/tools/hooks/channels/providers/httpRoutes...） | type |
| `PluginRegistryParams` | type | registry 建立參數 | type |
| `createEmptyPluginRegistry` | `() => PluginRegistry` | 建立空 registry | internal |
| `createPluginRegistry` | `(params: PluginRegistryParams) => {registry, createApi, ...}` | 建立 registry 並回傳所有 register* 方法 + `createApi` | **plugin lifecycle** |

`createPluginRegistry` 回傳的 register 方法：

| 內部方法 | 說明 |
|----------|------|
| `registerTool` | 註冊 agent tool（含 factory/optional） |
| `registerHook` | 註冊 internal hook（events + handler） |
| `registerTypedHook` | 註冊 typed lifecycle hook（24 種 hookName） |
| `registerGatewayMethod` | 註冊 gateway RPC method |
| `registerHttpRoute` | 註冊 HTTP route（含 overlap 檢查） |
| `registerChannel` | 註冊 channel plugin |
| `registerProvider` | 註冊 model provider |
| `registerCli` | 註冊 CLI 子命令 |
| `registerService` | 註冊 background service |
| `registerCommand` | 註冊 plugin command（bypass LLM） |
| `createApi` | 建立 `OpenClawPluginApi` 物件供插件 register() 使用 |

#### `toggle-config.ts`（48 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `setPluginEnabledInConfig` | `(config, pluginId, enabled) => OpenClawConfig` | 切換插件啟停狀態（immutable config） | internal |

#### `uninstall.ts`（238 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `UninstallActions` | type | 卸載動作旗標 | type |
| `UninstallPluginResult` | type | 卸載結果 | type |
| `resolveUninstallDirectoryTarget` | `(params) => string \| null` | 解析要刪除的安裝目錄 | internal |
| `removePluginFromConfig` | `(cfg, pluginId) => {config, actions}` | 從 config 移除插件所有引用（entries/installs/allow/load/slots） | public API |
| `UninstallPluginParams` | type | 卸載參數 | type |
| `uninstallPlugin` | `(params: UninstallPluginParams) => Promise<UninstallPluginResult>` | 完整卸載插件（config + 檔案刪除） | public API |

#### `tools.ts`（143 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `getPluginToolMeta` | `(tool: AnyAgentTool) => PluginToolMeta \| undefined` | 取得 tool 的插件 metadata | public API |
| `resolvePluginTools` | `(params: {context, existingToolNames?, toolAllowlist?, ...}) => AnyAgentTool[]` | 載入插件並解析所有 tools（含 name conflict 檢查 + optional allowlist） | **public API** |

#### `types.ts`（1006 行）

核心型別定義檔。關鍵 exports：

| Export | 說明 | 入口類型 |
|--------|------|----------|
| `PluginLogger` | 插件 logger 介面 | type |
| `PluginConfigUiHint` | config UI hint | type |
| `PluginKind` | `"memory" \| "context-engine"` | type |
| `OpenClawPluginConfigSchema` | 插件 config schema 介面（safeParse/validate/jsonSchema） | type |
| `OpenClawPluginToolContext` | tool 建立時 context | type |
| `OpenClawPluginToolFactory` | tool 工廠函式型別 | type |
| `ProviderPlugin` | model provider 完整定義 | type |
| `OpenClawPluginCommandDefinition` | 插件自訂 command 定義 | type |
| `PluginCommandContext` | command handler context | type |
| `OpenClawPluginDefinition` | 插件模組定義（id/register/activate） | type |
| `OpenClawPluginModule` | 插件模組（definition 或 function） | type |
| `OpenClawPluginApi` | 插件 API 物件（registerTool/on/registerChannel 等所有方法） | type |
| `PluginHookName` | 24 種 hook name 聯合型別 | type |
| `PLUGIN_HOOK_NAMES` | hook name 常數陣列 | public API |
| `isPluginHookName` | `(hookName: unknown) => hookName is PluginHookName` | 型別守衛 | public API |
| `PROMPT_INJECTION_HOOK_NAMES` | prompt injection 相關 hook 名稱 | public API |
| `isPromptInjectionHookName` | `(hookName: PluginHookName) => boolean` | 判斷是否為 prompt injection hook | internal |
| `stripPromptMutationFieldsFromLegacyHookResult` | `(result) => PluginHookBeforeAgentStartOverrideResult \| void` | 從 legacy hook result 移除 prompt mutation 欄位 | internal |
| `PluginHookHandlerMap` | 24 種 hook handler 簽名對映 | type |
| `PluginHookRegistration<K>` | typed hook 註冊記錄 | type |
| 所有 `PluginHook*Event` / `PluginHook*Result` types | 各 hook 的 event + result 型別 | type |

#### `update.ts`（510 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `PluginUpdateLogger` | type | 更新 logger | type |
| `PluginUpdateStatus` | type | 更新狀態 | type |
| `PluginUpdateOutcome` | type | 單一插件更新結果 | type |
| `PluginUpdateSummary` | type | 完整更新摘要 | type |
| `PluginUpdateIntegrityDriftParams` | type | integrity drift callback 參數 | type |
| `PluginChannelSyncSummary` | type | channel sync 摘要 | type |
| `PluginChannelSyncResult` | type | channel sync 結果 | type |
| `updateNpmInstalledPlugins` | `(params: {...}) => Promise<PluginUpdateSummary>` | 批量更新 npm 安裝的插件（支持 dryRun） | public API |
| `syncPluginsForUpdateChannel` | `(params: {config, channel, ...}) => Promise<PluginChannelSyncResult>` | 依 update channel (dev/release) 同步 bundled ↔ npm 來源 | public API |

#### `slots.ts`（111 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `PluginSlotKey` | type | slot key 型別 | type |
| `slotKeyForPluginKind` | `(kind?: PluginKind) => PluginSlotKey \| null` | kind → slot key 對映 | internal |
| `defaultSlotIdForKey` | `(slotKey: PluginSlotKey) => string` | slot key 的預設 plugin id | internal |
| `SlotSelectionResult` | type | slot 選擇結果 | type |
| `applyExclusiveSlotSelection` | `(params: {config, selectedId, selectedKind?, registry?}) => SlotSelectionResult` | 排他性 slot 選擇（停用同 kind 其他插件） | public API |

#### `loader.ts`（1087 行）— 插件載入器（**核心 orchestrator**）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `PluginLoadResult` | type (= PluginRegistry) | 載入結果 | type |
| `PluginLoadOptions` | type | 載入選項（config/workspaceDir/env/cache/mode） | type |
| `clearPluginLoaderCache` | `() => void` | 清除 registry 快取 | internal |
| `loadOpenClawPlugins` | `(options?: PluginLoadOptions) => PluginRegistry` | **核心載入函式**：discovery → manifest → jiti import → register → activate | **plugin lifecycle** |
| `__testing` | object | 測試用內部方法暴露 | internal (test) |

`loadOpenClawPlugins` 是整個 plugin 系統的入口。流程：
1. `applyTestPluginDefaults` — 測試環境預設停用
2. `normalizePluginsConfig` — 正規化 config
3. cache lookup — LRU cache（最多 32 entries）
4. `clearPluginCommands` — 清除已註冊 commands
5. `discoverOpenClawPlugins` — 檔案系統掃描
6. `loadPluginManifestRegistry` — manifest 載入+去重
7. Jiti loader 初始化（plugin-sdk alias 解析）
8. 逐一 import 並呼叫 `register(api)` — 設定 tools/hooks/channels...
9. `setActivePluginRegistry` + `initializeGlobalHookRunner` — 啟動

#### `discovery.ts`（738 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `PluginCandidate` | type | 發現的插件候選 | type |
| `PluginDiscoveryResult` | type | 發現結果 | type |
| `clearPluginDiscoveryCache` | `() => void` | 清除 discovery 快取 | internal |
| `CandidateBlockReason` | type | 候選被阻擋的原因 | type |
| `discoverOpenClawPlugins` | `(params: {workspaceDir?, extraPaths?, ...}) => PluginDiscoveryResult` | 從 config paths → workspace → bundled → global 掃描插件候選 | **plugin lifecycle** |

#### `config-state.ts`（294 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `NormalizedPluginsConfig` | type | 正規化後的 plugins config | type |
| `BUNDLED_ENABLED_BY_DEFAULT` | `Set<string>` | 預設啟用的 bundled 插件集合 | internal |
| `normalizePluginsConfig` | `(config?) => NormalizedPluginsConfig` | 正規化 plugins config（enabled/allow/deny/loadPaths/slots/entries） | **plugin lifecycle** |
| `applyTestPluginDefaults` | `(cfg, env?) => OpenClawConfig` | 測試環境預設停用插件 | internal |
| `isTestDefaultMemorySlotDisabled` | `(cfg, env?) => boolean` | 判斷測試是否預設停用 memory slot | internal |
| `resolveEnableState` | `(id, origin, config) => {enabled, reason?}` | 解析插件啟停狀態（deny → entry → allow → bundled default） | internal |
| `isBundledChannelEnabledByChannelConfig` | `(cfg?, pluginId) => boolean` | 判斷 bundled channel 是否由 channel config 啟用 | internal |
| `resolveEffectiveEnableState` | `(params) => {enabled, reason?}` | 綜合啟停判定（含 channel config fallback） | **plugin lifecycle** |
| `resolveMemorySlotDecision` | `(params) => {enabled, reason?, selected?}` | memory slot 排他性啟停決策 | internal |

#### `cli.ts`（65 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `registerPluginCliCommands` | `(program: Command, cfg?, env?) => void` | 將插件註冊的 CLI 子命令掛載到 Commander | public API |

#### `commands.ts`（350 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `validateCommandName` | `(name: string) => string \| null` | 驗證 command 名稱（reserved check + 格式） | internal |
| `CommandRegistrationResult` | type | 註冊結果 | type |
| `registerPluginCommand` | `(pluginId, command) => CommandRegistrationResult` | 註冊插件 command（不可覆蓋 reserved） | **plugin lifecycle** |
| `clearPluginCommands` | `() => void` | 清除所有已註冊 commands（reload 時呼叫） | internal |
| `clearPluginCommandsForPlugin` | `(pluginId: string) => void` | 清除特定插件的 commands | internal |
| `matchPluginCommand` | `(commandBody: string) => {command, args?} \| null` | 匹配 `/xxx` 是否為已註冊的 plugin command | public API |
| `executePluginCommand` | `(params: {...}) => Promise<PluginCommandResult>` | 執行 plugin command（含 auth + sanitize） | public API |
| `listPluginCommands` | `() => Array<{name, description, pluginId}>` | 列出所有已註冊 commands | public API |
| `getPluginCommandSpecs` | `(provider?: string) => Array<{name, description, acceptsArgs}>` | 取得 command specs（含 nativeNames 解析） | public API |

#### `services.ts`（76 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `PluginServicesHandle` | type | services 控制 handle | type |
| `startPluginServices` | `(params: {registry, config, workspaceDir?}) => Promise<PluginServicesHandle>` | 啟動所有已註冊的 plugin services，回傳 stop handle | **plugin lifecycle** |

#### `status.ts`（39 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `PluginStatusReport` | type | 狀態報告（= PluginRegistry + workspaceDir） | type |
| `buildPluginStatusReport` | `(params?) => PluginStatusReport` | 建立插件狀態報告（用於 `/status` 輸出） | public API |

#### `bundled-dir.ts`（43 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `resolveBundledPluginsDir` | `(env?) => string \| undefined` | 解析 bundled 插件目錄（env override → exec sibling → package root） | internal |

#### `bundled-sources.ts`（87 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `BundledPluginSource` | type | bundled 來源記錄 | type |
| `BundledPluginLookup` | type | 查詢條件（npmSpec 或 pluginId） | type |
| `findBundledPluginSourceInMap` | `(params) => BundledPluginSource \| undefined` | 在 map 中查找 bundled 來源 | internal |
| `resolveBundledPluginSources` | `(params) => Map<string, BundledPluginSource>` | 掃描所有 bundled 插件來源 | internal |
| `findBundledPluginSource` | `(params) => BundledPluginSource \| undefined` | 組合 discover + find | public API |

#### `roots.ts`（47 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `PluginSourceRoots` | type | 三種搜尋根（stock/global/workspace） | type |
| `PluginCacheInputs` | type | 快取 key 輸入 | type |
| `resolvePluginSourceRoots` | `(params: {workspaceDir?, env?}) => PluginSourceRoots` | 解析三種搜尋根目錄 | **plugin lifecycle** |
| `resolvePluginCacheInputs` | `(params) => PluginCacheInputs` | 計算快取 key 所需輸入 | internal |

#### `manifest-registry.ts`（325 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `PluginManifestRecord` | type | manifest 掃描記錄 | type |
| `PluginManifestRegistry` | type | manifest registry 結構 | type |
| `clearPluginManifestRegistryCache` | `() => void` | 清除 manifest 快取 | internal |
| `loadPluginManifestRegistry` | `(params: {config?, workspaceDir?, cache?, env?, candidates?, diagnostics?}) => PluginManifestRegistry` | 從 candidates 載入所有 manifest，處理 id 去重 + 優先級 | **plugin lifecycle** |

#### `provider-discovery.ts`（66 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `resolvePluginDiscoveryProviders` | `(params) => ProviderPlugin[]` | 取得有 discovery 的 providers | public API |
| `groupPluginDiscoveryProvidersByOrder` | `(providers) => Record<ProviderDiscoveryOrder, ProviderPlugin[]>` | 按 discovery order 分組 providers | public API |
| `normalizePluginDiscoveryResult` | `(params) => Record<string, ModelProviderConfig>` | 正規化 discovery result | internal |

#### `provider-validation.ts`（233 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `normalizeRegisteredProvider` | `(params) => ProviderPlugin \| null` | 驗證並正規化 provider 註冊（auth methods/wizard/aliases） | internal |

#### `provider-wizard.ts`（244 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `PROVIDER_PLUGIN_CHOICE_PREFIX` | const `"provider-plugin:"` | wizard choice value 前綴 | public API |
| `ProviderWizardOption` | type | wizard 選項 | type |
| `ProviderModelPickerEntry` | type | model picker 選項 | type |
| `buildProviderPluginMethodChoice` | `(providerId, methodId) => string` | 建構 choice value 字串 | public API |
| `resolveProviderWizardOptions` | `(params) => ProviderWizardOption[]` | 解析所有 provider wizard 選項 | public API |
| `resolveProviderModelPickerEntries` | `(params) => ProviderModelPickerEntry[]` | 解析所有 model picker 選項 | public API |
| `resolveProviderPluginChoice` | `(params: {providers, choice}) => {provider, method} \| null` | 從 choice string 解析 provider + auth method | public API |
| `runProviderModelSelectedHook` | `(params) => Promise<void>` | 執行 provider 的 onModelSelected callback | public API |

#### `providers.ts`（26 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `resolvePluginProviders` | `(params) => ProviderPlugin[]` | 載入插件並回傳所有已註冊 providers | public API |

#### `schema-validator.ts`（151 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `JsonSchemaValidationError` | type | 驗證錯誤（path/message/allowedValues） | type |
| `validateJsonSchemaValue` | `(params: {schema, cacheKey, value}) => {ok} \| {ok: false, errors}` | 用 Ajv 驗證 JSON Schema（含 compiled validator 快取） | internal |

#### `source-display.ts`（54 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `resolvePluginSourceRoots` | re-export | 從 roots.ts re-export | re-export |
| `PluginSourceRoots` | re-export | 從 roots.ts re-export | re-export |
| `formatPluginSourceForTable` | `(plugin, roots) => {value, rootKey?}` | 格式化插件來源路徑為表格顯示用短字串 | public API |

#### `hook-runner-global.ts`（105 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `initializeGlobalHookRunner` | `(registry: PluginRegistry) => void` | 初始化全域 singleton hook runner | **plugin lifecycle** |
| `getGlobalHookRunner` | `() => HookRunner \| null` | 取得全域 hook runner | public API |
| `getGlobalPluginRegistry` | `() => PluginRegistry \| null` | 取得全域 plugin registry | public API |
| `hasGlobalHooks` | `(hookName) => boolean` | 檢查全域是否有某 hook 註冊 | public API |
| `runGlobalGatewayStopSafely` | `(params) => Promise<void>` | 安全執行 gateway_stop hook（不拋錯） | public API |
| `resetGlobalHookRunner` | `() => void` | 重設全域 hook runner（測試用） | internal (test) |

---

### `runtime/` 子目錄

#### `runtime/index.ts`（90 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `CreatePluginRuntimeOptions` | type | runtime 建立選項 | type |
| `createPluginRuntime` | `(options?) => PluginRuntime` | 建立 PluginRuntime 物件（config/subagent/system/media/tts/stt/tools/channel/events/logging/state/modelAuth） | **plugin lifecycle** |
| `PluginRuntime` | re-export type | 從 types.ts re-export | type |

#### `runtime/types.ts`（64 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `RuntimeLogger` | re-export type | logger 型別 | type |
| `SubagentRunParams` / `SubagentRunResult` | type | subagent.run 參數/結果 | type |
| `SubagentWaitParams` / `SubagentWaitResult` | type | subagent.waitForRun 參數/結果 | type |
| `SubagentGetSessionMessagesParams` / `Result` | type | subagent.getSessionMessages 參數/結果 | type |
| `SubagentDeleteSessionParams` | type | subagent.deleteSession 參數 | type |
| `PluginRuntime` | type | 完整 runtime 型別（core + subagent + channel） | type |

#### `runtime/types-core.ts`（68 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `RuntimeLogger` | type | runtime logger 介面 | type |
| `PluginRuntimeCore` | type | core runtime 型別（version/config/system/media/tts/stt/tools/events/logging/state/modelAuth） | type |

#### `runtime/types-channel.ts`（166 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `PluginRuntimeChannel` | type | channel runtime 型別，包含各 channel 的 API 參照：text/reply/routing/pairing/media/activity/session/mentions/reactions/groups/debounce/commands + discord/slack/telegram/signal/imessage/whatsapp/line | type |

#### `runtime/runtime-config.ts`（10 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `createRuntimeConfig` | `() => PluginRuntime["config"]` | 建立 config runtime（loadConfig + writeConfigFile） | internal |

#### `runtime/runtime-events.ts`（11 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `createRuntimeEvents` | `() => PluginRuntime["events"]` | 建立 events runtime（onAgentEvent + onSessionTranscriptUpdate） | internal |

#### `runtime/runtime-logging.ts`（22 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `createRuntimeLogging` | `() => PluginRuntime["logging"]` | 建立 logging runtime（shouldLogVerbose + getChildLogger） | internal |

#### `runtime/runtime-system.ts`（15 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `createRuntimeSystem` | `() => PluginRuntime["system"]` | 建立 system runtime（enqueueSystemEvent/requestHeartbeatNow/runCommandWithTimeout/formatNativeDependencyHint） | internal |

#### `runtime/runtime-tools.ts`（12 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `createRuntimeTools` | `() => PluginRuntime["tools"]` | 建立 tools runtime（memory get/search tools + CLI） | internal |

#### `runtime/native-deps.ts`（29 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `NativeDependencyHintParams` | type | 提示參數 | type |
| `formatNativeDependencyHint` | `(params: NativeDependencyHintParams) => string` | 產生 native dependency 安裝提示訊息 | public API |

#### `runtime/runtime-channel.ts`（265 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `createRuntimeChannel` | `() => PluginRuntime["channel"]` | 建立 channel runtime，聚合所有 channel 相關 API（text/reply/routing/pairing/media/activity/session/mentions/reactions/groups/debounce/commands + 各 channel provider） | internal |

#### `runtime/runtime-media.ts`（18 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `createRuntimeMedia` | `() => PluginRuntime["media"]` | 建立 media runtime（loadWebMedia/detectMime/mediaKindFromMime/isVoiceCompatibleAudio/getImageMetadata/resizeToJpeg） | internal |

#### `runtime/runtime-whatsapp.ts`（112 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `createRuntimeWhatsApp` | `() => PluginRuntime["channel"]["whatsapp"]` | 建立 WhatsApp runtime（lazy-load 重量級模組：send/login/loginQr/monitorWeb/actions） | internal |

#### `runtime/runtime-whatsapp-login.runtime.ts`（2 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `loginWeb` | re-export | WhatsApp Web 登入函式 | internal |

#### `runtime/runtime-whatsapp-outbound.runtime.ts`（2 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `sendMessageWhatsApp` | re-export | WhatsApp 發送訊息 | internal |
| `sendPollWhatsApp` | re-export | WhatsApp 發送投票 | internal |

#### `runtime/gateway-request-scope.ts`（48 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `PluginRuntimeGatewayRequestScope` | type | request scope 結構 | type |
| `withPluginRuntimeGatewayRequestScope` | `<T>(scope, run: () => T) => T` | 在 AsyncLocalStorage 中執行 gateway request handler | public API |
| `getPluginRuntimeGatewayRequestScope` | `() => scope \| undefined` | 讀取目前 request scope | public API |

---

### `test-helpers/` 子目錄

#### `test-helpers/fs-fixtures.ts`（33 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `mkdirSafeDir` | `(dir: string) => void` | 建立目錄 + chmod 755 | internal (test) |
| `makeTrackedTempDir` | `(prefix, trackedDirs) => string` | 建立追蹤用暫存目錄 | internal (test) |
| `cleanupTrackedTempDirs` | `(trackedDirs) => void` | 清理所有追蹤暫存目錄 | internal (test) |

---

## 呼叫關聯圖

```
使用者操作 / Gateway 啟動
    │
    ▼
loadOpenClawPlugins()              ← loader.ts（核心 orchestrator）
    ├── applyTestPluginDefaults()  ← config-state.ts
    ├── normalizePluginsConfig()   ← config-state.ts
    ├── discoverOpenClawPlugins()  ← discovery.ts
    │   ├── resolvePluginSourceRoots()   ← roots.ts
    │   │   └── resolveBundledPluginsDir() ← bundled-dir.ts
    │   └── discoverInDirectory/discoverFromPath (internal)
    │       ├── resolvePackageExtensionEntries() ← manifest.ts
    │       └── isPathInside/safeRealpathSync    ← path-safety.ts
    ├── loadPluginManifestRegistry() ← manifest-registry.ts
    │   └── loadPluginManifest()   ← manifest.ts
    ├── createPluginRegistry()     ← registry.ts
    │   └── createApi()            → 產出 OpenClawPluginApi
    │       ├── registerTool / registerChannel / registerProvider
    │       ├── registerHook / registerTypedHook (on)
    │       ├── registerHttpRoute / registerGatewayMethod
    │       ├── registerCli / registerService / registerCommand
    │       └── registerContextEngine
    ├── resolveEffectiveEnableState() ← config-state.ts
    ├── resolveMemorySlotDecision()   ← config-state.ts
    ├── validateJsonSchemaValue()     ← schema-validator.ts
    ├── Jiti import → plugin.register(api)
    ├── setActivePluginRegistry()  ← runtime.ts
    └── initializeGlobalHookRunner() ← hook-runner-global.ts
            └── createHookRunner() ← hooks.ts

plugin 內部呼叫 api.on(hookName, handler)
    └── registerTypedHook() ← registry.ts
        └── registry.typedHooks.push(...)

Agent 執行時
    └── getGlobalHookRunner() ← hook-runner-global.ts
        └── hookRunner.runBeforeAgentStart / runBeforeToolCall / ...
            └── getHooksForName → sorted by priority → sequential/parallel exec

Tool 解析
    └── resolvePluginTools() ← tools.ts
        └── loadOpenClawPlugins() → registry.tools → factory(ctx)

CLI 註冊
    └── registerPluginCliCommands() ← cli.ts
        └── loadOpenClawPlugins() → registry.cliRegistrars → entry.register(ctx)

Service 啟動
    └── startPluginServices() ← services.ts
        └── registry.services → service.start(ctx)

Plugin Commands
    └── matchPluginCommand() ← commands.ts
        └── executePluginCommand() — auth + sanitize + handler(ctx)

安裝/卸載
    └── installPluginFromNpmSpec / installPluginFromPath ← install.ts
        └── recordPluginInstall() ← installs.ts
    └── uninstallPlugin() ← uninstall.ts
        └── removePluginFromConfig()

更新
    └── updateNpmInstalledPlugins() ← update.ts
    └── syncPluginsForUpdateChannel() ← update.ts
        └── resolveBundledPluginSources() ← bundled-sources.ts

HTTP Route 動態註冊
    └── registerPluginHttpRoute() ← http-registry.ts
        ├── normalizePluginHttpPath() ← http-path.ts
        └── findOverlappingPluginHttpRoute() ← http-route-overlap.ts

Provider 系統
    └── resolvePluginProviders() ← providers.ts
        └── loadOpenClawPlugins() → registry.providers
    └── resolveProviderWizardOptions() ← provider-wizard.ts
    └── resolvePluginDiscoveryProviders() ← provider-discovery.ts

Runtime 建立
    └── createPluginRuntime() ← runtime/index.ts
        ├── createRuntimeConfig()   ← runtime/runtime-config.ts
        ├── createRuntimeSystem()   ← runtime/runtime-system.ts
        ├── createRuntimeMedia()    ← runtime/runtime-media.ts
        ├── createRuntimeTools()    ← runtime/runtime-tools.ts
        ├── createRuntimeChannel()  ← runtime/runtime-channel.ts
        │   └── createRuntimeWhatsApp() ← runtime/runtime-whatsapp.ts (lazy)
        ├── createRuntimeEvents()   ← runtime/runtime-events.ts
        └── createRuntimeLogging()  ← runtime/runtime-logging.ts
```

## 系統歸屬分類

### Plugin Lifecycle（生命週期核心鏈路）

| 檔案 | 角色 |
|------|------|
| `loader.ts` | 主 orchestrator — discovery → load → register → activate |
| `discovery.ts` | 檔案系統插件掃描（workspace/bundled/global/config paths） |
| `manifest.ts` | openclaw.plugin.json 解析 |
| `manifest-registry.ts` | manifest 去重 + registry 建構 |
| `config-state.ts` | 插件啟停決策邏輯 |
| `registry.ts` | PluginRegistry 結構 + `createApi`（插件與系統的唯一介面） |
| `runtime.ts` | 全域 active registry 狀態管理 |
| `hooks.ts` | Hook runner — 24 種 lifecycle hook 執行 |
| `hook-runner-global.ts` | 全域 singleton hook runner |

### Plugin SDK / API Surface

| 檔案 | 角色 |
|------|------|
| `types.ts` | 所有公開型別定義（`OpenClawPluginApi`/`OpenClawPluginDefinition`/hooks/events） |
| `runtime/types.ts` + `types-core.ts` + `types-channel.ts` | PluginRuntime 型別 |
| `runtime/index.ts` | PluginRuntime 工廠 |
| `runtime/runtime-*.ts` | 各子系統 runtime 聚合 |

### Install / Update / Uninstall

| 檔案 | 角色 |
|------|------|
| `install.ts` | 安裝（npm/dir/file/archive） |
| `installs.ts` | install record config 操作 |
| `uninstall.ts` | 卸載（config + file removal） |
| `update.ts` | npm 更新 + channel sync |
| `bundled-sources.ts` | bundled 來源查找 |
| `bundled-dir.ts` | bundled 目錄解析 |

### Config / State

| 檔案 | 角色 |
|------|------|
| `config-schema.ts` | 空 schema 工廠 |
| `toggle-config.ts` | 啟停 toggle |
| `enable.ts` | 啟用操作 |
| `slots.ts` | 排他性 slot（memory/context-engine） |
| `schema-validator.ts` | JSON Schema 驗證 |

### HTTP / Command / CLI / Service

| 檔案 | 角色 |
|------|------|
| `http-registry.ts` | 動態 HTTP route 註冊 |
| `http-path.ts` + `http-route-overlap.ts` | HTTP route 工具 |
| `commands.ts` | Plugin command registry + execution |
| `cli.ts` | CLI 子命令掛載 |
| `services.ts` | Plugin service 啟停 |

### Provider 系統

| 檔案 | 角色 |
|------|------|
| `providers.ts` | provider 查詢入口 |
| `provider-discovery.ts` | provider auto-discovery |
| `provider-validation.ts` | provider 資料正規化 |
| `provider-wizard.ts` | onboarding wizard 邏輯 |

### Tool 系統

| 檔案 | 角色 |
|------|------|
| `tools.ts` | 插件 tool 解析 + 注入到 agent |

### 顯示 / 狀態

| 檔案 | 角色 |
|------|------|
| `status.ts` | 狀態報告 |
| `source-display.ts` | 來源路徑格式化 |
| `logger.ts` | logger adapter |

### Gateway Request Scope

| 檔案 | 角色 |
|------|------|
| `runtime/gateway-request-scope.ts` | AsyncLocalStorage 管理 gateway request context |

### 安全 / 路徑

| 檔案 | 角色 |
|------|------|
| `path-safety.ts` | 路徑安全工具 |
| `roots.ts` | 搜尋根路徑解析 |
