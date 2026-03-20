# Core: ACP — 函式級索引

> Phase 2 deep read (2026-03-20). 涵蓋 src/acp/ 全部 36 個非 test 檔案。

## 總覽

ACP (Agent Client Protocol) 子系統是 OpenClaw 的 **IDE/外部 Agent 整合橋樑**。它實作了 `@agentclientprotocol/sdk` 協議的 client 端與 server 端，讓外部 IDE (如 VS Code 擴充) 能透過 stdio/ndjson 管道與 OpenClaw Gateway 互動。整個子系統分為四大區塊：(1) **server/translator** — 接收 ACP 協議請求並轉譯為 Gateway WebSocket 呼叫；(2) **client** — 反向生成子行程啟動 ACP server 並建立連線；(3) **control-plane** — 管理 ACP runtime session 的生命週期（建立、evict、cancel、close、identity reconcile）；(4) **runtime** — 定義 backend adapter 介面（`AcpRuntime`）及其註冊機制，允許 plugin 提供具體 runtime 實作（如 acpx）。

ACP 同時支援 **persistent-bindings** 機制，可將 Discord/Telegram channel 對話綁定到特定的 ACP session，實現跨平台代理人對話路由。Policy 模組提供基於 config 的啟用/禁用/白名單控制。

## 檔案清單

| 檔案 | 行數 | 子系統角色 |
|------|------|-----------|
| `types.ts` | 51 | 核心型別：AcpSession, AcpServerOptions, ACP_AGENT_INFO |
| `commands.ts` | 40 | 可用 slash command 清單（/help, /status, /model 等） |
| `meta.ts` | 47 | metadata record 讀取工具函式 |
| `policy.ts` | 70 | ACP 啟用/禁用/允許 agent 政策判定 |
| `client.ts` | 623 | ACP client 端：spawn server 子行程、permission 解析、互動 REPL |
| `server.ts` | 261 | ACP server 端：建立 Gateway WebSocket + stdio 管道 |
| `session.ts` | 190 | ACP session 記憶體 store（CRUD + eviction） |
| `session-mapper.ts` | 98 | session key/label 解析與 reset 邏輯 |
| `event-mapper.ts` | 410 | Gateway 事件 → ACP ContentBlock 轉譯（文字、附件、工具呼叫） |
| `secret-file.ts` | 10 | 安全讀取密鑰檔案 |
| `translator.ts` | 1100 | AcpGatewayAgent 主類別：ACP Agent 協議實作 |
| `translator.test-helpers.ts` | 23 | test 用 mock connection/gateway 建構 |
| `conversation-id.ts` | 80 | Telegram topic conversation ID 解析 |
| `persistent-bindings.ts` | 19 | re-export barrel（types + lifecycle + resolve） |
| `persistent-bindings.types.ts` | 105 | binding spec 型別 + session key 建構 |
| `persistent-bindings.lifecycle.ts` | 198 | binding session ensure/reset |
| `persistent-bindings.resolve.ts` | 338 | config → binding record 解析 |
| `persistent-bindings.route.ts` | 81 | binding → route 整合 |
| `runtime/types.ts` | 138 | AcpRuntime interface + event/handle/capability 型別 |
| `runtime/errors.ts` | 61 | AcpRuntimeError class + error code enum |
| `runtime/error-text.ts` | 45 | 使用者友善錯誤訊息格式化 |
| `runtime/registry.ts` | 118 | runtime backend 全域註冊表 |
| `runtime/session-identifiers.ts` | 141 | session ID 顯示/resume hint 渲染 |
| `runtime/session-identity.ts` | 210 | session identity 合併/比較/建立邏輯 |
| `runtime/session-meta.ts` | 170 | session store 讀寫（JSON file 持久化） |
| `runtime/adapter-contract.testkit.ts` | 117 | runtime adapter 合約測試套件 |
| `control-plane/manager.ts` | 29 | singleton export + re-export barrel |
| `control-plane/manager.types.ts` | 148 | manager 所有 input/output/status 型別 |
| `control-plane/manager.core.ts` | 1290 | AcpSessionManager 主類別（init/run/cancel/close/evict） |
| `control-plane/manager.utils.ts` | 122 | session key 正規化、error 輔助、TTL 解析 |
| `control-plane/manager.identity-reconcile.ts` | 159 | runtime status → identity 同步 |
| `control-plane/manager.runtime-controls.ts` | 118 | runtime capability 偵測 + control 套用 |
| `control-plane/runtime-cache.ts` | 99 | runtime handle LRU 快取（idle eviction） |
| `control-plane/runtime-options.ts` | 349 | runtime option 驗證/合併/序列化 |
| `control-plane/session-actor-queue.ts` | 38 | per-session 串列化佇列（避免 race） |
| `control-plane/spawn.ts` | 77 | spawn 失敗後清理（runtime close + unbind + session delete） |

## 函式索引

### types.ts

| Export | 簽名 | 說明 |
|--------|------|------|
| `ACP_PROVENANCE_MODE_VALUES` | `const ["off", "meta", "meta+receipt"]` | 來源追蹤模式常量 |
| `AcpProvenanceMode` | type | 來源追蹤模式 union |
| `normalizeAcpProvenanceMode` | `(value: string \| undefined) => AcpProvenanceMode \| undefined` | 正規化 provenance 字串 |
| `AcpSession` | type | ACP session 記憶體記錄 |
| `AcpServerOptions` | type | ACP server 啟動參數 |
| `ACP_AGENT_INFO` | const `{ name, title, version }` | ACP agent 基本資訊 |

### commands.ts

| Export | 簽名 | 說明 |
|--------|------|------|
| `getAvailableCommands` | `() => AvailableCommand[]` | 回傳所有可用 ACP slash commands |

### meta.ts

| Export | 簽名 | 說明 |
|--------|------|------|
| `readString` | `(meta: Record<string, unknown> \| null \| undefined, keys: string[]) => string \| undefined` | 從 meta 物件讀首個符合的 string |
| `readBool` | `(meta: Record<string, unknown> \| null \| undefined, keys: string[]) => boolean \| undefined` | 從 meta 物件讀首個符合的 boolean |
| `readNumber` | `(meta: Record<string, unknown> \| null \| undefined, keys: string[]) => number \| undefined` | 從 meta 物件讀首個符合的 number |

### policy.ts

| Export | 簽名 | 說明 |
|--------|------|------|
| `AcpDispatchPolicyState` | type `"enabled" \| "acp_disabled" \| "dispatch_disabled"` | dispatch 政策狀態 |
| `isAcpEnabledByPolicy` | `(cfg: OpenClawConfig) => boolean` | ACP 是否啟用 |
| `resolveAcpDispatchPolicyState` | `(cfg: OpenClawConfig) => AcpDispatchPolicyState` | 解析 dispatch 政策狀態 |
| `isAcpDispatchEnabledByPolicy` | `(cfg: OpenClawConfig) => boolean` | dispatch 是否啟用 |
| `resolveAcpDispatchPolicyMessage` | `(cfg: OpenClawConfig) => string \| null` | 禁用時的使用者訊息 |
| `resolveAcpDispatchPolicyError` | `(cfg: OpenClawConfig) => AcpRuntimeError \| null` | 禁用時的錯誤物件 |
| `isAcpAgentAllowedByPolicy` | `(cfg: OpenClawConfig, agentId: string) => boolean` | agent 是否在白名單 |
| `resolveAcpAgentPolicyError` | `(cfg: OpenClawConfig, agentId: string) => AcpRuntimeError \| null` | agent 不在白名單時的錯誤 |

### client.ts

| Export | 簽名 | 說明 |
|--------|------|------|
| `AcpClientOptions` | type | client 啟動選項 |
| `AcpClientHandle` | type `{ client, agent, sessionId }` | 活躍 client 連線控制代碼 |
| `resolvePermissionRequest` | `(params: RequestPermissionRequest, deps?) => Promise<RequestPermissionResponse>` | **ACP hook handler**: 解析工具呼叫權限（自動批准安全工具/TTY 提示） |
| `resolveAcpClientSpawnEnv` | `(baseEnv?, options?) => NodeJS.ProcessEnv` | 建構 spawn 環境變數（移除敏感 key） |
| `shouldStripProviderAuthEnvVarsForAcpServer` | `(params?) => boolean` | 判斷是否應移除 provider auth 環境變數 |
| `buildAcpClientStripKeys` | `(params: { stripProviderAuthEnvVars?, activeSkillEnvKeys? }) => Set<string>` | 蒐集需移除的環境變數 key set |
| `resolveAcpClientSpawnInvocation` | `(params, runtime?) => { command, args, shell?, windowsHide? }` | 解析跨平台 spawn 指令 |
| `createAcpClient` | `(opts?: AcpClientOptions) => Promise<AcpClientHandle>` | **公開 API**: 建立 ACP client（spawn server + initialize + newSession） |
| `runAcpClientInteractive` | `(opts?: AcpClientOptions) => Promise<void>` | **公開 API**: 互動式 REPL client |

### server.ts

| Export | 簽名 | 說明 |
|--------|------|------|
| `serveAcpGateway` | `(opts?: AcpServerOptions) => Promise<void>` | **公開 API / CLI entry**: 啟動 ACP server（Gateway WS + stdio ACP 管道） |

### session.ts

| Export | 簽名 | 說明 |
|--------|------|------|
| `AcpSessionStore` | type | session store interface (CRUD + run tracking) |
| `createInMemorySessionStore` | `(options?: AcpSessionStoreOptions) => AcpSessionStore` | 建立記憶體 session store（帶 TTL eviction） |
| `defaultAcpSessionStore` | const `AcpSessionStore` | 預設全域 session store singleton |

### session-mapper.ts

| Export | 簽名 | 說明 |
|--------|------|------|
| `AcpSessionMeta` | type | 從 ACP request _meta 解析出的 session 參數 |
| `parseSessionMeta` | `(meta: unknown) => AcpSessionMeta` | 解析 request metadata 為 session 參數 |
| `resolveSessionKey` | `(params: { meta, fallbackKey, gateway, opts }) => Promise<string>` | 依 label/key/default 解析 Gateway session key |
| `resetSessionIfNeeded` | `(params: { meta, sessionKey, gateway, opts }) => Promise<void>` | 依設定 reset Gateway session |

### event-mapper.ts

| Export | 簽名 | 說明 |
|--------|------|------|
| `GatewayAttachment` | type | 附件結構（image base64） |
| `extractTextFromPrompt` | `(prompt: ContentBlock[], maxBytes?) => string` | 從 ACP prompt blocks 萃取純文字（帶大小限制，防 DoS） |
| `extractAttachmentsFromPrompt` | `(prompt: ContentBlock[]) => GatewayAttachment[]` | 從 prompt 萃取圖片附件 |
| `formatToolTitle` | `(name?: string, args?: Record<string, unknown>) => string` | 格式化工具呼叫標題 |
| `inferToolKind` | `(name?: string) => ToolKind` | 依工具名推斷 kind (read/edit/delete/search/execute/fetch/other) |
| `extractToolCallContent` | `(value: unknown) => ToolCallContent[] \| undefined` | 從工具結果萃取文字 content blocks |
| `extractToolCallLocations` | `(...values: unknown[]) => ToolCallLocation[] \| undefined` | 從工具 input/output 萃取檔案路徑 locations |

### secret-file.ts

| Export | 簽名 | 說明 |
|--------|------|------|
| `MAX_SECRET_FILE_BYTES` | const number | 密鑰檔案大小上限 |
| `readSecretFromFile` | `(filePath: string, label: string) => string` | 安全讀取密鑰檔案（拒絕 symlink） |

### translator.ts

| Export | 簽名 | 說明 |
|--------|------|------|
| `AcpGatewayAgent` | class implements `Agent` | **ACP Agent 協議核心**: 處理 initialize/newSession/loadSession/prompt/cancel/setSessionMode/setSessionConfigOption |

#### AcpGatewayAgent 方法

| 方法 | 簽名 | 說明 | 角色 |
|------|------|------|------|
| `constructor` | `(connection, gateway, opts?)` | 建構 ACP agent | — |
| `start` | `() => void` | 標記就緒 | lifecycle |
| `handleGatewayReconnect` | `() => void` | Gateway 重連回呼 | hook |
| `handleGatewayDisconnect` | `(reason: string) => void` | Gateway 斷線 → 拒絕所有 pending prompts | hook |
| `handleGatewayEvent` | `(evt: EventFrame) => Promise<void>` | **hook handler**: 分派 gateway chat/agent 事件 | hook |
| `initialize` | `(params: InitializeRequest) => Promise<InitializeResponse>` | **ACP RPC**: 回報 agent capabilities | RPC |
| `newSession` | `(params: NewSessionRequest) => Promise<NewSessionResponse>` | **ACP RPC**: 建立新 session | RPC |
| `loadSession` | `(params: LoadSessionRequest) => Promise<LoadSessionResponse>` | **ACP RPC**: 載入既有 session + replay transcript | RPC |
| `unstable_listSessions` | `(params: ListSessionsRequest) => Promise<ListSessionsResponse>` | **ACP RPC**: 列出 Gateway sessions | RPC |
| `authenticate` | `(params: AuthenticateRequest) => Promise<AuthenticateResponse>` | **ACP RPC**: 認證（目前空實作） | RPC |
| `setSessionMode` | `(params: SetSessionModeRequest) => Promise<SetSessionModeResponse>` | **ACP RPC**: 設定 thinking level | RPC |
| `setSessionConfigOption` | `(params: SetSessionConfigOptionRequest) => Promise<SetSessionConfigOptionResponse>` | **ACP RPC**: 設定 session config (fast mode, verbose 等) | RPC |
| `prompt` | `(params: PromptRequest) => Promise<PromptResponse>` | **ACP RPC**: 送出 prompt 至 Gateway、串流回應 | RPC |
| `cancel` | `(params: CancelNotification) => Promise<void>` | **ACP RPC**: 取消執行中 prompt | RPC |

### translator.test-helpers.ts

| Export | 簽名 | 說明 |
|--------|------|------|
| `TestAcpConnection` | type | 測試用 connection mock |
| `createAcpConnection` | `() => TestAcpConnection` | 建立 mock ACP connection |
| `createAcpGateway` | `(request?) => GatewayClient` | 建立 mock Gateway client |

### conversation-id.ts

| Export | 簽名 | 說明 |
|--------|------|------|
| `ParsedTelegramTopicConversation` | type | Telegram topic 解析結果 |
| `normalizeConversationText` | `(value: unknown) => string` | 將任意值正規化為 conversation ID 字串 |
| `parseTelegramChatIdFromTarget` | `(raw: unknown) => string \| undefined` | 從 `telegram:chatId` 格式解析 chatId |
| `buildTelegramTopicConversationId` | `(params: { chatId, topicId }) => string \| null` | 建構 `chatId:topic:topicId` 格式 |
| `parseTelegramTopicConversation` | `(params: { conversationId, parentConversationId? }) => ParsedTelegramTopicConversation \| null` | 解析 Telegram topic conversation |

### persistent-bindings.ts (barrel)

Re-export from `persistent-bindings.types.ts`, `persistent-bindings.lifecycle.ts`, `persistent-bindings.resolve.ts`.

### persistent-bindings.types.ts

| Export | 簽名 | 說明 |
|--------|------|------|
| `ConfiguredAcpBindingChannel` | type `"discord" \| "telegram"` | binding channel 型別 |
| `ConfiguredAcpBindingSpec` | type | binding 規格 (channel, accountId, conversationId, agentId, mode...) |
| `ResolvedConfiguredAcpBinding` | type `{ spec, record }` | 已解析的 binding + 其 store record |
| `AcpBindingConfigShape` | type | binding config 原始結構 |
| `normalizeText` | `(value: unknown) => string \| undefined` | 正規化字串（trim + falsy → undefined） |
| `normalizeMode` | `(value: unknown) => AcpRuntimeSessionMode` | 正規化 mode 為 "persistent" 或 "oneshot" |
| `normalizeBindingConfig` | `(raw: unknown) => AcpBindingConfigShape` | 正規化 binding config |
| `buildConfiguredAcpSessionKey` | `(spec: ConfiguredAcpBindingSpec) => string` | 從 binding spec 建構 session key（含 sha256 hash） |
| `toConfiguredAcpBindingRecord` | `(spec: ConfiguredAcpBindingSpec) => SessionBindingRecord` | spec → SessionBindingRecord 轉換 |

### persistent-bindings.lifecycle.ts

| Export | 簽名 | 說明 |
|--------|------|------|
| `ensureConfiguredAcpBindingSession` | `(params: { cfg, spec }) => Promise<{ ok, sessionKey, error? }>` | **公開 API**: 確保 binding 對應的 ACP session 存在且 config 一致 |
| `resetAcpSessionInPlace` | `(params: { cfg, sessionKey, reason }) => Promise<{ ok, skipped?, error? }>` | **公開 API**: 就地 reset ACP session（close → reinitialize） |

### persistent-bindings.resolve.ts

| Export | 簽名 | 說明 |
|--------|------|------|
| `resolveConfiguredAcpBindingSpecBySessionKey` | `(params: { cfg, sessionKey }) => ConfiguredAcpBindingSpec \| null` | 從 session key 反查 binding spec |
| `resolveConfiguredAcpBindingRecord` | `(params: { cfg, channel, accountId, conversationId, parentConversationId? }) => ResolvedConfiguredAcpBinding \| null` | 從 channel/conversation 解析 binding record（支援 Discord 繼承 + Telegram topic） |

### persistent-bindings.route.ts

| Export | 簽名 | 說明 |
|--------|------|------|
| `resolveConfiguredAcpRoute` | `(params: { cfg, route, channel, accountId, conversationId, parentConversationId? }) => { configuredBinding, route, boundSessionKey?, boundAgentId? }` | **公開 API**: 將 message route 覆寫為 ACP binding 路由 |
| `ensureConfiguredAcpRouteReady` | `(params: { cfg, configuredBinding }) => Promise<{ ok } \| { ok: false, error }>` | 確保 binding route 的 ACP session 已就緒 |

### runtime/types.ts

| Export | 簽名 | 說明 |
|--------|------|------|
| `AcpRuntimePromptMode` | type `"prompt" \| "steer"` | turn 模式 |
| `AcpRuntimeSessionMode` | type `"persistent" \| "oneshot"` | session 模式 |
| `AcpSessionUpdateTag` | type | session update 事件標籤 |
| `AcpRuntimeControl` | type | runtime 控制指令 |
| `AcpRuntimeHandle` | type | 活躍 runtime session 控制代碼 |
| `AcpRuntimeEnsureInput` | type | ensureSession 輸入 |
| `AcpRuntimeTurnAttachment` | type | turn 附件 |
| `AcpRuntimeTurnInput` | type | runTurn 輸入 |
| `AcpRuntimeCapabilities` | type | runtime 能力清單 |
| `AcpRuntimeStatus` | type | runtime 狀態快照 |
| `AcpRuntimeDoctorReport` | type | 健康檢查報告 |
| `AcpRuntimeEvent` | type (union) | runtime 事件（text_delta/status/tool_call/done/error） |
| `AcpRuntime` | interface | **核心 runtime adapter 介面**: ensureSession, runTurn, cancel, close, getStatus?, setMode?, setConfigOption?, getCapabilities?, doctor? |

### runtime/errors.ts

| Export | 簽名 | 說明 |
|--------|------|------|
| `ACP_ERROR_CODES` | const array | 所有 ACP error code |
| `AcpRuntimeErrorCode` | type | error code union |
| `AcpRuntimeError` | class extends Error | ACP 專用 error (帶 code + cause) |
| `isAcpRuntimeError` | `(value: unknown) => value is AcpRuntimeError` | type guard |
| `toAcpRuntimeError` | `(params: { error, fallbackCode, fallbackMessage }) => AcpRuntimeError` | 將任意 error 轉為 AcpRuntimeError |
| `withAcpRuntimeErrorBoundary` | `<T>(params: { run, fallbackCode, fallbackMessage }) => Promise<T>` | async error boundary wrapper |

### runtime/error-text.ts

| Export | 簽名 | 說明 |
|--------|------|------|
| `formatAcpRuntimeErrorText` | `(error: AcpRuntimeError) => string` | 格式化使用者友善錯誤訊息（含 next step 建議） |
| `toAcpRuntimeErrorText` | `(params: { error, fallbackCode, fallbackMessage }) => string` | 任意 error → 使用者友善文字 |

### runtime/registry.ts

| Export | 簽名 | 說明 |
|--------|------|------|
| `AcpRuntimeBackend` | type `{ id, runtime, healthy? }` | 已註冊的 backend entry |
| `registerAcpRuntimeBackend` | `(backend: AcpRuntimeBackend) => void` | **Plugin API**: 註冊 runtime backend |
| `unregisterAcpRuntimeBackend` | `(id: string) => void` | **Plugin API**: 取消註冊 backend |
| `getAcpRuntimeBackend` | `(id?: string) => AcpRuntimeBackend \| null` | 取得 backend（指定 ID 或首個健康 backend） |
| `requireAcpRuntimeBackend` | `(id?: string) => AcpRuntimeBackend` | 取得 backend 或丟出 ACP_BACKEND_MISSING |

### runtime/session-identifiers.ts

| Export | 簽名 | 說明 |
|--------|------|------|
| `ACP_SESSION_IDENTITY_RENDERER_VERSION` | const `"v1"` | 渲染版本號 |
| `AcpSessionIdentifierRenderMode` | type `"status" \| "thread"` | 渲染模式 |
| `resolveAcpSessionIdentifierLines` | `(params: { sessionKey, meta? }) => string[]` | 產生 session ID 顯示行（for /acp status） |
| `resolveAcpSessionIdentifierLinesFromIdentity` | `(params: { backend, identity?, mode? }) => string[]` | 從 identity 產生 ID 顯示行 |
| `resolveAcpSessionCwd` | `(meta?: SessionAcpMeta) => string \| undefined` | 解析 session cwd |
| `resolveAcpThreadSessionDetailLines` | `(params: { sessionKey, meta? }) => string[]` | 產生 thread 詳細資訊行（含 resume hint） |

### runtime/session-identity.ts

| Export | 簽名 | 說明 |
|--------|------|------|
| `resolveSessionIdentityFromMeta` | `(meta?: SessionAcpMeta) => SessionAcpIdentity \| undefined` | 從 meta 萃取 identity |
| `identityHasStableSessionId` | `(identity?: SessionAcpIdentity) => boolean` | identity 是否有穩定 ID |
| `isSessionIdentityPending` | `(identity?: SessionAcpIdentity) => boolean` | identity 是否為 pending |
| `identityEquals` | `(left?, right?) => boolean` | 兩個 identity 是否相等 |
| `mergeSessionIdentity` | `(params: { current, incoming, now }) => SessionAcpIdentity \| undefined` | 合併兩個 identity（current 優先，incoming 填補） |
| `createIdentityFromEnsure` | `(params: { handle, now }) => SessionAcpIdentity \| undefined` | 從 runtime handle 建立 identity |
| `createIdentityFromStatus` | `(params: { status, now }) => SessionAcpIdentity \| undefined` | 從 runtime status 建立 identity |
| `resolveRuntimeHandleIdentifiersFromIdentity` | `(identity?) => { backendSessionId?, agentSessionId? }` | 從 identity 萃取 handle ID |

### runtime/session-meta.ts

| Export | 簽名 | 說明 |
|--------|------|------|
| `AcpSessionStoreEntry` | type | session store entry 結構 |
| `resolveSessionStorePathForAcp` | `(params: { sessionKey, cfg? }) => { cfg, storePath }` | 解析 session store 檔案路徑 |
| `readAcpSessionEntry` | `(params: { sessionKey, cfg? }) => AcpSessionStoreEntry \| null` | 讀取單一 session entry |
| `listAcpSessionEntries` | `(params: { cfg?, env? }) => Promise<AcpSessionStoreEntry[]>` | 列出所有 ACP session entries |
| `upsertAcpSessionMeta` | `(params: { sessionKey, cfg?, mutate }) => Promise<SessionEntry \| null>` | 原子更新 session ACP meta（file lock 寫入） |

### runtime/adapter-contract.testkit.ts

| Export | 簽名 | 說明 |
|--------|------|------|
| `AcpRuntimeAdapterContractParams` | type | 合約測試參數 |
| `runAcpRuntimeAdapterContract` | `(params: AcpRuntimeAdapterContractParams) => Promise<void>` | **Test utility**: 驗證 runtime adapter 實作符合合約 |

### control-plane/manager.ts

| Export | 簽名 | 說明 |
|--------|------|------|
| `AcpSessionManager` | class (re-export) | re-export from manager.core.ts |
| `getAcpSessionManager` | `() => AcpSessionManager` | **公開 API**: 取得全域 singleton manager |
| 各 types | re-export | AcpCloseSessionInput, AcpInitializeSessionInput, AcpRunTurnInput, etc. |

### control-plane/manager.types.ts

| Export | 簽名 | 說明 |
|--------|------|------|
| `AcpSessionResolution` | type (discriminated union) | session 解析結果 (none/stale/ready) |
| `AcpInitializeSessionInput` | type | initializeSession 輸入 |
| `AcpTurnAttachment` | type | turn 附件 |
| `AcpRunTurnInput` | type | runTurn 輸入（含 onEvent 回呼） |
| `AcpCloseSessionInput` | type | closeSession 輸入 |
| `AcpCloseSessionResult` | type | closeSession 結果 |
| `AcpSessionStatus` | type | session 狀態快照 |
| `AcpManagerObservabilitySnapshot` | type | 可觀察性快照（cache/turn/error 統計） |
| `AcpStartupIdentityReconcileResult` | type | 啟動時 identity reconcile 結果 |
| `ActiveTurnState` | type | 執行中 turn 狀態 |
| `TurnLatencyStats` | type | turn 延遲統計 |
| `AcpSessionManagerDeps` | type | manager DI 依賴介面 |
| `DEFAULT_DEPS` | const | 預設依賴實作 |

### control-plane/manager.core.ts — AcpSessionManager

| 方法 | 簽名 | 說明 | 角色 |
|------|------|------|------|
| `resolveSession` | `(params: { cfg, sessionKey }) => AcpSessionResolution` | 解析 session 狀態（none/stale/ready） | 公開 |
| `getObservabilitySnapshot` | `(cfg) => AcpManagerObservabilitySnapshot` | 取得 runtime/turn/error 統計 | 公開 |
| `reconcilePendingSessionIdentities` | `(params: { cfg }) => Promise<AcpStartupIdentityReconcileResult>` | 啟動時掃描 pending identity 並 resolve | 公開 |
| `initializeSession` | `(input: AcpInitializeSessionInput) => Promise<{ runtime, handle, meta }>` | **公開 API**: 初始化 ACP session（backend.ensureSession + persist meta） | 公開 |
| `getSessionStatus` | `(params: { cfg, sessionKey, signal? }) => Promise<AcpSessionStatus>` | **公開 API**: 取得 session 完整狀態 | 公開 |
| `setSessionRuntimeMode` | `(params: { cfg, sessionKey, runtimeMode }) => Promise<AcpSessionRuntimeOptions>` | 設定 runtime mode | 公開 |
| `setSessionConfigOption` | `(params: { cfg, sessionKey, key, value }) => Promise<AcpSessionRuntimeOptions>` | 設定 runtime config option | 公開 |
| `updateSessionRuntimeOptions` | `(params: { cfg, sessionKey, patch }) => Promise<AcpSessionRuntimeOptions>` | 批次更新 runtime options | 公開 |
| `resetSessionRuntimeOptions` | `(params: { cfg, sessionKey }) => Promise<AcpSessionRuntimeOptions>` | 重置 runtime options（close + clear） | 公開 |
| `runTurn` | `(input: AcpRunTurnInput) => Promise<void>` | **公開 API**: 執行一個 ACP turn（streaming + error + oneshot close） | 公開 |
| `cancelSession` | `(params: { cfg, sessionKey, reason? }) => Promise<void>` | 取消執行中 turn | 公開 |
| `closeSession` | `(input: AcpCloseSessionInput) => Promise<AcpCloseSessionResult>` | **公開 API**: 關閉 ACP session（runtime close + optional meta clear） | 公開 |

### control-plane/manager.utils.ts

| Export | 簽名 | 說明 |
|--------|------|------|
| `resolveAcpAgentFromSessionKey` | `(sessionKey: string, fallback?) => string` | 從 session key 解析 agent ID |
| `resolveMissingMetaError` | `(sessionKey: string) => AcpRuntimeError` | 建立 meta 遺失錯誤 |
| `resolveAcpSessionResolutionError` | `(resolution: AcpSessionResolution) => AcpRuntimeError \| null` | resolution → error 轉換 |
| `requireReadySessionMeta` | `(resolution: AcpSessionResolution) => SessionAcpMeta` | 要求 ready resolution 或 throw |
| `normalizeSessionKey` | `(sessionKey: string) => string` | trim session key |
| `canonicalizeAcpSessionKey` | `(params: { cfg, sessionKey }) => string` | 正規化 session key（含 main alias 解析） |
| `normalizeActorKey` | `(sessionKey: string) => string` | 正規化 actor queue key (lowercase) |
| `normalizeAcpErrorCode` | `(code?: string) => AcpRuntimeErrorCode` | 正規化 error code 或 fallback |
| `createUnsupportedControlError` | `(params: { backend, control }) => AcpRuntimeError` | 建立不支援控制項錯誤 |
| `resolveRuntimeIdleTtlMs` | `(cfg: OpenClawConfig) => number` | 解析 idle TTL 設定 (minutes → ms) |
| `hasLegacyAcpIdentityProjection` | `(meta: SessionAcpMeta) => boolean` | 偵測舊格式 identity 欄位 |

### control-plane/manager.identity-reconcile.ts

| Export | 簽名 | 說明 |
|--------|------|------|
| `reconcileManagerRuntimeSessionIdentifiers` | `(params: { cfg, sessionKey, runtime, handle, meta, runtimeStatus?, failOnStatusError, setCachedHandle, writeSessionMeta }) => Promise<{ handle, meta, runtimeStatus? }>` | 從 runtime status 同步 session identity 到 meta + handle cache |

### control-plane/manager.runtime-controls.ts

| Export | 簽名 | 說明 |
|--------|------|------|
| `resolveManagerRuntimeCapabilities` | `(params: { runtime, handle }) => Promise<AcpRuntimeCapabilities>` | 合併 runtime 回報 + 本地推斷的 capabilities |
| `applyManagerRuntimeControls` | `(params: { sessionKey, runtime, handle, meta, getCachedRuntimeState }) => Promise<void>` | 將 persisted runtime options 套用到 runtime（skip if signature 未變） |

### control-plane/runtime-cache.ts

| Export | 簽名 | 說明 |
|--------|------|------|
| `CachedRuntimeState` | type | 快取項目結構 |
| `CachedRuntimeSnapshot` | type | 快照結構（含 idleMs） |
| `RuntimeCache` | class | runtime handle LRU 快取 |

#### RuntimeCache 方法

| 方法 | 說明 |
|------|------|
| `size()` | 快取大小 |
| `has(actorKey)` | 是否存在 |
| `get(actorKey, params?)` | 取得並 touch |
| `peek(actorKey)` | 取得不 touch |
| `getLastTouchedAt(actorKey)` | 最後存取時間 |
| `set(actorKey, state, params?)` | 設定 |
| `clear(actorKey)` | 清除 |
| `snapshot(params?)` | 全部快照 |
| `collectIdleCandidates(params)` | 蒐集超過 idle 門檻的項目 |

### control-plane/runtime-options.ts

| Export | 簽名 | 說明 |
|--------|------|------|
| `validateRuntimeModeInput` | `(rawMode: unknown) => string` | 驗證 mode 字串 |
| `validateRuntimeModelInput` | `(rawModel: unknown) => string` | 驗證 model ID |
| `validateRuntimePermissionProfileInput` | `(rawProfile: unknown) => string` | 驗證 permission profile |
| `validateRuntimeCwdInput` | `(rawCwd: unknown) => string` | 驗證 cwd（必須 absolute） |
| `validateRuntimeTimeoutSecondsInput` | `(rawTimeout: unknown) => number` | 驗證 timeout 秒數 |
| `parseRuntimeTimeoutSecondsInput` | `(rawTimeout: unknown) => number` | 解析字串 timeout |
| `validateRuntimeConfigOptionInput` | `(rawKey, rawValue) => { key, value }` | 驗證 config key/value |
| `validateRuntimeOptionPatch` | `(patch?) => Partial<AcpSessionRuntimeOptions>` | 驗證整個 patch 物件 |
| `normalizeText` | `(value: unknown) => string \| undefined` | trim + falsy → undefined |
| `normalizeRuntimeOptions` | `(options?) => AcpSessionRuntimeOptions` | 正規化所有 runtime options |
| `mergeRuntimeOptions` | `(params: { current?, patch? }) => AcpSessionRuntimeOptions` | 合併 current + patch |
| `resolveRuntimeOptionsFromMeta` | `(meta: SessionAcpMeta) => AcpSessionRuntimeOptions` | 從 meta 解析 runtime options（fallback cwd） |
| `runtimeOptionsEqual` | `(a?, b?) => boolean` | 比較兩組 options |
| `buildRuntimeControlSignature` | `(options) => string` | 序列化 options 為 dedup signature |
| `buildRuntimeConfigOptionPairs` | `(options) => Array<[string, string]>` | options → key-value pairs（for setConfigOption） |
| `inferRuntimeOptionPatchFromConfigOption` | `(key, value) => Partial<AcpSessionRuntimeOptions>` | config option → runtime option patch |

### control-plane/session-actor-queue.ts

| Export | 簽名 | 說明 |
|--------|------|------|
| `SessionActorQueue` | class | per-session 串列化執行佇列 |

#### SessionActorQueue 方法

| 方法 | 說明 |
|------|------|
| `getTailMapForTesting()` | 測試用 tail map |
| `getTotalPendingCount()` | 全部等待中任務數 |
| `getPendingCountForSession(actorKey)` | 特定 session 等待數 |
| `run<T>(actorKey, op)` | 串列化執行 op |

### control-plane/spawn.ts

| Export | 簽名 | 說明 |
|--------|------|------|
| `AcpSpawnRuntimeCloseHandle` | type | spawn 失敗清理用 handle |
| `cleanupFailedAcpSpawn` | `(params: { cfg, sessionKey, shouldDeleteSession, deleteTranscript, runtimeCloseHandle? }) => Promise<void>` | **公開 API**: spawn 失敗後全面清理（runtime close + manager close + unbind + session delete） |

## API 入口

| 入口 | 檔案 | 類型 | 說明 |
|------|------|------|------|
| `serveAcpGateway` | server.ts | CLI entry / 公開 API | ACP server 啟動入口（可獨立執行） |
| `createAcpClient` | client.ts | 公開 API | 建立 ACP client 連線 |
| `runAcpClientInteractive` | client.ts | 公開 API | 互動式 REPL |
| `resolvePermissionRequest` | client.ts | Hook handler | 工具呼叫權限解析 |
| `AcpGatewayAgent.initialize` | translator.ts | ACP RPC | Agent 初始化 |
| `AcpGatewayAgent.newSession` | translator.ts | ACP RPC | 建立 session |
| `AcpGatewayAgent.loadSession` | translator.ts | ACP RPC | 載入 session |
| `AcpGatewayAgent.prompt` | translator.ts | ACP RPC | 送出 prompt |
| `AcpGatewayAgent.cancel` | translator.ts | ACP RPC | 取消 prompt |
| `AcpGatewayAgent.setSessionMode` | translator.ts | ACP RPC | 設定 mode |
| `AcpGatewayAgent.setSessionConfigOption` | translator.ts | ACP RPC | 設定 config |
| `AcpGatewayAgent.unstable_listSessions` | translator.ts | ACP RPC | 列出 sessions |
| `getAcpSessionManager` | control-plane/manager.ts | 公開 API (singleton) | 取得 session manager |
| `AcpSessionManager.initializeSession` | control-plane/manager.core.ts | 公開 API | 初始化 runtime session |
| `AcpSessionManager.runTurn` | control-plane/manager.core.ts | 公開 API | 執行 turn |
| `AcpSessionManager.closeSession` | control-plane/manager.core.ts | 公開 API | 關閉 session |
| `AcpSessionManager.cancelSession` | control-plane/manager.core.ts | 公開 API | 取消 turn |
| `AcpSessionManager.getSessionStatus` | control-plane/manager.core.ts | 公開 API | 查詢狀態 |
| `registerAcpRuntimeBackend` | runtime/registry.ts | Plugin API | 註冊 backend |
| `unregisterAcpRuntimeBackend` | runtime/registry.ts | Plugin API | 移除 backend |
| `ensureConfiguredAcpBindingSession` | persistent-bindings.lifecycle.ts | 公開 API | 確保 binding session |
| `resetAcpSessionInPlace` | persistent-bindings.lifecycle.ts | 公開 API | 就地 reset session |
| `resolveConfiguredAcpRoute` | persistent-bindings.route.ts | 公開 API | binding → route |
| `cleanupFailedAcpSpawn` | control-plane/spawn.ts | 公開 API | spawn 失敗清理 |
| `AcpRuntime` interface | runtime/types.ts | Plugin contract | runtime adapter 必須實作 |

## 呼叫關聯圖

```
server.ts
  serveAcpGateway
    ├─ loadConfig (config/)
    ├─ buildGatewayConnectionDetails (gateway/)
    ├─ resolveGatewayConnectionAuth (gateway/)
    ├─ new GatewayClient (gateway/)
    ├─ new AgentSideConnection (@agentclientprotocol/sdk)
    └─ new AcpGatewayAgent → translator.ts
         ├─ parseSessionMeta ← session-mapper.ts
         ├─ resolveSessionKey ← session-mapper.ts
         ├─ resetSessionIfNeeded ← session-mapper.ts
         ├─ extractTextFromPrompt ← event-mapper.ts
         ├─ extractAttachmentsFromPrompt ← event-mapper.ts
         ├─ formatToolTitle ← event-mapper.ts
         ├─ inferToolKind ← event-mapper.ts
         ├─ extractToolCallContent ← event-mapper.ts
         ├─ extractToolCallLocations ← event-mapper.ts
         ├─ getAvailableCommands ← commands.ts
         ├─ readString, readBool, readNumber ← meta.ts
         ├─ defaultAcpSessionStore ← session.ts
         │    └─ createInMemorySessionStore
         └─ buildSessionPresentation (internal)
              └─ listThinkingLevels (auto-reply/)

client.ts
  createAcpClient
    ├─ buildServerArgs (internal)
    ├─ resolveAcpClientSpawnInvocation
    │    └─ resolveWindowsSpawnProgram (plugin-sdk/)
    ├─ resolveAcpClientSpawnEnv
    │    └─ omitEnvKeysCaseInsensitive (secrets/)
    ├─ buildAcpClientStripKeys
    │    └─ listKnownProviderAuthEnvVarNames (secrets/)
    ├─ shouldStripProviderAuthEnvVarsForAcpServer
    ├─ resolvePermissionRequest
    │    ├─ resolveToolNameForPermission (internal)
    │    ├─ shouldAutoApproveToolCall (internal)
    │    │    ├─ isKnownCoreToolId (agents/)
    │    │    └─ isReadToolCallScopedToCwd (internal)
    │    └─ DANGEROUS_ACP_TOOLS (security/)
    └─ ensureOpenClawCliOnPath (infra/)

control-plane/manager.core.ts (AcpSessionManager)
  initializeSession
    ├─ requireRuntimeBackend ← runtime/registry.ts
    ├─ runtime.ensureSession ← AcpRuntime interface
    ├─ createIdentityFromEnsure ← runtime/session-identity.ts
    ├─ mergeSessionIdentity ← runtime/session-identity.ts
    └─ writeSessionMeta → upsertAcpSessionMeta ← runtime/session-meta.ts
  runTurn
    ├─ resolveSession (self)
    ├─ requireReadySessionMeta ← manager.utils.ts
    ├─ ensureRuntimeHandle (private)
    │    ├─ requireRuntimeBackend
    │    ├─ runtime.ensureSession
    │    └─ mergeSessionIdentity
    ├─ applyRuntimeControls → manager.runtime-controls.ts
    │    ├─ resolveManagerRuntimeCapabilities
    │    └─ buildRuntimeControlSignature ← runtime-options.ts
    ├─ runtime.runTurn ← AcpRuntime
    └─ reconcileRuntimeSessionIdentifiers → manager.identity-reconcile.ts
         ├─ runtime.getStatus?
         ├─ createIdentityFromStatus ← runtime/session-identity.ts
         └─ mergeSessionIdentity
  closeSession
    ├─ ensureRuntimeHandle (private)
    ├─ runtime.close
    └─ writeSessionMeta
  cancelSession
    ├─ runtime.cancel
    └─ activeTurn.abortController.abort

persistent-bindings.lifecycle.ts
  ensureConfiguredAcpBindingSession
    ├─ buildConfiguredAcpSessionKey ← persistent-bindings.types.ts
    ├─ getAcpSessionManager ← control-plane/manager.ts
    ├─ manager.resolveSession
    ├─ manager.closeSession
    └─ manager.initializeSession
  resetAcpSessionInPlace
    ├─ resolveConfiguredAcpBindingSpecBySessionKey ← persistent-bindings.resolve.ts
    ├─ readAcpSessionEntry ← runtime/session-meta.ts
    ├─ resolveAcpAgentFromSessionKey ← control-plane/manager.utils.ts
    ├─ manager.closeSession
    ├─ manager.initializeSession
    └─ manager.updateSessionRuntimeOptions

persistent-bindings.resolve.ts
  resolveConfiguredAcpBindingRecord
    ├─ listAcpBindings ← config/bindings.ts
    ├─ parseTelegramTopicConversation ← conversation-id.ts
    ├─ normalizeBindingConfig ← persistent-bindings.types.ts
    └─ toConfiguredAcpBindingRecord ← persistent-bindings.types.ts

persistent-bindings.route.ts
  resolveConfiguredAcpRoute
    ├─ resolveConfiguredAcpBindingRecord ← persistent-bindings.resolve.ts
    ├─ deriveLastRoutePolicy ← routing/
    └─ resolveAgentIdFromSessionKey ← routing/

control-plane/spawn.ts
  cleanupFailedAcpSpawn
    ├─ getAcpSessionManager
    ├─ manager.closeSession
    ├─ getSessionBindingService ← infra/outbound/
    └─ callGateway ← gateway/
```

## 跨模組依賴

| 依賴目錄 | 用途 |
|---------|------|
| `config/` | `OpenClawConfig` 型別, `loadConfig`, `loadSessionStore`, `updateSessionStore`, `listAcpBindings`, `SessionAcpMeta`, `SessionEntry` |
| `gateway/` | `GatewayClient` (WebSocket), `buildGatewayConnectionDetails`, `resolveGatewayConnectionAuth`, `callGateway`, `EventFrame`, `SessionsListResult` |
| `routing/` | `normalizeAgentId`, `parseAgentSessionKey`, `resolveAgentIdFromSessionKey`, `sanitizeAgentId`, `deriveLastRoutePolicy`, `resolveMainSessionKey` |
| `agents/` | `isKnownCoreToolId` (tool-catalog), `getActiveSkillEnvKeys` (skills/env-overrides) |
| `auto-reply/` | `listThinkingLevels` (thinking.ts) |
| `infra/` | `isMainModule`, `ensureOpenClawCliOnPath`, `readSecretFileSync`, `createFixedWindowRateLimiter`, `getSessionBindingService`, `KeyedAsyncQueue` |
| `secrets/` | `listKnownProviderAuthEnvVarNames`, `omitEnvKeysCaseInsensitive` |
| `security/` | `DANGEROUS_ACP_TOOLS` |
| `sessions/` | `isAcpSessionKey` |
| `plugin-sdk/` | `resolveWindowsSpawnProgram`, `materializeWindowsSpawnProgram`, `KeyedAsyncQueue` |
| `utils.ts` | `shortenHomePath` |
| `version.ts` | `VERSION` |
| `globals.ts` | `logVerbose` |
| `@agentclientprotocol/sdk` | ACP 協議型別、`ClientSideConnection`, `AgentSideConnection`, `ndJsonStream`, `PROTOCOL_VERSION` |
