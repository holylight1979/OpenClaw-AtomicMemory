# Plugin SDK + Memory + Secrets + Security 函式級索引
> 掃描日期：2026-03-21 | 檔案數：198 檔 | 總行數：~35,182 行

## 目錄結構

```
src/plugin-sdk/   (87 檔) — Plugin SDK：extension 開發者對外 API 面
src/memory/       (58 檔) — 記憶子系統：embedding、向量搜尋、hybrid search
src/secrets/      (33 檔) — 密鑰管理：resolve、runtime snapshot、target registry
src/security/     (20 檔) — 安全機制：audit、DM policy、sensitive filter、external content
```

---

## 函式清單

### src/plugin-sdk/

> plugin-sdk 有兩類檔案：
> - **Barrel re-export 檔**（`discord.ts`, `slack.ts`, `line.ts`, `telegram.ts` 等 ~30 個 channel-specific barrel）— 從 core modules 彙集 re-export 給各 extension 使用，不含原創邏輯
> - **原創邏輯檔** — 定義 SDK 公用函式，下方詳列

#### account-id.ts
| 入口 | re-export |
| --- | --- |
| re-export `DEFAULT_ACCOUNT_ID`, `normalizeAccountId` from `routing/session-key` | 帳號 ID 標準化共用入口 |

#### account-resolution.ts
| export | 簽名 | 回傳 | 說明 |
|--------|------|------|------|
| `resolveAccountWithDefaultFallback<TAccount>` | `(params: { accountId?, normalizeAccountId, resolvePrimary, hasCredential, resolveDefaultAccountId }) → TAccount` | `TAccount` | 帳號解析，無 credential 時 fallback 到 default |
| `listConfiguredAccountIds` | `(params: { accounts, normalizeAccountId }) → string[]` | `string[]` | 列出已設定的帳號 ID |

#### acpx.ts
| 入口 | re-export barrel |
| --- | --- |
| ACP runtime types + functions | 整合 `acp/runtime/` 的 errors、registry、backend types 給 extension 使用 |

#### agent-media-payload.ts
| export | 簽名 | 回傳 | 說明 |
|--------|------|------|------|
| `type AgentMediaPayload` | — | type | agent 媒體 payload 型別（url, mime, filename 等） |
| `buildAgentMediaPayload` | `(opts) → AgentMediaPayload` | `AgentMediaPayload` | 建構 agent 媒體 payload |

#### allow-from.ts
| export | 簽名 | 回傳 | 說明 |
|--------|------|------|------|
| `formatAllowFromLowercase` | `(params: { allowFrom }) → string[]` | `string[]` | 將 allowFrom 陣列轉小寫 |
| `formatNormalizedAllowFromEntries` | `(params: { allowFrom }) → string[]` | `string[]` | 正規化 allowFrom 項目 |
| `isNormalizedSenderAllowed` | `(params: { senderId, allowFrom }) → boolean` | `boolean` | 檢查 sender 是否在 allowFrom 名單 |
| `isAllowedParsedChatSender<TParsed>` | `(params: { parsed, allowFrom }) → boolean` | `boolean` | 以 parsed target 檢查 sender 權限 |

#### allowlist-resolution.ts
| export | 簽名 | 回傳 | 說明 |
|--------|------|------|------|
| `type BasicAllowlistResolutionEntry` | — | type | allowlist 解析基礎項目 |
| `mapBasicAllowlistResolutionEntries` | `(entries) → mapped[]` | `mapped[]` | 映射 allowlist 解析項目 |
| `mapAllowlistResolutionInputs<T>` | `async (params) → T[]` | `Promise<T[]>` | 非同步映射 allowlist 輸入 |

#### atomic-memory.ts
| 入口 | re-export |
| --- | --- |
| re-export types from `memory/` | Atomic Memory Plugin 的 type-only barrel |

#### boolean-param.ts
| export | 簽名 | 回傳 | 說明 |
|--------|------|------|------|
| `readBooleanParam` | `(value) → boolean` | `boolean` | 從字串/未知值讀取布林參數 |

#### channel-config-helpers.ts
| export | 簽名 | 回傳 | 說明 |
|--------|------|------|------|
| `mapAllowFromEntries` | `(entries) → string[]` | `string[]` | 映射 channel config 的 allowFrom |
| `formatTrimmedAllowFromEntries` | `(allowFrom) → string[]` | `string[]` | 格式化並裁剪 allowFrom |
| `resolveOptionalConfigString` | `(value) → string \| undefined` | `string \| undefined` | 解析 optional config 字串 |
| `createScopedAccountConfigAccessors<ResolvedAccount>` | `(params) → accessors` | `object` | 建立 scoped account config 存取器 |
| `createScopedChannelConfigBase<T>` | `(params) → config` | `object` | 建立 scoped channel config 基底 |
| `createScopedDmSecurityResolver<T>` | `(params) → resolver` | `object` | 建立 scoped DM 安全解析器 |
| `resolveWhatsAppConfigAllowFrom` | `(params) → string[]` | `string[]` | WhatsApp allowFrom 解析 |
| `formatWhatsAppConfigAllowFromEntries` | `(allowFrom) → string[]` | `string[]` | WhatsApp allowFrom 格式化 |
| `resolveWhatsAppConfigDefaultTo` | `(params) → string` | `string` | WhatsApp 預設收件者 |
| `resolveIMessageConfigAllowFrom` | `(params) → string[]` | `string[]` | iMessage allowFrom 解析 |
| `resolveIMessageConfigDefaultTo` | `(params) → string` | `string` | iMessage 預設收件者 |

#### channel-lifecycle.ts
| export | 簽名 | 回傳 | 說明 |
|--------|------|------|------|
| `createAccountStatusSink` | `(params: { accountId, setStatus }) → (patch) => void` | `function` | 建立帳號狀態更新 sink |
| `waitUntilAbort` | `(signal?, onAbort?) → Promise<void>` | `Promise<void>` | 等待 AbortSignal 觸發 |
| `runPassiveAccountLifecycle<Handle>` | `(params: { abortSignal?, start, stop?, onStop? }) → Promise<void>` | `Promise<void>` | 保持被動帳號任務直到 abort |
| `keepHttpServerTaskAlive` | `(params: { server, abortSignal?, onAbort? }) → Promise<void>` | `Promise<void>` | 保持 HTTP server 存活直到 close |

#### channel-send-result.ts
| export | 簽名 | 回傳 | 說明 |
|--------|------|------|------|
| `type ChannelSendRawResult` | — | type | 發送原始結果 |
| `buildChannelSendResult` | `(channel, result) → tagged` | `object` | 標記 channel 發送結果 |

#### command-auth.ts
| export | 簽名 | 回傳 | 說明 |
|--------|------|------|------|
| `type ResolveSenderCommandAuthorizationParams` | — | type | 命令授權解析參數 |
| `type CommandAuthorizationRuntime` | — | type | 命令授權 runtime 介面 |
| `resolveDirectDmAuthorizationOutcome` | `(params) → "disabled" \| "unauthorized" \| "allowed"` | `string` | DM 授權結果判定 |
| `resolveSenderCommandAuthorizationWithRuntime` | `async (params) → { shouldComputeAuth, effectiveAllowFrom, senderAllowedForCommands, commandAuthorized }` | `Promise<object>` | 搭配 runtime 的命令授權解析 |
| `resolveSenderCommandAuthorization` | `async (params) → { shouldComputeAuth, effectiveAllowFrom, effectiveGroupAllowFrom, senderAllowedForCommands, commandAuthorized }` | `Promise<object>` | 完整命令授權解析 |

#### config-paths.ts
| export | 簽名 | 回傳 | 說明 |
|--------|------|------|------|
| `resolveChannelAccountConfigBasePath` | `(params: { channel, accountId }) → string` | `string` | 解析 channel 帳號 config 基底路徑 |

#### discord-send.ts
| export | 簽名 | 回傳 | 說明 |
|--------|------|------|------|
| `buildDiscordSendOptions` | `(input) → options` | `object` | 建構 Discord 發送選項 |
| `buildDiscordSendMediaOptions` | `(input) → options` | `object` | 建構 Discord 媒體發送選項 |
| `tagDiscordChannelResult` | `(result) → tagged` | `object` | 標記 Discord channel 結果 |

#### fetch-auth.ts
| export | 簽名 | 回傳 | 說明 |
|--------|------|------|------|
| `type ScopeTokenProvider` | — | type | scope token 提供者 |
| `fetchWithBearerAuthScopeFallback` | `async (params) → Response` | `Promise<Response>` | Bearer auth 加 scope fallback 的 fetch |

#### file-lock.ts
| export | 簽名 | 回傳 | 說明 |
|--------|------|------|------|
| `type FileLockOptions` | — | type | 檔案鎖選項（retries, stale） |
| `type FileLockHandle` | — | type | 持有鎖的 handle |
| `acquireFileLock` | `async (path, options?) → FileLockHandle` | `Promise<FileLockHandle>` | 取得檔案鎖 |
| `withFileLock<T>` | `async (path, fn, options?) → T` | `Promise<T>` | 在檔案鎖保護下執行作業 |

#### group-access.ts
| export | 簽名 | 回傳 | 說明 |
|--------|------|------|------|
| `type SenderGroupAccessReason` | — | type | sender 群組存取原因 |
| `type SenderGroupAccessDecision` | — | type | sender 群組存取決策 |
| `type GroupRouteAccessReason` | — | type | 路由群組存取原因 |
| `type GroupRouteAccessDecision` | — | type | 路由群組存取決策 |
| `type MatchedGroupAccessReason` | — | type | 匹配群組存取原因 |
| `type MatchedGroupAccessDecision` | — | type | 匹配群組存取決策 |
| `resolveSenderScopedGroupPolicy` | `(params) → GroupPolicy` | `GroupPolicy` | 解析 sender 範圍的群組策略 |
| `evaluateGroupRouteAccessForPolicy` | `(params) → GroupRouteAccessDecision` | `GroupRouteAccessDecision` | 評估路由群組存取 |
| `evaluateMatchedGroupAccessForPolicy` | `(params) → MatchedGroupAccessDecision` | `MatchedGroupAccessDecision` | 評估匹配群組存取 |
| `evaluateSenderGroupAccessForPolicy` | `(params) → SenderGroupAccessDecision` | `SenderGroupAccessDecision` | 評估 sender 群組存取 |
| `evaluateSenderGroupAccess` | `(params) → SenderGroupAccessDecision` | `SenderGroupAccessDecision` | 統合 sender 群組存取評估 |

#### inbound-envelope.ts
| export | 簽名 | 回傳 | 說明 |
|--------|------|------|------|
| `createInboundEnvelopeBuilder<TConfig, TEnvelope>` | `(params) → (input) => string` | `function` | 建立 inbound envelope builder |
| `resolveInboundRouteEnvelopeBuilder` | `(params) → builder` | `function` | 解析 inbound route envelope builder |
| `resolveInboundRouteEnvelopeBuilderWithRuntime` | `(params) → builder` | `function` | 搭配 runtime 的 envelope builder |

#### inbound-reply-dispatch.ts
| export | 簽名 | 回傳 | 說明 |
|--------|------|------|------|
| `dispatchReplyFromConfigWithSettledDispatcher` | `async (params) → void` | `Promise<void>` | 從 config 分派回覆（settled mode） |
| `buildInboundReplyDispatchBase` | `(params) → base` | `object` | 建構 inbound 回覆分派基底 |
| `dispatchInboundReplyWithBase` | `async (params) → void` | `Promise<void>` | 以 base 分派 inbound 回覆 |
| `recordInboundSessionAndDispatchReply` | `async (params) → void` | `Promise<void>` | 記錄 session 並分派回覆 |

#### json-store.ts
| export | 簽名 | 回傳 | 說明 |
|--------|------|------|------|
| `readJsonFileWithFallback<T>` | `async (path, fallback) → T` | `Promise<T>` | 讀取 JSON 檔，失敗回 fallback |
| `writeJsonFileAtomically` | `async (filePath, value) → void` | `Promise<void>` | 原子寫入 JSON 檔 |

#### keyed-async-queue.ts
| export | 簽名 | 回傳 | 說明 |
|--------|------|------|------|
| `type KeyedAsyncQueueHooks` | — | type | queue hook 回呼 |
| `enqueueKeyedTask<T>` | `(params) → Promise<T>` | `Promise<T>` | 將任務排入 keyed queue |
| `class KeyedAsyncQueue` | — | class | 依 key 分組的非同步佇列 |

#### oauth-utils.ts
| export | 簽名 | 回傳 | 說明 |
|--------|------|------|------|
| `toFormUrlEncoded` | `(data) → string` | `string` | 物件轉 URL-encoded form |
| `generatePkceVerifierChallenge` | `() → { verifier, challenge }` | `object` | 產生 PKCE verifier + challenge |

#### onboarding.ts
| export | 簽名 | 回傳 | 說明 |
|--------|------|------|------|
| `type PromptAccountIdParams` | — | type | 帳號 ID 提示參數 |
| `promptAccountId` | `async (params) → string` | `Promise<string>` | 互動式提示使用者輸入帳號 ID |

#### outbound-media.ts
| export | 簽名 | 回傳 | 說明 |
|--------|------|------|------|
| `type OutboundMediaLoadOptions` | — | type | outbound 媒體載入選項 |
| `loadOutboundMediaFromUrl` | `async (url, options?) → Buffer` | `Promise<Buffer>` | 從 URL 載入 outbound 媒體 |

#### pairing-access.ts
| export | 簽名 | 回傳 | 說明 |
|--------|------|------|------|
| `createScopedPairingAccess` | `(params) → access` | `object` | 建立 scoped pairing 存取控制器 |

#### permission-level.ts
| 入口 | re-export |
| --- | --- |
| Permission level types + utils | 統一權限等級系統的 SDK 入口 |

#### persistent-dedupe.ts
| export | 簽名 | 回傳 | 說明 |
|--------|------|------|------|
| `type PersistentDedupeOptions` | — | type | 持久去重選項（ttl, fileMaxEntries） |
| `type PersistentDedupeCheckOptions` | — | type | 去重檢查選項 |
| `type PersistentDedupe` | — | type | 去重介面（checkAndRecord, warmup, clearMemory） |
| `createPersistentDedupe` | `(options) → PersistentDedupe` | `PersistentDedupe` | 建立 memory + disk 持久去重器 |

#### provider-auth-result.ts
| export | 簽名 | 回傳 | 說明 |
|--------|------|------|------|
| `buildOauthProviderAuthResult` | `(params) → result` | `object` | 建構 OAuth provider auth 結果 |

#### reply-payload.ts
| export | 簽名 | 回傳 | 說明 |
|--------|------|------|------|
| `type OutboundReplyPayload` | — | type | outbound 回覆 payload |
| `normalizeOutboundReplyPayload` | `(payload) → normalized` | `OutboundReplyPayload` | 正規化 outbound 回覆 payload |
| `createNormalizedOutboundDeliverer` | `(deliverer) → normalized` | `function` | 建立正規化 outbound 投遞器 |
| `resolveOutboundMediaUrls` | `(payload) → string[]` | `string[]` | 從 payload 解析 outbound 媒體 URL |
| `sendPayloadWithChunkedTextAndMedia` | `async (params) → result` | `Promise<result>` | 分段發送文字 + 媒體 |
| `isNumericTargetId` | `(raw) → boolean` | `boolean` | 檢查是否為純數字 target ID |
| `formatTextWithAttachmentLinks` | `(params) → string` | `string` | 格式化文字附件連結 |
| `sendMediaWithLeadingCaption` | `async (params) → void` | `Promise<void>` | 帶標題發送媒體 |

#### request-url.ts
| export | 簽名 | 回傳 | 說明 |
|--------|------|------|------|
| `resolveRequestUrl` | `(input: RequestInfo \| URL) → string` | `string` | 從 Request/URL 物件解析 URL 字串 |

#### resolution-notes.ts
| export | 簽名 | 回傳 | 說明 |
|--------|------|------|------|
| `formatResolvedUnresolvedNote` | `(params) → string` | `string` | 格式化 resolved/unresolved 狀態說明 |

#### run-command.ts
| export | 簽名 | 回傳 | 說明 |
|--------|------|------|------|
| `type PluginCommandRunResult` | — | type | plugin 命令執行結果 |
| `type PluginCommandRunOptions` | — | type | plugin 命令執行選項 |
| `runPluginCommandWithTimeout` | `async (cmd, args, options) → PluginCommandRunResult` | `Promise<PluginCommandRunResult>` | 帶 timeout 執行 plugin 命令 |

#### runtime-store.ts
| export | 簽名 | 回傳 | 說明 |
|--------|------|------|------|
| `createPluginRuntimeStore<T>` | `(errorMessage) → { get, set }` | `{ get, set }` | 建立 plugin runtime 單例 store |

#### runtime.ts
| export | 簽名 | 回傳 | 說明 |
|--------|------|------|------|
| `createLoggerBackedRuntime` | `(params: { logger, exitError? }) → RuntimeEnv` | `RuntimeEnv` | 建立 logger-backed RuntimeEnv |
| `resolveRuntimeEnv` | `(params: { runtime?, logger, exitError? }) → RuntimeEnv` | `RuntimeEnv` | 解析或建立 RuntimeEnv |
| `resolveRuntimeEnvWithUnavailableExit` | `(params) → RuntimeEnv` | `RuntimeEnv` | 建立 exit 為 throw 的 RuntimeEnv |

#### secret-input-schema.ts
| export | 簽名 | 回傳 | 說明 |
|--------|------|------|------|
| `buildSecretInputSchema` | `() → ZodSchema` | `ZodSchema` | 建構 secret input Zod schema |

#### slack-message-actions.ts
| export | 簽名 | 回傳 | 說明 |
|--------|------|------|------|
| `handleSlackMessageAction` | `async (params) → void` | `Promise<void>` | 處理 Slack message action |

#### ssrf-policy.ts
| export | 簽名 | 回傳 | 說明 |
|--------|------|------|------|
| `normalizeHostnameSuffixAllowlist` | `(input?, defaults?) → string[]` | `string[]` | 正規化 hostname suffix allowlist |
| `isHttpsUrlAllowedByHostnameSuffixAllowlist` | `(url, allowlist) → boolean` | `boolean` | 檢查 HTTPS URL 是否在 hostname suffix allowlist |
| `buildHostnameAllowlistPolicyFromSuffixAllowlist` | `(allowHosts?) → SsrFPolicy \| undefined` | `SsrFPolicy \| undefined` | 從 suffix allowlist 建構 SSRF policy |

#### status-helpers.ts
| export | 簽名 | 回傳 | 說明 |
|--------|------|------|------|
| `createDefaultChannelRuntimeState<T>` | `(params) → state` | `T` | 建立預設 channel runtime 狀態 |
| `buildBaseChannelStatusSummary` | `(snapshot) → summary` | `object` | 建構基礎 channel 狀態摘要 |
| `buildProbeChannelStatusSummary<TExtra>` | `(params) → summary` | `object` | 建構 probe channel 狀態摘要 |
| `buildBaseAccountStatusSnapshot` | `(params) → snapshot` | `object` | 建構基礎帳號狀態快照 |
| `buildComputedAccountStatusSnapshot` | `(params) → snapshot` | `object` | 建構計算後帳號狀態快照 |
| `buildRuntimeAccountStatusSnapshot` | `(params) → snapshot` | `object` | 建構 runtime 帳號狀態快照 |
| `buildTokenChannelStatusSummary` | `(params) → summary` | `object` | 建構 token channel 狀態摘要 |
| `collectStatusIssuesFromLastError` | `(params) → issues[]` | `array` | 從最後錯誤收集狀態問題 |

#### temp-path.ts
| export | 簽名 | 回傳 | 說明 |
|--------|------|------|------|
| `buildRandomTempFilePath` | `(params) → string` | `string` | 建構隨機暫存檔路徑 |
| `withTempDownloadPath<T>` | `async (fn) → T` | `Promise<T>` | 在暫存路徑下執行下載作業 |

#### text-chunking.ts
| export | 簽名 | 回傳 | 說明 |
|--------|------|------|------|
| `chunkTextForOutbound` | `(text, limit) → string[]` | `string[]` | 依限制分段文字用於 outbound |

#### tool-send.ts
| export | 簽名 | 回傳 | 說明 |
|--------|------|------|------|
| `extractToolSend` | `(params) → result` | `object` | 從 tool 結果提取發送 payload |

#### webhook-memory-guards.ts
| export | 簽名 | 回傳 | 說明 |
|--------|------|------|------|
| `type FixedWindowRateLimiter` | — | type | 固定窗口 rate limiter |
| `type BoundedCounter` | — | type | 有上限計數器 |
| `type WebhookAnomalyTracker` | — | type | webhook 異常追蹤器 |
| `WEBHOOK_RATE_LIMIT_DEFAULTS` | — | const | rate limit 預設值 |
| `WEBHOOK_ANOMALY_COUNTER_DEFAULTS` | — | const | 異常計數器預設值 |
| `WEBHOOK_ANOMALY_STATUS_CODES` | — | const | 異常 HTTP status codes |
| `createFixedWindowRateLimiter` | `(options) → FixedWindowRateLimiter` | `FixedWindowRateLimiter` | 建立固定窗口 rate limiter |
| `createBoundedCounter` | `(options) → BoundedCounter` | `BoundedCounter` | 建立有上限計數器 |
| `createWebhookAnomalyTracker` | `(options?) → WebhookAnomalyTracker` | `WebhookAnomalyTracker` | 建立 webhook 異常追蹤器 |

#### webhook-path.ts
| export | 簽名 | 回傳 | 說明 |
|--------|------|------|------|
| `normalizeWebhookPath` | `(raw) → string` | `string` | 正規化 webhook path |
| `resolveWebhookPath` | `(params) → string` | `string` | 解析 webhook 完整 path |

#### webhook-request-guards.ts
| export | 簽名 | 回傳 | 說明 |
|--------|------|------|------|
| `type WebhookBodyReadProfile` | — | type | body 讀取 profile（pre/post-auth） |
| `type WebhookInFlightLimiter` | — | type | in-flight 限制器 |
| `WEBHOOK_BODY_READ_DEFAULTS` | — | const | body 讀取預設值 |
| `WEBHOOK_IN_FLIGHT_DEFAULTS` | — | const | in-flight 預設值 |
| `createWebhookInFlightLimiter` | `(options?) → WebhookInFlightLimiter` | `WebhookInFlightLimiter` | 建立 in-flight 限制器 |
| `isJsonContentType` | `(value) → boolean` | `boolean` | 判斷是否為 JSON content-type |
| `applyBasicWebhookRequestGuards` | `(params) → boolean` | `boolean` | 套用基本 webhook 請求防護 |
| `beginWebhookRequestPipelineOrReject` | `(params) → boolean` | `boolean` | 啟動 webhook pipeline 或拒絕 |
| `readWebhookBodyOrReject` | `async (params) → Buffer \| null` | `Promise<Buffer \| null>` | 讀取 webhook body 或拒絕 |
| `readJsonWebhookBodyOrReject` | `async (params) → T \| null` | `Promise<T \| null>` | 讀取 JSON webhook body 或拒絕 |

#### webhook-targets.ts
| export | 簽名 | 回傳 | 說明 |
|--------|------|------|------|
| `type RegisteredWebhookTarget<T>` | — | type | 已註冊 webhook target |
| `type RegisterWebhookTargetOptions<T>` | — | type | webhook target 註冊選項 |
| `registerWebhookTargetWithPluginRoute<T>` | `(params) → RegisteredWebhookTarget<T>` | `RegisteredWebhookTarget<T>` | 註冊 webhook target 並綁定 plugin route |
| `registerWebhookTarget<T>` | `(targetsByPath, target, options?) → RegisteredWebhookTarget<T>` | `RegisteredWebhookTarget<T>` | 註冊 webhook target |
| `resolveWebhookTargets<T>` | `(targetsByPath, path) → T[]` | `T[]` | 解析 path 對應的 webhook targets |
| `withResolvedWebhookRequestPipeline<T>` | `async (params) → void` | `Promise<void>` | 在解析的 pipeline 中處理 webhook |
| `resolveSingleWebhookTarget<T>` | `(params) → WebhookTargetMatchResult<T>` | `WebhookTargetMatchResult<T>` | 解析單一 webhook target |
| `resolveSingleWebhookTargetAsync<T>` | `async (params) → WebhookTargetMatchResult<T>` | `Promise<WebhookTargetMatchResult<T>>` | 非同步解析單一 webhook target |
| `resolveWebhookTargetWithAuthOrReject<T>` | `async (params) → T \| null` | `Promise<T \| null>` | 解析 webhook target 含 auth 或拒絕 |
| `resolveWebhookTargetWithAuthOrRejectSync<T>` | `(params) → T \| null` | `T \| null` | 同步版 |
| `rejectNonPostWebhookRequest` | `(req, res) → boolean` | `boolean` | 拒絕非 POST webhook 請求 |

#### windows-spawn.ts
| export | 簽名 | 回傳 | 說明 |
|--------|------|------|------|
| `type WindowsSpawnResolution` | — | type | Windows spawn 解析結果類型 |
| `type WindowsSpawnProgram` | — | type | Windows spawn 程式描述 |
| `type WindowsSpawnInvocation` | — | type | Windows spawn 呼叫描述 |
| `resolveWindowsExecutablePath` | `(command, env) → string` | `string` | 解析 Windows 執行檔路徑 |
| `resolveWindowsSpawnProgramCandidate` | `(params) → candidate` | `WindowsSpawnCandidateResolution` | 解析 Windows spawn 候選程式 |
| `applyWindowsSpawnProgramPolicy` | `(params) → invocation` | `WindowsSpawnInvocation` | 套用 spawn 安全政策 |
| `resolveWindowsSpawnProgram` | `(params) → program` | `WindowsSpawnProgram` | 解析 Windows spawn 程式 |
| `materializeWindowsSpawnProgram` | `(params) → invocation` | `WindowsSpawnInvocation` | 具體化 spawn 程式為呼叫指令 |

#### Channel-specific barrel 檔（re-export only）
以下檔案為各 channel extension 的 re-export 入口，不含原創邏輯：
`bluebubbles.ts`, `discord.ts`, `feishu.ts`, `googlechat.ts`, `imessage.ts`, `irc.ts`, `line.ts`, `lobster.ts`, `matrix.ts`, `mattermost.ts`, `msteams.ts`, `nextcloud-talk.ts`, `nostr.ts`, `signal.ts`, `slack.ts`, `synology-chat.ts`, `telegram.ts`, `tlon.ts`, `twitch.ts`, `voice-call.ts`, `whatsapp.ts`, `zalo.ts`, `zalouser.ts`, `copilot-proxy.ts`, `google-gemini-cli-auth.ts`, `minimax-portal-auth.ts`, `qwen-portal-auth.ts`, `device-pair.ts`, `diagnostics-otel.ts`, `diffs.ts`, `llm-task.ts`, `memory-core.ts`, `memory-lancedb.ts`, `open-prose.ts`, `phone-control.ts`, `talk-voice.ts`, `thread-ownership.ts`, `core.ts`, `compat.ts`, `index.ts`

---

### src/memory/

#### index.ts — Public API 入口
| export | 說明 |
|--------|------|
| `MemoryIndexManager` (class) | 記憶索引主管理器 |
| `type MemorySearchManager` | 記憶搜尋介面 |
| `type MemorySearchResult` | 搜尋結果型別 |
| `type MemoryEmbeddingProbeResult` | embedding probe 結果 |
| `getMemorySearchManager` | 取得記憶搜尋管理器 |
| `closeAllMemorySearchManagers` | 關閉所有搜尋管理器 |

#### types.ts
| export | 說明 |
|--------|------|
| `type MemorySource` | 記憶來源（"memory" \| "sessions"） |
| `type MemorySearchResult` | 搜尋結果（relPath, score, snippet, source） |
| `type MemoryEmbeddingProbeResult` | embedding probe 結果 |
| `type MemorySyncProgressUpdate` | 同步進度更新 |
| `type MemoryProviderStatus` | provider 狀態 |
| `interface MemorySearchManager` | 記憶搜尋管理器介面（search, sync, status, close） |

#### backend-config.ts
| export | 簽名 | 回傳 | 說明 |
|--------|------|------|------|
| `type ResolvedMemoryBackendConfig` | — | type | 解析後的記憶 backend 設定 |
| `type ResolvedQmdConfig` | — | type | QMD 設定 |
| `resolveMemoryBackendConfig` | `(params) → ResolvedMemoryBackendConfig` | `ResolvedMemoryBackendConfig` | 解析記憶 backend 設定 |

#### manager.ts
| export | 簽名 | 回傳 | 說明 |
|--------|------|------|------|
| `closeAllMemoryIndexManagers` | `async () → void` | `Promise<void>` | 關閉所有 MemoryIndexManager 實例 |
| `class MemoryIndexManager` | extends `MemoryManagerEmbeddingOps` implements `MemorySearchManager` | class | 核心記憶管理器（向量 + FTS + 同步） |

#### manager-sync-ops.ts
| export | 說明 |
|--------|------|
| `abstract class MemoryManagerSyncOps` | 記憶同步作業基底（file listing, chunk building, DB write） |

#### manager-embedding-ops.ts
| export | 說明 |
|--------|------|
| `abstract class MemoryManagerEmbeddingOps extends MemoryManagerSyncOps` | embedding 作業層（batch embedding, cache） |

#### manager-search.ts
| export | 簽名 | 回傳 | 說明 |
|--------|------|------|------|
| `type SearchSource` | — | type | 搜尋來源標識 |
| `type SearchRowResult` | — | type | 搜尋行結果 |
| `searchVector` | `async (params) → SearchRowResult[]` | `Promise<SearchRowResult[]>` | 向量搜尋 |
| `listChunks` | `(params) → chunks[]` | `array` | 列出所有 chunk |
| `searchKeyword` | `async (params) → SearchRowResult[]` | `Promise<SearchRowResult[]>` | 關鍵字 FTS 搜尋 |

#### search-manager.ts
| export | 簽名 | 回傳 | 說明 |
|--------|------|------|------|
| `type MemorySearchManagerResult` | — | type | 搜尋管理器結果 |
| `getMemorySearchManager` | `async (params: { cfg, agentId, purpose? }) → MemorySearchManagerResult` | `Promise<MemorySearchManagerResult>` | 取得記憶搜尋管理器（自動選擇 backend） |
| `closeAllMemorySearchManagers` | `async () → void` | `Promise<void>` | 關閉所有搜尋管理器 |

#### embeddings.ts — Embedding provider 統一入口
| export | 簽名 | 回傳 | 說明 |
|--------|------|------|------|
| `type EmbeddingProvider` | — | type | embedding 提供者介面（embed, model, dimensions） |
| `type EmbeddingProviderId` | — | type | provider ID（openai/local/gemini/voyage/mistral/ollama） |
| `type EmbeddingProviderResult` | — | type | provider 建立結果（含 fallback info） |
| `DEFAULT_LOCAL_MODEL` | — | const | 預設 local model 名稱 |
| `createEmbeddingProvider` | `async (params) → EmbeddingProviderResult` | `Promise<EmbeddingProviderResult>` | 建立 embedding provider（含 auto + fallback） |

#### embeddings-openai.ts / embeddings-gemini.ts / embeddings-voyage.ts / embeddings-mistral.ts / embeddings-ollama.ts
每個檔案提供：
| export | 說明 |
|--------|------|
| `type {Provider}EmbeddingClient` | 各 provider 的 client 型別 |
| `DEFAULT_{PROVIDER}_EMBEDDING_MODEL` | 預設 model |
| `create{Provider}EmbeddingProvider` | 建立 provider 實例 |
| `resolve{Provider}EmbeddingClient` | 解析 client 設定 |
| `normalize{Provider}Model` | model 名稱標準化 |

#### embeddings-remote-client.ts / embeddings-remote-fetch.ts / embeddings-remote-provider.ts
| export | 說明 |
|--------|------|
| `type RemoteEmbeddingClient` | 遠端 embedding client 型別 |
| `resolveRemoteEmbeddingBearerClient` | 解析遠端 bearer client |
| `fetchRemoteEmbeddingVectors` | 取得遠端 embedding 向量 |
| `createRemoteEmbeddingProvider` | 建立遠端 embedding provider |
| `resolveRemoteEmbeddingClient` | 解析遠端 client |

#### hybrid.ts
| export | 簽名 | 回傳 | 說明 |
|--------|------|------|------|
| `type HybridVectorResult` | — | type | hybrid 向量結果 |
| `type HybridKeywordResult` | — | type | hybrid 關鍵字結果 |
| `buildFtsQuery` | `(raw) → string \| null` | `string \| null` | 建構 FTS query |
| `bm25RankToScore` | `(rank) → number` | `number` | BM25 rank 轉 score |
| `mergeHybridResults` | `async (params) → merged[]` | `Promise<array>` | 合併 hybrid 搜尋結果 |

#### mmr.ts
| export | 簽名 | 回傳 | 說明 |
|--------|------|------|------|
| `type MMRItem` / `type MMRConfig` | — | type | MMR 項目與設定 |
| `DEFAULT_MMR_CONFIG` | — | const | 預設 MMR 設定 |
| `tokenize` | `(text) → Set<string>` | `Set<string>` | 文字分詞 |
| `jaccardSimilarity` | `(setA, setB) → number` | `number` | Jaccard 相似度 |
| `textSimilarity` | `(contentA, contentB) → number` | `number` | 文字相似度 |
| `computeMMRScore` | `(relevance, maxSimilarity, lambda) → number` | `number` | 計算 MMR 分數 |
| `mmrRerank<T>` | `(items, config?) → T[]` | `T[]` | MMR 重排序 |
| `applyMMRToHybridResults` | `(params) → results[]` | `array` | 對 hybrid 結果套用 MMR |

#### temporal-decay.ts
| export | 簽名 | 回傳 | 說明 |
|--------|------|------|------|
| `type TemporalDecayConfig` | — | type | 時間衰減設定 |
| `DEFAULT_TEMPORAL_DECAY_CONFIG` | — | const | 預設衰減設定 |
| `toDecayLambda` | `(halfLifeDays) → number` | `number` | 半衰期轉 lambda |
| `calculateTemporalDecayMultiplier` | `(params) → number` | `number` | 計算時間衰減乘數 |
| `applyTemporalDecayToScore` | `(params) → number` | `number` | 對 score 套用時間衰減 |
| `applyTemporalDecayToHybridResults` | `async (params) → results[]` | `Promise<array>` | 對 hybrid 結果套用時間衰減 |

#### query-expansion.ts
| export | 簽名 | 回傳 | 說明 |
|--------|------|------|------|
| `isQueryStopWordToken` | `(token) → boolean` | `boolean` | 判斷是否為 stop word |
| `extractKeywords` | `(query) → string[]` | `string[]` | 從查詢提取關鍵字 |
| `expandQueryForFts` | `(query) → { expanded, keywords }` | `object` | 擴展查詢用於 FTS |
| `type LlmQueryExpander` | — | type | LLM query 擴展器 |
| `expandQueryWithLlm` | `async (query) → string[]` | `Promise<string[]>` | 用 LLM 擴展查詢 |

#### internal.ts
| export | 簽名 | 回傳 | 說明 |
|--------|------|------|------|
| `type MemoryFileEntry` / `type MemoryChunk` / `type MultimodalMemoryChunk` | — | type | 核心資料結構 |
| `ensureDir` | `(dir) → string` | `string` | 確保目錄存在 |
| `normalizeRelPath` | `(value) → string` | `string` | 正規化相對路徑 |
| `normalizeExtraMemoryPaths` | `(workspaceDir, extraPaths?) → string[]` | `string[]` | 正規化額外記憶路徑 |
| `isMemoryPath` | `(relPath) → boolean` | `boolean` | 判斷是否為 memory 路徑 |
| `listMemoryFiles` | `async (params) → MemoryFileEntry[]` | `Promise<MemoryFileEntry[]>` | 列出所有 memory 檔案 |
| `hashText` | `(value) → string` | `string` | 文字 hash |
| `buildFileEntry` | `async (params) → MemoryFileEntry` | `Promise<MemoryFileEntry>` | 建構檔案 entry |
| `buildMultimodalChunkForIndexing` | `async (params) → MultimodalMemoryChunk` | `Promise<MultimodalMemoryChunk>` | 建構 multimodal chunk |
| `chunkMarkdown` | `(content, ...) → MemoryChunk[]` | `MemoryChunk[]` | markdown 分段 |
| `remapChunkLines` | `(chunks, lineMap) → void` | `void` | 重映射 chunk 行號 |
| `parseEmbedding` | `(raw) → number[]` | `number[]` | 解析 embedding 字串 |
| `cosineSimilarity` | `(a, b) → number` | `number` | 餘弦相似度 |
| `runWithConcurrency<T>` | `async (tasks, limit) → T[]` | `Promise<T[]>` | 帶並發限制執行任務 |

#### multimodal.ts
| export | 簽名 | 回傳 | 說明 |
|--------|------|------|------|
| `type MemoryMultimodalModality` | — | type | multimodal 模態 |
| `type MemoryMultimodalSettings` | — | type | multimodal 設定 |
| `normalizeMemoryMultimodalModalities` | `(raw) → modalities` | `array` | 正規化 multimodal 模態 |
| `normalizeMemoryMultimodalSettings` | `(raw) → settings` | `MemoryMultimodalSettings` | 正規化 multimodal 設定 |
| `isMemoryMultimodalEnabled` | `(settings) → boolean` | `boolean` | 判斷 multimodal 是否啟用 |
| `getMemoryMultimodalExtensions` | `(settings) → string[]` | `string[]` | 取得啟用的副檔名 |
| `classifyMemoryMultimodalPath` | `(path, settings) → modality` | `string \| null` | 分類路徑的 modality |
| `supportsMemoryMultimodalEmbeddings` | `(params) → boolean` | `boolean` | 判斷是否支援 multimodal embedding |

#### batch-* 系列（batch-runner / batch-openai / batch-gemini / batch-voyage / batch-upload / batch-output / batch-status / batch-http / batch-utils / batch-error-utils）
| 核心 export | 說明 |
|------------|------|
| `runEmbeddingBatchGroups` | 執行 embedding batch 群組 |
| `run{Provider}EmbeddingBatches` | 各 provider 的 batch embedding 執行器 |
| `uploadBatchJsonlFile` | 上傳 batch JSONL 檔 |
| `applyEmbeddingBatchOutputLine` | 套用 batch 輸出行 |
| `resolveBatchCompletionFromStatus` | 從狀態解析 batch 完成度 |
| `postJsonWithRetry` | 帶重試的 POST JSON |
| `buildBatchHeaders`, `normalizeBatchBaseUrl`, `splitBatchRequests` | batch 工具函式 |

#### qmd-manager.ts / qmd-process.ts / qmd-query-parser.ts / qmd-scope.ts
| export | 說明 |
|--------|------|
| `class QmdMemoryManager` | QMD backend 記憶管理器 |
| `resolveCliSpawnInvocation` | 解析 CLI spawn 呼叫 |
| `runCliCommand` | 執行 CLI 命令 |
| `parseQmdQueryJson` | 解析 QMD query JSON 輸出 |
| `isQmdScopeAllowed` | 判斷 QMD scope 是否允許 |
| `deriveQmdScopeChannel` | 從 session key 衍生 channel |

#### 其他工具
| 檔案 | 核心 export | 說明 |
|------|------------|------|
| `embedding-chunk-limits.ts` | `enforceEmbeddingMaxInputTokens` | 強制 embedding 最大 input token |
| `embedding-input-limits.ts` | `estimateUtf8Bytes`, `splitTextToUtf8ByteLimit` | UTF-8 位元組估算與分割 |
| `embedding-inputs.ts` | `type EmbeddingInput`, `buildTextEmbeddingInput` | embedding 輸入型別 |
| `embedding-model-limits.ts` | `resolveEmbeddingMaxInputTokens` | 解析各 model 最大 input token |
| `embedding-vectors.ts` | `sanitizeAndNormalizeEmbedding` | embedding 向量正規化 |
| `embeddings-debug.ts` | `debugEmbeddingsLog` | embedding debug 日誌 |
| `embeddings-model-normalize.ts` | `normalizeEmbeddingModelWithPrefixes` | embedding model 名稱正規化 |
| `fs-utils.ts` | `statRegularFile`, `isFileMissingError` | 檔案系統工具 |
| `memory-schema.ts` | `ensureMemoryIndexSchema` | 確保 SQLite 記憶索引 schema |
| `node-llama.ts` | `importNodeLlamaCpp` | 動態 import node-llama-cpp |
| `post-json.ts` | `postJson` | 帶選項的 POST JSON |
| `remote-http.ts` | `buildRemoteBaseUrlPolicy`, `withRemoteHttpResponse` | 遠端 HTTP 工具 |
| `secret-input.ts` | `hasConfiguredMemorySecretInput`, `resolveMemorySecretInputString` | 記憶 secret input 解析 |
| `session-files.ts` | `listSessionFilesForAgent`, `buildSessionEntry` | session 檔案管理 |
| `sqlite.ts` | `requireNodeSqlite` | 載入 node:sqlite |
| `sqlite-vec.ts` | `loadSqliteVecExtension` | 載入 sqlite-vec 擴充 |
| `status-format.ts` | `resolveMemoryVectorState`, `resolveMemoryFtsState`, etc. | 記憶狀態格式化 |

---

### src/secrets/

#### runtime.ts — 密鑰 Runtime 入口
| export | 簽名 | 回傳 | 說明 |
|--------|------|------|------|
| `type PreparedSecretsRuntimeSnapshot` | — | type | 準備好的 secrets runtime 快照 |
| `prepareSecretsRuntimeSnapshot` | `async (params) → PreparedSecretsRuntimeSnapshot` | `Promise<PreparedSecretsRuntimeSnapshot>` | 準備 secrets runtime 快照 |
| `activateSecretsRuntimeSnapshot` | `(snapshot) → void` | `void` | 啟用 secrets runtime 快照 |
| `getActiveSecretsRuntimeSnapshot` | `() → snapshot \| null` | `PreparedSecretsRuntimeSnapshot \| null` | 取得當前啟用的快照 |
| `getActiveRuntimeWebToolsMetadata` | `() → metadata \| null` | `RuntimeWebToolsMetadata \| null` | 取得 web tools metadata |
| `resolveCommandSecretsFromActiveRuntimeSnapshot` | `(params) → assignments` | `CommandSecretAssignment[]` | 從啟用快照解析命令密鑰 |
| `clearSecretsRuntimeSnapshot` | `() → void` | `void` | 清除 runtime 快照 |

#### resolve.ts — 密鑰解析核心
| export | 簽名 | 回傳 | 說明 |
|--------|------|------|------|
| `type SecretRefResolveCache` | — | type | 解析快取 |
| `class SecretProviderResolutionError` | extends Error | class | provider 解析錯誤 |
| `class SecretRefResolutionError` | extends Error | class | ref 解析錯誤 |
| `isProviderScopedSecretResolutionError` | `(err) → boolean` | `boolean` | 判斷是否為 provider-scoped 錯誤 |
| `resolveSecretRefValues` | `async (params) → Map<string, unknown>` | `Promise<Map>` | 批量解析 secret ref 值 |
| `resolveSecretRefValue` | `async (params) → unknown` | `Promise<unknown>` | 解析單一 secret ref 值 |
| `resolveSecretRefString` | `async (params) → string` | `Promise<string>` | 解析 secret ref 為字串 |

#### apply.ts
| export | 簽名 | 回傳 | 說明 |
|--------|------|------|------|
| `type SecretsApplyResult` | — | type | apply 結果 |
| `runSecretsApply` | `async (params) → SecretsApplyResult` | `Promise<SecretsApplyResult>` | 執行 secrets apply（寫入 config） |

#### audit.ts
| export | 簽名 | 回傳 | 說明 |
|--------|------|------|------|
| `type SecretsAuditFinding` / `type SecretsAuditReport` | — | type | audit 發現與報告 |
| `runSecretsAudit` | `async (params) → SecretsAuditReport` | `Promise<SecretsAuditReport>` | 執行密鑰 audit |
| `resolveSecretsAuditExitCode` | `(report, check) → number` | `number` | 解析 audit exit code |

#### plan.ts
| export | 簽名 | 回傳 | 說明 |
|--------|------|------|------|
| `type SecretsPlanTarget` / `type SecretsApplyPlan` | — | type | plan target 與 apply plan |
| `resolveValidatedPlanTarget` | `(candidate) → target` | `SecretsPlanTarget` | 驗證並解析 plan target |
| `isSecretsApplyPlan` | `(value) → boolean` | `boolean` | 型別守衛 |
| `normalizeSecretsPlanOptions` | `(params) → options` | `object` | 正規化 plan 選項 |

#### configure.ts / configure-plan.ts
| export | 簽名 | 回傳 | 說明 |
|--------|------|------|------|
| `type SecretsConfigureResult` | — | type | configure 結果 |
| `runSecretsConfigureInteractive` | `async (params) → SecretsConfigureResult` | `Promise<SecretsConfigureResult>` | 互動式 secrets 設定 |
| `buildConfigureCandidates` | `(config) → ConfigureCandidate[]` | `ConfigureCandidate[]` | 建構設定候選項 |
| `buildConfigureCandidatesForScope` | `(params) → ConfigureCandidate[]` | `ConfigureCandidate[]` | 建構 scope 內候選項 |
| `collectConfigureProviderChanges` | `(params) → changes` | `ConfigureProviderChanges` | 收集 provider 變更 |
| `buildSecretsConfigurePlan` | `(params) → plan` | `object` | 建構 secrets configure plan |

#### ref-contract.ts
| export | 簽名 | 回傳 | 說明 |
|--------|------|------|------|
| `SECRET_PROVIDER_ALIAS_PATTERN` | — | RegExp | provider alias 正規表達式 |
| `secretRefKey` | `(ref) → string` | `string` | 計算 secret ref key |
| `resolveDefaultSecretProviderAlias` | `(params) → string` | `string` | 解析預設 provider alias |
| `isValidFileSecretRefId` / `isValidExecSecretRefId` / `isValidSecretProviderAlias` | `(value) → boolean` | `boolean` | 各種驗證函式 |
| `validateExecSecretRefId` | `(value) → ExecSecretRefIdValidationResult` | `ExecSecretRefIdValidationResult` | exec ref ID 驗證 |

#### command-config.ts
| export | 簽名 | 回傳 | 說明 |
|--------|------|------|------|
| `type CommandSecretAssignment` | — | type | 命令密鑰分配 |
| `analyzeCommandSecretAssignmentsFromSnapshot` | `(params) → result` | `AnalyzeAssignmentsFromSnapshotResult` | 從快照分析命令密鑰分配 |
| `collectCommandSecretAssignmentsFromSnapshot` | `(params) → result` | `ResolveAssignmentsFromSnapshotResult` | 從快照收集命令密鑰分配 |

#### runtime-shared.ts
| export | 簽名 | 回傳 | 說明 |
|--------|------|------|------|
| `type SecretAssignment` / `type ResolverContext` | — | type | 密鑰分配與解析 context |
| `createResolverContext` | `(params) → ResolverContext` | `ResolverContext` | 建立解析 context |
| `pushAssignment` / `pushWarning` | `(context, item) → void` | `void` | 新增分配/警告 |
| `collectSecretInputAssignment` | `(params) → void` | `void` | 收集 secret input 分配 |
| `applyResolvedAssignments` | `(params) → void` | `void` | 套用已解析的分配 |
| `isEnabledFlag` / `isChannelAccountEffectivelyEnabled` | `(value) → boolean` | `boolean` | 啟用旗標判斷 |

#### runtime-config-collectors*.ts
| 檔案 | 核心 export | 說明 |
|------|------------|------|
| `runtime-config-collectors.ts` | `collectConfigAssignments` | 收集所有 config 密鑰分配（統合入口） |
| `runtime-config-collectors-core.ts` | `collectCoreConfigAssignments` | 收集 core config 密鑰分配 |
| `runtime-config-collectors-channels.ts` | `collectChannelConfigAssignments` | 收集各 channel config 密鑰分配 |
| `runtime-config-collectors-tts.ts` | `collectTtsApiKeyAssignments` | 收集 TTS API key 分配 |
| `runtime-auth-collectors.ts` | `collectAuthStoreAssignments` | 收集 auth store 密鑰分配 |

#### runtime-web-tools.ts
| export | 簽名 | 回傳 | 說明 |
|--------|------|------|------|
| `type RuntimeWebToolsMetadata` | — | type | web tools metadata |
| `resolveRuntimeWebTools` | `async (params) → RuntimeWebToolsMetadata` | `Promise<RuntimeWebToolsMetadata>` | 解析 runtime web tools 狀態 |

#### runtime-gateway-auth-surfaces.ts
| export | 簽名 | 回傳 | 說明 |
|--------|------|------|------|
| `GATEWAY_AUTH_SURFACE_PATHS` | — | const | gateway auth 表面路徑 |
| `evaluateGatewayAuthSurfaceStates` | `(params) → GatewayAuthSurfaceStateMap` | `GatewayAuthSurfaceStateMap` | 評估 gateway auth 表面狀態 |

#### target-registry*.ts — Secret Target 註冊系統
| 檔案 | 核心 export | 說明 |
|------|------------|------|
| `target-registry-types.ts` | `type SecretTargetRegistryEntry`, `type DiscoveredConfigSecretTarget` | target 型別定義 |
| `target-registry-data.ts` | `SECRET_TARGET_REGISTRY` | 完整 target 註冊資料 |
| `target-registry-pattern.ts` | `parsePathPattern`, `compileTargetRegistryEntry`, `matchPathTokens`, `expandPathTokens` | path pattern 解析 + 匹配 |
| `target-registry-query.ts` | `listSecretTargetRegistryEntries`, `discoverConfigSecretTargets`, `resolvePlanTargetAgainstRegistry` | target 查詢 + 探索 |
| `target-registry.ts` | re-export `target-registry-query` | 統一入口 |

#### 其他工具
| 檔案 | 核心 export | 說明 |
|------|------------|------|
| `json-pointer.ts` | `readJsonPointer`, `setJsonPointer` | JSON Pointer 讀寫 |
| `path-utils.ts` | `getPath`, `setPathCreateStrict`, `deletePathStrict` | 物件路徑操作 |
| `shared.ts` | `isRecord`, `isNonEmptyString`, `parseDotPath`, `writeJsonFileSecure`, etc. | 共用工具函式 |
| `secret-value.ts` | `isExpectedResolvedSecretValue`, `assertExpectedResolvedSecretValue` | secret 值驗證 |
| `provider-env-vars.ts` | `PROVIDER_ENV_VARS`, `listKnownProviderAuthEnvVarNames` | provider 環境變數 |
| `config-io.ts` | `createSecretsConfigIO` | secrets config I/O |
| `credential-matrix.ts` | `buildSecretRefCredentialMatrix` | 建構 credential matrix |
| `auth-profiles-scan.ts` | `iterateAuthProfileCredentials` | 迭代 auth profile credentials |
| `auth-store-paths.ts` | `listAuthProfileStorePaths`, `collectAuthStorePaths` | auth store 路徑 |
| `storage-scan.ts` | `readJsonObjectIfExists`, `listAuthProfileStorePaths`, `listLegacyAuthJsonPaths` | 儲存掃描 |
| `resolve-secret-input-string.ts` | `resolveSecretInputString` | 解析 secret input 字串 |

---

### src/security/

#### audit.ts — 安全審計主入口
| export | 簽名 | 回傳 | 說明 |
|--------|------|------|------|
| `type SecurityAuditSeverity` | — | type | 嚴重度（info/warn/critical） |
| `type SecurityAuditFinding` / `type SecurityAuditReport` | — | type | 發現與報告 |
| `type SecurityAuditOptions` | — | type | audit 選項 |
| `runSecurityAudit` | `async (opts) → SecurityAuditReport` | `Promise<SecurityAuditReport>` | 執行完整安全審計 |

#### audit-extra.sync.ts — 同步安全檢查集
| export | 說明 |
|--------|------|
| `collectAttackSurfaceSummaryFindings` | 攻擊面摘要 |
| `collectSyncedFolderFindings` | 同步資料夾風險 |
| `collectSecretsInConfigFindings` | config 中明文密鑰 |
| `collectHooksHardeningFindings` | hooks 加固檢查 |
| `collectGatewayHttpSessionKeyOverrideFindings` | gateway session key 覆寫 |
| `collectGatewayHttpNoAuthFindings` | gateway 無 auth 檢查 |
| `collectSandboxDockerNoopFindings` | sandbox docker noop |
| `collectSandboxDangerousConfigFindings` | sandbox 危險設定 |
| `collectNodeDenyCommandPatternFindings` | node deny command pattern |
| `collectNodeDangerousAllowCommandFindings` | node 危險 allow command |
| `collectMinimalProfileOverrideFindings` | minimal profile 覆寫 |
| `collectModelHygieneFindings` | model 衛生檢查 |
| `collectSmallModelRiskFindings` | 小 model 風險 |
| `collectExposureMatrixFindings` | 暴露矩陣 |
| `collectLikelyMultiUserSetupFindings` | 多用戶設定偵測 |

#### audit-extra.async.ts — 非同步安全檢查集
| export | 說明 |
|--------|------|
| `collectSandboxBrowserHashLabelFindings` | sandbox 瀏覽器 hash label |
| `collectPluginsTrustFindings` | plugin 信任檢查 |
| `collectWorkspaceSkillSymlinkEscapeFindings` | skill symlink 逃逸 |
| `collectIncludeFilePermFindings` | include 檔案權限 |
| `collectStateDeepFilesystemFindings` | state 深層檔案系統 |
| `readConfigSnapshotForAudit` | 讀取 config 快照 |
| `collectPluginsCodeSafetyFindings` | plugin 程式碼安全 |
| `collectInstalledSkillsCodeSafetyFindings` | 已安裝 skill 程式碼安全 |

#### audit-channel.ts
| export | 簽名 | 回傳 | 說明 |
|--------|------|------|------|
| `collectChannelSecurityFindings` | `async (params) → SecurityAuditFinding[]` | `Promise<SecurityAuditFinding[]>` | 收集各 channel 安全發現 |

#### audit-fs.ts
| export | 簽名 | 回傳 | 說明 |
|--------|------|------|------|
| `type PermissionCheck` | — | type | 權限檢查結果 |
| `safeStat` | `async (path) → { exists, stat }` | `Promise<object>` | 安全 stat |
| `inspectPathPermissions` | `async (path) → PermissionCheck` | `Promise<PermissionCheck>` | 檢查路徑權限 |
| `formatPermissionDetail` / `formatPermissionRemediation` | `(params) → string` | `string` | 格式化權限資訊 |
| `modeBits`, `isWorldWritable`, `isGroupWritable`, etc. | `(mode) → boolean` | `boolean` | 權限位元判斷 |

#### sensitive-filter.ts — 敏感資訊過濾器（Phase 2.5）
| export | 簽名 | 回傳 | 說明 |
|--------|------|------|------|
| `registerSessionSender` | `(sessionKey, isOwner) → void` | `void` | 註冊 session sender 的 owner 狀態 |
| `unregisterSessionSender` | `(sessionKey) → void` | `void` | 移除 session sender |
| `isSessionOwner` | `(sessionKey) → boolean` | `boolean` | 判斷 session 是否為 owner |
| `loadSecurityConfig` | `(config?) → void` | `void` | 載入安全設定 |
| `isSensitivePath` | `(filePath) → boolean` | `boolean` | 判斷是否為敏感路徑 |
| `containsSensitiveContent` | `(text) → boolean` | `boolean` | 檢測文字是否含敏感內容 |
| `redactSensitiveContent` | `(text) → string` | `string` | 遮蔽敏感內容 |
| `type SensitivePathCheckResult` | — | type | 敏感路徑檢查結果 |
| `checkToolCallSensitivity` | `(params) → SensitivePathCheckResult` | `SensitivePathCheckResult` | 檢查 tool call 的敏感度 |
| `filterToolResultContent` | `(params) → filtered` | `object` | 過濾 tool result 內容 |
| `filterLlmOutput` | `(text) → { filtered, text }` | `object` | 過濾 LLM 輸出 |

#### external-content.ts — 外部內容安全處理
| export | 簽名 | 回傳 | 說明 |
|--------|------|------|------|
| `detectSuspiciousPatterns` | `(content) → string[]` | `string[]` | 偵測可疑 injection 模式 |
| `type ExternalContentSource` | — | type | 外部內容來源 |
| `type WrapExternalContentOptions` | — | type | 包裝選項 |
| `wrapExternalContent` | `(content, options) → string` | `string` | 安全包裝外部內容 |
| `buildSafeExternalPrompt` | `(params) → string` | `string` | 建構安全外部 prompt |
| `isExternalHookSession` | `(sessionKey) → boolean` | `boolean` | 判斷是否為外部 hook session |
| `getHookType` | `(sessionKey) → ExternalContentSource` | `ExternalContentSource` | 取得 hook type |
| `wrapWebContent` | `(params) → string` | `string` | 包裝 web 內容 |

#### dm-policy-shared.ts — DM 策略共用邏輯
| export | 簽名 | 回傳 | 說明 |
|--------|------|------|------|
| `resolvePinnedMainDmOwnerFromAllowlist` | `(params) → string \| null` | `string \| null` | 從 allowlist 解析固定 DM owner |
| `resolveEffectiveAllowFromLists` | `(params) → { effectiveAllowFrom, effectiveGroupAllowFrom }` | `object` | 解析有效 allowFrom 列表 |
| `type DmGroupAccessDecision` | — | type | DM 群組存取決策 |
| `readStoreAllowFromForDmPolicy` | `async (params) → string[]` | `Promise<string[]>` | 從 store 讀取 DM policy allowFrom |
| `resolveDmGroupAccessDecision` | `(params) → decision` | `object` | 解析 DM 群組存取決策 |
| `resolveDmGroupAccessWithLists` | `(params) → decision` | `object` | 搭配 list 的 DM 群組存取決策 |
| `resolveDmGroupAccessWithCommandGate` | `(params) → decision` | `object` | 搭配 command gate 的存取決策 |
| `resolveDmAllowState` | `async (params) → state` | `Promise<object>` | 解析 DM allow 狀態 |

#### fix.ts
| export | 簽名 | 回傳 | 說明 |
|--------|------|------|------|
| `type SecurityFixAction` | — | type | 安全修正動作（chmod / icacls） |
| `type SecurityFixResult` | — | type | 修正結果 |
| `fixSecurityFootguns` | `async (opts?) → SecurityFixResult` | `Promise<SecurityFixResult>` | 自動修正常見安全問題 |

#### 其他
| 檔案 | 核心 export | 說明 |
|------|------------|------|
| `dangerous-config-flags.ts` | `collectEnabledInsecureOrDangerousFlags` | 收集已啟用的不安全旗標 |
| `dangerous-tools.ts` | `DEFAULT_GATEWAY_HTTP_TOOL_DENY`, `DANGEROUS_ACP_TOOLS` | 危險工具黑名單 |
| `channel-metadata.ts` | `buildUntrustedChannelMetadata` | 建構不受信任的 channel metadata |
| `mutable-allowlist-detectors.ts` | `isDiscordMutableAllowEntry`, `isSlackMutableAllowEntry`, etc. | 各 channel 的 mutable allowlist 偵測 |
| `safe-regex.ts` | `testRegexWithBoundedInput`, `hasNestedRepetition`, `compileSafeRegex` | 安全正規表達式 |
| `scan-paths.ts` | `isPathInside`, `isPathInsideWithRealpath`, `extensionUsesSkippedScannerPath` | 路徑包含判斷 |
| `secret-equal.ts` | `safeEqualSecret` | timing-safe 密鑰比較 |
| `skill-scanner.ts` | `isScannable`, `scanSource`, `scanDirectory`, `scanDirectoryWithSummary` | skill 程式碼掃描 |
| `windows-acl.ts` | `parseIcaclsOutput`, `summarizeWindowsAcl`, `inspectWindowsAcl`, `formatIcaclsResetCommand` | Windows ACL 操作 |
| `audit-tool-policy.ts` | re-export `pickSandboxToolPolicy` | sandbox tool policy |

---

## 呼叫關聯圖

```
┌─────────────────────────────────────────────────────────────────────┐
│                        plugin-sdk (對外 API 面)                      │
│  index.ts ──┬── channel-plugin-common.ts ── re-exports ──────────── │
│             ├── channel-lifecycle.ts                                 │
│             ├── webhook-targets.ts ── webhook-request-guards.ts     │
│             │                        └── webhook-memory-guards.ts   │
│             ├── command-auth.ts ──────→ security/dm-policy-shared   │
│             ├── group-access.ts                                     │
│             ├── inbound-envelope.ts → inbound-reply-dispatch.ts     │
│             ├── reply-payload.ts                                    │
│             ├── persistent-dedupe.ts → file-lock.ts → json-store.ts│
│             ├── ssrf-policy.ts                                      │
│             └── windows-spawn.ts                                    │
│                                                                     │
│  Channel barrels (discord/slack/line/...) ── re-export from:        │
│    channels/*, config/*, infra/*, routing/*, pairing/*              │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ depends on
┌──────────────────────────▼──────────────────────────────────────────┐
│                        security (安全機制)                           │
│  audit.ts ─┬── audit-extra.sync.ts (16 sync checks)                │
│            ├── audit-extra.async.ts (9 async checks)                │
│            ├── audit-channel.ts                                     │
│            └── audit-fs.ts ──→ windows-acl.ts                       │
│                                                                     │
│  sensitive-filter.ts ←── agents (tool interception)                 │
│  external-content.ts ←── agents (prompt wrapping)                   │
│  dm-policy-shared.ts ←── plugin-sdk/command-auth.ts                 │
│                       ←── channel plugins                           │
│  fix.ts ←── CLI (openclaw security fix)                             │
│  skill-scanner.ts ←── audit-extra.async.ts                          │
│  safe-regex.ts ←── multiple consumers                               │
│  scan-paths.ts ←── secrets/resolve.ts                               │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ used by
┌──────────────────────────▼──────────────────────────────────────────┐
│                        secrets (密鑰管理)                            │
│  runtime.ts ─┬── resolve.ts ──→ ref-contract.ts                     │
│              │               ──→ json-pointer.ts                    │
│              │               ──→ path-utils.ts                      │
│              │               ──→ security/audit-fs.ts               │
│              │               ──→ security/scan-paths.ts             │
│              ├── runtime-config-collectors.ts                        │
│              │   ├── runtime-config-collectors-core.ts               │
│              │   ├── runtime-config-collectors-channels.ts           │
│              │   └── runtime-config-collectors-tts.ts                │
│              ├── runtime-auth-collectors.ts                          │
│              └── runtime-web-tools.ts                                │
│                                                                     │
│  apply.ts ──→ plan.ts → target-registry-query.ts                    │
│          ──→ resolve.ts, storage-scan.ts                            │
│  audit.ts ──→ resolve.ts                                            │
│  configure.ts → configure-plan.ts → target-registry                 │
│  target-registry.ts → target-registry-query.ts                      │
│                     → target-registry-pattern.ts                    │
│                     → target-registry-data.ts                       │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                        memory (記憶子系統)                           │
│  index.ts → manager.ts → manager-embedding-ops.ts                   │
│                         → manager-sync-ops.ts                       │
│                         → manager-search.ts                         │
│           → search-manager.ts ──→ backend-config.ts                 │
│                               ──→ qmd-manager.ts                    │
│                                                                     │
│  embeddings.ts ─┬── embeddings-openai.ts                            │
│                 ├── embeddings-gemini.ts                             │
│                 ├── embeddings-voyage.ts                             │
│                 ├── embeddings-mistral.ts                            │
│                 ├── embeddings-ollama.ts                             │
│                 └── embeddings-remote-*.ts                           │
│                                                                     │
│  hybrid.ts ←── manager.ts (merge vector + keyword results)          │
│  mmr.ts ←── manager.ts (rerank)                                     │
│  temporal-decay.ts ←── manager.ts (score decay)                     │
│  query-expansion.ts ←── manager.ts (query expand)                   │
│  internal.ts ←── manager-sync-ops.ts (chunk, hash, list)            │
│  batch-*.ts ←── manager-embedding-ops.ts (batch embedding)          │
│                                                                     │
│  secret-input.ts ──→ secrets/resolve-secret-input-string.ts         │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 系統歸屬分類

### 1. Channel Extension API（plugin-sdk 核心功能）
提供 extension 開發者統一 API，涵蓋 channel 生命週期、webhook 處理、存取控制。

| 子分類 | 關鍵檔案 |
|--------|---------|
| Channel 生命週期 | `channel-lifecycle.ts`, `channel-send-result.ts`, `status-helpers.ts` |
| Webhook 基礎設施 | `webhook-targets.ts`, `webhook-request-guards.ts`, `webhook-memory-guards.ts`, `webhook-path.ts` |
| Inbound 處理 | `inbound-envelope.ts`, `inbound-reply-dispatch.ts`, `reply-payload.ts` |
| 存取控制 | `allow-from.ts`, `allowlist-resolution.ts`, `command-auth.ts`, `group-access.ts`, `pairing-access.ts` |
| Config 輔助 | `channel-config-helpers.ts`, `config-paths.ts`, `account-resolution.ts`, `boolean-param.ts` |
| 工具類 | `file-lock.ts`, `json-store.ts`, `keyed-async-queue.ts`, `persistent-dedupe.ts`, `temp-path.ts`, `text-chunking.ts`, `runtime.ts`, `runtime-store.ts` |
| 網路安全 | `ssrf-policy.ts`, `fetch-auth.ts` |
| OAuth | `oauth-utils.ts`, `provider-auth-result.ts` |
| 平台特定 | `windows-spawn.ts`, `discord-send.ts`, `slack-message-actions.ts` |

### 2. 記憶子系統（memory）
向量 + FTS hybrid search engine，支援多 embedding provider。

| 子分類 | 關鍵檔案 |
|--------|---------|
| 核心管理器 | `manager.ts`, `manager-sync-ops.ts`, `manager-embedding-ops.ts`, `manager-search.ts` |
| 搜尋入口 | `search-manager.ts`, `index.ts` |
| Embedding Provider | `embeddings.ts`, `embeddings-{openai,gemini,voyage,mistral,ollama}.ts` |
| 遠端 Embedding | `embeddings-remote-{client,fetch,provider}.ts` |
| 搜尋演算法 | `hybrid.ts`(hybrid merge), `mmr.ts`(MMR rerank), `temporal-decay.ts`(時間衰減), `query-expansion.ts`(查詢擴展) |
| 資料處理 | `internal.ts`(chunk/hash), `embedding-*.ts`(limits/inputs/vectors) |
| Batch 處理 | `batch-runner.ts`, `batch-{openai,gemini,voyage}.ts`, `batch-upload.ts`, `batch-output.ts` |
| QMD Backend | `qmd-manager.ts`, `qmd-process.ts`, `qmd-query-parser.ts`, `qmd-scope.ts` |
| Backend 設定 | `backend-config.ts`, `multimodal.ts` |
| 基礎設施 | `sqlite.ts`, `sqlite-vec.ts`, `memory-schema.ts`, `fs-utils.ts`, `session-files.ts` |

### 3. 密鑰管理（secrets）
完整的 secret ref 解析、runtime 快照、target registry 系統。

| 子分類 | 關鍵檔案 |
|--------|---------|
| 核心解析 | `resolve.ts`(ref 解析), `ref-contract.ts`(ref 合約), `secret-value.ts`(值驗證) |
| Runtime | `runtime.ts`(快照管理), `runtime-shared.ts`(共用), `runtime-web-tools.ts` |
| Config 收集器 | `runtime-config-collectors*.ts`, `runtime-auth-collectors.ts` |
| 操作命令 | `apply.ts`(套用), `audit.ts`(審計), `configure.ts`(互動設定) |
| Plan 系統 | `plan.ts`, `configure-plan.ts` |
| Target Registry | `target-registry*.ts`(5 檔) — 密鑰 target 註冊、查詢、pattern 匹配 |
| 工具 | `json-pointer.ts`, `path-utils.ts`, `shared.ts`, `config-io.ts`, `storage-scan.ts` |

### 4. 安全機制（security）
安全審計、敏感資訊過濾、DM 策略、外部內容防護。

| 子分類 | 關鍵檔案 |
|--------|---------|
| 安全審計 | `audit.ts`(主入口), `audit-extra.sync.ts`(16 sync), `audit-extra.async.ts`(9 async), `audit-channel.ts`, `audit-fs.ts` |
| 敏感過濾 | `sensitive-filter.ts`(Phase 2.5 三層過濾) |
| 外部內容 | `external-content.ts`(injection 防護 + 安全包裝) |
| DM 策略 | `dm-policy-shared.ts`(DM 群組存取決策) |
| 自動修正 | `fix.ts`(chmod/icacls 修正) |
| 偵測器 | `dangerous-config-flags.ts`, `dangerous-tools.ts`, `mutable-allowlist-detectors.ts` |
| 掃描 | `skill-scanner.ts`, `scan-paths.ts`, `safe-regex.ts` |
| 平台 | `windows-acl.ts`(Windows ACL) |
| 輔助 | `secret-equal.ts`(timing-safe), `channel-metadata.ts` |
