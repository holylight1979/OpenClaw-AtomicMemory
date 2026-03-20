# Core: Gateway — 函式級索引

> Phase 2 deep read (2026-03-20). 涵蓋 src/gateway/ 全部 ~180 支非 test 檔案。

## 總覽

Gateway 是 OpenClaw 的核心通訊中樞，以單一 Node.js 程序提供 WebSocket RPC 伺服器、HTTP endpoint 與 mDNS/Tailscale 發現機制。它是所有 CLI 工具、Control UI、Mobile Node、Channel Plugin 以及外部 Webhook 的統一入口。

架構分為幾個核心層：**Protocol 層**定義 WS frame schema（request/response/event）與版本控制；**Auth 層**處理 token/password/device-token/trusted-proxy/Tailscale 等多種認證模式，含滑動視窗速率限制；**Server Methods 層**實作所有 RPC method handler（agent、chat、config、cron、nodes、sessions 等 100+ 方法）；**HTTP 層**處理 hooks webhook ingress、OpenAI-compatible endpoint、OpenResponses endpoint、health probe、Control UI SPA、Canvas、Slack HTTP 和 plugin HTTP routes；**Channel Manager**管理所有 channel plugin（Discord/Telegram/Slack/LINE 等）的生命週期與自動重啟；**Node Registry**追蹤連線的遠端 node（mobile/desktop）並支援 invoke/event 分發。

Gateway 啟動流程（server.impl.ts `startGatewayServer`）涵蓋：config 驗證與 legacy migration → secrets runtime 初始化 → auth bootstrap（token 自動生成）→ plugin 載入 → channel 啟動 → discovery/Tailscale → cron service → heartbeat runner → config hot-reload watcher。關閉時依序清理所有 subsystem 並觸發 `gateway_stop` plugin hook。

## 子系統分類

| 子系統 | 目錄/檔案群 | 說明 |
|--------|------------|------|
| Server Core | `server.ts`, `server.impl.ts`, `boot.ts` | 啟動入口、GatewayServer 介面 |
| Protocol | `protocol/` (18 files) | WS frame/schema/type 定義、AJV validator |
| Auth | `auth*.ts`, `startup-auth.ts`, `device-auth.ts`, `connection-auth.ts`, `probe-auth.ts` | 多模式認證、rate limit、device identity |
| Credentials | `credentials.ts`, `credential-planner.ts`, `call.ts`, `connection-auth.ts` | 認證選擇策略（local/remote/secret ref） |
| Server Methods (RPC) | `server-methods/` (35 files) | 所有 WS RPC method handlers |
| HTTP Layer | `server-http.ts`, `openai-http.ts`, `openresponses-http.ts`, `http-*.ts`, `control-ui*.ts` | HTTP request routing & handlers |
| Hooks | `hooks.ts`, `hooks-mapping.ts` | Webhook ingress with mapping/transform |
| Channel Manager | `server-channels.ts`, `channel-health-*.ts` | Channel lifecycle & health monitoring |
| Node System | `node-registry.ts`, `node-*.ts`, `server-node-*.ts` | Remote node management & invocations |
| Chat/Agent | `server-chat.ts`, `chat-*.ts`, `agent-*.ts` | Chat session management & agent dispatch |
| Sessions | `session-*.ts`, `sessions-*.ts` | Session CRUD, preview, archive |
| Config Reload | `config-reload*.ts`, `server-reload-handlers.ts` | Hot-reload & restart planning |
| WS Runtime | `server-ws-runtime.ts`, `server/ws-connection/` (6 files) | WS connection lifecycle & auth handshake |
| Network/Security | `net.ts`, `origin-check.ts`, `security-path.ts` | IP resolution, loopback checks, CORS |
| Discovery | `server-discovery*.ts`, `server-tailscale.ts` | mDNS Bonjour + Tailscale exposure |
| Client | `client.ts` | GatewayClient WS client class |
| Misc | `server-cron.ts`, `server-model-catalog.ts`, `server-plugins.ts`, etc. | Cron, model catalog, plugin loading |

## 函式索引

---

### Server Core

#### `server.ts`
- `export { startGatewayServer }` — re-export from server.impl.ts
- `export type GatewayServer` — gateway handle with `close()` method
- `export type GatewayServerOptions` — startup config (bind, auth, controlUi, etc.)
- `export { truncateCloseReason }` — from server/close-reason.ts

#### `server.impl.ts`
- `export async function startGatewayServer(port?: number, opts?: GatewayServerOptions): Promise<GatewayServer>` — **主入口**：啟動整個 gateway 伺服器（config load → auth → channels → discovery → WS/HTTP server）
- `export type GatewayServer = { close: (opts?) => Promise<void> }` — gateway handle
- `export type GatewayServerOptions` — bind mode, controlUi, openAI, auth/tailscale overrides

#### `boot.ts`
- `export type BootRunResult = { status: "skipped" | "ran" | "failed"; ... }` — boot check result
- `export async function runBootOnce(params: { cfg, deps, workspaceDir, agentId? }): Promise<BootRunResult>` — 讀取 BOOT.md 並執行 agent 指令

#### `events.ts`
- `export const GATEWAY_EVENT_UPDATE_AVAILABLE = "update.available"` — event name constant
- `export type GatewayUpdateAvailableEventPayload` — update event payload type

---

### Auth System

#### `auth.ts`
- `export type ResolvedGatewayAuthMode = "none" | "token" | "password" | "trusted-proxy"` — auth mode
- `export type ResolvedGatewayAuth` — resolved auth config (mode + token/password + tailscale flag)
- `export type GatewayAuthResult = { ok, method?, user?, reason?, rateLimited?, retryAfterMs? }` — auth result
- `export type GatewayAuthSurface = "http" | "ws-control-ui"` — auth surface
- `export type AuthorizeGatewayConnectParams` — full auth params
- `export function isLocalDirectRequest(req?, trustedProxies?, allowRealIpFallback?): boolean` — 判斷是否為本地直連
- `export function resolveGatewayAuth(params): ResolvedGatewayAuth` — 從 config 解析出認證設定
- `export function assertGatewayAuthConfigured(auth, rawAuthConfig?): void` — 驗證認證已正確設定
- `export async function authorizeGatewayConnect(params): Promise<GatewayAuthResult>` — **核心認證**：token/password/tailscale/trusted-proxy 認證流程
- `export async function authorizeHttpGatewayConnect(params): Promise<GatewayAuthResult>` — HTTP surface 認證
- `export async function authorizeWsControlUiGatewayConnect(params): Promise<GatewayAuthResult>` — WS Control UI 認證

#### `auth-rate-limit.ts`
- `export interface RateLimitConfig` — rate limit 設定（maxAttempts/windowMs/lockoutMs）
- `export const AUTH_RATE_LIMIT_SCOPE_DEFAULT / _SHARED_SECRET / _DEVICE_TOKEN / _HOOK_AUTH` — scope constants
- `export interface AuthRateLimiter { check, recordFailure, reset, size, prune, dispose }` — rate limiter 介面
- `export function normalizeRateLimitClientIp(ip?): string` — 正規化 IP
- `export function createAuthRateLimiter(config?): AuthRateLimiter` — 建立滑動視窗 rate limiter

#### `auth-config-utils.ts`
- `export function withGatewayAuthPassword(cfg, password): OpenClawConfig` — 回傳帶 password 的新 config
- `export async function resolveGatewayPasswordSecretRef(params): Promise<OpenClawConfig>` — 解析 password secret ref

#### `auth-install-policy.ts`
- `export function shouldRequireGatewayTokenForInstall(cfg, env): boolean` — service install 是否需要 token

#### `auth-mode-policy.ts`
- `export const EXPLICIT_GATEWAY_AUTH_MODE_REQUIRED_ERROR` — error message
- `export function hasAmbiguousGatewayAuthModeConfig(cfg): boolean` — token+password 都設但沒指定 mode
- `export function assertExplicitGatewayAuthModeWhenBothConfigured(cfg): void` — 拋錯若模式不明

#### `startup-auth.ts`
- `export function mergeGatewayAuthConfig(base?, override?): GatewayAuthConfig` — 合併 auth config
- `export function mergeGatewayTailscaleConfig(base?, override?): GatewayTailscaleConfig` — 合併 tailscale config
- `export async function ensureGatewayStartupAuth(params): Promise<{ cfg, auth, generatedToken?, persistedGeneratedToken }>` — **啟動認證引導**：自動生成 token 並持久化
- `export function assertHooksTokenSeparateFromGatewayAuth(params): void` — hooks token 不得與 gateway token 相同

#### `device-auth.ts`
- `export type DeviceAuthPayloadParams / DeviceAuthPayloadV3Params` — device auth payload types
- `export function buildDeviceAuthPayload(params): string` — v2 device auth payload 字串
- `export function buildDeviceAuthPayloadV3(params): string` — v3 payload（含 platform/deviceFamily）
- `export { normalizeDeviceMetadataForAuth }` — re-export

#### `device-metadata-normalization.ts`
- `export function normalizeDeviceMetadataForAuth(value?): string` — ASCII-lowered metadata for auth
- `export function normalizeDeviceMetadataForPolicy(value?): string` — NFKD-normalized for policy

#### `connection-auth.ts`
- `export type GatewayConnectionAuthOptions` — connection auth options
- `export async function resolveGatewayConnectionAuth(params): Promise<{ token?, password? }>` — resolve credentials for connection
- `export function resolveGatewayConnectionAuthFromConfig(params): { token?, password? }` — sync variant

#### `probe-auth.ts`
- `export function resolveGatewayProbeAuth(params): { token?, password? }` — probe auth resolution
- `export async function resolveGatewayProbeAuthWithSecretInputs(params): Promise<{ token?, password? }>` — with secret refs
- `export function resolveGatewayProbeAuthSafe(params): { token?, password? }` — safe variant (no throw)

---

### Credentials

#### `credentials.ts`
- `export type GatewayCredentialMode = "local" | "remote"` — credential resolution mode
- `export type GatewayCredentialPrecedence = "env-first" | "config-first"` — precedence
- `export class GatewaySecretRefUnavailableError extends Error` — thrown when secret ref can't resolve
- `export function resolveGatewayCredentialsFromValues(params): ResolvedGatewayCredentials` — 從值解析 credentials
- `export function resolveGatewayCredentialsFromConfig(params): ResolvedGatewayCredentials` — **核心**：從 config + env 解析 credentials
- `export function resolveGatewayProbeCredentialsFromConfig(params): ResolvedGatewayCredentials` — probe 用
- `export function resolveGatewayDriftCheckCredentialsFromConfig(params): ResolvedGatewayCredentials` — drift check 用

#### `credential-planner.ts`
- `export type GatewayCredentialPlan` — credential resolution plan
- `export function trimToUndefined(value): string | undefined` — trim or undefined
- `export function readGatewayTokenEnv(env, includeLegacy?): string | undefined` — 讀取 env token
- `export function readGatewayPasswordEnv(env, includeLegacy?): string | undefined` — 讀取 env password
- `export function hasGatewayTokenEnvCandidate(env): boolean` — 是否有 env token
- `export function hasGatewayPasswordEnvCandidate(env): boolean` — 是否有 env password
- `export function createGatewayCredentialPlan(params): GatewayCredentialPlan` — 建立 credential resolution plan

#### `call.ts`
- `export type CallGatewayOptions / CallGatewayScopedOptions / CallGatewayCliOptions` — call options
- `export type GatewayConnectionDetails = { url, urlSource, message, ... }` — connection detail
- `export type ExplicitGatewayAuth = { token?, password? }` — explicit auth
- `export function resolveExplicitGatewayAuth(opts?): ExplicitGatewayAuth` — resolve explicit auth
- `export function ensureExplicitGatewayAuth(params): void` — 驗證 URL override 有明確 credentials
- `export function buildGatewayConnectionDetails(options?): GatewayConnectionDetails` — **Public API**: 建構 gateway 連線資訊
- `export async function resolveGatewayCredentialsWithSecretInputs(params): Promise<{ token?, password? }>` — with secret ref resolution
- `export async function callGatewayScoped<T>(opts): Promise<T>` — **Public API**: 帶 scope 的 RPC call
- `export async function callGatewayCli<T>(opts): Promise<T>` — **Public API**: CLI RPC call
- `export async function callGatewayLeastPrivilege<T>(opts): Promise<T>` — **Public API**: 最小權限 RPC call
- `export async function callGateway<T>(opts): Promise<T>` — **Public API**: 通用 RPC call
- `export function randomIdempotencyKey(): string` — 生成 idempotency key

---

### Client

#### `client.ts`
- `export type GatewayClientOptions` — client config（url, token, password, callbacks, etc.）
- `export const GATEWAY_CLOSE_CODE_HINTS` — close code description map
- `export function describeGatewayCloseCode(code): string | undefined` — describe close code
- `export class GatewayClient` — **WebSocket 客戶端**：自動重連、device auth、tick monitoring、challenge-response handshake
  - `start()` — 開始連線
  - `stop()` — 停止連線
  - `request<T>(method, params?, opts?): Promise<T>` — 發送 RPC request

---

### Protocol

#### `protocol/index.ts`
- 所有 AJV compiled validators: `validateConnectParams`, `validateRequestFrame`, `validateResponseFrame`, `validateEventFrame`, `validateSendParams`, `validatePollParams`, `validateAgentParams`, `validateAgentWaitParams`, `validateWakeParams`, `validateAgentsListParams`, `validateNodeInvokeParams`, etc. (~50 validators)
- Re-exports all schema types from `protocol/schema.ts`

#### `protocol/schema/types.ts`
- All WS protocol types: `ConnectParams`, `HelloOk`, `RequestFrame`, `ResponseFrame`, `EventFrame`, `GatewayFrame`, `Snapshot`, `PresenceEntry`, `ErrorShape`, `StateVersion`, `AgentEvent`, `NodeInvokeParams`, etc. (~35 types)

#### `protocol/schema/error-codes.ts`
- `export const ErrorCodes = { INVALID_REQUEST, UNAVAILABLE, INTERNAL }` — error code constants
- `export function errorShape(code, message, extra?): ErrorShape` — build error shape

#### `protocol/schema/protocol-schemas.ts`
- `export const ProtocolSchemas` — all schema definitions registry
- `export const PROTOCOL_VERSION = 3` — current protocol version

#### `protocol/schema/frames.ts`
- `ConnectParamsSchema`, `HelloOkSchema`, `RequestFrameSchema`, `ResponseFrameSchema`, `EventFrameSchema`, etc. — TypeBox frame schemas

#### `protocol/client-info.ts`
- `export const GATEWAY_CLIENT_IDS` — client ID constants (CLI, CONTROL_UI, NODE, etc.)
- `export const GATEWAY_CLIENT_MODES` — client mode constants (CLI, BACKEND, PROBE, etc.)
- `export const GATEWAY_CLIENT_CAPS` — client capability constants
- `export function normalizeGatewayClientId/Name/Mode(raw?): ... | undefined` — normalization
- `export function hasGatewayClientCap(caps, cap): boolean` — check client capability

#### `protocol/connect-error-details.ts`
- `export const ConnectErrorDetailCodes` — connect error detail constants (AUTH_TOKEN_MISSING, PAIRING_REQUIRED, etc.)
- `export function resolveAuthConnectErrorDetailCode(params): string` — resolve auth error code
- `export function resolveDeviceAuthConnectErrorDetailCode(params): string` — resolve device auth error
- `export function readConnectErrorDetailCode(details): string | null` — parse detail code
- `export function readConnectErrorRecoveryAdvice(details): ConnectErrorRecoveryAdvice` — parse recovery advice

*(Other `protocol/schema/*.ts` files define TypeBox schemas for agent, channels, config, cron, devices, exec-approvals, logs-chat, nodes, push, secrets, sessions, snapshot, wizard — all re-exported via `protocol/schema.ts`)*

---

### Server Methods (RPC Handlers)

#### `server-methods.ts`
- `export const coreGatewayHandlers: GatewayRequestHandlers` — **所有核心 RPC handler 集合**
- `export async function handleGatewayRequest(opts): Promise<void>` — **RPC dispatch**: auth check → rate limit → handler lookup → execute in plugin scope

#### `server-methods-list.ts`
- `export function listGatewayMethods(): string[]` — 列出所有支援的 gateway methods (~106 methods)
- `export const GATEWAY_EVENTS` — 所有支援的 event names

#### `server-methods/types.ts`
- `export type GatewayClient = { connect, connId?, clientIp?, canvasHostUrl?, ... }` — connected client
- `export type RespondFn` — response callback
- `export type GatewayRequestContext` — **核心 context**: deps, cron, execApprovalManager, nodeRegistry, broadcast, channels, wizard, etc.
- `export type GatewayRequestHandlerOptions` — handler params
- `export type GatewayRequestHandler` — handler function type
- `export type GatewayRequestHandlers` — handler map

#### `server-methods/connect.ts`
- `export const connectHandlers: GatewayRequestHandlers` — `connect` method handler

#### `server-methods/agent.ts`
- `export const agentHandlers: GatewayRequestHandlers` — `agent`, `agent.wait`, `agent.identity.get`, `gateway.identity.get` handlers

#### `server-methods/agents.ts`
- `export const agentsHandlers: GatewayRequestHandlers` — `agents.list/create/update/delete`, `agents.files.list/get/set` handlers

#### `server-methods/chat.ts`
- `export function sanitizeChatSendMessageInput(message, opts?): string` — sanitize chat input
- `export const chatHandlers: GatewayRequestHandlers` — `chat.send`, `chat.abort`, `chat.history`, `chat.inject` handlers

#### `server-methods/config.ts`
- `export const configHandlers: GatewayRequestHandlers` — `config.get/set/apply/patch`, `config.schema/schema.lookup` handlers

#### `server-methods/cron.ts`
- `export const cronHandlers: GatewayRequestHandlers` — `cron.list/status/add/update/remove/run/runs` handlers

#### `server-methods/nodes.ts`
- `export const NODE_WAKE_RECONNECT_WAIT_MS / RETRY_WAIT_MS / POLL_MS` — wake timing constants
- `export async function maybeWakeNodeWithApns(params): ...` — wake node via APNs
- `export async function maybeSendNodeWakeNudge(nodeId): Promise<NodeWakeNudgeAttempt>` — send wake nudge
- `export async function waitForNodeReconnect(params): ...` — wait for node reconnection
- `export const nodeHandlers: GatewayRequestHandlers` — `node.pair.*`, `node.rename`, `node.list`, `node.describe`, `node.invoke`, `node.invoke.result`, `node.event`, `node.canvas.capability.refresh` handlers

#### `server-methods/nodes-pending.ts`
- `export const nodePendingHandlers: GatewayRequestHandlers` — `node.pending.drain/pull/ack/enqueue` handlers

#### `server-methods/sessions.ts`
- `export const sessionsHandlers: GatewayRequestHandlers` — `sessions.list/preview/patch/reset/delete/compact` handlers

#### `server-methods/devices.ts`
- `export const deviceHandlers: GatewayRequestHandlers` — `device.pair.list/approve/reject/remove`, `device.token.rotate/revoke` handlers

#### `server-methods/exec-approval.ts`
- `export function createExecApprovalHandlers(manager, opts): GatewayRequestHandlers` — `exec.approval.request/waitDecision/resolve` handlers

#### `server-methods/exec-approvals.ts`
- `export const execApprovalsHandlers: GatewayRequestHandlers` — `exec.approvals.get/set`, `exec.approvals.node.get/set` handlers

#### `server-methods/secrets.ts`
- `export function createSecretsHandlers(params): GatewayRequestHandlers` — `secrets.reload/resolve` handlers

#### `server-methods/health.ts`
- `export const healthHandlers: GatewayRequestHandlers` — `health`, `status`, `last-heartbeat`, `set-heartbeats` handlers

#### `server-methods/logs.ts`
- `export const logsHandlers: GatewayRequestHandlers` — `logs.tail` handler

#### `server-methods/channels.ts`
- `export async function logoutChannelAccount(params): ...` — logout a channel account
- `export const channelsHandlers: GatewayRequestHandlers` — `channels.status`, `channels.logout` handlers

#### `server-methods/models.ts`
- `export const modelsHandlers: GatewayRequestHandlers` — `models.list` handler

#### `server-methods/skills.ts`
- `export const skillsHandlers: GatewayRequestHandlers` — `skills.status/bins/install/update` handlers

#### `server-methods/talk.ts`
- `export const talkHandlers: GatewayRequestHandlers` — `talk.config`, `talk.mode` handlers

#### `server-methods/tts.ts`
- `export const ttsHandlers: GatewayRequestHandlers` — `tts.status/providers/enable/disable/convert/setProvider` handlers

#### `server-methods/tools-catalog.ts`
- `export const toolsCatalogHandlers: GatewayRequestHandlers` — `tools.catalog` handler

#### `server-methods/usage.ts`
- `export const usageHandlers: GatewayRequestHandlers` — `usage.status`, `usage.cost` handlers

#### `server-methods/voicewake.ts`
- `export const voicewakeHandlers: GatewayRequestHandlers` — `voicewake.get/set` handlers

#### `server-methods/wizard.ts`
- `export const wizardHandlers: GatewayRequestHandlers` — `wizard.start/next/cancel/status` handlers

#### `server-methods/web.ts`
- `export const webHandlers: GatewayRequestHandlers` — `web.login.start/wait` handlers

#### `server-methods/send.ts`
- `export const sendHandlers: GatewayRequestHandlers` — `send` handler

#### `server-methods/push.ts`
- `export const pushHandlers: GatewayRequestHandlers` — `push.test` handler

#### `server-methods/browser.ts`
- `export const browserHandlers: GatewayRequestHandlers` — `browser.request` handler

#### `server-methods/system.ts`
- `export const systemHandlers: GatewayRequestHandlers` — `system-presence`, `system-event` handlers

#### `server-methods/update.ts`
- `export const updateHandlers: GatewayRequestHandlers` — `update.run` handler

#### `server-methods/doctor.ts`
- `export type DoctorMemoryStatusPayload` — memory status payload
- `export const doctorHandlers: GatewayRequestHandlers` — `doctor.memory.status` handler

#### `server-methods/validation.ts`
- `export type Validator<T>` — AJV validator type
- `export function assertValidParams<T>(validate, params, respond): params is T` — validate + respond error

#### `server-methods/agent-job.ts`
- `export async function waitForAgentJob(params): Promise<...>` — wait for agent execution to complete

#### `server-methods/agent-timestamp.ts`
- `export interface TimestampInjectionOptions` — timestamp injection config
- `export function injectTimestamp(message, opts?): string` — inject timestamp into message
- `export function timestampOptsFromConfig(cfg): TimestampInjectionOptions` — resolve from config

#### `server-methods/agent-wait-dedupe.ts`
- `export type AgentWaitTerminalSnapshot` — terminal state snapshot
- `export function readTerminalSnapshotFromDedupeEntry/FromGatewayDedupe(params): ...` — read cached result
- `export async function waitForTerminalGatewayDedupe(params): Promise<...>` — wait with deduplication
- `export function setGatewayDedupeEntry(params): void` — store dedupe entry

#### `server-methods/attachment-normalize.ts`
- `export type RpcAttachmentInput` — RPC attachment input type
- `export function normalizeRpcAttachmentsToChatAttachments(attachments): ChatAttachment[]` — normalize

#### `server-methods/base-hash.ts`
- `export function resolveBaseHashParam(params): string | null` — extract baseHash from params

#### `server-methods/chat-transcript-inject.ts`
- `export function appendInjectedAssistantMessageToTranscript(params): GatewayInjectedTranscriptAppendResult` — inject assistant message

#### `server-methods/nodes.helpers.ts`
- `export function respondInvalidParams(params): void` — respond invalid params
- `export async function respondUnavailableOnThrow(respond, fn): void` — catch → unavailable
- `export function uniqueSortedStrings(values): string[]` — unique sorted
- `export function safeParseJson(value): unknown` — safe JSON parse
- `export function respondUnavailableOnNodeInvokeError(respond, result): void` — handle node invoke error

#### `server-methods/nodes.handlers.invoke-result.ts`
- `export const handleNodeInvokeResult: GatewayRequestHandler` — node.invoke.result handler

#### `server-methods/restart-request.ts`
- `export function parseRestartRequestParams(params): { reason?, restartExpectedMs? }` — parse restart params

---

### HTTP Layer

#### `server-http.ts`
- `export type HookClientIpConfig` — hook client IP config
- `export type HooksRequestHandler` — hook request handler fn type
- `export function createHooksRequestHandler(opts): HooksRequestHandler` — **Hook Handler**: 建立 webhook ingress handler（auth + replay + mapping）
- `export function createGatewayHttpServer(opts): HttpServer` — **HTTP Server**: 建立主 HTTP server（hooks + tools-invoke + slack + openai + openresponses + canvas + plugins + control-ui + probes）
- `export function attachGatewayUpgradeHandler(opts): void` — attach WS upgrade handler

#### `openai-http.ts`
- `export async function handleOpenAiHttpRequest(req, res, opts): Promise<boolean>` — **HTTP Route**: `POST /v1/chat/completions` OpenAI-compatible endpoint

#### `openresponses-http.ts`
- `export async function handleOpenResponsesHttpRequest(req, res, opts): Promise<boolean>` — **HTTP Route**: `POST /v1/responses` OpenResponses endpoint
- `export { buildAgentPrompt }` — from openresponses-prompt.ts

#### `openresponses-prompt.ts`
- `export function buildAgentPrompt(input): { message, images, ... }` — build agent prompt from OpenResponses input

#### `http-common.ts`
- `export function setDefaultSecurityHeaders(res, opts?): void` — set security headers
- `export function sendJson/sendText/sendMethodNotAllowed/sendUnauthorized/sendRateLimited/sendGatewayAuthFailure/sendInvalidRequest(res, ...): void` — HTTP response helpers
- `export async function readJsonBodyOrError(req, maxBytes): ...` — read JSON body
- `export function writeDone/setSseHeaders(res): void` — SSE helpers

#### `http-endpoint-helpers.ts`
- `export async function handleGatewayPostJsonEndpoint(req, res, opts): Promise<boolean>` — generic POST JSON endpoint handler

#### `http-auth-helpers.ts`
- `export async function authorizeGatewayBearerRequestOrReply(params): Promise<boolean>` — authorize bearer token or send 401

#### `http-utils.ts`
- `export function getHeader(req, name): string | undefined` — get header
- `export function getBearerToken(req): string | undefined` — extract bearer token
- `export function resolveAgentIdFromHeader/FromModel(req/model): string | undefined` — resolve agent ID
- `export function resolveAgentIdForRequest(params): string | undefined` — combined resolver
- `export function resolveSessionKey(params): string` — resolve session key
- `export function resolveGatewayRequestContext(params): { agentId, sessionKey, ... }` — resolve request context

#### `tools-invoke-http.ts`
- `export async function handleToolsInvokeHttpRequest(req, res, opts): Promise<boolean>` — **HTTP Route**: `POST /v1/tools/invoke` endpoint

#### `control-ui.ts`
- `export type ControlUiRequestOptions` — request options
- `export type ControlUiRootState = "bundled" | { kind: "resolved"|"invalid"|"missing", path }` — UI root state
- `export function handleControlUiAvatarRequest(req, res, opts): boolean` — **HTTP Route**: avatar image endpoint
- `export function handleControlUiHttpRequest(req, res, opts): boolean` — **HTTP Route**: Control UI SPA serving

#### `control-ui-routing.ts`
- `export function classifyControlUiRequest(params): ControlUiRequestClassification` — classify request type

#### `control-ui-shared.ts`
- `export function normalizeControlUiBasePath(basePath?): string` — normalize base path
- `export function buildControlUiAvatarUrl(basePath, agentId): string` — build avatar URL
- `export function resolveAssistantAvatarUrl(params): string` — resolve avatar URL

#### `control-ui-csp.ts`
- `export function buildControlUiCspHeader(): string` — build CSP header

#### `control-ui-contract.ts`
- `export const CONTROL_UI_BOOTSTRAP_CONFIG_PATH` — bootstrap config endpoint path
- `export type ControlUiBootstrapConfig` — bootstrap config type

#### `control-ui-http-utils.ts`
- `export function isReadHttpMethod(method): boolean` — GET/HEAD check
- `export function respondPlainText/respondNotFound(res, ...): void` — response helpers

---

### Hooks System

#### `hooks.ts`
- `export type HooksConfigResolved` — resolved hooks config
- `export type HookAgentPolicyResolved / HookSessionPolicyResolved` — policy types
- `export function resolveHooksConfig(cfg): HooksConfigResolved | null` — **Hook Handler**: resolve hooks config from OpenClawConfig
- `export function resolveAllowedAgentIds(raw): Set<string> | undefined` — parse allowed agents
- `export function extractHookToken(req): string | undefined` — extract hook auth token
- `export async function readJsonBody(req, maxBytes): ...` — read JSON body
- `export function normalizeHookHeaders(req): Record<string, string>` — normalize headers
- `export function normalizeWakePayload/normalizeAgentPayload(payload): ...` — normalize payloads
- `export type HookAgentPayload / HookAgentDispatchPayload` — payload types
- `export function resolveHookChannel/resolveHookDeliver/resolveHookIdempotencyKey/resolveHookTargetAgentId/isHookAgentAllowed(params): ...` — hook resolution helpers
- `export function resolveHookSessionKey(params): { ok, value/error }` — resolve session key with policy

#### `hooks-mapping.ts`
- `export type HookMappingResolved / HookMappingTransformResolved / HookMappingContext / HookAction / HookMappingResult` — mapping types
- `export function resolveHookMappings(hooks?, opts?): HookMappingResolved[]` — resolve hook mappings from config
- `export async function applyHookMappings(mappings, ctx): Promise<HookMappingResult | null>` — apply mapping rules to incoming webhook

---

### Channel Manager

#### `server-channels.ts`
- `export type ChannelRuntimeSnapshot = { channels, channelAccounts }` — runtime status snapshot
- `export type ChannelManager` — manager interface (start/stop/status)
- `export function createChannelManager(opts): ChannelManager` — **核心**：建立 channel lifecycle manager（auto-restart with backoff）

#### `channel-health-monitor.ts`
- `export type ChannelHealthMonitor = { stop, handleEvent, checkNow }` — health monitor
- `export function startChannelHealthMonitor(deps): ChannelHealthMonitor` — 啟動 channel 健康監控

#### `channel-health-policy.ts`
- `export type ChannelHealthSnapshot / ChannelHealthEvaluation` — health types
- `export function evaluateChannelHealth(params): ChannelHealthEvaluation` — 評估 channel 健康
- `export function resolveChannelRestartReason(params): ChannelRestartReason | null` — 判斷是否需要重啟

#### `channel-status-patches.ts`
- `export function createConnectedChannelStatusPatch(params): ConnectedChannelStatusPatch` — build status patch

---

### Node System

#### `node-registry.ts`
- `export type NodeSession = { nodeId, connId, client, displayName, platform, caps, commands, ... }` — node session
- `export type NodeInvokeResult = { ok, payload?, error? }` — invoke result
- `export class NodeRegistry` — **核心**：node 註冊表
  - `register(client, opts): NodeSession` — 註冊 node
  - `unregisterByConn(connId)` — 取消註冊
  - `get(nodeId): NodeSession | undefined` — 查詢
  - `list(): NodeSession[]` — 列出所有
  - `invoke(nodeId, command, args): Promise<NodeInvokeResult>` — 遠端執行命令
  - `sendEvent(nodeId, event, payload)` — 發送事件

#### `node-pending-work.ts`
- `export type NodePendingWorkItem / NodePendingWorkType / NodePendingWorkPriority` — pending work types
- `export function enqueueNodePendingWork(params): { itemId }` — enqueue work for node
- `export function drainNodePendingWork(nodeId, opts?): DrainResult` — drain pending work
- `export function acknowledgeNodePendingWork(params): { acknowledged }` — acknowledge completion

#### `node-command-policy.ts`
- `export const DEFAULT_DANGEROUS_NODE_COMMANDS` — dangerous command list
- `export function resolveNodeCommandAllowlist(params): Set<string>` — resolve allowed commands
- `export function isNodeCommandAllowed(params): boolean` — check command allowed

#### `node-invoke-sanitize.ts`
- `export function sanitizeNodeInvokeParamsForForwarding(opts): ...` — sanitize invoke params

#### `node-invoke-system-run-approval.ts`
- `export function sanitizeSystemRunParamsForForwarding(opts): ...` — sanitize system run params

#### `node-invoke-system-run-approval-match.ts`
- `export type SystemRunApprovalBinding` — approval binding type
- `export function evaluateSystemRunApprovalMatch(params): SystemRunApprovalMatchResult` — evaluate approval match

#### `node-invoke-system-run-approval-errors.ts`
- `export function systemRunApprovalGuardError(params): SystemRunApprovalGuardError` — build error
- `export function systemRunApprovalRequired(runId): SystemRunApprovalGuardError` — approval required error

#### `server-node-events.ts`
- `export const handleNodeEvent` — process incoming node events (screen capture, status, location, etc.)

#### `server-node-events-types.ts`
- `export type NodeEventContext / NodeEvent` — event context & event types

#### `server-node-subscriptions.ts`
- `export type NodeSubscriptionManager` — subscription manager interface
- `export function createNodeSubscriptionManager(): NodeSubscriptionManager` — session-to-node subscription management

#### `server-mobile-nodes.ts`
- `export function hasConnectedMobileNode(registry): boolean` — check if any mobile node connected

---

### Chat/Agent System

#### `server-chat.ts`
- `export type ChatRunEntry / ChatRunRegistry` — chat run tracking types
- `export function createChatRunRegistry(): ChatRunRegistry` — create run registry
- `export type ChatRunState` — chat run state (abort controllers, buffers, etc.)
- `export function createChatRunState(): ChatRunState` — create run state
- `export type ToolEventRecipientRegistry` — tool event routing
- `export function createToolEventRecipientRegistry(): ToolEventRecipientRegistry` — create tool event registry
- `export function createAgentEventHandler(opts): (evt) => void` — **核心**：agent event → WS broadcast

#### `chat-abort.ts`
- `export type ChatAbortControllerEntry` — abort controller entry
- `export function isChatStopCommandText(text): boolean` — detect "/stop" command
- `export function resolveChatRunExpiresAtMs(params): number` — resolve expiration
- `export type ChatAbortOps` — abort operations
- `export function abortChatRunById(params): boolean` — abort specific run
- `export function abortChatRunsForSessionKey(params): number` — abort all runs for session

#### `chat-attachments.ts`
- `export type ChatAttachment / ChatImageContent / ParsedMessageWithImages` — attachment types
- `export async function parseMessageWithAttachments(message, opts): Promise<ParsedMessageWithImages>` — parse message with image attachments
- `export function buildMessageWithAttachments(message, images): string` — build message with inline images

#### `chat-sanitize.ts`
- `export function stripEnvelopeFromMessage(message): unknown` — strip envelope wrapper
- `export function stripEnvelopeFromMessages(messages): unknown[]` — strip from array

#### `agent-event-assistant-text.ts`
- `export function resolveAssistantStreamDeltaText(evt): string` — extract delta text from agent event

#### `agent-prompt.ts`
- `export type ConversationEntry` — conversation entry type
- `export function buildAgentMessageFromConversationEntries(entries): string` — build agent message from conversation history

#### `assistant-identity.ts`
- `export const DEFAULT_ASSISTANT_IDENTITY` — default identity
- `export type AssistantIdentity = { agentId, name, avatar, emoji? }` — identity type
- `export function resolveAssistantIdentity(params): AssistantIdentity` — resolve identity from config + agent + file

---

### Sessions

#### `session-utils.ts`
- `export function deriveSessionTitle(params): string` — derive session title
- `export function loadSessionEntry(sessionKey): SessionEntry | null` — load session entry
- `export function findStoreKeysIgnoreCase(store, key): string[]` — case-insensitive key search
- `export function classifySessionKey(key, entry?): "main" | "agent" | "hook" | ...` — classify session type
- `export function listAgentsForGateway(cfg): { agents }` — list agents for gateway display
- `export function resolveSessionStoreKey(params): string` — resolve store key
- `export function loadCombinedSessionStoreForGateway(cfg): { store, ... }` — load combined session store
- `export function getSessionDefaults(cfg): GatewaySessionsDefaults` — get session defaults
- `export function resolveSessionModelRef(params): ...` — resolve model reference
- `export function listSessionsFromStore(params): GatewaySessionRow[]` — list sessions

#### `session-utils.fs.ts`
- `export function readSessionMessages(sessionKey, opts?): ...` — read session transcript
- `export function resolveSessionTranscriptCandidates(params): string[]` — find transcript files
- `export function archiveFileOnDisk(filePath, reason): string` — archive file
- `export function archiveSessionTranscripts(opts): ...` — archive transcripts
- `export async function cleanupArchivedSessionTranscripts(opts): ...` — cleanup archives
- `export function readSessionTitleFieldsFromTranscript(messages): ...` — extract title fields
- `export function readFirstUserMessageFromTranscript(messages): ...` — read first user message
- `export function readLastMessagePreviewFromTranscript(messages): ...` — read last message preview
- `export function readSessionPreviewItemsFromTranscript(messages): ...` — read preview items

#### `session-utils.types.ts`
- `export type GatewaySessionsDefaults / GatewaySessionRow / GatewayAgentRow / SessionPreviewItem / SessionsListResult / SessionsPatchResult` — session types

#### `session-reset-service.ts`
- `export function archiveSessionTranscriptsForSession(params): ...` — archive for session
- `export async function emitSessionUnboundLifecycleEvent(params): ...` — emit lifecycle event
- `export async function cleanupSessionBeforeMutation(params): ...` — cleanup before mutation
- `export async function performGatewaySessionReset(params): ...` — full session reset

#### `sessions-patch.ts`
- `export async function applySessionsPatchToStore(params): ...` — apply session patch

#### `sessions-resolve.ts`
- `export type SessionsResolveResult` — resolve result
- `export async function resolveSessionKeyFromResolveParams(params): Promise<SessionsResolveResult>` — resolve session key

---

### Network & Security

#### `net.ts`
- `export function pickPrimaryLanIPv4(): string | undefined` — get primary LAN IPv4
- `export function normalizeHostHeader(hostHeader?): string` — normalize Host header
- `export function resolveHostName(hostHeader?): string` — extract hostname
- `export function isLoopbackAddress(ip?): boolean` — 127.x / ::1 check
- `export function isPrivateOrLoopbackAddress(ip?): boolean` — RFC1918 + loopback
- `export function isTrustedProxyAddress(ip?, trustedProxies?): boolean` — trusted proxy check
- `export function resolveClientIp(params): string | undefined` — **核心**：resolve client IP (X-Forwarded-For + trusted proxies)
- `export function resolveRequestClientIp(req?, trustedProxies?, allowRealIpFallback?): string | undefined` — HTTP request client IP
- `export function isLocalGatewayAddress(ip?): boolean` — loopback or Tailnet address
- `export async function resolveGatewayBindHost(bind?, customHost?): Promise<string>` — resolve bind address
- `export async function canBindToHost(host): Promise<boolean>` — test if host is bindable
- `export async function resolveGatewayListenHosts(bindHost, opts?): Promise<string[]>` — resolve listen hosts (IPv4 + IPv6)
- `export function isValidIPv4(host): boolean` — IPv4 validation
- `export function isLoopbackHost(host): boolean` — loopback hostname check
- `export function isLocalishHost(hostHeader?): boolean` — loopback or *.ts.net
- `export function isPrivateOrLoopbackHost(host): boolean` — private/loopback hostname
- `export function isSecureWebSocketUrl(url, opts?): boolean` — **Security**: ws:// safety check (CWE-319)

#### `origin-check.ts`
- `export function checkBrowserOrigin(params): { allowed, reason? }` — browser origin CORS check

#### `security-path.ts`
- `export function buildCanonicalPathCandidates(pathname): string[]` — generate canonical path variants
- `export function canonicalizePathForSecurity(pathname): SecurityPathCanonicalization` — security canonicalization
- `export function hasSecurityPathCanonicalizationAnomaly(pathname): boolean` — detect path anomalies
- `export function isPathProtectedByPrefixes(pathname, prefixes): boolean` — prefix protection check
- `export const PROTECTED_PLUGIN_ROUTE_PREFIXES` — protected prefixes
- `export function isProtectedPluginRoutePath(pathname): boolean` — check if protected

#### `input-allowlist.ts`
- `export function normalizeInputHostnameAllowlist(raw): string[]` — normalize hostname allowlist

---

### Config Reload

#### `config-reload-plan.ts`
- `export type GatewayReloadPlan` — reload plan (hot changes, restart-required changes, channel changes)
- `export function buildGatewayReloadPlan(changedPaths): GatewayReloadPlan` — build reload plan from changed paths

#### `config-reload.ts`
- `export function diffConfigPaths(prev, next, prefix?): string[]` — diff config objects
- `export function resolveGatewayReloadSettings(cfg): GatewayReloadSettings` — resolve reload settings
- `export type GatewayConfigReloader = { stop }` — reloader handle
- `export function startGatewayConfigReloader(opts): GatewayConfigReloader` — start file watcher + hot reload

#### `server-reload-handlers.ts`
- `export function createGatewayReloadHandlers(params): { applyHotReload, requestGatewayRestart }` — create reload handler functions

---

### WS Runtime

#### `server-ws-runtime.ts`
- `export function attachGatewayWsHandlers(params): void` — attach WS connection handlers to WSS

#### `server/ws-connection.ts`
- `export type GatewayWsSharedHandlerParams` — shared WS handler params
- `export type AttachGatewayWsConnectionHandlerParams` — full WS connection params
- `export function attachGatewayWsConnectionHandler(params): void` — **WS Handler**: connection lifecycle (auth, challenge, message routing, disconnect)

#### `server/ws-connection/auth-context.ts`
- `export type ConnectAuthState / ConnectAuthDecision` — auth state & decision types
- `export async function resolveConnectAuthState(params): Promise<ConnectAuthState>` — resolve auth state
- `export async function resolveConnectAuthDecision(params): Promise<ConnectAuthDecision>` — resolve auth decision

#### `server/ws-connection/auth-messages.ts`
- `export function formatGatewayAuthFailureMessage(params): string` — format auth failure message

#### `server/ws-connection/connect-policy.ts`
- `export type ControlUiAuthPolicy` — control UI auth policy
- `export function resolveControlUiAuthPolicy(params): ControlUiAuthPolicy` — resolve policy
- `export function shouldSkipControlUiPairing(params): boolean` — skip pairing check
- `export function evaluateMissingDeviceIdentity(params): MissingDeviceIdentityDecision` — evaluate missing identity

#### `server/ws-connection/handshake-auth-helpers.ts`
- `export function resolveHandshakeBrowserSecurityContext(params): HandshakeBrowserSecurityContext` — resolve browser context
- `export function shouldAllowSilentLocalPairing(params): boolean` — allow silent pairing
- `export function shouldSkipBackendSelfPairing(params): boolean` — skip self-pairing
- `export function resolveDeviceSignaturePayloadVersion(params): number` — resolve sig version
- `export function resolveAuthProvidedKind(params): AuthProvidedKind` — resolve auth kind

#### `server/ws-connection/message-handler.ts`
- `export function attachGatewayWsMessageHandler(params): void` — attach message handler to WS

#### `server/ws-connection/unauthorized-flood-guard.ts`
- `export class UnauthorizedFloodGuard` — rate limiter for unauthorized message floods
- `export function isUnauthorizedRoleError(error?): boolean` — check unauthorized role error

#### `server/ws-types.ts`
- `export type GatewayWsClient` — WS client type (ws, connId, connect, send, etc.)

---

### Server Infrastructure

#### `server/health-state.ts`
- `export function buildGatewaySnapshot(): Snapshot` — build current gateway snapshot
- `export function getHealthCache(): HealthSummary | null` — get cached health
- `export function getHealthVersion(): number` — get health version
- `export function incrementPresenceVersion(): number` — increment presence version
- `export function getPresenceVersion(): number` — get presence version
- `export async function refreshGatewayHealthSnapshot(opts?): Promise<HealthSummary>` — refresh health

#### `server/readiness.ts`
- `export type ReadinessResult = { ready, failing?, uptimeMs }` — readiness result
- `export type ReadinessChecker = () => ReadinessResult` — checker fn
- `export function createReadinessChecker(deps): ReadinessChecker` — create readiness checker

#### `server/close-reason.ts`
- `export function truncateCloseReason(reason, maxBytes?): string` — truncate WS close reason

#### `server/tls.ts`
- `export async function loadGatewayTlsRuntime(tlsConfig?, log?): Promise<GatewayTlsRuntime>` — load TLS runtime

#### `server/http-listen.ts`
- `export async function listenGatewayHttpServer(params): Promise<void>` — bind HTTP server to hosts

#### `server/http-auth.ts`
- `export function isCanvasPath(pathname): boolean` — check if canvas path
- `export async function authorizeCanvasRequest(params): Promise<GatewayAuthResult>` — authorize canvas request
- `export async function enforcePluginRouteGatewayAuth(params): Promise<boolean>` — enforce auth for plugin routes

#### `server/hooks.ts`
- `export function resolveHookClientIpConfig(cfg): HookClientIpConfig` — resolve hook client IP config
- `export function createGatewayHooksRequestHandler(params): HooksRequestHandler` — create hooks handler

#### `server/presence-events.ts`
- `export function broadcastPresenceSnapshot(params): void` — broadcast presence update

#### `server/plugins-http.ts`
- `export type PluginHttpRequestHandler` — plugin HTTP handler type
- `export function createGatewayPluginRequestHandler(params): PluginHttpRequestHandler` — create plugin HTTP handler

#### `server/plugins-http/path-context.ts`
- `export type PluginRoutePathContext` — route path context
- `export function resolvePluginRoutePathContext(pathname): PluginRoutePathContext` — resolve path context
- `export function isProtectedPluginRoutePathFromContext(context): boolean` — check if protected

#### `server/plugins-http/route-match.ts`
- `export function doesPluginRouteMatchPath(route, pathname): boolean` — match plugin route
- `export function findMatchingPluginHttpRoutes(routes, pathname): ...` — find matching routes
- `export function isRegisteredPluginHttpRoutePath(routes, pathname): boolean` — check registered

#### `server/plugins-http/route-auth.ts`
- `export function matchedPluginRoutesRequireGatewayAuth(routes): boolean` — check if routes need auth
- `export function shouldEnforceGatewayAuthForPluginPath(pathname, routes): boolean` — enforce auth check

---

### Other Subsystems

#### `server-broadcast.ts`
- `export type GatewayBroadcastFn / GatewayBroadcastToConnIdsFn` — broadcast fn types
- `export function createGatewayBroadcaster(params): { broadcast, broadcastToConnIds }` — create broadcaster

#### `server-cron.ts`
- `export type GatewayCronState = { cron, storePath }` — cron state
- `export function buildGatewayCronService(params): GatewayCronState` — build cron service

#### `server-model-catalog.ts`
- `export type GatewayModelChoice` — model catalog entry
- `export async function loadGatewayModelCatalog(): Promise<GatewayModelChoice[]>` — load model catalog

#### `server-plugins.ts`
- `export function setFallbackGatewayContext(ctx): void` — set fallback context for non-WS paths
- `export function loadGatewayPlugins(params): { pluginRegistry, gatewayMethods }` — load gateway plugins

#### `server-runtime-config.ts`
- `export type GatewayRuntimeConfig` — runtime config type
- `export async function resolveGatewayRuntimeConfig(params): Promise<GatewayRuntimeConfig>` — resolve runtime config

#### `server-runtime-state.ts`
- `export async function createGatewayRuntimeState(params): Promise<...>` — create runtime state (HTTP server, WSS, clients, broadcast, chat state, etc.)

#### `server-session-key.ts`
- `export function resolveSessionKeyForRun(runId): string | undefined` — resolve session key from run ID

#### `server-startup.ts`
- `export async function startGatewaySidecars(params): Promise<{ browserControl, pluginServices }>` — start sidecars (browser control, channels, plugin services)

#### `server-startup-log.ts`
- `export function logGatewayStartup(params): void` — log startup info

#### `server-startup-memory.ts`
- `export async function startGatewayMemoryBackend(params): Promise<...>` — start memory backend

#### `server-discovery-runtime.ts`
- `export async function startGatewayDiscovery(params): Promise<{ bonjourStop }>` — start mDNS/Tailscale discovery

#### `server-discovery.ts`
- `export function formatBonjourInstanceName(displayName): string` — format Bonjour name
- `export function resolveBonjourCliPath(opts?): string | undefined` — resolve Bonjour CLI path
- `export async function resolveTailnetDnsHint(opts?): Promise<string | undefined>` — resolve Tailnet DNS

#### `server-tailscale.ts`
- `export async function startGatewayTailscaleExposure(params): Promise<() => Promise<void> | null>` — start Tailscale Serve/Funnel

#### `server-browser.ts`
- `export async function startBrowserControlServerIfEnabled(): Promise<BrowserControlServer | null>` — start browser control

#### `server-lanes.ts`
- `export function applyGatewayLaneConcurrency(cfg): void` — apply lane concurrency config

#### `server-maintenance.ts`
- `export function startGatewayMaintenanceTimers(params): { tickInterval, healthInterval, dedupeCleanup, mediaCleanup }` — start maintenance timers

#### `server-close.ts`
- `export function createGatewayCloseHandler(params): (opts?) => Promise<void>` — create close handler

#### `server-wizard-sessions.ts`
- `export function createWizardSessionTracker(): { wizardSessions, findRunningWizard, purgeWizardSession }` — wizard session tracker

#### `server-constants.ts`
- `export const MAX_PAYLOAD_BYTES / MAX_BUFFERED_BYTES / MAX_PREAUTH_PAYLOAD_BYTES` — size limits
- `export const TICK_INTERVAL_MS / HEALTH_REFRESH_INTERVAL_MS / DEDUPE_TTL_MS / DEDUPE_MAX` — timing constants
- `export const DEFAULT_HANDSHAKE_TIMEOUT_MS` — handshake timeout

#### `server-shared.ts`
- `export type DedupeEntry` — dedup entry type

#### `server-utils.ts`
- `export function normalizeVoiceWakeTriggers(input): string[]` — normalize wake triggers
- `export function formatError(err): string` — format error

#### `server-restart-sentinel.ts`
- `export async function scheduleRestartSentinelWake(params): ...` — schedule restart sentinel
- `export function shouldWakeFromRestartSentinel(): boolean` — check sentinel

#### `exec-approval-manager.ts`
- `export class ExecApprovalManager` — exec approval state manager (add/remove/resolve/list approvals)

#### `method-scopes.ts`
- `export const ADMIN_SCOPE / READ_SCOPE / WRITE_SCOPE / APPROVALS_SCOPE / PAIRING_SCOPE` — scope constants
- `export type OperatorScope` — scope type
- `export const CLI_DEFAULT_OPERATOR_SCOPES` — default CLI scopes
- `export function isApprovalMethod/isPairingMethod/isReadMethod/isWriteMethod/isNodeRoleMethod/isAdminOnlyMethod(method): boolean` — method classification
- `export function resolveRequiredOperatorScopeForMethod(method): OperatorScope | undefined` — get required scope
- `export function resolveLeastPrivilegeOperatorScopesForMethod(method): OperatorScope[]` — least privilege
- `export function authorizeOperatorScopesForMethod(method, scopes): { allowed } | { allowed: false, missingScope }` — authorize

#### `role-policy.ts`
- `export const GATEWAY_ROLES = ["operator", "node"]` — roles
- `export function parseGatewayRole(roleRaw): GatewayRole | null` — parse role
- `export function roleCanSkipDeviceIdentity(role, sharedAuthOk): boolean` — skip identity check
- `export function isRoleAuthorizedForMethod(role, method): boolean` — role authorization

#### `control-plane-audit.ts`
- `export function resolveControlPlaneActor(client): ControlPlaneActor` — resolve actor
- `export function formatControlPlaneActor(actor): string` — format actor
- `export function summarizeChangedPaths(paths, maxPaths?): string` — summarize changes

#### `control-plane-rate-limit.ts`
- `export function resolveControlPlaneRateLimitKey(client): string` — resolve rate limit key
- `export function consumeControlPlaneWriteBudget(params): { allowed, retryAfterMs? }` — consume write budget

#### `canvas-capability.ts`
- `export const CANVAS_CAPABILITY_PATH_PREFIX / CANVAS_CAPABILITY_QUERY_PARAM / CANVAS_CAPABILITY_TTL_MS` — canvas constants
- `export function mintCanvasCapabilityToken(): string` — mint capability token
- `export function buildCanvasScopedHostUrl(baseUrl, capability): string | undefined` — build scoped URL
- `export function normalizeCanvasScopedUrl(rawUrl): NormalizedCanvasScopedUrl` — normalize canvas URL

#### `open-responses.schema.ts`
- OpenResponses Zod schemas: `CreateResponseBodySchema`, `ResponseResourceSchema`, `ToolDefinitionSchema`, `ItemParamSchema`, `OutputItemSchema`, `UsageSchema`, etc.

#### `openresponses-prompt.ts`
- `export function buildAgentPrompt(input): { message, images, files, tools, ... }` — build agent prompt from OpenResponses input

#### `operator-approvals-client.ts`
- `export async function createOperatorApprovalsGatewayClient(params): Promise<GatewayClient>` — create approvals client

#### `probe.ts`
- `export type GatewayProbeResult = { ok, hello?, auth?, close? }` — probe result
- `export async function probeGateway(opts): Promise<GatewayProbeResult>` — probe gateway connectivity

#### `gateway-config-prompts.shared.ts`
- `export const TAILSCALE_EXPOSURE_OPTIONS / TAILSCALE_MISSING_BIN_NOTE_LINES / TAILSCALE_DOCS_LINES` — Tailscale prompts
- `export function buildTailnetHttpsOrigin(rawHost): string | null` — build Tailnet origin
- `export function appendAllowedOrigin(existing, origin): string[]` — append origin
- `export async function maybeAddTailnetOriginToControlUiAllowedOrigins(params): Promise<...>` — add Tailnet origin

#### `startup-control-ui-origins.ts`
- `export async function maybeSeedControlUiAllowedOriginsAtStartup(params): Promise<OpenClawConfig>` — seed allowed origins

#### `resolve-configured-secret-input-string.ts`
- `export async function resolveConfiguredSecretInputString(params): Promise<string | undefined>` — resolve secret input
- `export async function resolveConfiguredSecretInputWithFallback(params): Promise<string | undefined>` — with fallback
- `export async function resolveRequiredConfiguredSecretRefInputString(params): Promise<string | undefined>` — required ref

#### `live-image-probe.ts`
- `export function renderCatNoncePngBase64(nonce): string` — render probe image PNG

#### `live-tool-probe-utils.ts`
- `export function hasExpectedToolNonce(text, nonceA, nonceB): boolean` — check tool nonce
- `export function hasExpectedSingleNonce(text, nonce): boolean` — check single nonce
- `export function isLikelyToolNonceRefusal(text): boolean` — detect refusal
- `export function shouldRetryToolReadProbe/shouldRetryExecReadProbe(params): boolean` — retry decisions

#### `ws-log.ts`
- `export function shouldLogWs(): boolean` — check if WS logging enabled
- `export function shortId(value): string` — shorten ID for logging
- `export function formatForLog(value): string` — format value for log
- `export function summarizeAgentEventForWsLog(payload): Record<string, unknown>` — summarize agent event
- `export function logWs(direction, kind, meta?): void` — log WS message

#### `ws-logging.ts`
- `export type GatewayWsLogStyle = "auto" | "full" | "compact"` — log style
- `export function setGatewayWsLogStyle/getGatewayWsLogStyle(style): void/GatewayWsLogStyle` — get/set
- `export const DEFAULT_WS_SLOW_MS = 50` — slow threshold

---

## RPC Methods 總表

| Method | Handler File | Description |
|--------|-------------|-------------|
| `connect` | server-methods/connect.ts | WebSocket 連線握手 |
| `health` | server-methods/health.ts | 健康狀態查詢 |
| `status` | server-methods/health.ts | 系統狀態查詢 |
| `last-heartbeat` | server-methods/health.ts | 最後心跳查詢 |
| `set-heartbeats` | server-methods/health.ts | 設定心跳 |
| `doctor.memory.status` | server-methods/doctor.ts | 記憶體診斷 |
| `logs.tail` | server-methods/logs.ts | 日誌追蹤 |
| `channels.status` | server-methods/channels.ts | Channel 狀態 |
| `channels.logout` | server-methods/channels.ts | Channel 登出 |
| `chat.history` | server-methods/chat.ts | 聊天歷史 |
| `chat.send` | server-methods/chat.ts | 發送聊天訊息 |
| `chat.abort` | server-methods/chat.ts | 中止聊天 |
| `chat.inject` | server-methods/chat.ts | 注入聊天訊息（admin） |
| `config.get` | server-methods/config.ts | 取得設定 |
| `config.set` | server-methods/config.ts | 設定值 |
| `config.apply` | server-methods/config.ts | 套用設定 |
| `config.patch` | server-methods/config.ts | 修補設定 |
| `config.schema` | server-methods/config.ts | 取得 schema |
| `config.schema.lookup` | server-methods/config.ts | Schema 查詢 |
| `cron.list` | server-methods/cron.ts | 列出排程 |
| `cron.status` | server-methods/cron.ts | 排程狀態 |
| `cron.add` | server-methods/cron.ts | 新增排程 |
| `cron.update` | server-methods/cron.ts | 更新排程 |
| `cron.remove` | server-methods/cron.ts | 移除排程 |
| `cron.run` | server-methods/cron.ts | 手動執行排程 |
| `cron.runs` | server-methods/cron.ts | 排程執行記錄 |
| `models.list` | server-methods/models.ts | 列出模型 |
| `tools.catalog` | server-methods/tools-catalog.ts | 工具目錄 |
| `agents.list` | server-methods/agents.ts | 列出 agents |
| `agents.create` | server-methods/agents.ts | 建立 agent |
| `agents.update` | server-methods/agents.ts | 更新 agent |
| `agents.delete` | server-methods/agents.ts | 刪除 agent |
| `agents.files.list` | server-methods/agents.ts | Agent 檔案列表 |
| `agents.files.get` | server-methods/agents.ts | 取得 agent 檔案 |
| `agents.files.set` | server-methods/agents.ts | 設定 agent 檔案 |
| `agent` | server-methods/agent.ts | 執行 agent |
| `agent.wait` | server-methods/agent.ts | 等待 agent 完成 |
| `agent.identity.get` | server-methods/agent.ts | 取得 agent 身份 |
| `gateway.identity.get` | server-methods/agent.ts | 取得 gateway 身份 |
| `skills.status` | server-methods/skills.ts | Skills 狀態 |
| `skills.bins` | server-methods/skills.ts | Skills 二進位 |
| `skills.install` | server-methods/skills.ts | 安裝 skill |
| `skills.update` | server-methods/skills.ts | 更新 skill |
| `sessions.list` | server-methods/sessions.ts | 列出 sessions |
| `sessions.preview` | server-methods/sessions.ts | Session 預覽 |
| `sessions.patch` | server-methods/sessions.ts | 修補 session |
| `sessions.reset` | server-methods/sessions.ts | 重置 session |
| `sessions.delete` | server-methods/sessions.ts | 刪除 session |
| `sessions.compact` | server-methods/sessions.ts | 壓縮 session |
| `usage.status` | server-methods/usage.ts | 用量狀態 |
| `usage.cost` | server-methods/usage.ts | 成本查詢 |
| `tts.status/providers/enable/disable/convert/setProvider` | server-methods/tts.ts | TTS 管理 |
| `talk.config` | server-methods/talk.ts | Talk 設定 |
| `talk.mode` | server-methods/talk.ts | Talk 模式 |
| `voicewake.get` | server-methods/voicewake.ts | 語音喚醒查詢 |
| `voicewake.set` | server-methods/voicewake.ts | 語音喚醒設定 |
| `secrets.reload` | server-methods/secrets.ts | 重載 secrets |
| `secrets.resolve` | server-methods/secrets.ts | 解析 secrets |
| `send` | server-methods/send.ts | 發送訊息 |
| `wake` | server-methods/health.ts | 喚醒 |
| `node.pair.request/list/approve/reject/verify` | server-methods/nodes.ts | Node 配對 |
| `node.rename` | server-methods/nodes.ts | Node 重命名 |
| `node.list` | server-methods/nodes.ts | 列出 nodes |
| `node.describe` | server-methods/nodes.ts | Node 詳情 |
| `node.invoke` | server-methods/nodes.ts | 遠端執行 |
| `node.invoke.result` | server-methods/nodes.handlers.invoke-result.ts | 執行結果回報 |
| `node.event` | server-methods/nodes.ts | Node 事件 |
| `node.canvas.capability.refresh` | server-methods/nodes.ts | Canvas 能力刷新 |
| `node.pending.drain/pull/ack/enqueue` | server-methods/nodes-pending.ts | Node 待處理工作 |
| `device.pair.list/approve/reject/remove` | server-methods/devices.ts | Device 配對 |
| `device.token.rotate/revoke` | server-methods/devices.ts | Device token 管理 |
| `exec.approvals.get/set` | server-methods/exec-approvals.ts | 執行核准設定 |
| `exec.approvals.node.get/set` | server-methods/exec-approvals.ts | Node 執行核准 |
| `exec.approval.request` | server-methods/exec-approval.ts | 請求核准 |
| `exec.approval.waitDecision` | server-methods/exec-approval.ts | 等待決定 |
| `exec.approval.resolve` | server-methods/exec-approval.ts | 解決核准 |
| `wizard.start/next/cancel/status` | server-methods/wizard.ts | 設定精靈 |
| `web.login.start/wait` | server-methods/web.ts | Web 登入 |
| `browser.request` | server-methods/browser.ts | 瀏覽器請求 |
| `push.test` | server-methods/push.ts | Push 測試 |
| `system-presence` | server-methods/system.ts | 系統在線狀態 |
| `system-event` | server-methods/system.ts | 系統事件 |
| `update.run` | server-methods/update.ts | 執行更新 |

## HTTP Routes 總表

| Method + Path | Handler File | Description |
|--------------|-------------|-------------|
| `POST /hooks/wake` | server-http.ts | Webhook：喚醒觸發 |
| `POST /hooks/agent` | server-http.ts | Webhook：Agent 觸發 |
| `POST /hooks/{mapping}` | server-http.ts | Webhook：自訂 mapping |
| `POST /v1/chat/completions` | openai-http.ts | OpenAI-compatible chat completions |
| `POST /v1/responses` | openresponses-http.ts | OpenResponses API |
| `POST /v1/tools/invoke` | tools-invoke-http.ts | Tool invocation API |
| `GET /health`, `GET /healthz` | server-http.ts | Liveness probe |
| `GET /ready`, `GET /readyz` | server-http.ts | Readiness probe |
| `GET /__openclaw/control-ui-config.json` | control-ui.ts | Control UI bootstrap config |
| `GET {basePath}/**` | control-ui.ts | Control UI SPA serving |
| `GET {basePath}/api/avatar/{agentId}` | control-ui.ts | Agent avatar |
| `* /api/channels/**` | server/plugins-http.ts | Plugin HTTP routes |
| `POST /api/channels/mattermost/command` | server-http.ts (delegated) | Mattermost slash commands |
| `* /api/channels/slack/**` | extensions/slack (delegated) | Slack HTTP events |

## WebSocket Events 總表

| Event Name | Handler/Origin | Description |
|-----------|---------------|-------------|
| `connect.challenge` | server/ws-connection.ts | Auth challenge with nonce |
| `agent` | server-chat.ts | Agent execution events (delta, status, tool) |
| `chat` | server-chat.ts | Chat events |
| `presence` | server/presence-events.ts | Client presence update |
| `tick` | server-maintenance.ts | Heartbeat tick |
| `talk.mode` | server-methods/talk.ts | Talk mode change |
| `shutdown` | server-close.ts | Gateway shutdown notification |
| `health` | server/health-state.ts | Health snapshot update |
| `heartbeat` | server.impl.ts | Heartbeat forwarding |
| `cron` | server-cron.ts | Cron job events |
| `node.pair.requested` | server-methods/nodes.ts | Node pairing request |
| `node.pair.resolved` | server-methods/nodes.ts | Node pairing result |
| `node.invoke.request` | server-methods/nodes.ts | Node invoke forwarded to node |
| `device.pair.requested` | server-methods/devices.ts | Device pairing request |
| `device.pair.resolved` | server-methods/devices.ts | Device pairing result |
| `voicewake.changed` | server.impl.ts | Voice wake triggers updated |
| `exec.approval.requested` | server-methods/exec-approval.ts | Exec approval request |
| `exec.approval.resolved` | server-methods/exec-approval.ts | Exec approval decision |
| `update.available` | events.ts | Update available notification |

## 跨模組依賴

| 依賴模組 | 引用次數 | 主要用途 |
|---------|---------|---------|
| `../config/` | ~121 | OpenClawConfig、config loading、session config、types |
| `../infra/` | ~127 | agent-events、device-identity、heartbeat、tailscale、TLS、system-events、outbound delivery |
| `../agents/` | ~53 | agent-scope、identity、model-catalog、skills、subagent-registry |
| `../plugins/` | ~31 | plugin registry、runtime、hook-runner、services |
| `../channels/` | ~25 | channel plugins、types、helpers |
| `../auto-reply/` | ~23 | reply dispatcher、history、tokens |
| `../utils/` | ~27 | message-channel（client names/modes） |
| `../routing/` | ~17 | session-key、account-lookup |
| `../cli/` | ~15 | deps、command-format |
| `../commands/` | ~13 | agent command、onboard、health |
| `../shared/` | ~14 | chat-content、net/ip、avatar-policy |
| `../logging/` | ~13 | subsystem logger |
| `../secrets/` | ~6 | runtime、resolve-secret-input |
| `../security/` | ~4 | secret-equal |
| `../cron/` | ~7 | CronService |
| `../media/` | ~7 | input-files、base64 |
| `../process/` | ~7 | command-queue |
| `../hooks/` | ~8 | module-loader |
| `../canvas-host/` | ~8 | server、a2ui |
| `../wizard/` | ~3 | onboarding、session、prompts |
| `../runtime.ts` | ~9 | RuntimeEnv |
| `../version.ts` | ~3 | VERSION constant |
