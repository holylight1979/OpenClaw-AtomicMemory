# Core: Routing — 函式級索引

> Phase 2 deep read (2026-03-20). 涵蓋 src/routing/ 全部非 test 檔案。

## 總覽

Routing 子系統負責將「來自某 channel 的訊息」解析為一條完整路由：**哪個 agent、哪個 account、用哪個 session key 存取對話狀態**。核心入口是 `resolveAgentRoute()`，它根據 config 中的 bindings 規則，依照 peer → parentPeer → guild+roles → guild → team → account → channel → default 的優先級匹配，回傳 `ResolvedAgentRoute`。

輔助模組處理三類正規化邏輯：accountId 正規化與快取（`account-id.ts`）、agentId / sessionKey 的建構與解析（`session-key.ts`）、以及 binding 查詢與偏好帳號解析（`bindings.ts`）。所有 ID 正規化皆為 lowercase + 非法字元替換，並帶 LRU / WeakMap 快取。

## 檔案清單

| 檔案路徑 | 行數 | 子系統角色 |
|----------|------|-----------|
| `src/routing/account-id.ts` | 70 | accountId 正規化 + LRU 快取 |
| `src/routing/account-lookup.ts` | 14 | case-insensitive account entry 查找 |
| `src/routing/bindings.ts` | 114 | binding 查詢 / bound account 列舉 / 偏好帳號 |
| `src/routing/default-account-warnings.ts` | 17 | config 路徑格式化（警告訊息用） |
| `src/routing/resolve-route.ts` | 804 | **核心路由解析引擎** — binding 評估 + 快取 + agent 路由 |
| `src/routing/session-key.ts` | 253 | agentId/sessionKey 建構、解析、分類、re-export hub |

## 函式索引

### account-id.ts

| 匯出 | 簽名 | 說明 |
|------|------|------|
| `DEFAULT_ACCOUNT_ID` | `const: "default"` | 預設帳號 ID 常數 |
| `normalizeAccountId` | `(value: string \| undefined \| null) => string` | 正規化 accountId，空值回傳 `"default"`，帶 LRU 快取 |
| `normalizeOptionalAccountId` | `(value: string \| undefined \| null) => string \| undefined` | 同上但空值回傳 `undefined` |

內部函式：`canonicalizeAccountId`、`normalizeCanonicalAccountId`、`setNormalizeCache`。

跨模組依賴：`../infra/prototype-keys.js` → `isBlockedObjectKey`

### account-lookup.ts

| 匯出 | 簽名 | 說明 |
|------|------|------|
| `resolveAccountEntry<T>` | `(accounts: Record<string, T> \| undefined, accountId: string) => T \| undefined` | Case-insensitive 查找 accounts 物件中的 entry |

跨模組依賴：無

### bindings.ts

| 匯出 | 簽名 | 說明 |
|------|------|------|
| `listBindings` | `(cfg: OpenClawConfig) => AgentRouteBinding[]` | 取得 config 中所有路由 binding（委派 `config/bindings.js`） |
| `listBoundAccountIds` | `(cfg: OpenClawConfig, channelId: string) => string[]` | 列出特定 channel 下所有被 binding 綁定的 accountId，排序回傳 |
| `resolveDefaultAgentBoundAccountId` | `(cfg: OpenClawConfig, channelId: string) => string \| null` | 找出 default agent 在指定 channel 的 bound accountId |
| `buildChannelAccountBindings` | `(cfg: OpenClawConfig) => Map<string, Map<string, string[]>>` | 建構 channelId → agentId → accountId[] 的完整 binding 映射 |
| `resolvePreferredAccountId` | `(params: { accountIds: string[]; defaultAccountId: string; boundAccounts: string[] }) => string` | 優先選用 bound account，否則回傳 default |

內部函式：`normalizeBindingChannelId`、`resolveNormalizedBindingMatch`。

跨模組依賴：
- `../agents/agent-scope.js` → `resolveDefaultAgentId`
- `../channels/registry.js` → `normalizeChatChannelId`
- `../config/bindings.js` → `listRouteBindings`
- `../config/config.js` → `OpenClawConfig` (type)
- `../config/types.agents.js` → `AgentRouteBinding` (type)
- `./session-key.js` → `normalizeAccountId`, `normalizeAgentId`

### default-account-warnings.ts

| 匯出 | 簽名 | 說明 |
|------|------|------|
| `formatChannelDefaultAccountPath` | `(channelKey: string) => string` | 回傳 `channels.{key}.defaultAccount` 路徑字串 |
| `formatChannelAccountsDefaultPath` | `(channelKey: string) => string` | 回傳 `channels.{key}.accounts.default` 路徑字串 |
| `formatSetExplicitDefaultInstruction` | `(channelKey: string) => string` | 產生設定預設帳號的提示訊息 |
| `formatSetExplicitDefaultToConfiguredInstruction` | `(params: { channelKey: string }) => string` | 同上，針對已有帳號列表的情境 |

跨模組依賴：無

### resolve-route.ts

| 匯出 | 簽名 | 說明 |
|------|------|------|
| `RoutePeerKind` | `type = ChatType` | **@deprecated** — peer 種類別名 |
| `RoutePeer` | `type { kind: ChatType; id: string }` | 對話對象描述 |
| `ResolveAgentRouteInput` | `type { cfg, channel, accountId?, peer?, parentPeer?, guildId?, teamId?, memberRoleIds? }` | 路由解析輸入 |
| `ResolvedAgentRoute` | `type { agentId, channel, accountId, sessionKey, mainSessionKey, lastRoutePolicy, matchedBy }` | 路由解析結果 |
| `DEFAULT_ACCOUNT_ID` | re-export from `session-key.js` | 預設帳號 ID |
| `DEFAULT_AGENT_ID` | re-export from `session-key.js` | 預設 agent ID |
| `deriveLastRoutePolicy` | `(params: { sessionKey: string; mainSessionKey: string }) => "main" \| "session"` | 判斷 last-route 更新策略 |
| `resolveInboundLastRouteSessionKey` | `(params: { route: Pick<...>; sessionKey: string }) => string` | 根據 policy 決定寫入 last-route 的 session key |
| `buildAgentSessionKey` | `(params: { agentId, channel, accountId?, peer?, dmScope?, identityLinks? }) => string` | 建構完整 agent session key（委派 `buildAgentPeerSessionKey`） |
| `pickFirstExistingAgentId` | `(cfg: OpenClawConfig, agentId: string) => string` | 查找 config 中存在的 agent ID，不存在則回退 default |
| **`resolveAgentRoute`** | `(input: ResolveAgentRouteInput) => ResolvedAgentRoute` | **核心路由解析** — 7 層 tier 匹配 binding，帶 WeakMap 快取 |

內部函式（多）：`normalizeToken`、`normalizeId`、`listAgents`、`resolveAgentLookupCache`、`buildEvaluatedBindingsByChannel`、`mergeEvaluatedBindingsInSourceOrder`、`pushToIndexMap`、`peerLookupKeys`、`collectPeerIndexedBindings`、`buildEvaluatedBindingsIndex`、`getEvaluatedBindingsForChannelAccount`、`getEvaluatedBindingIndexForChannelAccount`、`normalizePeerConstraint`、`normalizeBindingMatch`、`resolveRouteCacheForConfig`、`formatRouteCachePeer`、`formatRoleIdsCacheKey`、`buildResolvedRouteCacheKey`、`hasGuildConstraint`、`hasTeamConstraint`、`hasRolesConstraint`、`peerKindMatches`、`matchesBindingScope`。

跨模組依賴：
- `../agents/agent-scope.js` → `resolveDefaultAgentId`
- `../channels/chat-type.js` → `ChatType` (type), `normalizeChatType`
- `../config/config.js` → `OpenClawConfig` (type)
- `../globals.js` → `shouldLogVerbose`
- `../logger.js` → `logDebug`
- `./bindings.js` → `listBindings`
- `./session-key.js` → `buildAgentMainSessionKey`, `buildAgentPeerSessionKey`, `DEFAULT_ACCOUNT_ID`, `DEFAULT_MAIN_KEY`, `normalizeAccountId`, `normalizeAgentId`, `sanitizeAgentId`

### session-key.ts

| 匯出 | 簽名 | 說明 |
|------|------|------|
| `DEFAULT_AGENT_ID` | `const: "main"` | 預設 agent ID |
| `DEFAULT_MAIN_KEY` | `const: "main"` | 預設 main session key 片段 |
| `SessionKeyShape` | `type: "missing" \| "agent" \| "legacy_or_alias" \| "malformed_agent"` | session key 結構分類 |
| `scopedHeartbeatWakeOptions<T>` | `(sessionKey: string, wakeOptions: T) => T \| (T & { sessionKey })` | 若 sessionKey 可解析，附加到 wake options |
| `normalizeMainKey` | `(value: string \| undefined \| null) => string` | 正規化 main key，空值回傳 `"main"` |
| `toAgentRequestSessionKey` | `(storeKey: string \| undefined \| null) => string \| undefined` | store key → request key（去掉 agent: 前綴） |
| `toAgentStoreSessionKey` | `(params: { agentId, requestKey, mainKey? }) => string` | request key → store key（加上 agent: 前綴） |
| `resolveAgentIdFromSessionKey` | `(sessionKey: string \| undefined \| null) => string` | 從 session key 提取 agent ID |
| `classifySessionKeyShape` | `(sessionKey: string \| undefined \| null) => SessionKeyShape` | 判斷 session key 結構類型 |
| `normalizeAgentId` | `(value: string \| undefined \| null) => string` | 正規化 agent ID，同 account-id 邏輯 |
| `isValidAgentId` | `(value: string \| undefined \| null) => boolean` | 驗證 agent ID 格式 |
| `sanitizeAgentId` | `(value: string \| undefined \| null) => string` | `normalizeAgentId` 別名 |
| `buildAgentMainSessionKey` | `(params: { agentId, mainKey? }) => string` | 建構 `agent:{id}:{mainKey}` 格式 key |
| `buildAgentPeerSessionKey` | `(params: { agentId, mainKey?, channel, accountId?, peerKind?, peerId?, identityLinks?, dmScope? }) => string` | 根據 peer 種類與 dmScope 建構完整 session key |
| `buildGroupHistoryKey` | `(params: { channel, accountId?, peerKind, peerId }) => string` | 建構群組歷史記錄 key |
| `resolveThreadSessionKeys` | `(params: { baseSessionKey, threadId?, parentSessionKey?, useSuffix?, normalizeThreadId? }) => { sessionKey, parentSessionKey? }` | 處理 thread 子對話的 session key 衍生 |
| Re-exports from `../sessions/session-key-utils.js` | `getSubagentDepth`, `isCronSessionKey`, `isAcpSessionKey`, `isSubagentSessionKey`, `parseAgentSessionKey`, `ParsedAgentSessionKey` | Session key 解析工具 |
| Re-exports from `./account-id.js` | `DEFAULT_ACCOUNT_ID`, `normalizeAccountId`, `normalizeOptionalAccountId` | Account ID 正規化 |

內部函式：`normalizeToken`、`resolveLinkedPeerId`。

跨模組依賴：
- `../channels/chat-type.js` → `ChatType` (type)
- `../sessions/session-key-utils.js` → `parseAgentSessionKey`, `ParsedAgentSessionKey`, 及其他 re-exports
- `./account-id.js` → `DEFAULT_ACCOUNT_ID`, `normalizeAccountId`

## API 入口

| 函式 | 檔案 | 入口類型 | 說明 |
|------|------|---------|------|
| `resolveAgentRoute` | resolve-route.ts | **Public API — 核心路由入口** | 所有 inbound 訊息路由的主解析函式 |
| `buildAgentSessionKey` | resolve-route.ts | Public API | 外部建構 session key（不經 binding 匹配） |
| `pickFirstExistingAgentId` | resolve-route.ts | Public API | 驗證 agent ID 存在性 |
| `buildAgentPeerSessionKey` | session-key.ts | Public API | 底層 session key 建構 |
| `buildAgentMainSessionKey` | session-key.ts | Public API | main session key 建構 |
| `toAgentStoreSessionKey` | session-key.ts | Public API | request ↔ store key 轉換 |
| `resolveAgentIdFromSessionKey` | session-key.ts | Public API | session key 反解 agent ID |
| `normalizeAccountId` | account-id.ts | Public API | 全系統 accountId 正規化 |
| `normalizeAgentId` | session-key.ts | Public API | 全系統 agentId 正規化 |
| `listBoundAccountIds` | bindings.ts | Public API | 查詢 channel binding 帳號 |
| `resolveDefaultAgentBoundAccountId` | bindings.ts | Public API | 查詢 default agent binding |
| `resolveAccountEntry` | account-lookup.ts | Public API | 泛型 account record 查找 |

## 呼叫關聯圖

```
resolveAgentRoute (resolve-route.ts)  ← 核心入口
 ├── normalizeAccountId (session-key.ts → account-id.ts)
 ├── normalizeChatType (../channels/chat-type.js)
 ├── listBindings (bindings.ts → ../config/bindings.js)
 ├── getEvaluatedBindingsForChannelAccount
 │    ├── buildEvaluatedBindingsByChannel
 │    │    ├── listBindings
 │    │    └── normalizeBindingMatch → normalizePeerConstraint
 │    └── mergeEvaluatedBindingsInSourceOrder
 ├── getEvaluatedBindingIndexForChannelAccount
 │    └── buildEvaluatedBindingsIndex → peerLookupKeys, pushToIndexMap
 ├── collectPeerIndexedBindings → peerLookupKeys
 ├── matchesBindingScope → peerKindMatches
 ├── pickFirstExistingAgentId
 │    └── resolveAgentLookupCache
 │         ├── normalizeAgentId (session-key.ts)
 │         ├── sanitizeAgentId (session-key.ts)
 │         └── resolveDefaultAgentId (../agents/agent-scope.js)
 ├── buildAgentSessionKey
 │    └── buildAgentPeerSessionKey (session-key.ts)
 │         ├── normalizeAgentId
 │         ├── normalizeAccountId
 │         ├── normalizeMainKey
 │         └── resolveLinkedPeerId
 ├── buildAgentMainSessionKey (session-key.ts)
 │    ├── normalizeAgentId
 │    └── normalizeMainKey
 └── deriveLastRoutePolicy

bindings.ts 內部呼叫：
 listBindings → listRouteBindings (../config/bindings.js)
 listBoundAccountIds → listBindings, resolveNormalizedBindingMatch
 resolveDefaultAgentBoundAccountId → listBindings, resolveNormalizedBindingMatch
 buildChannelAccountBindings → listBindings, resolveNormalizedBindingMatch
 resolveNormalizedBindingMatch → normalizeBindingChannelId, normalizeAgentId, normalizeAccountId
```

## 跨模組依賴

| 依賴模組 | 引用來源 | 用途 |
|---------|---------|------|
| `src/agents/agent-scope.js` | bindings.ts, resolve-route.ts | `resolveDefaultAgentId` — 取得 config 中的預設 agent |
| `src/channels/chat-type.js` | resolve-route.ts, session-key.ts | `ChatType` 型別 + `normalizeChatType` 正規化 |
| `src/channels/registry.js` | bindings.ts | `normalizeChatChannelId` — channel ID 正規化 |
| `src/config/bindings.js` | bindings.ts | `listRouteBindings` — 讀取 config 中的 binding 定義 |
| `src/config/config.js` | bindings.ts, resolve-route.ts | `OpenClawConfig` 型別 |
| `src/config/types.agents.js` | bindings.ts | `AgentRouteBinding` 型別 |
| `src/globals.js` | resolve-route.ts | `shouldLogVerbose` — 控制 debug 日誌 |
| `src/logger.js` | resolve-route.ts | `logDebug` — 路由匹配過程日誌 |
| `src/infra/prototype-keys.js` | account-id.ts | `isBlockedObjectKey` — 防止 prototype 汙染 |
| `src/sessions/session-key-utils.js` | session-key.ts | `parseAgentSessionKey` 等 session key 解析工具 |
