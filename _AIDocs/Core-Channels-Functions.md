# Core-Channels-Functions — 函式級索引

> 掃描範圍：`src/channels/`、`src/line/`、`src/whatsapp/`、`src/pairing/`、`src/sessions/`
> 產出日期：2026-03-21 | 非測試 .ts 檔約 156 支

---

## 目錄結構

```
src/channels/                         # Channel 抽象層 (root 32 files)
├── allowlists/                       # Allowlist 解析工具 (1 file)
├── plugins/                          # Channel Plugin 註冊/載入/類型 (root 20 files)
│   ├── actions/                      # Action 輔助 (2 files)
│   ├── normalize/                    # Target 正規化 (2 files)
│   ├── onboarding/                   # 引導流程 (2 files)
│   ├── outbound/                     # 各 channel outbound adapter (8 files)
│   └── status-issues/               # 狀態診斷 (2 files)
├── transport/                        # 傳輸監控 (1 file)
src/line/                             # LINE Messaging (root 21 files)
├── flex-templates/                   # Flex Message 模板 (6 files)
src/whatsapp/                         # WhatsApp (2 files)
src/pairing/                          # 配對機制 (5 files)
src/sessions/                         # Session 管理 (9 files)
```

---

## src/channels/ (root)

### account-snapshot-fields.ts (218 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `resolveConfiguredFromCredentialStatuses` | `(statuses) → boolean` | 從 credential 狀態陣列判定是否已設定 | helper |
| `resolveConfiguredFromRequiredCredentialStatuses` | `(statuses) → boolean` | 所有必要 credential 皆已設定 | helper |
| `hasConfiguredUnavailableCredentialStatus` | `(statuses) → boolean` | 是否有已設定但不可用的 credential | helper |
| `hasResolvedCredentialValue` | `(status) → boolean` | 單一 credential 值已解析 | helper |
| `projectCredentialSnapshotFields` | `(statuses) → CredentialSnapshot` | 投影 credential 快照欄位 | helper |
| `projectSafeChannelAccountSnapshotFields` | `(params) → SafeSnapshot` | 產出安全的 channel account 快照（去敏感資料） | **entry** |

### account-summary.ts (75 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `buildChannelAccountSnapshot` | `(params) → AccountSnapshot` | 建立 channel account 快照 | **entry** |
| `formatChannelAllowFrom` | `(allowFrom) → string` | 格式化 allowFrom 為可讀字串 | helper |
| `resolveChannelAccountEnabled` | `(account) → boolean` | 判定 channel account 是否啟用 | helper |
| `resolveChannelAccountConfigured` | `(account) → boolean` | 判定 channel account 是否已設定 | helper |

### ack-reactions.ts (104 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `shouldAckReaction` | `(cfg, channel, chatType) → AckReactionDecision` | 判定是否發送 ack reaction | **entry** |
| `shouldAckReactionForWhatsApp` | `(cfg, chatType) → AckReactionDecision` | WhatsApp 專用 ack reaction 判定 | entry |
| `removeAckReactionAfterReply` | `(cfg, channel) → boolean` | 回覆後是否移除 ack reaction | helper |

### allow-from.ts (54 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `mergeDmAllowFromSources` | `(base, account, channel) → string[]` | 合併 DM allowFrom 來源（base + account + channel） | **entry** |
| `resolveGroupAllowFromSources` | `(base, account) → string[]` | 合併群組 allowFrom 來源 | entry |
| `firstDefined` | `(...values) → T \| undefined` | 回傳第一個非 undefined 值 | utility |
| `isSenderIdAllowed` | `(senderId, allowFrom) → boolean` | 檢查 sender ID 是否在 allowFrom 內 | helper |

### allowlist-match.ts (116 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `formatAllowlistMatchMeta` | `(meta) → string` | 格式化 allowlist match 元資料 | helper |
| `compileAllowlist` | `(entries) → CompiledAllowlist` | 編譯 allowlist（含 wildcard 展開） | **entry** |
| `resolveAllowlistCandidates` | `(params) → string[]` | 解析 allowlist 候選值 | helper |
| `resolveCompiledAllowlistMatch` | `(compiled, candidates) → AllowlistMatch` | 以編譯過的 allowlist 比對候選值 | helper |
| `resolveAllowlistMatchByCandidates` | `(entries, candidates) → AllowlistMatch` | 候選值比對（一步完成） | entry |
| `resolveAllowlistMatchSimple` | `(entries, value) → AllowlistMatch` | 單值比對 | entry |

### channel-config.ts (183 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `applyChannelMatchMeta` | `(match, meta) → void` | 將 match metadata 寫入結果 | helper |
| `resolveChannelMatchConfig` | `(cfg, key) → MatchConfig` | 解析 channel match 組態 | helper |
| `normalizeChannelSlug` | `(slug) → string` | 正規化 channel slug（小寫去空白） | utility |
| `buildChannelKeyCandidates` | `(params) → string[]` | 建立 channel key 候選清單（含 fallback/wildcard） | helper |
| `resolveChannelEntryMatch` | `(cfg, params) → EntryMatch \| null` | 解析 channel entry match（精確） | **entry** |
| `resolveChannelEntryMatchWithFallback` | `(cfg, params) → EntryMatch \| null` | 解析 channel entry match（含 fallback/parent/wildcard） | **entry** |
| `resolveNestedAllowlistDecision` | `(cfg, params) → AllowlistDecision` | 巢狀 allowlist 決策（channel → account → base） | **entry** |

### chat-type.ts (19 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `normalizeChatType` | `(raw) → ChatType \| undefined` | 正規化 chat type（dm/group/channel） | utility |

### conversation-label.ts (70 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `resolveConversationLabel` | `(ctx: MsgContext) → string` | 從 MsgContext 解析對話標籤 | **entry** |

### draft-stream-controls.ts (143 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `createFinalizableDraftStreamControls` | `(params) → DraftStreamControls` | 建立可終結的 draft stream 控制器 | **entry** |
| `createFinalizableDraftStreamControlsForState` | `(state) → DraftStreamControls` | 從既有 state 建立 draft stream 控制器 | entry |
| `takeMessageIdAfterStop` | `(controls) → string \| null` | stop 後取出 message ID | helper |
| `clearFinalizableDraftMessage` | `(controls) → void` | 清除 draft message 狀態 | helper |
| `createFinalizableDraftLifecycle` | `(params) → DraftLifecycle` | 建立完整 draft 生命週期（controls + loop） | **entry** |

### draft-stream-loop.ts (105 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `createDraftStreamLoop` | `(params) → DraftStreamLoop` | 建立節流式 draft stream 迴圈（update/flush/stop） | **entry** |

### inbound-debounce-policy.ts (52 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `shouldDebounceTextInbound` | `(cfg, channel) → boolean` | 判定是否 debounce 文字 inbound | helper |
| `createChannelInboundDebouncer` | `(cfg) → Debouncer` | 建立 channel inbound debouncer | **entry** |

### location.ts (77 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `formatLocationText` | `(location) → string` | 格式化地理位置為可讀文字 | helper |
| `toLocationContext` | `(location) → LocationContext` | 轉換為 location context 物件 | helper |

### logging.ts (34 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `logInboundDrop` | `(channel, reason) → void` | 記錄 inbound drop 事件 | helper |
| `logTypingFailure` | `(channel, err) → void` | 記錄 typing 失敗 | helper |
| `logAckFailure` | `(channel, err) → void` | 記錄 ack 失敗 | helper |

### mention-gating.ts (60 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `resolveMentionGating` | `(params) → MentionGatingResult` | 解析 mention gating（群組訊息需 @mention） | **entry** |
| `resolveMentionGatingWithBypass` | `(params) → MentionGatingResult` | 含 text command bypass 的 mention gating | **entry** |

### model-overrides.ts (143 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `resolveChannelModelOverride` | `(cfg, channel, chatType) → ChannelModelOverride \| null` | 解析 channel 層級的 model override | **entry** |

### native-command-session-targets.ts (20 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `resolveNativeCommandSessionTargets` | `(cfg) → string[]` | 解析 native command session targets | entry |

### registry.ts (201 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `CHAT_CHANNEL_ORDER` | `string[]` | 9 個 channel 的排序陣列 | const |
| `CHANNEL_IDS` | `string[]` | 所有 channel ID | const |
| `listChatChannels` | `() → ChatChannelMeta[]` | 列出所有 chat channel 元資料 | **entry** |
| `listChatChannelAliases` | `() → Map<string, string>` | 列出 channel 別名對照 | helper |
| `getChatChannelMeta` | `(id) → ChatChannelMeta \| undefined` | 取得指定 channel 元資料 | helper |
| `normalizeChatChannelId` | `(raw) → string \| undefined` | 正規化 chat channel ID（含別名） | utility |
| `normalizeChannelId` | `(raw) → string \| undefined` | 正規化 channel ID | utility |
| `normalizeAnyChannelId` | `(raw) → string \| undefined` | 正規化任意 channel ID（含 extended） | utility |
| `formatChannelPrimerLine` | `(meta) → string` | 格式化 channel 簡介行 | helper |
| `formatChannelSelectionLine` | `(meta) → string` | 格式化 channel 選擇行 | helper |

### run-state-machine.ts (100 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `createRunStateMachine` | `(params) → RunStateMachine` | 建立 run state machine（active run 計數 + heartbeat） | **entry** |

### sender-identity.ts (42 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `validateSenderIdentity` | `(identity) → ValidationResult` | 驗證 sender identity 結構 | **entry** |

### sender-label.ts (60 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `resolveSenderLabel` | `(params) → string` | 解析 sender 顯示名稱（name/username/tag/e164/id） | **entry** |
| `listSenderLabelCandidates` | `(params) → string[]` | 列出 sender label 候選值 | helper |

### session-envelope.ts (22 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `resolveInboundSessionEnvelopeContext` | `(params) → EnvelopeContext` | 解析 inbound session envelope context | **entry** |

### session-meta.ts (25 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `recordInboundSessionMetaSafe` | `(params) → void` | 安全地記錄 inbound session metadata | **entry** |

### session.ts (82 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `recordInboundSession` | `(params) → void` | 記錄 inbound session（含 last-route 更新 + DM owner pin） | **entry** |

### targets.ts (147 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `normalizeTargetId` | `(id) → string` | 正規化 target ID | utility |
| `buildMessagingTarget` | `(params) → MessagingTarget` | 建立 messaging target 物件 | helper |
| `ensureTargetId` | `(target) → string` | 確保 target 有 ID（否則 throw） | helper |
| `parseTargetMention` | `(text) → TargetMention \| null` | 解析 @mention target | helper |
| `parseTargetPrefix` | `(text) → TargetPrefix \| null` | 解析 prefix target | helper |
| `parseTargetPrefixes` | `(text) → TargetPrefix[]` | 解析多個 prefix target | helper |
| `parseAtUserTarget` | `(text) → string \| null` | 解析 @user target | helper |
| `parseMentionPrefixOrAtUserTarget` | `(text) → ParsedTarget \| null` | 統一解析 mention/prefix/@user | **entry** |
| `requireTargetKind` | `(target, kind) → void` | 斷言 target kind | guard |

### thread-binding-id.ts (16 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `resolveThreadBindingConversationIdFromBindingId` | `(bindingId) → string \| null` | 從 binding ID 解析 conversation ID | helper |

### thread-bindings-messages.ts (114 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `formatThreadBindingDurationLabel` | `(ms) → string` | 格式化 thread binding 時長標籤 | helper |
| `resolveThreadBindingThreadName` | `(params) → string` | 解析 thread binding 的 thread 名稱 | helper |
| `resolveThreadBindingIntroText` | `(params) → string` | 產出 thread binding 啟始文字 | **entry** |
| `resolveThreadBindingFarewellText` | `(params) → string` | 產出 thread binding 結束文字 | **entry** |

### thread-bindings-policy.ts (202 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `resolveThreadBindingIdleTimeoutMs` | `(cfg) → number` | 解析 thread binding idle timeout（毫秒） | helper |
| `resolveThreadBindingMaxAgeMs` | `(cfg) → number` | 解析 thread binding max age（毫秒） | helper |
| `resolveThreadBindingsEnabled` | `(cfg, channel) → boolean` | 判定 thread binding 是否啟用 | **entry** |
| `resolveThreadBindingSpawnPolicy` | `(cfg, channel) → SpawnPolicy` | 解析 thread binding spawn 策略 | **entry** |
| `resolveThreadBindingIdleTimeoutMsForChannel` | `(cfg, channel) → number` | channel 層級的 idle timeout | helper |
| `resolveThreadBindingMaxAgeMsForChannel` | `(cfg, channel) → number` | channel 層級的 max age | helper |
| `formatThreadBindingDisabledError` | `() → string` | thread binding 停用錯誤文字 | helper |
| `formatThreadBindingSpawnDisabledError` | `() → string` | thread binding spawn 停用錯誤文字 | helper |

### transport/stall-watchdog.ts (104 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `createArmableStallWatchdog` | `(params) → StallWatchdog` | 建立可啟動的 stall watchdog（傳輸層停滯監控） | **entry** |

### typing-lifecycle.ts (56 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `createTypingKeepaliveLoop` | `(params) → TypingKeepaliveLoop` | 建立 typing keepalive 迴圈 | **entry** |

### typing-start-guard.ts (64 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `createTypingStartGuard` | `(params) → TypingStartGuard` | 建立 typing 啟動守衛（連續失敗自動 trip） | **entry** |

### typing.ts (100 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `createTypingCallbacks` | `(params) → TypingCallbacks` | 建立 typing callbacks（含 TTL 安全機制） | **entry** |

---

## src/channels/allowlists/

### resolve-utils.ts (163 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `mergeAllowlist` | `(base, additions) → string[]` | 合併 allowlist（去重） | helper |
| `buildAllowlistResolutionSummary` | `(mapping) → string` | 建立 allowlist 解析摘要 | helper |
| `resolveAllowlistIdAdditions` | `(params) → string[]` | 解析要加入 allowlist 的 ID | helper |
| `canonicalizeAllowlistWithResolvedIds` | `(params) → string[]` | 以 resolved ID 正規化 allowlist | helper |
| `patchAllowlistUsersInConfigEntries` | `(entries, users) → void` | 將 users patch 寫入 config entries | helper |
| `addAllowlistUserEntriesFromConfigEntry` | `(entry, users) → void` | 從 config entry 加入 allowlist user entries | helper |
| `summarizeMapping` | `(mapping) → string` | 摘要 ID mapping | helper |

---

## src/channels/plugins/

### types.plugin.ts (86 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `ChannelPlugin` | interface | **核心 channel plugin 介面**（所有 adapter slot） | **type** |

### index.ts (118 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `listChannelPlugins` | `() → ChannelPlugin[]` | 列出所有已註冊 channel plugins | **entry** |
| `getChannelPlugin` | `(id) → ChannelPlugin \| undefined` | 取得指定 channel plugin（cached） | **entry** |
| `normalizeChannelId` | re-export | 正規化 channel ID（來自 registry） | re-export |

### load.ts (9 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `loadChannelPlugin` | `(id) → Promise<ChannelPlugin>` | 從 registry 載入 channel plugin | **entry** |

### types.ts (66 行)

> Type re-exports barrel，無函式 export。

### account-action-gate.ts (22 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `createAccountActionGate` | `(base, account) → ActionGate` | 建立 account action gate（base + account merge） | **entry** |

### account-helpers.ts (63 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `createAccountListHelpers` | `(params) → AccountListHelpers` | 建立 account list helpers（list IDs / resolve default） | **entry** |

### allowlist-match.ts (3 行)

> Re-export from `../allowlist-match.ts`。

### channel-config.ts (11 行)

> Re-export from `../channel-config.ts`。

### config-helpers.ts (176 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `setAccountEnabledInConfigSection` | `(section, accountId, enabled) → void` | 啟用/停用 config section 內的 account | **entry** |
| `deleteAccountFromConfigSection` | `(section, accountId) → void` | 從 config section 刪除 account | entry |
| `clearAccountEntryFields` | `(entry, fields) → void` | 清除 account entry 指定欄位 | helper |

### bluebubbles-actions.ts (35 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `BLUEBUBBLES_ACTIONS` | `ActionSpec[]` | BlueBubbles action 定義 | const |
| `BLUEBUBBLES_ACTION_NAMES` | `string[]` | BlueBubbles action 名稱列表 | const |
| `BLUEBUBBLES_GROUP_ACTIONS` | `ActionSpec[]` | BlueBubbles 群組 action | const |

### group-policy-warnings.ts (158 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `collectOpenGroupPolicyWarnings` | `(cfg, channel) → string[]` | 收集 open group policy 警告 | **entry** |
| `formatGroupPolicyWarnings` | `(warnings) → string` | 格式化 group policy 警告 | helper |

### media-limits.ts (26 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `resolveChannelMediaMaxBytes` | `(cfg, channel) → number` | 解析 channel media 最大位元組 | **entry** |

### media-payload.ts (34 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `buildMediaPayload` | `(params) → MediaPayload` | 建立 media payload 物件 | helper |

### message-action-names.ts (58 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `CHANNEL_MESSAGE_ACTION_NAMES` | `string[]` | 所有 channel message action 名稱（55 個） | const |

### message-actions.ts (104 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `listChannelMessageActions` | `(channel) → ActionSpec[]` | 列出 channel 的 message actions | helper |
| `supportsChannelMessageButtons` | `(channel) → boolean` | channel 是否支援 message buttons | helper |
| `supportsChannelMessageButtonsForChannel` | `(channel) → boolean` | 同上（per channel ID） | helper |
| `supportsChannelMessageCards` | `(channel) → boolean` | channel 是否支援 message cards | helper |
| `supportsChannelMessageCardsForChannel` | `(channel) → boolean` | 同上（per channel ID） | helper |
| `dispatchChannelMessageAction` | `(params) → Promise<void>` | 分派 channel message action | **entry** |

### pairing-message.ts (3 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `PAIRING_APPROVED_MESSAGE` | `string` | 配對成功訊息常數 | const |

### pairing.ts (70 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `listPairingChannels` | `() → ChannelPlugin[]` | 列出支援配對的 channels | helper |
| `getPairingAdapter` | `(channelId) → PairingAdapter \| undefined` | 取得 channel 的 pairing adapter | helper |
| `requirePairingAdapter` | `(channelId) → PairingAdapter` | 取得 pairing adapter（不存在時 throw） | helper |
| `resolvePairingChannel` | `(cfg) → string \| null` | 解析預設 pairing channel | **entry** |
| `notifyPairingApproved` | `(params) → Promise<void>` | 發送配對成功通知 | **entry** |

### registry-loader.ts (36 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `createChannelRegistryLoader` | `(params) → RegistryLoader` | 建立通用 channel registry loader（含 cache invalidation） | **entry** |

### whatsapp-heartbeat.ts (100 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `resolveWhatsAppHeartbeatRecipients` | `(cfg) → string[]` | 解析 WhatsApp heartbeat 接收者 | **entry** |

### onboarding-types.ts (101 行)

> Types only，無函式 export。

### normalize/shared.ts (23 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `trimMessagingTarget` | `(target) → string` | trim messaging target 字串 | utility |
| `looksLikeHandleOrPhoneTarget` | `(target) → boolean` | 判定是否像 handle 或電話號碼 | utility |

### normalize/signal.ts (71 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `normalizeSignalMessagingTarget` | `(target) → string` | 正規化 Signal messaging target | **entry** |
| `looksLikeSignalTargetId` | `(target) → boolean` | 判定是否為 Signal target ID | utility |

### onboarding/channel-access-configure.ts (42 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `configureChannelAccessWithAllowlist` | `(params) → Promise<void>` | 以 allowlist 設定 channel 存取權限 | **entry** |

### onboarding/channel-access.ts (99 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `parseAllowlistEntries` | `(raw) → string[]` | 解析 allowlist 文字輸入 | helper |
| `formatAllowlistEntries` | `(entries) → string` | 格式化 allowlist entries | helper |
| `promptChannelAccessPolicy` | `(params) → Promise<AccessPolicy>` | 引導使用者選擇 channel access policy | entry |
| `promptChannelAllowlist` | `(params) → Promise<string[]>` | 引導使用者輸入 allowlist | entry |
| `promptChannelAccessConfig` | `(params) → Promise<AccessConfig>` | 完整 channel access 引導流程 | **entry** |

### actions/reaction-message-id.ts (13 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `resolveReactionMessageId` | `(params) → string \| null` | 解析 reaction 對應的 message ID | helper |

### actions/shared.ts (20 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `listTokenSourcedAccounts` | `(accounts) → Account[]` | 列出以 token 為來源的 accounts | helper |
| `createUnionActionGate` | `(gates) → ActionGate` | 建立 union action gate（OR 合併多個 gate） | helper |

### status-issues/bluebubbles.ts (101 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `collectBlueBubblesStatusIssues` | `(cfg) → StatusIssue[]` | 收集 BlueBubbles 狀態問題 | **entry** |

### status-issues/shared.ts (64 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `asString` | `(v) → string` | 安全轉字串 | utility |
| `formatMatchMetadata` | `(meta) → string` | 格式化 match metadata | helper |
| `appendMatchMetadata` | `(issues, meta) → void` | 附加 match metadata 至 issues | helper |
| `resolveEnabledConfiguredAccountId` | `(cfg, channel) → string \| undefined` | 解析啟用且已設定的 account ID | helper |
| `collectIssuesForEnabledAccounts` | `(params) → StatusIssue[]` | 收集所有啟用 account 的狀態問題 | **entry** |

---

## src/channels/plugins/outbound/

### load.ts (18 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `loadChannelOutboundAdapter` | `(channelId) → OutboundAdapter \| null` | 載入 channel outbound adapter | **entry** |

### direct-text-media.ts (194 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `resolvePayloadMediaUrls` | `(payload) → string[]` | 解析 payload 中的 media URLs | helper |
| `sendPayloadMediaSequence` | `(params) → Promise<void>` | 依序發送 media payload | helper |
| `sendTextMediaPayload` | `(params) → Promise<void>` | 發送 text + media payload | helper |
| `resolveScopedChannelMediaMaxBytes` | `(cfg, channel) → number` | 解析 scoped channel media 上限 | helper |
| `createScopedChannelMediaMaxBytesResolver` | `(cfg) → (channel) → number` | 建立 scoped media 上限 resolver | helper |
| `createDirectTextMediaOutbound` | `(params) → OutboundAdapter` | 建立 direct text+media outbound adapter（iMessage/Signal 共用模式） | **entry** |

### discord.ts (3 行)

> Shim re-export from extension。

### imessage.ts (36 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `imessageOutbound` | `OutboundAdapter` | iMessage outbound adapter 實例 | **entry** |

### signal.ts (32 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `signalOutbound` | `OutboundAdapter` | Signal outbound adapter 實例 | **entry** |

### slack.ts (169 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `slackOutbound` | `OutboundAdapter` | Slack outbound adapter（含 hook + blocks 支援） | **entry** |

### telegram.ts (2 行)

> Shim re-export from extension。

### whatsapp.ts (3 行)

> Shim re-export from extension。

---

## src/line/

### actions.ts (62 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `createMessageAction` | `(label, text) → Action` | 建立 message action | helper |
| `createUriAction` | `(label, uri) → Action` | 建立 URI action | helper |
| `createPostbackAction` | `(label, data, displayText?) → Action` | 建立 postback action | helper |
| `createDatetimePickerAction` | `(label, data, mode) → Action` | 建立 datetime picker action | helper |

### auto-reply-delivery.ts (176 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `deliverLineAutoReply` | `(params) → Promise<void>` | LINE auto-reply 交付（reply token 管理 + flex/template/media） | **entry** |

### bot-access.ts (49 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `normalizeLineAllowFrom` | `(allowFrom) → string[]` | 正規化 LINE allowFrom | helper |
| `isLineSenderAllowed` | `(senderId, allowFrom) → boolean` | 檢查 LINE sender 是否在 allowFrom 內 | helper |

### bot-message-context.ts (520 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `buildLineBotMessageContext` | `(params) → Promise<MsgContext>` | 建立 LINE inbound 訊息的完整 MsgContext（route 解析、session 記錄、history） | **entry** |

### bot.ts (84 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `createLineBot` | `(params) → LineBot` | 建立 LINE bot（含 webhook 處理） | **entry** |

### bot-handlers.ts (747 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `handleLineWebhookEvents` | `(params) → Promise<void>` | 處理 LINE webhook 事件（message/follow/unfollow/join/leave/postback），含 replay dedup、mention gating、pairing、rich menu binding | **entry** |

### channel-access-token.ts (15 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `resolveLineChannelAccessToken` | `(cfg) → string \| undefined` | 解析 LINE channel access token | helper |

### config-schema.ts (52 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `LineConfigSchema` | `ZodSchema` | LINE Zod config schema | const |
| `LineConfigSchemaType` | type | LINE config 型別 | type |

### download.ts (126 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `downloadLineMedia` | `(params) → Promise<MediaResult>` | 下載 LINE media（含 magic-byte content type 偵測） | **entry** |

### flex-templates.ts (34 行)

> Barrel re-exports for flex template builders。

### group-keys.ts (73 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `resolveLineGroupLookupIds` | `(event) → string[]` | 解析 LINE group lookup IDs | helper |
| `resolveLineGroupConfigEntry` | `(cfg, groupId) → GroupConfig \| undefined` | 解析 LINE group config entry | helper |
| `resolveLineGroupHistoryKey` | `(event) → string` | 解析 LINE group history key | helper |

### markdown-to-line.ts (452 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `processLineMessage` | `(text) → LineMessage[]` | Markdown 轉 LINE 訊息（tables→flex、code→flex、links、strip markdown） | **entry** |

### monitor.ts (336 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `createLineProviderMonitor` | `(params) → LineProviderMonitor` | 建立 LINE provider monitor（loading 動畫 keepalive、auto-reply dispatch、webhook 註冊） | **entry** |

### probe.ts (34 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `probeLineBot` | `(token) → Promise<LineBotProbeResult>` | 探測 LINE bot 資訊（getBotInfo） | **entry** |

### reply-chunks.ts (102 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `sendLineReplyChunks` | `(params) → Promise<void>` | 分批發送 LINE reply（reply token + push fallback） | **entry** |

### rich-menu.ts (394 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `createRichMenu` | `(token, menu) → Promise<string>` | 建立 Rich Menu | entry |
| `uploadRichMenuImage` | `(token, menuId, image) → Promise<void>` | 上傳 Rich Menu 圖片 | entry |
| `setDefaultRichMenu` | `(token, menuId) → Promise<void>` | 設定預設 Rich Menu | entry |
| `linkRichMenuToUser` | `(token, userId, menuId) → Promise<void>` | 綁定 Rich Menu 至用戶 | entry |
| `unlinkRichMenuFromUser` | `(token, userId) → Promise<void>` | 解除用戶 Rich Menu 綁定 | entry |
| `buildRichMenuGridLayout` | `(params) → RichMenuLayout` | 建立 Rich Menu grid layout | helper |
| `buildDefaultRichMenuConfig` | `(params) → RichMenuConfig` | 建立預設 Rich Menu 設定 | helper |

### rich-menu-binding.ts (161 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `resolveRichMenuIdForPermissionLevel` | `(cfg, level) → string \| undefined` | 依 permission level 解析 Rich Menu ID | helper |
| `bindRichMenuForUser` | `(params) → Promise<void>` | 依使用者 permission level 自動綁定 Rich Menu（含 cache） | **entry** |

### send.ts (475 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `pushLineMessage` | `(token, to, messages) → Promise<SendResult>` | Push 訊息 | entry |
| `replyLineMessage` | `(token, replyToken, messages) → Promise<SendResult>` | Reply 訊息 | entry |
| `sendLineFlex` | `(token, to, flex) → Promise<SendResult>` | 發送 Flex Message | entry |
| `sendLineImage` | `(token, to, url, preview?) → Promise<SendResult>` | 發送圖片 | entry |
| `sendLineLocation` | `(token, to, location) → Promise<SendResult>` | 發送位置 | entry |
| `sendLineTemplate` | `(token, to, template) → Promise<SendResult>` | 發送 template message | entry |
| `sendLineQuickReply` | `(token, to, text, items) → Promise<SendResult>` | 發送 quick reply | entry |
| `sendLineLoadingAnimation` | `(token, chatId) → Promise<void>` | 發送 loading 動畫 | entry |
| `getLineUserProfile` | `(token, userId) → Promise<UserProfile>` | 取得用戶 profile | entry |

### signature.ts (19 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `validateLineSignature` | `(body, signature, secret) → boolean` | LINE webhook 簽章驗證（HMAC-SHA256 + timing-safe） | **entry** |

### template-messages.ts (356 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `createConfirmTemplate` | `(params) → TemplateMessage` | 建立確認模板 | helper |
| `createButtonsTemplate` | `(params) → TemplateMessage` | 建立按鈕模板 | helper |
| `createCarouselTemplate` | `(columns) → TemplateMessage` | 建立 carousel 模板 | helper |
| `createImageCarouselTemplate` | `(columns) → TemplateMessage` | 建立 image carousel 模板 | helper |

### types.ts (144 行)

> Types only（LineConfig、LineAccount、message types、send result、probe result、channel data）。

### accounts.ts (196 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `resolveLineAccountToken` | `(cfg, accountId) → Promise<string \| undefined>` | 解析 LINE account token（config/file/env） | **entry** |
| `resolveLineAccounts` | `(cfg) → LineAccount[]` | 解析所有 LINE accounts | **entry** |
| `resolveDefaultLineAccount` | `(cfg) → LineAccount \| undefined` | 解析預設 LINE account | entry |

### webhook-node.ts (133 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `readLineWebhookRequestBody` | `(req, maxBytes?, timeout?) → Promise<string>` | 讀取 LINE webhook request body（含限制） | helper |
| `createLineNodeWebhookHandler` | `(params) → Handler` | 建立 Node.js HTTP LINE webhook handler（簽章驗證 + body 限制） | **entry** |

### webhook-utils.ts (10 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `parseLineWebhookBody` | `(rawBody) → WebhookRequestBody \| null` | 解析 LINE webhook body JSON | helper |

### webhook.ts (117 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `createLineWebhookMiddleware` | `(options) → Middleware` | 建立 Express LINE webhook middleware | **entry** |
| `startLineWebhook` | `(options) → { path, handler }` | 啟動 LINE webhook（驗證 secret + 建立 middleware） | **entry** |

---

## src/line/flex-templates/

### basic-cards.ts (396 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `createInfoCard` | `(params) → FlexBubble` | 建立資訊卡 Flex Bubble | helper |
| `createListCard` | `(params) → FlexBubble` | 建立列表卡 | helper |
| `createImageCard` | `(params) → FlexBubble` | 建立圖片卡 | helper |
| `createActionCard` | `(params) → FlexBubble` | 建立動作卡 | helper |
| `createCarousel` | `(bubbles) → FlexCarousel` | 建立 carousel 容器 | helper |
| `createNotificationBubble` | `(params) → FlexBubble` | 建立通知 bubble | helper |

### common.ts (21 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `attachFooterText` | `(bubble, text) → FlexBubble` | 附加 footer 文字至 bubble | helper |

### media-control-cards.ts (556 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `createMediaPlayerCard` | `(params) → FlexBubble` | 建立媒體播放器卡 | helper |
| `createAppleTvRemoteCard` | `(params) → FlexBubble` | 建立 Apple TV 遙控器卡 | helper |
| `createDeviceControlCard` | `(params) → FlexBubble` | 建立裝置控制卡 | helper |

### message.ts (14 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `toFlexMessage` | `(altText, contents) → FlexMessage` | 包裝為 FlexMessage 物件 | helper |

### schedule-cards.ts (468 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `createReceiptCard` | `(params) → FlexBubble` | 建立收據卡 | helper |
| `createEventCard` | `(params) → FlexBubble` | 建立事件卡 | helper |
| `createAgendaCard` | `(params) → FlexBubble` | 建立議程卡 | helper |

### types.ts (23 行)

> Flex type re-exports from @line/bot-sdk。

---

## src/whatsapp/

### normalize.ts (81 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `normalizeWhatsAppTarget` | `(target) → string` | 正規化 WhatsApp target（group JID / user JID / E.164） | **entry** |
| `isWhatsAppGroupJid` | `(jid) → boolean` | 判定是否為 WhatsApp group JID | utility |
| `normalizeE164` | `(phone) → string \| null` | 正規化 E.164 電話號碼 | utility |

### resolve-outbound-target.ts (53 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `resolveWhatsAppOutboundTarget` | `(params) → OutboundTarget \| null` | 解析 WhatsApp outbound target（含 allowFrom 強制） | **entry** |

---

## src/pairing/

### pairing-challenge.ts (49 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `issuePairingChallenge` | `(params) → PairingChallenge` | 簽發配對挑戰碼 | **entry** |

### pairing-labels.ts (7 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `resolvePairingIdLabel` | `(id) → string` | 解析配對 ID 的顯示標籤 | helper |

### pairing-messages.ts (21 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `formatPairingReplyMessage` | `(params) → string` | 格式化配對回覆訊息 | helper |
| `formatPairingSuccessMessage` | `(params) → string` | 格式化配對成功訊息 | helper |

### pairing-store.ts (853 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `createPairingRequestStore` | `(params) → PairingRequestStore` | 建立配對請求 store（CRUD + 過期清理） | **entry** |
| `createAllowFromStore` | `(params) → AllowFromStore` | 建立 allowFrom store（file-locked JSON 持久化 + cache） | **entry** |
| `loadAllowFromEntries` | `(filePath) → Promise<AllowFromEntry[]>` | 載入 allowFrom entries | helper |
| `saveAllowFromEntries` | `(filePath, entries) → Promise<void>` | 儲存 allowFrom entries | helper |
| `createMultiAccountAllowFromStore` | `(params) → MultiAccountAllowFromStore` | 建立多帳號 allowFrom store | **entry** |

### setup-code.ts (410 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `encodePairingSetupCode` | `(payload) → string` | 編碼配對 setup code（base64url） | helper |
| `resolvePairingSetupFromConfig` | `(cfg, options?) → Promise<PairingSetupResolution>` | 從 config 解析完整 pairing setup（gateway URL + auth + bootstrap token） | **entry** |

---

## src/sessions/

### level-overrides.ts (33 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `parseVerboseOverride` | `(raw) → Result<VerboseLevel \| null>` | 解析 verbose level override | helper |
| `applyVerboseOverride` | `(entry, level) → void` | 套用 verbose override 至 session entry | helper |

### send-policy.ts (124 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `normalizeSendPolicy` | `(raw?) → "allow" \| "deny" \| undefined` | 正規化 send policy 值 | utility |
| `resolveSendPolicy` | `(params) → "allow" \| "deny"` | 解析 session send policy（rule matching + channel/chatType/keyPrefix） | **entry** |

### session-id.ts (6 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `SESSION_ID_RE` | `RegExp` | Session ID 正規表達式（UUID v4） | const |
| `looksLikeSessionId` | `(value) → boolean` | 判定字串是否為 session ID | utility |

### session-key-utils.ts (133 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `parseAgentSessionKey` | `(sessionKey) → ParsedAgentSessionKey \| null` | 解析 agent-scoped session key（agent:agentId:rest） | **entry** |
| `deriveSessionChatType` | `(sessionKey) → SessionKeyChatType` | 從 session key 推導 chat type | helper |
| `isCronRunSessionKey` | `(sessionKey) → boolean` | 判定是否為 cron run session key | utility |
| `isCronSessionKey` | `(sessionKey) → boolean` | 判定是否為 cron session key | utility |
| `isSubagentSessionKey` | `(sessionKey) → boolean` | 判定是否為 subagent session key | utility |
| `getSubagentDepth` | `(sessionKey) → number` | 取得 subagent 巢狀深度 | utility |
| `isAcpSessionKey` | `(sessionKey) → boolean` | 判定是否為 ACP session key | utility |
| `resolveThreadParentSessionKey` | `(sessionKey) → string \| null` | 解析 thread parent session key | helper |

### session-label.ts (21 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `SESSION_LABEL_MAX_LENGTH` | `number (64)` | Session label 最大長度 | const |
| `parseSessionLabel` | `(raw) → ParsedSessionLabel` | 解析並驗證 session label | helper |

### transcript-events.ts (30 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `onSessionTranscriptUpdate` | `(listener) → () → void` | 註冊 session transcript 更新監聽（回傳取消函式） | **entry** |
| `emitSessionTranscriptUpdate` | `(sessionFile) → void` | 發送 session transcript 更新事件 | **entry** |

### input-provenance.ts (82 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `INPUT_PROVENANCE_KIND_VALUES` | `const tuple` | Input provenance 種類值（external_user / inter_session / internal_system） | const |
| `normalizeInputProvenance` | `(value) → InputProvenance \| undefined` | 正規化 input provenance 物件 | helper |
| `applyInputProvenanceToUserMessage` | `(message, provenance) → AgentMessage` | 將 input provenance 套用至 user message | helper |
| `isInterSessionInputProvenance` | `(value) → boolean` | 判定是否為 inter-session provenance | utility |
| `hasInterSessionUserProvenance` | `(message) → boolean` | 判定 message 是否有 inter-session user provenance | utility |

### model-overrides.ts (113 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `applyModelOverrideToSessionEntry` | `(params) → { updated: boolean }` | 套用 model override 至 session entry（含 runtime model 清除 + context token 重設） | **entry** |

### session-id-resolution.ts (38 行)

| Export | Signature | 說明 | Entry |
|--------|-----------|------|-------|
| `resolvePreferredSessionKeyForSessionIdMatches` | `(matches, sessionId) → string \| undefined` | 從多筆 session ID match 中選出最佳 session key | **entry** |

---

## 呼叫關聯圖

```
[Inbound 訊息流]
  webhook.ts / webhook-node.ts
    → signature.ts (validateLineSignature)
    → webhook-utils.ts (parseLineWebhookBody)
    → bot.ts (createLineBot)
      → bot-handlers.ts (handleLineWebhookEvents)
        → bot-access.ts (isLineSenderAllowed)
        → bot-message-context.ts (buildLineBotMessageContext)
          → group-keys.ts (resolveLineGroupLookupIds/ConfigEntry/HistoryKey)
          → channels/session.ts (recordInboundSession)
          → channels/session-envelope.ts (resolveInboundSessionEnvelopeContext)
          → channels/session-meta.ts (recordInboundSessionMetaSafe)
        → channels/mention-gating.ts (resolveMentionGatingWithBypass)
        → rich-menu-binding.ts (bindRichMenuForUser)
          → rich-menu.ts (linkRichMenuToUser)
        → pairing/pairing-challenge.ts (issuePairingChallenge)
        → pairing/pairing-store.ts (createPairingRequestStore/createAllowFromStore)

[Outbound 送訊流]
  monitor.ts (createLineProviderMonitor)
    → auto-reply-delivery.ts (deliverLineAutoReply)
      → reply-chunks.ts (sendLineReplyChunks)
        → send.ts (pushLineMessage/replyLineMessage/sendLineFlex/...)
      → markdown-to-line.ts (processLineMessage)
      → flex-templates/* (各種 Flex card builder)
      → template-messages.ts (createConfirmTemplate/createButtonsTemplate/...)

[Channel Plugin 系統]
  plugins/index.ts (listChannelPlugins/getChannelPlugin)
    → plugins/load.ts (loadChannelPlugin)
    → plugins/registry-loader.ts (createChannelRegistryLoader)
    → channels/registry.ts (CHAT_CHANNEL_ORDER/getChatChannelMeta/...)
  plugins/outbound/load.ts (loadChannelOutboundAdapter)
    → outbound/direct-text-media.ts (createDirectTextMediaOutbound)
    → outbound/slack.ts / signal.ts / imessage.ts (各 adapter 實例)

[存取控制]
  channel-config.ts (resolveChannelEntryMatchWithFallback/resolveNestedAllowlistDecision)
    → allowlist-match.ts (compileAllowlist/resolveCompiledAllowlistMatch)
    → allow-from.ts (mergeDmAllowFromSources/resolveGroupAllowFromSources)
    → allowlists/resolve-utils.ts (mergeAllowlist/canonicalizeAllowlistWithResolvedIds)

[Typing 生命週期]
  typing.ts (createTypingCallbacks)
    → typing-lifecycle.ts (createTypingKeepaliveLoop)
    → typing-start-guard.ts (createTypingStartGuard)

[Draft Stream]
  draft-stream-controls.ts (createFinalizableDraftLifecycle)
    → draft-stream-loop.ts (createDraftStreamLoop)

[Thread Binding]
  thread-bindings-policy.ts (resolveThreadBindingsEnabled/resolveThreadBindingSpawnPolicy)
    → thread-binding-id.ts (resolveThreadBindingConversationIdFromBindingId)
    → thread-bindings-messages.ts (resolveThreadBindingIntroText/FarewellText)

[Run 狀態]
  run-state-machine.ts (createRunStateMachine)
    → transport/stall-watchdog.ts (createArmableStallWatchdog)

[Session 管理]
  session-key-utils.ts (parseAgentSessionKey/deriveSessionChatType)
    → session-id.ts (looksLikeSessionId)
    → session-id-resolution.ts (resolvePreferredSessionKeyForSessionIdMatches)
  send-policy.ts (resolveSendPolicy)
    → session-key-utils.ts (deriveSessionChatType)
  model-overrides.ts (applyModelOverrideToSessionEntry)
  transcript-events.ts (onSessionTranscriptUpdate/emitSessionTranscriptUpdate)
  input-provenance.ts (normalizeInputProvenance/applyInputProvenanceToUserMessage)

[配對機制]
  pairing/setup-code.ts (resolvePairingSetupFromConfig)
    → pairing/pairing-challenge.ts (issuePairingChallenge)
  pairing/pairing-store.ts (createPairingRequestStore/createAllowFromStore)
    → pairing/pairing-messages.ts (formatPairingReplyMessage/formatPairingSuccessMessage)
    → pairing/pairing-labels.ts (resolvePairingIdLabel)
  plugins/pairing.ts (resolvePairingChannel/notifyPairingApproved)
    → pairing/pairing-store.ts

[WhatsApp]
  whatsapp/normalize.ts (normalizeWhatsAppTarget)
  whatsapp/resolve-outbound-target.ts (resolveWhatsAppOutboundTarget)
    → whatsapp/normalize.ts
  plugins/whatsapp-heartbeat.ts (resolveWhatsAppHeartbeatRecipients)
```

---

## 系統歸屬分類

| 系統 | 檔案 |
|------|------|
| **Channel Registry** | `channels/registry.ts`, `plugins/index.ts`, `plugins/load.ts`, `plugins/registry-loader.ts`, `plugins/types.plugin.ts`, `plugins/types.ts` |
| **Channel Config / Match** | `channels/channel-config.ts`, `channels/chat-type.ts`, `plugins/channel-config.ts`, `plugins/config-helpers.ts` |
| **Allowlist / 存取控制** | `channels/allow-from.ts`, `channels/allowlist-match.ts`, `channels/allowlists/resolve-utils.ts`, `plugins/allowlist-match.ts`, `plugins/onboarding/*` |
| **Inbound 處理** | `channels/session.ts`, `channels/session-envelope.ts`, `channels/session-meta.ts`, `channels/sender-identity.ts`, `channels/sender-label.ts`, `channels/conversation-label.ts`, `channels/inbound-debounce-policy.ts`, `channels/logging.ts` |
| **Outbound 傳輸** | `plugins/outbound/*`, `plugins/media-limits.ts`, `plugins/media-payload.ts`, `channels/targets.ts`, `plugins/normalize/*` |
| **Message Actions** | `plugins/message-actions.ts`, `plugins/message-action-names.ts`, `plugins/account-action-gate.ts`, `plugins/actions/*`, `plugins/bluebubbles-actions.ts` |
| **Draft Stream / Typing** | `channels/draft-stream-controls.ts`, `channels/draft-stream-loop.ts`, `channels/typing.ts`, `channels/typing-lifecycle.ts`, `channels/typing-start-guard.ts` |
| **Thread Binding** | `channels/thread-binding-id.ts`, `channels/thread-bindings-messages.ts`, `channels/thread-bindings-policy.ts` |
| **Run 狀態 / 傳輸監控** | `channels/run-state-machine.ts`, `channels/transport/stall-watchdog.ts` |
| **Ack Reaction** | `channels/ack-reactions.ts` |
| **Model Override** | `channels/model-overrides.ts`, `sessions/model-overrides.ts` |
| **Account 管理** | `channels/account-snapshot-fields.ts`, `channels/account-summary.ts`, `plugins/account-helpers.ts`, `plugins/group-policy-warnings.ts`, `plugins/status-issues/*` |
| **Mention Gating** | `channels/mention-gating.ts` |
| **LINE — Core** | `line/bot.ts`, `line/bot-handlers.ts`, `line/bot-message-context.ts`, `line/bot-access.ts`, `line/accounts.ts`, `line/types.ts`, `line/config-schema.ts` |
| **LINE — Webhook** | `line/webhook.ts`, `line/webhook-node.ts`, `line/webhook-utils.ts`, `line/signature.ts` |
| **LINE — Send / Reply** | `line/send.ts`, `line/reply-chunks.ts`, `line/auto-reply-delivery.ts`, `line/monitor.ts` |
| **LINE — Rich Menu** | `line/rich-menu.ts`, `line/rich-menu-binding.ts` |
| **LINE — Flex / Template** | `line/flex-templates/*`, `line/template-messages.ts`, `line/actions.ts` |
| **LINE — Media / Format** | `line/download.ts`, `line/markdown-to-line.ts`, `line/group-keys.ts`, `line/channel-access-token.ts` |
| **WhatsApp** | `whatsapp/normalize.ts`, `whatsapp/resolve-outbound-target.ts`, `plugins/whatsapp-heartbeat.ts` |
| **配對機制** | `pairing/pairing-challenge.ts`, `pairing/pairing-store.ts`, `pairing/pairing-labels.ts`, `pairing/pairing-messages.ts`, `pairing/setup-code.ts`, `plugins/pairing.ts`, `plugins/pairing-message.ts` |
| **Session 管理** | `sessions/session-key-utils.ts`, `sessions/session-id.ts`, `sessions/session-id-resolution.ts`, `sessions/session-label.ts`, `sessions/send-policy.ts`, `sessions/level-overrides.ts`, `sessions/transcript-events.ts`, `sessions/input-provenance.ts`, `sessions/model-overrides.ts` |
| **Onboarding** | `plugins/onboarding-types.ts`, `plugins/onboarding/*` |
| **Location** | `channels/location.ts` |
