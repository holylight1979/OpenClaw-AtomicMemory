# AutoReply + Cron + TTS + Context Engine 函式級索引

> 掃描日期：2026-03-21 | 檔案數：226 檔 | 總行數：~44,500 行

---

## 目錄結構

```
src/auto-reply/               (184 檔, ~34,128 行) — 自動回覆核心 pipeline
  ├── chunk.ts                 文字分塊
  ├── command-auth.ts          指令權限判定
  ├── command-detection.ts     控制指令偵測
  ├── commands-args.ts         指令參數格式化
  ├── commands-registry.data.ts 指令定義資料
  ├── commands-registry.ts     指令註冊表（查詢/解析/啟停）
  ├── commands-registry.types.ts 指令型別定義
  ├── dispatch.ts              入站訊息 → reply dispatch 入口
  ├── envelope.ts              Agent/Inbound 訊息信封格式化
  ├── fallback-state.ts        Fallback model 狀態 & 通知
  ├── group-activation.ts      群組啟動模式解析
  ├── heartbeat-reply-payload.ts 心跳回覆 payload 解析
  ├── heartbeat.ts             心跳 prompt/token 處理
  ├── inbound-debounce.ts      入站訊息防抖
  ├── media-note.ts            入站媒體附註建構
  ├── model-runtime.ts         Provider/Model ref 格式化
  ├── model.ts                 Model directive 擷取
  ├── reply.ts                 Re-export 入口（getReplyFromConfig 等）
  ├── send-policy.ts           發送策略 override
  ├── skill-commands.ts        Skill slash command 解析
  ├── status.ts                狀態/幫助/指令清單訊息建構
  ├── templating.ts            MsgContext/TemplateContext 型別 + template 套用
  ├── thinking.ts              Thinking/Verbose/Elevated/Reasoning level 正規化
  ├── tokens.ts                HEARTBEAT_TOKEN/SILENT_REPLY_TOKEN 常數 + 判定
  ├── tool-meta.ts             Tool 呼叫 metadata 格式化
  ├── types.ts                 ReplyPayload/GetReplyOptions 等共用型別
  └── reply/                   回覆 pipeline 子模組 (~140 檔)
      ├── abort*.ts            中斷/停止指令處理
      ├── acp-*.ts             ACP (Agent Control Protocol) 投影/串流/重設
      ├── agent-runner*.ts     LLM Agent 執行核心（fallback/memory/payloads）
      ├── block-*.ts           Block-streaming 回覆管線（coalesce/chunk/pipeline）
      ├── body.ts              Session hints 套用
      ├── btw-command.ts       BTW 附帶提問偵測
      ├── channel-context.ts   Channel/Discord/Telegram 表面判定
      ├── command-gates.ts     指令權限閘門
      ├── commands-*.ts        各 slash command handler 實作
      ├── config-*.ts          Config 指令解析/寫入授權
      ├── debug-commands.ts    Debug 指令解析
      ├── directive-*.ts       Inline directive 解析/套用/持久化
      ├── dispatch-*.ts        Reply dispatch（ACP 派送/config dispatch）
      ├── dispatcher-registry.ts Reply dispatcher 全域註冊
      ├── elevated-*.ts        Elevated mode 白名單/不可用訊息
      ├── exec/directive.ts    Exec directive 擷取
      ├── followup-runner.ts   Followup 回覆執行器
      ├── get-reply*.ts        Reply pipeline 主流程
      ├── groups.ts            群組上下文/intro 建構
      ├── history.ts           對話歷史管理
      ├── inbound-*.ts         入站訊息 context/dedup/meta/text
      ├── line-directives.ts   LINE 平台 directive 解析
      ├── memory-flush.ts      Memory flush（上下文壓縮觸發）
      ├── mentions.ts          @mention 偵測/剝離
      ├── model-selection.ts   Model 選擇狀態機
      ├── normalize-reply.ts   回覆 payload 正規化
      ├── origin-routing.ts    Origin routing 解析
      ├── post-compaction-context.ts Compaction 後上下文注入
      ├── provider-dispatcher.ts Provider reply dispatch
      ├── queue*.ts            Followup 佇列系統（排入/排出/策略）
      ├── reply-*.ts           回覆投遞/directive/dispatch/threading
      ├── response-prefix-template.ts 回覆前綴模板
      ├── route-reply.ts       回覆路由（多頻道）
      ├── session*.ts          Session 初始化/fork/reset/usage/delivery
      ├── slack-directives.ts  Slack directive 解析
      ├── stage-sandbox-media.ts Sandbox 媒體暫存
      ├── streaming-directives.ts Streaming directive 累加器
      ├── strip-inbound-meta.ts 入站 metadata 剝離
      ├── subagents-utils.ts   Subagent 顯示/排序工具
      ├── telegram-context.ts  Telegram conversation ID 解析
      ├── typing*.ts           Typing indicator 控制
      └── untrusted-context.ts Untrusted context 附加

src/cron/                     (35 檔, ~8,212 行) — 排程任務系統
  ├── delivery.ts              Cron delivery 計畫解析 + 失敗通知
  ├── heartbeat-policy.ts      心跳 delivery 跳過策略
  ├── isolated-agent.ts        Re-export（runCronIsolatedAgentTurn）
  ├── legacy-delivery.ts       Legacy delivery 遷移/相容
  ├── normalize.ts             Cron job 輸入正規化
  ├── parse.ts                 絕對時間解析
  ├── payload-migration.ts     Legacy payload 遷移
  ├── run-log.ts               Cron 執行日誌讀寫
  ├── schedule.ts              排程計算（next/previous run）
  ├── service.ts               CronService 類別（facade）
  ├── session-reaper.ts        Cron session 清理
  ├── stagger.ts               Top-of-hour 錯開策略
  ├── store.ts                 Cron store 檔案讀寫
  ├── store-migration.ts       Store 資料遷移
  ├── types-shared.ts          CronJobBase 共用型別
  ├── types.ts                 完整 Cron 型別定義
  ├── validate-timestamp.ts    排程時間戳驗證
  ├── webhook-url.ts           Webhook URL 正規化
  ├── isolated-agent/          Isolated agent 執行子模組
  │   ├── run.ts               Cron isolated agent turn 主執行
  │   ├── delivery-dispatch.ts 投遞派送（direct delivery）
  │   ├── delivery-target.ts   投遞目標解析
  │   ├── helpers.ts           Output 摘要/payload 擷取
  │   ├── session-key.ts       Session key 解析
  │   ├── session.ts           Cron session 解析
  │   ├── skills-snapshot.ts   Skills snapshot 解析
  │   └── subagent-followup.ts Subagent followup 等待
  └── service/                 CronService 內部子模組
      ├── initial-delivery.ts  初始 delivery 解析
      ├── jobs.ts              Job CRUD + 排程計算
      ├── locked.ts            Lock 機制
      ├── normalize.ts         名稱/文字/Agent 正規化
      ├── ops.ts               Service 操作（start/stop/add/remove/run）
      ├── state.ts             Service state 型別 + 建構
      ├── store.ts             Store 載入/持久化
      ├── timeout-policy.ts    Job timeout 策略
      └── timer.ts             Timer 排程/執行核心

src/tts/                      (2 檔, ~1,727 行) — 語音合成
  ├── tts-core.ts              TTS 底層（ElevenLabs/OpenAI/Edge 引擎）
  └── tts.ts                   TTS 設定解析/provider 管理/payload 套用

src/context-engine/           (5 檔, ~432 行) — 上下文引擎
  ├── index.ts                 Re-export 入口
  ├── init.ts                  Context engine 初始化
  ├── legacy.ts                LegacyContextEngine 實作
  ├── registry.ts              Engine 註冊/查詢/解析
  └── types.ts                 ContextEngine interface + 型別
```

---

## 函式清單

### src/auto-reply/

#### `chunk.ts`（476 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `TextChunkProvider` | type | 文字分塊 provider（channel ID 或 internal） | Type |
| `ChunkMode` | type `"length" \| "newline"` | 分塊模式 | Type |
| `resolveTextChunkLimit` | `(params) → number` | 依 channel 解析文字分塊上限 | Utility |
| `resolveChunkMode` | `(params) → ChunkMode` | 依 config 解析分塊模式 | Utility |
| `chunkByNewline` | `(text, limit) → string[]` | 以換行符為邊界分塊 | Utility |
| `chunkByParagraph` | `(text, limit) → string[]` | 以段落為邊界分塊 | Utility |
| `chunkTextWithMode` | `(text, limit, mode) → string[]` | 依指定模式分塊純文字 | Utility |
| `chunkMarkdownTextWithMode` | `(text, limit, mode) → string[]` | 依指定模式分塊 Markdown | Utility |
| `chunkText` | `(text, limit) → string[]` | 分塊純文字（預設模式） | Utility |
| `chunkMarkdownText` | `(text, limit) → string[]` | 分塊 Markdown（預設模式） | Utility |

#### `command-auth.ts`（403 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `CommandAuthorization` | type | 指令授權結果型別（含 `senderPermissionLevel: PermissionLevel`） | Type |
| `resolveCommandAuthorization` | `(params) → CommandAuthorization` | 解析使用者授權 — 整合 `resolveEffectivePermissionLevel()`，回傳四級權限（owner/admin/user/guest）+ allowlist 判定。Guest 條件：不在 allowlist 且非 owner/admin | Core |

#### `command-detection.ts`（88 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `hasControlCommand` | `(text, cfg?) → boolean` | 偵測文字中是否含控制指令 | Utility |
| `isControlCommandMessage` | `(ctx) → boolean` | 判斷訊息是否為純控制指令 | Utility |
| `hasInlineCommandTokens` | `(text?) → boolean` | 偵測 inline command token | Utility |
| `shouldComputeCommandAuthorized` | `(params) → boolean` | 判斷是否需計算指令授權 | Utility |

#### `commands-args.ts`（130 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `CommandArgsFormatter` | type | 指令參數格式化函式型別 | Type |
| `COMMAND_ARG_FORMATTERS` | `Record<string, CommandArgsFormatter>` | 各指令參數格式化器 map | Const |

#### `commands-registry.data.ts`（829 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `getChatCommands` | `() → ChatCommandDefinition[]` | 取得所有 chat command 定義 | Data |
| `getNativeCommandSurfaces` | `() → Set<string>` | 取得所有 native command surface 名稱 | Data |

#### `commands-registry.ts`（539 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| Type re-exports | — | ChatCommandDefinition, NativeCommandSpec 等型別 | Type |
| `listChatCommands` | `(params?) → ChatCommandDefinition[]` | 列出所有 chat commands | Query |
| `isCommandEnabled` | `(cfg, commandKey) → boolean` | 判斷指令是否啟用 | Query |
| `listChatCommandsForConfig` | `(params) → ChatCommandDefinition[]` | 依 config 過濾可用指令 | Query |
| `listNativeCommandSpecs` | `(params?) → NativeCommandSpec[]` | 列出 native command 規格 | Query |
| `listNativeCommandSpecsForConfig` | `(params) → NativeCommandSpec[]` | 依 config 列出 native commands | Query |
| `findCommandByNativeName` | `(name) → ChatCommandDefinition \| undefined` | 依 native name 查找指令 | Query |
| `findCommandByTextAlias` | `(alias) → ChatCommandDefinition \| undefined` | 依 text alias 查找指令 | Query |
| `buildCommandText` | `(name, args?) → string` | 組合指令文字 | Utility |
| `parseCommandArgs` | `(def, raw) → CommandArgValues` | 解析指令參數 | Utility |
| `serializeCommandArgs` | `(def, values) → string` | 序列化指令參數 | Utility |
| `buildCommandTextFromArgs` | `(def, values) → string` | 從參數值組合指令文字 | Utility |
| `ResolvedCommandArgChoice` | type | 解析後的指令參數選項 | Type |
| `resolveCommandArgChoices` | `(params) → ResolvedCommandArgChoice[]` | 解析指令參數選項列表 | Utility |
| `resolveCommandArgMenu` | `(params) → CommandArgMenuSpec` | 解析指令參數選單 | Utility |
| `normalizeCommandBody` | `(raw, options?) → string` | 正規化指令文字 | Utility |
| `isCommandMessage` | `(raw) → boolean` | 判斷是否為指令訊息 | Utility |
| `getCommandDetection` | `(cfg?) → CommandDetection` | 取得指令偵測器 | Factory |
| `maybeResolveTextAlias` | `(raw, cfg?) → result` | 嘗試解析 text alias | Utility |
| `resolveTextCommand` | `(params) → result` | 解析 text command | Utility |
| `isNativeCommandSurface` | `(surface?) → boolean` | 判斷是否為 native command surface | Utility |
| `shouldHandleTextCommands` | `(params) → boolean` | 判斷是否應處理 text commands | Utility |

#### `commands-registry.types.ts`（91 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `CommandScope` | type | 指令作用域（text/native/both） | Type |
| `CommandCategory` | type | 指令分類 | Type |
| `CommandArgType` / `CommandArgDefinition` | types | 指令參數定義型別 | Type |
| `ChatCommandDefinition` | type | Chat command 完整定義 | Type |
| `NativeCommandSpec` | type | Native command 規格 | Type |
| `CommandDetection` | type | 指令偵測結果型別 | Type |
| 其他 arg/menu 相關 types | — | CommandArgValues, CommandArgs 等 | Type |

#### `dispatch.ts`（97 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `DispatchInboundResult` | type alias | 入站 dispatch 結果 | Type |
| `withReplyDispatcher` | `<T>(params) → Promise<T>` | 包裝 dispatcher 生命週期管理 | Core |
| `dispatchInboundMessage` | `(params) → Promise<DispatchInboundResult>` | **入站訊息 dispatch 主入口** | Entry |
| `dispatchInboundMessageWithBufferedDispatcher` | `(params) → Promise<DispatchInboundResult>` | 建立 buffered typing dispatcher 並 dispatch | Entry |
| `dispatchInboundMessageWithDispatcher` | `(params) → Promise<DispatchInboundResult>` | 建立 dispatcher 並 dispatch | Entry |

#### `envelope.ts`（259 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `AgentEnvelopeParams` / `EnvelopeFormatOptions` | types | 信封參數與格式選項 | Type |
| `resolveEnvelopeFormatOptions` | `(cfg?) → EnvelopeFormatOptions` | 從 config 解析信封格式選項 | Utility |
| `formatAgentEnvelope` | `(params) → string` | 格式化 agent 回覆信封 | Utility |
| `formatInboundEnvelope` | `(params) → string` | 格式化入站訊息信封 | Utility |
| `formatInboundFromLabel` | `(params) → string` | 格式化入站訊息發送者標籤 | Utility |
| `formatThreadStarterEnvelope` | `(params) → string` | 格式化 thread starter 信封 | Utility |

#### `fallback-state.ts`（180 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `FallbackNoticeState` | type | Fallback 通知狀態 | Type |
| `normalizeFallbackModelRef` | `(value?) → string \| undefined` | 正規化 fallback model ref | Utility |
| `formatFallbackAttemptReason` | `(attempt) → string` | 格式化單次 fallback 原因 | Utility |
| `buildFallbackReasonSummary` | `(attempts) → string` | 建構 fallback 摘要 | Utility |
| `buildFallbackAttemptSummaries` | `(attempts) → string[]` | 建構 fallback 嘗試列表 | Utility |
| `buildFallbackNotice` | `(params) → string` | 建構 fallback 啟用通知 | Utility |
| `buildFallbackClearedNotice` | `(params) → string` | 建構 fallback 解除通知 | Utility |
| `resolveActiveFallbackState` | `(params) → FallbackNoticeState` | 解析當前 fallback 狀態 | Utility |
| `ResolvedFallbackTransition` | type | Fallback 轉換結果 | Type |
| `resolveFallbackTransition` | `(params) → ResolvedFallbackTransition` | 計算 fallback 狀態轉換 | Core |

#### `group-activation.ts`（34 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `GroupActivationMode` | type `"mention" \| "always"` | 群組啟動模式 | Type |
| `normalizeGroupActivation` | `(raw?) → GroupActivationMode \| undefined` | 正規化群組啟動模式 | Utility |
| `parseActivationCommand` | `(raw?) → { mode, args }` | 解析 activation 指令 | Utility |

#### `heartbeat-reply-payload.ts`（22 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `resolveHeartbeatReplyPayload` | `(params) → ReplyPayload` | 解析心跳回覆 payload | Utility |

#### `heartbeat.ts`（171 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `HEARTBEAT_PROMPT` | const | 心跳 prompt 文字 | Const |
| `DEFAULT_HEARTBEAT_EVERY` / `DEFAULT_HEARTBEAT_ACK_MAX_CHARS` | const | 心跳間隔/回覆上限預設值 | Const |
| `isHeartbeatContentEffectivelyEmpty` | `(content) → boolean` | 判斷心跳內容是否實質為空 | Utility |
| `resolveHeartbeatPrompt` | `(raw?) → string` | 解析心跳 prompt | Utility |
| `StripHeartbeatMode` | type | 心跳 token 剝離模式 | Type |
| `stripHeartbeatToken` | `(params) → result` | 剝離心跳 token | Utility |

#### `inbound-debounce.ts`（128 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `resolveInboundDebounceMs` | `(params) → number` | 解析入站防抖毫秒數 | Utility |
| `InboundDebounceCreateParams<T>` | type | 防抖器建構參數 | Type |
| `createInboundDebouncer` | `<T>(params) → debouncer` | 建立入站訊息防抖器 | Factory |

#### `media-note.ts`（154 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `buildInboundMediaNote` | `(ctx) → string \| undefined` | 為入站媒體訊息建構描述附註 | Utility |

#### `model-runtime.ts`（93 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `formatProviderModelRef` | `(provider, model) → string` | 格式化 provider:model 字串 | Utility |
| `resolveSelectedAndActiveModel` | `(params) → result` | 解析選定/活躍 model（含 session override） | Core |

#### `model.ts`（51 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `extractModelDirective` | `(body?) → { model, rest }` | 從訊息中擷取 model directive | Utility |

#### `reply.ts`（11 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| Re-exports | — | getReplyFromConfig, extractExecDirective, extractQueueDirective, extractReplyToTag | Barrel |

#### `send-policy.ts`（44 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `SendPolicyOverride` | type `"allow" \| "deny"` | 發送策略 override | Type |
| `normalizeSendPolicyOverride` | `(raw?) → SendPolicyOverride \| undefined` | 正規化發送策略 | Utility |
| `parseSendPolicyCommand` | `(raw?) → result` | 解析發送策略指令 | Utility |

#### `skill-commands.ts`（204 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `listReservedChatSlashCommandNames` | `(extra?) → Set<string>` | 列出保留 slash command 名稱 | Query |
| `listSkillCommandsForWorkspace` | `(params) → result[]` | 列出 workspace 的 skill commands | Query |
| `listSkillCommandsForAgents` | `(params) → result[]` | 列出 agents 的 skill commands | Query |
| `resolveSkillCommandInvocation` | `(params) → result` | 解析 skill command 調用 | Core |

#### `status.ts`（911 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `formatTokenCount` | `(n) → string` | 格式化 token 數字 | Utility |
| `formatContextUsageShort` | `(params) → string` | 格式化 context 使用量簡報 | Utility |
| `buildStatusMessage` | `(args) → string` | 建構 `/status` 回覆訊息 | Core |
| `buildHelpMessage` | `(cfg?) → string` | 建構 `/help` 回覆訊息 | Core |
| `CommandsMessageOptions` / `CommandsMessageResult` | types | 指令清單訊息選項/結果 | Type |
| `buildCommandsMessage` | `(params) → string` | 建構指令清單訊息 | Core |
| `buildCommandsMessagePaginated` | `(params) → CommandsMessageResult` | 建構分頁指令清單 | Core |

#### `templating.ts`（242 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `OriginatingChannelType` | type | 來源頻道型別 | Type |
| `MsgContext` | type | 訊息上下文（入站訊息的完整屬性） | Type |
| `FinalizedMsgContext` | type | 確定化的訊息上下文 | Type |
| `TemplateContext` | type | 模板上下文（MsgContext + session 狀態） | Type |
| `applyTemplate` | `(str, ctx) → string` | 套用模板變數替換 | Utility |

#### `thinking.ts`（286 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| Level types | `ThinkLevel`, `VerboseLevel`, `NoticeLevel`, `ElevatedLevel`, `ElevatedMode`, `ReasoningLevel`, `UsageDisplayLevel` | 各種推理等級型別 | Type |
| `ThinkingCatalogEntry` | type | Thinking 目錄項目 | Type |
| `isBinaryThinkingProvider` | `(provider?) → boolean` | 判斷是否為二元 thinking provider | Utility |
| `XHIGH_MODEL_REFS` | const | 支援 xhigh thinking 的 model 列表 | Const |
| `normalizeThinkLevel` | `(raw?) → ThinkLevel \| undefined` | 正規化 thinking level | Utility |
| `supportsXHighThinking` | `(provider?, model?) → boolean` | 判斷 model 是否支援 xhigh | Query |
| `listThinkingLevels` / `listThinkingLevelLabels` | `(provider?, model?) → string[]` | 列出可用 thinking levels | Query |
| `formatThinkingLevels` | `(params) → string` | 格式化 thinking levels 顯示 | Utility |
| `resolveThinkingDefaultForModel` | `(params) → ThinkLevel` | 依 model 解析預設 thinking level | Core |
| `normalizeVerboseLevel` / `normalizeNoticeLevel` / `normalizeUsageDisplay` / `normalizeElevatedLevel` / `normalizeReasoningLevel` / `normalizeFastMode` | `(raw?) → Level \| undefined` | 正規化各種 level | Utility |
| `resolveResponseUsageMode` | `(raw?) → UsageDisplayLevel` | 解析回覆 usage 顯示模式 | Utility |
| `resolveElevatedMode` | `(level?) → ElevatedMode` | 解析 elevated mode | Utility |

#### `tokens.ts`（89 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `HEARTBEAT_TOKEN` / `SILENT_REPLY_TOKEN` | const | 心跳/靜默回覆 token | Const |
| `isSilentReplyText` | `(text, token?) → boolean` | 判斷是否為靜默回覆 | Utility |
| `stripSilentToken` | `(text, token?) → string` | 剝離靜默 token | Utility |
| `isSilentReplyPrefixText` | `(text, token?) → boolean` | 判斷是否為靜默前綴 | Utility |

#### `tool-meta.ts`（143 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `shortenPath` | `(p) → string` | 縮短路徑顯示 | Utility |
| `shortenMeta` | `(meta) → string` | 縮短 meta 顯示 | Utility |
| `formatToolAggregate` | `(params) → string` | 格式化 tool 聚合摘要 | Utility |
| `formatToolPrefix` | `(toolName?, meta?) → string` | 格式化 tool 前綴 | Utility |

#### `types.ts`（94 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `BlockReplyContext` | type | Block reply 上下文 | Type |
| `ModelSelectedContext` | type | Model 選定上下文 | Type |
| `TypingPolicy` | type | Typing 策略型別 | Type |
| `GetReplyOptions` | type | getReply 選項 | Type |
| `ReplyPayload` | type | **回覆 payload 核心型別** | Type |

---

### src/auto-reply/reply/ — LLM Pipeline 核心

#### `abort-cutoff.ts`（138 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `AbortCutoff` | type | 中斷截止點 | Type |
| `resolveAbortCutoffFromContext` | `(ctx) → AbortCutoff \| undefined` | 從上下文解析中斷截止 | Utility |
| `readAbortCutoffFromSessionEntry` | `(entry) → AbortCutoff` | 從 session entry 讀取截止 | Utility |
| `hasAbortCutoff` | `(entry?) → boolean` | 判斷是否有中斷截止 | Utility |
| `applyAbortCutoffToSessionEntry` | `(params) → void` | 套用中斷截止到 session | Utility |
| `clearAbortCutoffInSession` | `async (params) → void` | 清除 session 中的中斷截止 | Utility |
| `shouldSkipMessageByAbortCutoff` | `(params) → boolean` | 判斷訊息是否因截止而跳過 | Utility |
| `shouldPersistAbortCutoff` | `(params) → boolean` | 判斷是否需持久化截止 | Utility |

#### `abort.ts`（385 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| re-exports from abort-cutoff | — | resolveAbortCutoffFromContext 等 | Re-export |
| `isAbortTrigger` | `(text?) → boolean` | 判斷是否為 abort 觸發 | Utility |
| `isAbortRequestText` | `(text?, opts?) → boolean` | 判斷是否為 abort 請求 | Utility |
| `getAbortMemory` / `setAbortMemory` | `(key, value?) → boolean \| void` | 讀寫 abort 記憶 | State |
| `formatAbortReplyText` | `(stoppedSubagents?) → string` | 格式化 abort 回覆文字 | Utility |
| `resolveSessionEntryForKey` | `(params) → SessionEntry` | 解析指定 key 的 session entry | Utility |
| `stopSubagentsForRequester` | `(params) → Promise<number>` | 停止請求者的所有 subagent | Core |
| `tryFastAbortFromMessage` | `async (params) → result` | **快速中斷路徑**（繞過 LLM） | Entry |

#### `acp-projector.ts`（498 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `AcpProjectedDeliveryMeta` | type | ACP 投影投遞 metadata | Type |
| `AcpReplyProjector` | type | ACP 回覆投影器介面 | Type |
| `createAcpReplyProjector` | `(params) → AcpReplyProjector` | 建立 ACP 回覆投影器（streaming 回覆轉 ACP session） | Factory |

#### `acp-reset-target.ts`（75 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `resolveEffectiveResetTargetSessionKey` | `(params) → string` | 解析 ACP reset 的有效目標 session key | Utility |

#### `acp-stream-settings.ts`（157 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `ACP_TAG_VISIBILITY_DEFAULTS` | const | ACP tag 可見性預設值 | Const |
| `AcpDeliveryMode` / `AcpHiddenBoundarySeparator` | types | ACP 投遞模式/隱藏邊界分隔 | Type |
| `AcpProjectionSettings` | type | ACP 投影設定 | Type |
| `resolveAcpProjectionSettings` | `(cfg) → AcpProjectionSettings` | 從 config 解析 ACP 投影設定 | Utility |
| `resolveAcpStreamingConfig` | `(params) → result` | 解析 ACP streaming config | Utility |
| `isAcpTagVisible` | `(tag, settings) → boolean` | 判斷 ACP tag 是否可見 | Utility |

#### `agent-runner.ts`（725 行）— **LLM Agent 執行主入口**

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `runReplyAgent` | `async (params) → Promise<ReplyPayload[]>` | **執行 LLM agent 回覆**（含 queue policy / block pipeline / memory flush / typing） | Entry |

#### `agent-runner-execution.ts`（678 行）— **LLM 呼叫核心 + Fallback**

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `RuntimeFallbackAttempt` | type | 執行時 fallback 嘗試記錄 | Type |
| `AgentRunLoopResult` | type | Agent 執行迴圈結果 | Type |
| `runAgentTurnWithFallback` | `async (params) → Promise<AgentRunLoopResult>` | **LLM agent turn 執行**（含 model fallback + compaction retry） | Core |

#### `agent-runner-helpers.ts`（82 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `isAudioPayload` | `(payload) → boolean` | 判斷是否為音訊 payload | Utility |
| `createShouldEmitToolResult` | `(params) → () → boolean` | 建立 tool result emit 閘門 | Factory |
| `createShouldEmitToolOutput` | `(params) → () → boolean` | 建立 tool output emit 閘門 | Factory |
| `finalizeWithFollowup` | `<T>(result, followup) → T` | 加入 followup 資訊到結果 | Utility |
| `signalTypingIfNeeded` | `async (params) → void` | 在需要時發送 typing 信號 | Utility |

#### `agent-runner-memory.ts`（560 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `estimatePromptTokensForMemoryFlush` | `(prompt?) → number \| undefined` | 估算 memory flush prompt tokens | Utility |
| `resolveEffectivePromptTokens` | `(params) → number` | 解析有效 prompt tokens | Utility |
| `SessionTranscriptUsageSnapshot` | type | Session transcript usage 快照 | Type |
| `readPromptTokensFromSessionLog` | `async (params) → number \| undefined` | 從 session log 讀取 prompt tokens | IO |
| `runMemoryFlushIfNeeded` | `async (params) → result` | **在上下文壓縮前執行 memory flush** | Core |

#### `agent-runner-payloads.ts`（225 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `buildReplyPayloads` | `async (params) → ReplyPayload[]` | 從 agent run 結果建構回覆 payloads | Core |

#### `agent-runner-reminder-guard.ts`（64 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `UNSCHEDULED_REMINDER_NOTE` | const | 未排程提醒附註 | Const |
| `hasUnbackedReminderCommitment` | `(text) → boolean` | 偵測 AI 回覆中未排程的提醒承諾 | Utility |
| `hasSessionRelatedCronJobs` | `async (params) → boolean` | 檢查 session 是否有關聯 cron jobs | Query |
| `appendUnscheduledReminderNote` | `(payloads) → ReplyPayload[]` | 附加未排程提醒附註 | Utility |

#### `agent-runner-utils.ts`（303 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `buildThreadingToolContext` | `(params) → string` | 建構 threading tool 上下文 | Utility |
| `isBunFetchSocketError` / `formatBunFetchSocketError` | utility | Bun fetch socket error 偵測/格式化 | Utility |
| `formatResponseUsageLine` | `(params) → string` | 格式化回覆 usage 行 | Utility |
| `appendUsageLine` | `(payloads, line) → ReplyPayload[]` | 附加 usage 行到 payloads | Utility |
| `resolveEnforceFinalTag` | `(run, provider) → boolean` | 解析是否強制 final tag | Utility |
| `resolveModelFallbackOptions` | `(run) → options` | 解析 model fallback 選項 | Utility |
| `buildEmbeddedRunBaseParams` | `(params) → params` | 建構 embedded run 基礎參數 | Utility |
| `buildEmbeddedContextFromTemplate` | `(params) → string` | 從模板建構 embedded context | Utility |
| `buildTemplateSenderContext` | `(sessionCtx) → string` | 建構模板 sender context | Utility |
| `resolveRunAuthProfile` | `(run, provider) → profile` | 解析 run 的 auth profile | Utility |
| `buildEmbeddedRunContexts` | `(params) → contexts` | 建構 embedded run 上下文集合 | Utility |
| `buildEmbeddedRunExecutionParams` | `(params) → params` | 建構 embedded run 執行參數 | Utility |
| `resolveProviderScopedAuthProfile` | `(params) → profile` | 解析 provider 範圍的 auth profile | Utility |

#### `block-reply-coalescer.ts`（149 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `BlockReplyCoalescer` | type | Block reply coalescer 介面 | Type |
| `createBlockReplyCoalescer` | `(params) → BlockReplyCoalescer` | 建立 block reply 合併器（debounce 多次 update） | Factory |

#### `block-reply-pipeline.ts`（261 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `BlockReplyPipeline` / `BlockReplyBuffer` | types | Block reply pipeline 介面 | Type |
| `createAudioAsVoiceBuffer` | `(params) → BlockReplyBuffer` | 建立音訊 buffer | Factory |
| `createBlockReplyPayloadKey` / `createBlockReplyContentKey` | `(payload) → string` | 建立 block reply 的 key | Utility |
| `createBlockReplyPipeline` | `(params) → BlockReplyPipeline` | **建立 block-streaming 回覆 pipeline** | Factory |

#### `block-streaming.ts`（247 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `BlockStreamingCoalescing` / `BlockStreamingChunking` | types | Block streaming 合併/分塊設定 | Type |
| `clampPositiveInteger` | `(value, fallback, min) → number` | 限制正整數範圍 | Utility |
| `resolveEffectiveBlockStreamingConfig` | `(params) → config` | 解析有效的 block streaming 設定 | Utility |
| `resolveBlockStreamingChunking` | `(params) → BlockStreamingChunking` | 解析分塊設定 | Utility |
| `resolveBlockStreamingCoalescing` | `(params) → BlockStreamingCoalescing` | 解析合併設定 | Utility |

#### `body.ts`（44 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `applySessionHints` | `async (params) → string` | 套用 session hints 到 prompt body | Utility |

#### `btw-command.ts`（26 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `isBtwRequestText` | `(text?, opts?) → boolean` | 判斷是否為 BTW 附帶提問 | Utility |
| `extractBtwQuestion` | `(params) → result` | 擷取 BTW 問題內容 | Utility |

#### `channel-context.ts`（45 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `isDiscordSurface` / `isTelegramSurface` | `(params) → boolean` | 判斷頻道表面類型 | Utility |
| `resolveCommandSurfaceChannel` | `(params) → string` | 解析指令表面頻道 | Utility |
| `resolveDiscordAccountId` / `resolveChannelAccountId` | `(params) → string` | 解析帳號 ID | Utility |

#### `command-gates.ts`（88 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `rejectUnauthorizedCommand` | `(params) → result \| null` | 拒絕未授權指令 | Guard |
| `rejectNonOwnerCommand` | `(params) → result \| null` | 拒絕非 owner 指令 | Guard |
| `requireGatewayClientScopeForInternalChannel` | `(params) → result \| null` | 要求 gateway client scope | Guard |
| `buildDisabledCommandReply` | `(params) → ReplyPayload` | 建構指令已停用回覆 | Utility |
| `requireCommandFlagEnabled` | `(params) → result \| null` | 要求指令 flag 啟用 | Guard |

#### `commands-acp.ts`（83 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `handleAcpCommand` | `CommandHandler` | `/acp` 指令 handler（分派到各 sub-action） | Handler |

#### `commands-acp/context.ts`（128 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `resolveAcpCommandChannel` / `resolveAcpCommandAccountId` / `resolveAcpCommandThreadId` / `resolveAcpCommandConversationId` / `resolveAcpCommandParentConversationId` | `(params) → string` | 解析 ACP 指令各上下文欄位 | Utility |
| `isAcpCommandDiscordChannel` | `(params) → boolean` | 判斷是否為 Discord channel | Utility |
| `resolveAcpCommandBindingContext` | `(params) → { channel, threadId }` | 解析 ACP 指令綁定上下文 | Utility |

#### `commands-acp/diagnostics.ts`（203 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `handleAcpDoctorAction` | `async (params) → result` | `/acp doctor` — ACP 健康檢查 | Handler |
| `handleAcpInstallAction` | `(params) → result` | `/acp install` — 安裝指引 | Handler |
| `handleAcpSessionsAction` | `(params) → result` | `/acp sessions` — 列出 ACP sessions | Handler |

#### `commands-acp/install-hints.ts`（23 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `resolveConfiguredAcpBackendId` | `(cfg) → string` | 解析 ACP backend ID | Utility |
| `resolveAcpInstallCommandHint` | `(cfg) → string` | 解析 ACP 安裝指令提示 | Utility |

#### `commands-acp/lifecycle.ts`（601 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `handleAcpSpawnAction` | `async (params) → result` | `/acp spawn` — 啟動 ACP session | Handler |
| `handleAcpCancelAction` | `async (params) → result` | `/acp cancel` — 取消 ACP session | Handler |
| `handleAcpSteerAction` | `async (params) → result` | `/acp steer` — 引導 ACP session | Handler |
| `handleAcpCloseAction` | `async (params) → result` | `/acp close` — 關閉 ACP session | Handler |

#### `commands-acp/runtime-options.ts`（387 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `handleAcpStatusAction` | `async (params) → result` | `/acp status` | Handler |
| `handleAcpSetModeAction` | `async (params) → result` | `/acp set-mode` | Handler |
| `handleAcpSetAction` | `async (params) → result` | `/acp set` | Handler |
| `handleAcpCwdAction` | `async (params) → result` | `/acp cwd` | Handler |
| `handleAcpPermissionsAction` | `async (params) → result` | `/acp permissions` | Handler |
| `handleAcpTimeoutAction` | `async (params) → result` | `/acp timeout` | Handler |
| `handleAcpModelAction` | `async (params) → result` | `/acp model` | Handler |
| `handleAcpResetOptionsAction` | `async (params) → result` | `/acp reset-options` | Handler |

#### `commands-acp/shared.ts`（500 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| 常數 | `COMMAND`, `ACP_SPAWN_USAGE` 等 | ACP 指令常數 + usage 文字 | Const |
| `AcpAction` / `AcpSpawnThreadMode` | types | ACP 動作/spawn thread 模式 | Type |
| `ParsedSpawnInput` / `ParsedSteerInput` / `ParsedSetCommandInput` | types | 解析後的輸入型別 | Type |
| `stopWithText` | `(text) → CommandHandlerResult` | 建構停止回覆 | Utility |
| `resolveAcpAction` | `(tokens) → AcpAction` | 從 token 解析 ACP 動作 | Utility |
| `parseSpawnInput` / `parseSteerInput` / `parseSingleValueCommandInput` / `parseSetCommandInput` | `(params) → ParsedInput` | 解析各 ACP 指令輸入 | Utility |
| `parseOptionalSingleTarget` | `(params) → result` | 解析可選單一目標 | Utility |
| `resolveAcpHelpText` | `() → string` | ACP 說明文字 | Utility |
| `formatRuntimeOptionsText` / `formatAcpCapabilitiesText` | `(params) → string` | 格式化 runtime options / capabilities | Utility |
| `resolveCommandRequestId` | `(params) → string` | 解析指令 request ID | Utility |
| `collectAcpErrorText` | `(params) → string` | 收集 ACP 錯誤文字 | Utility |
| `withAcpCommandErrorBoundary` | `async <T>(params) → T` | ACP 指令錯誤邊界 | Wrapper |

#### `commands-acp/targets.ts`（93 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `resolveBoundAcpThreadSessionKey` | `(params) → string \| undefined` | 解析綁定的 ACP thread session key | Utility |
| `resolveAcpTargetSessionKey` | `async (params) → result` | 解析 ACP 目標 session key | Utility |

#### `commands-allowlist.ts`（790 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `handleAllowlistCommand` | `CommandHandler` | `/allowlist` 指令 — 管理 elevated 白名單 | Handler |

#### `commands-approve.ts`（149 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `handleApproveCommand` | `CommandHandler` | `/approve` 指令 — 核准 exec 請求 | Handler |

#### `commands-bash.ts`（29 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `handleBashCommand` | `CommandHandler` | `/bash` 指令 — 直接執行 bash | Handler |

#### `commands-btw.ts`（80 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `handleBtwCommand` | `CommandHandler` | `/btw` 指令 — 附帶提問（不中斷當前對話） | Handler |

#### `commands-compact.ts`（144 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `handleCompactCommand` | `CommandHandler` | `/compact` 指令 — 壓縮上下文 | Handler |

#### `commands-config.ts`（286 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `handleConfigCommand` | `CommandHandler` | `/config` 指令 — 讀寫 config | Handler |
| `handleDebugCommand` | `CommandHandler` | `/debug` 指令 — 切換 debug 設定 | Handler |

#### `commands-context-report.ts`（272 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `buildContextReply` | `async (params) → ReplyPayload` | 建構 context 報告 payload | Core |

#### `commands-context.ts`（47 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `buildCommandContext` | `(params) → CommandContext` | 建構指令執行 context | Utility |

#### `commands-core.ts`（343 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `ResetCommandAction` | type `"new" \| "reset"` | 重設指令動作 | Type |
| `emitResetCommandHooks` | `async (params) → void` | 發射 session reset hooks | Core |
| `handleCommands` | `async (params) → CommandHandlerResult` | **指令處理主入口** — 含權限閘門：`findCommandByTextAlias()` 查指令定義 → `hasMinLevel(senderLevel, cmd.permissionLevel)` 比對 → guest 執行非白名單指令回傳 `⛔ requires {level}` | Entry |

#### `commands-export-session.ts`（203 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `buildExportSessionReply` | `async (params) → ReplyPayload` | 建構 session 匯出回覆 | Core |

#### `commands-info.ts`（230 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `handleHelpCommand` | `CommandHandler` | `/help` | Handler |
| `handleCommandsListCommand` | `CommandHandler` | `/commands` — 列出指令清單 | Handler |
| `buildCommandsPaginationKeyboard` | `(params) → keyboard` | 建構指令清單分頁鍵盤 | Utility |
| `handleStatusCommand` | `CommandHandler` | `/status` | Handler |
| `handleContextCommand` | `CommandHandler` | `/context` | Handler |
| `handleExportSessionCommand` | `CommandHandler` | `/export` | Handler |
| `handleWhoamiCommand` | `CommandHandler` | `/whoami` | Handler |

#### `commands-models.ts`（400 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `ModelsProviderData` | type | Model 列表資料 | Type |
| `buildModelsProviderData` | `async (params) → ModelsProviderData[]` | 建構 provider/model 列表資料 | Core |
| `formatModelsAvailableHeader` | `(params) → string` | 格式化可用 models 標題 | Utility |
| `resolveModelsCommandReply` | `async (params) → ReplyPayload` | 解析 `/models` 回覆 | Core |
| `handleModelsCommand` | `CommandHandler` | `/models` | Handler |

#### `commands-plugin.ts`（53 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `handlePluginCommand` | `CommandHandler` | `/plugin` 指令 | Handler |

#### `commands-session-abort.ts`（172 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `handleStopCommand` | `CommandHandler` | `/stop` 指令 | Handler |
| `handleAbortTrigger` | `CommandHandler` | Abort 觸發處理 | Handler |

#### `commands-session-store.ts`（53 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `persistSessionEntry` | `async (params) → boolean` | 持久化 session entry | IO |
| `persistAbortTargetEntry` | `async (params) → void` | 持久化 abort 目標 entry | IO |

#### `commands-session.ts`（646 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `handleActivationCommand` | `CommandHandler` | `/activation` — 切換群組啟動模式 | Handler |
| `handleSendPolicyCommand` | `CommandHandler` | `/send` — 切換發送策略 | Handler |
| `handleUsageCommand` | `CommandHandler` | `/usage` — 顯示使用量 | Handler |
| `handleFastCommand` | `CommandHandler` | `/fast` — 切換 fast mode | Handler |
| `handleSessionCommand` | `CommandHandler` | `/session` — session 管理（list/switch/delete） | Handler |
| `handleRestartCommand` | `CommandHandler` | `/restart` — 重啟 session | Handler |

#### `commands-setunset.ts`（101 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `SetUnsetParseResult` | type | Set/Unset 解析結果 | Type |
| `parseSetUnsetCommand` / `parseSetUnsetCommandAction` / `parseSlashCommandWithSetUnset` | `(params) → result` | 解析 set/unset 風格指令 | Utility |

#### `commands-setunset-standard.ts`（23 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `parseStandardSetUnsetSlashCommand` | `<T>(params) → result` | 解析標準 set/unset slash command | Utility |

#### `commands-slash-parse.ts`（46 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `SlashCommandParseResult` / `ParsedSlashCommand` | types | Slash command 解析結果 | Type |
| `parseSlashCommandActionArgs` | `(raw, slash) → result` | 解析 slash command action + args | Utility |
| `parseSlashCommandOrNull` | `(raw) → result \| null` | 嘗試解析 slash command | Utility |

#### `commands-status.ts`（216 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `buildStatusReply` | `async (params) → ReplyPayload` | 建構 `/status` 回覆 payload | Core |

#### `commands-subagents.ts`（94 行）+ `commands-subagents/`（多檔）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `handleSubagentsCommand` | `CommandHandler` | `/subagents` 指令主入口 | Handler |
| `handleSubagentsAgentsAction` | `(ctx) → result` | `/agents` — 列出 agents | Handler |
| `handleSubagentsFocusAction` | `async (ctx) → result` | `/focus` — 聚焦 subagent | Handler |
| `handleSubagentsHelpAction` | `() → result` | Subagents 說明 | Handler |
| `handleSubagentsInfoAction` | `(ctx) → result` | Subagent info | Handler |
| `handleSubagentsKillAction` | `async (ctx) → result` | `/kill` — 終止 subagent | Handler |
| `handleSubagentsListAction` | `(ctx) → result` | 列出 subagents | Handler |
| `handleSubagentsLogAction` | `async (ctx) → result` | Subagent log | Handler |
| `handleSubagentsSendAction` | `async (ctx) → result` | `/tell` — 向 subagent 發送 | Handler |
| `handleSubagentsSpawnAction` | `async (ctx) → result` | Spawn subagent | Handler |
| `handleSubagentsUnfocusAction` | `async (ctx) → result` | `/unfocus` — 取消聚焦 | Handler |
| `commands-subagents/shared.ts` | — | 共用工具（resolveSubagentTarget, formatSubagentListLine, buildSubagentsHelp 等） | Utility |

#### `commands-system-prompt.ts`（136 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `CommandsSystemPromptBundle` | type | 指令 system prompt 包 | Type |
| `resolveCommandsSystemPromptBundle` | `async (params) → bundle` | 解析指令 system prompt（含 skill commands） | Core |

#### `commands-tts.ts`（279 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `handleTtsCommands` | `CommandHandler` | `/tts` 指令（enable/disable/provider/voice 等） | Handler |

#### `commands-types.ts`（76 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `CommandContext` / `HandleCommandsParams` | types | 指令 context / handler 參數 | Type |
| `CommandHandlerResult` | type | 指令處理結果 | Type |
| `CommandHandler` | type | 指令處理器函式型別 | Type |

#### `commands.ts`（8 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| Re-exports | — | buildCommandContext, handleCommands, buildStatusReply, types | Barrel |

#### `config-commands.ts` / `config-value.ts` / `config-write-authorization.ts`

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `ConfigCommand` | type | Config 指令型別 | Type |
| `parseConfigCommand` | `(raw) → ConfigCommand \| null` | 解析 config 指令 | Utility |
| `parseConfigValue` | `(raw) → { key, value }` | 解析 config 值 | Utility |
| `resolveConfigWriteDeniedText` | `(params) → string` | 建構 config 寫入被拒文字 | Utility |

#### `debug-commands.ts`（26 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `DebugCommand` | type | Debug 指令型別 | Type |
| `parseDebugCommand` | `(raw) → DebugCommand \| null` | 解析 debug 指令 | Utility |

#### `directive-handling*.ts`（多檔，~1,500 行合計）— **Inline Directive 處理核心**

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `handleDirectiveOnly` | `async (params) → result` | 處理純 directive 訊息 | Core |
| `applyInlineDirectivesFastLane` | `async (params) → result` | **Fast-lane directive 套用**（繞過 LLM） | Core |
| `InlineDirectives` | type | Inline directive 解析結果 | Type |
| `parseInlineDirectives` | `(params) → InlineDirectives` | 解析 inline directives | Utility |
| `isDirectiveOnly` | `(params) → boolean` | 判斷是否為純 directive 訊息 | Utility |
| `persistInlineDirectives` | `async (params) → void` | 持久化 inline directives 到 session | IO |
| `resolveDefaultModel` | `(params) → { provider, model, aliasIndex }` | 解析預設 model | Core |
| `resolveCurrentDirectiveLevels` | `async (params) → result` | 解析當前 directive levels | Query |
| `ModelPickerCatalogEntry` / `ModelPickerItem` | types | Model 選擇器型別 | Type |
| `buildModelPickerItems` | `(catalog) → ModelPickerItem[]` | 建構 model picker 項目 | Utility |
| `resolveProviderEndpointLabel` | `(params) → string` | 解析 provider endpoint 標籤 | Utility |
| `maybeHandleModelDirectiveInfo` | `async (params) → result` | 處理 model directive info | Handler |
| `resolveModelSelectionFromDirective` | `(params) → result` | 從 directive 解析 model 選擇 | Core |
| `HandleDirectiveOnlyCoreParams` / `HandleDirectiveOnlyParams` / `ApplyInlineDirectivesFastLaneParams` | types | Directive handler 參數 | Type |
| `directive-handling.parse.ts` | — | Directive 解析（model/think/verbose/notice/elevated/reasoning/fast/queue/exec） | Utility |
| `directive-handling.persist.ts` | — | Directive 持久化 + 預設 model 解析 | IO |
| `directive-handling.auth.ts` | — | Auth label/profile override 解析 | Utility |
| `directive-handling.shared.ts` | — | 格式化輔助（formatDirectiveAck, formatElevatedEvent 等） | Utility |
| `directive-handling.queue-validation.ts` | — | Queue directive 驗證 | Utility |
| `directive-handling.model.ts` | — | Model directive 資訊/選擇處理 | Core |

#### `directive-parsing.ts`（40 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `skipDirectiveArgPrefix` | `(raw) → number` | 跳過 directive arg prefix | Utility |
| `takeDirectiveToken` | `(params) → result` | 擷取 directive token | Utility |

#### `directives.ts`（211 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `extractThinkDirective` / `extractVerboseDirective` / `extractFastDirective` / `extractNoticeDirective` / `extractElevatedDirective` / `extractReasoningDirective` / `extractStatusDirective` | `(body?) → { value, rest }` | 從訊息中擷取各 directive | Utility |
| `extractExecDirective` | re-export from exec/directive | 擷取 exec directive | Utility |

#### `dispatch-acp-delivery.ts`（201 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `AcpDispatchDeliveryMeta` | type | ACP dispatch delivery metadata | Type |
| `AcpDispatchDeliveryCoordinator` | type | ACP dispatch delivery 協調器介面 | Type |
| `createAcpDispatchDeliveryCoordinator` | `(params) → coordinator` | 建立 ACP dispatch delivery 協調器 | Factory |

#### `dispatch-acp.ts`（394 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `shouldBypassAcpDispatchForCommand` | `(params) → boolean` | 判斷是否繞過 ACP dispatch | Utility |
| `AcpDispatchAttemptResult` | type | ACP dispatch 嘗試結果 | Type |
| `tryDispatchAcpReply` | `async (params) → AcpDispatchAttemptResult` | **嘗試將回覆 dispatch 到 ACP session** | Core |

#### `dispatch-from-config.ts`（626 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `DispatchFromConfigResult` | type | Config dispatch 結果 | Type |
| `dispatchReplyFromConfig` | `async (params) → DispatchFromConfigResult` | **從 config 觸發完整 reply dispatch**（含 abort/ACP/hooks/TTS） | Entry |

#### `dispatcher-registry.ts`（58 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `registerDispatcher` | `(dispatcher) → void` | 註冊全域 reply dispatcher | State |
| `getTotalPendingReplies` | `() → number` | 取得所有 dispatcher 的待處理回覆數 | Query |
| `clearAllDispatchers` | `() → void` | 清除所有 dispatchers | State |

#### `elevated-allowlist-matcher.ts`（142 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `ExplicitElevatedAllowField` | type | Elevated 白名單欄位 | Type |
| `AllowFromFormatter` | type | 白名單格式化器 | Type |
| `stripSenderPrefix` / `parseExplicitElevatedAllowEntry` / `addFormattedTokens` / `matchesFormattedTokens` / `buildMutableTokens` / `matchesMutableTokens` | utility functions | Elevated 白名單 token 解析/比對 | Utility |

#### `elevated-unavailable.ts`（30 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `formatElevatedUnavailableMessage` | `(params) → string` | 格式化 elevated 不可用訊息 | Utility |

#### `exec/directive.ts`（210 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `extractExecDirective` | `(body?) → ExecDirectiveParse` | 擷取 exec directive（approval/deny/auto 等） | Utility |

#### `followup-runner.ts`（373 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `createFollowupRunner` | `(params) → runner` | 建立 followup 回覆執行器（處理佇列排入/排出） | Factory |

#### `get-reply-directives-apply.ts`（296 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `ApplyDirectiveResult` | type | Directive 套用結果 | Type |
| `applyInlineDirectiveOverrides` | `async (params) → ApplyDirectiveResult` | 套用 inline directive 覆蓋 | Core |

#### `get-reply-directives-utils.ts`（61 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `clearInlineDirectives` | `(cleaned) → InlineDirectives` | 清除 inline directives | Utility |
| `clearExecInlineDirectives` | `(directives) → InlineDirectives` | 清除 exec inline directives | Utility |

#### `get-reply-directives.ts`（512 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `ReplyDirectiveContinuation` | type | Reply directive 延續 | Type |
| `ReplyDirectiveResult` | type | Reply directive 結果 | Type |
| `resolveReplyDirectives` | `async (params) → ReplyDirectiveResult` | **解析回覆 directives**（directive-only / inline / command 路徑分流） | Core |

#### `get-reply-inline-actions.ts`（434 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `InlineActionResult` | type | Inline action 結果 | Type |
| `handleInlineActions` | `async (params) → InlineActionResult` | **處理 inline actions**（exec/queue/btw/abort） | Core |

#### `get-reply-run.ts`（563 行）— **Reply 執行核心**

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `runPreparedReply` | `async (params) → ReplyPayload \| ReplyPayload[] \| undefined` | **執行準備好的 reply**（session init → agent run → route） | Entry |

#### `get-reply.ts`（406 行）— **Reply Pipeline 入口**

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `getReplyFromConfig` | `async (ctx, opts?, cfg?) → ReplyPayload \| ReplyPayload[] \| undefined` | **主 reply 入口**（config → session → directives → **guest 攔截** → agent run）。Guest 非指令訊息在 inline actions 之後、agent run 之前攔截，直接回傳固定文字「你尚未取得使用權限。請使用 /request-access 提請認證。」，不進 LLM pipeline | Entry |

#### `groups.ts`（185 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `resolveGroupRequireMention` | `(params) → boolean` | 解析群組是否需要 @mention | Utility |
| `defaultGroupActivation` | `(requireMention) → "always" \| "mention"` | 預設群組啟動模式 | Utility |
| `buildGroupChatContext` | `(params) → string` | 建構群組 chat context | Utility |
| `buildGroupIntro` | `(params) → string` | 建構群組 intro 訊息 | Utility |

#### `history.ts`（193 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| Constants | `HISTORY_CONTEXT_MARKER`, `DEFAULT_GROUP_HISTORY_LIMIT`, `MAX_HISTORY_KEYS` | 歷史常數 | Const |
| `evictOldHistoryKeys` | `<T>(params) → void` | 淘汰舊歷史 key | Utility |
| `HistoryEntry` | type | 歷史項目 | Type |
| `buildHistoryContext` / `appendHistoryEntry` / `recordPendingHistoryEntry` / `recordPendingHistoryEntryIfEnabled` / `buildPendingHistoryContextFromMap` / `buildHistoryContextFromMap` / `clearHistoryEntries` / `clearHistoryEntriesIfEnabled` / `buildHistoryContextFromEntries` | 函式群 | 對話歷史管理 CRUD | Core |

#### `inbound-context.ts`（128 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `FinalizeInboundContextOptions` | type | 入站 context 確定化選項 | Type |
| `finalizeInboundContext` | `<T>(ctx, opts?) → FinalizedMsgContext` | 確定化入站訊息 context | Core |

#### `inbound-dedupe.ts`（82 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `buildInboundDedupeKey` | `(ctx) → string \| null` | 建構入站去重 key | Utility |
| `shouldSkipDuplicateInbound` | `(ctx) → boolean` | 判斷是否跳過重複入站訊息 | Utility |
| `resetInboundDedupe` | `() → void` | 重設入站去重狀態 | State |

#### `inbound-meta.ts`（233 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `buildInboundMetaSystemPrompt` | `(ctx) → string` | 建構入站訊息 metadata system prompt | Core |
| `buildInboundUserContextPrefix` | `(ctx) → string` | 建構入站使用者 context 前綴 | Utility |

#### `inbound-text.ts`（18 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `normalizeInboundTextNewlines` | `(input) → string` | 正規化入站文字換行 | Utility |
| `sanitizeInboundSystemTags` | `(input) → string` | 清理入站 system tags | Utility |

#### `line-directives.ts`（342 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `parseLineDirectives` | `(payload) → ReplyPayload` | 解析 LINE 平台 directives（Flex/quick-reply/sticker/image-map） | Utility |
| `hasLineDirectives` | `(text) → boolean` | 判斷是否有 LINE directives | Utility |

#### `memory-flush.ts`（228 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| Constants | `DEFAULT_MEMORY_FLUSH_SOFT_TOKENS`, `DEFAULT_MEMORY_FLUSH_FORCE_TRANSCRIPT_BYTES` | Memory flush 預設值 | Const |
| `DEFAULT_MEMORY_FLUSH_PROMPT` / `DEFAULT_MEMORY_FLUSH_SYSTEM_PROMPT` | const | Memory flush prompt | Const |
| `resolveMemoryFlushRelativePathForRun` / `resolveMemoryFlushPromptForRun` | `(params) → string` | 解析 memory flush 路徑/prompt | Utility |
| `MemoryFlushSettings` | type | Memory flush 設定 | Type |
| `resolveMemoryFlushSettings` | `(cfg?) → MemoryFlushSettings \| null` | 從 config 解析 memory flush 設定 | Utility |
| `resolveMemoryFlushContextWindowTokens` | `(params) → number` | 解析 memory flush context window tokens | Utility |
| `shouldRunMemoryFlush` | `(params) → boolean` | 判斷是否應執行 memory flush | Utility |
| `hasAlreadyFlushedForCurrentCompaction` | `(params) → boolean` | 判斷當前 compaction 是否已 flush | Query |

#### `mentions.ts`（179 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `CURRENT_MESSAGE_MARKER` | const | 當前訊息標記 | Const |
| `buildMentionRegexes` | `(cfg, agentId?) → RegExp[]` | 建構 @mention regex 列表 | Utility |
| `normalizeMentionText` | `(text) → string` | 正規化 mention 文字 | Utility |
| `matchesMentionPatterns` | `(text, regexes) → boolean` | 判斷是否 match mention | Utility |
| `ExplicitMentionSignal` | type | 顯式 mention 信號 | Type |
| `matchesMentionWithExplicit` | `(params) → result` | 帶顯式信號的 mention 比對 | Utility |
| `stripStructuralPrefixes` / `stripMentions` | `(text) → string` | 剝離結構前綴/mentions | Utility |

#### `model-selection.ts`（610 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `ModelDirectiveSelection` | type | Model directive 選擇結果 | Type |
| `StoredModelOverride` | type | 儲存的 model override | Type |
| `resolveStoredModelOverride` | `(params) → StoredModelOverride` | 解析儲存的 model override | Core |
| `createModelSelectionState` | `async (params) → ModelSelectionState` | **建立 model 選擇狀態機** | Factory |
| `resolveModelDirectiveSelection` | `(params) → ModelDirectiveSelection` | 從 directive 解析 model 選擇 | Core |
| `resolveContextTokens` | `(params) → number` | 解析 context tokens | Utility |

#### `normalize-reply.ts`（116 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `NormalizeReplySkipReason` | type | 正規化跳過原因 | Type |
| `NormalizeReplyOptions` | type | 正規化選項 | Type |
| `normalizeReplyPayload` | `(params) → result` | 正規化回覆 payload（strip heartbeat/silent/empty） | Core |

#### `origin-routing.ts`（29 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `resolveOriginMessageProvider` / `resolveOriginMessageTo` / `resolveOriginAccountId` | `(params) → string` | 解析 origin 路由欄位 | Utility |

#### `post-compaction-context.ts`（233 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `readPostCompactionContext` | `async (params) → string \| undefined` | 讀取 compaction 後注入的上下文 | IO |
| `extractSections` | `(text) → sections` | 從 compaction context 擷取區段 | Utility |

#### `provider-dispatcher.ts`（44 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `dispatchReplyWithBufferedBlockDispatcher` | `async (params) → result` | 以 buffered block dispatcher 投遞回覆 | Core |
| `dispatchReplyWithDispatcher` | `async (params) → result` | 以 dispatcher 投遞回覆 | Core |

#### `queue*.ts`（佇列系統，多檔 ~500 行合計）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `extractQueueDirective` | `(body?) → { mode, rest }` | 擷取 queue directive | Utility |
| `clearSessionQueues` | `(keys) → ClearSessionQueueResult` | 清除 session 佇列 | State |
| `scheduleFollowupDrain` | `(params) → void` | 排程 followup drain | Core |
| `enqueueFollowupRun` | `(params) → void` | 排入 followup run | Core |
| `getFollowupQueueDepth` | `(key) → number` | 取得佇列深度 | Query |
| `resolveQueueSettings` | `(params) → QueueSettings` | 解析佇列設定 | Utility |
| `clearFollowupQueue` | `(key) → number` | 清除 followup 佇列 | State |
| `QueueMode` / `QueueDropPolicy` / `QueueSettings` / `FollowupRun` | types | 佇列型別 | Type |
| `FollowupQueueState` | type | 佇列狀態 | Type |

#### `queue-policy.ts`（21 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `ActiveRunQueueAction` | type `"run-now" \| "enqueue-followup" \| "drop"` | 活躍 run 佇列動作 | Type |
| `resolveActiveRunQueueAction` | `(params) → ActiveRunQueueAction` | 解析活躍 run 的佇列動作 | Utility |

#### `reply-delivery.ts`（136 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `ReplyDirectiveParseMode` | type | Reply directive 解析模式 | Type |
| `normalizeReplyPayloadDirectives` | `(params) → ReplyPayload` | 正規化 reply payload directives | Utility |
| `createBlockReplyDeliveryHandler` | `(params) → handler` | 建立 block reply delivery handler | Factory |

#### `reply-directives.ts`（49 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `ReplyDirectiveParseResult` | type | Reply directive 解析結果 | Type |
| `parseReplyDirectives` | `(text) → ReplyDirectiveParseResult` | 解析 reply directives | Utility |

#### `reply-dispatcher.ts`（253 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `ReplyDispatchKind` | type `"tool" \| "block" \| "final"` | Reply dispatch 種類 | Type |
| `ReplyDispatcherOptions` / `ReplyDispatcherWithTypingOptions` | types | Dispatcher 選項 | Type |
| `ReplyDispatcher` | type | **Reply dispatcher 介面** | Type |
| `createReplyDispatcher` | `(options) → ReplyDispatcher` | 建立 reply dispatcher | Factory |
| `createReplyDispatcherWithTyping` | `(options) → { dispatcher, replyOptions, markDispatchIdle }` | 建立含 typing 的 dispatcher | Factory |

#### `reply-elevated.ts`（236 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `formatElevatedUnavailableMessage` | re-export | 格式化 elevated 不可用訊息 | Utility |
| `resolveElevatedPermissions` | `(params) → result` | 解析使用者的 elevated 權限 | Core |

#### `reply-inline.ts` / `reply-inline-whitespace.ts`

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `extractInlineSimpleCommand` | `(body?) → result` | 擷取 inline 簡單指令 | Utility |
| `stripInlineStatus` | `(body) → { stripped, status }` | 剝離 inline status | Utility |
| `collapseInlineHorizontalWhitespace` | `(value) → string` | 合併 inline 水平空白 | Utility |

#### `reply-media-paths.ts`（105 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `createReplyMediaPathNormalizer` | `(params) → normalizer` | 建立回覆媒體路徑正規化器 | Factory |

#### `reply-payloads.ts`（277 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `formatBtwTextForExternalDelivery` | `(payload) → string \| undefined` | 格式化 BTW 文字供外部投遞 | Utility |
| `applyReplyTagsToPayload` | `(payload, tags) → ReplyPayload` | 套用 reply tags | Utility |
| `isRenderablePayload` | `(payload) → boolean` | 判斷 payload 是否可渲染 | Utility |
| `shouldSuppressReasoningPayload` | `(payload) → boolean` | 判斷是否應隱藏 reasoning payload | Utility |
| `applyReplyThreading` | `(params) → ReplyPayload` | 套用 reply threading | Utility |
| `filterMessagingToolDuplicates` / `filterMessagingToolMediaDuplicates` | `(params) → ReplyPayload[]` | 過濾 messaging tool 重複 | Utility |
| `shouldSuppressMessagingToolReplies` | `(params) → boolean` | 判斷是否應抑制 messaging tool 回覆 | Utility |

#### `reply-reference.ts`（60 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `ReplyReferencePlanner` | type | Reply reference 規劃器 | Type |
| `createReplyReferencePlanner` | `(options) → ReplyReferencePlanner` | 建立 reply reference 規劃器 | Factory |

#### `reply-tags.ts`（22 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `extractReplyToTag` | `(body?) → result` | 擷取 reply-to tag | Utility |

#### `reply-threading.ts`（69 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `resolveReplyToMode` | `(params) → mode` | 解析 reply-to 模式 | Utility |
| `createReplyToModeFilter` / `createReplyToModeFilterForChannel` | `(params) → filter` | 建立 reply-to 模式過濾器 | Factory |

#### `response-prefix-template.ts`（101 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `ResponsePrefixContext` | type | 回覆前綴上下文 | Type |
| `resolveResponsePrefixTemplate` | `(params) → string \| undefined` | 解析回覆前綴模板 | Utility |
| `extractShortModelName` | `(fullModel) → string` | 擷取短 model 名稱 | Utility |
| `hasTemplateVariables` | `(template?) → boolean` | 判斷是否有模板變數 | Utility |

#### `route-reply.ts`（220 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `RouteReplyParams` / `RouteReplyResult` | types | 路由參數/結果 | Type |
| `routeReply` | `async (params) → RouteReplyResult` | **路由回覆到正確頻道**（多頻道投遞） | Core |
| `isRoutableChannel` | `(params) → boolean` | 判斷頻道是否可路由 | Utility |

#### `session.ts`（620 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `SessionInitResult` | type | Session 初始化結果 | Type |
| `initSessionState` | `async (params) → SessionInitResult` | **Session 狀態初始化**（載入/建立 session entry + model resolve） | Core |

#### `session-delivery.ts`（207 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `LegacyMainDeliveryRetirement` | type | Legacy main delivery 退役型別 | Type |
| `resolveLastChannelRaw` / `resolveLastToRaw` | `(params) → string \| undefined` | 解析最後 channel/to | Utility |
| `maybeRetireLegacyMainDeliveryRoute` | `(params) → result` | 退役 legacy main delivery 路由 | Utility |

#### `session-fork.ts`（63 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `resolveParentForkMaxTokens` | `(cfg) → number` | 解析 parent fork max tokens | Utility |
| `forkSessionFromParent` | `(params) → void` | 從 parent 分叉 session | Core |

#### `session-hooks.ts`（66 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `SessionHookContext` | type | Session hook context | Type |
| `buildSessionStartHookPayload` / `buildSessionEndHookPayload` | `(params) → payload` | 建構 session start/end hook payload | Utility |

#### `session-reset-model.ts`（200 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `applyResetModelOverride` | `async (params) → void` | 套用 session reset 時的 model override | Core |

#### `session-reset-prompt.ts`（21 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `buildBareSessionResetPrompt` | `(cfg?, nowMs?) → string` | 建構基本 session reset prompt | Utility |
| `BARE_SESSION_RESET_PROMPT` | const | 基本 session reset prompt | Const |

#### `session-run-accounting.ts`（37 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `persistRunSessionUsage` | `async (params) → void` | 持久化 run session usage | IO |
| `incrementRunCompactionCount` | `async (params) → void` | 遞增 run compaction 計數 | IO |

#### `session-updates.ts`（308 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `drainFormattedSystemEvents` | `async (params) → string[]` | 排出格式化的 system events | Core |
| `ensureSkillSnapshot` | `async (params) → void` | 確保 skill snapshot 已更新 | Core |
| `incrementCompactionCount` | `async (params) → void` | 遞增 compaction 計數 | IO |

#### `session-usage.ts`（135 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `persistSessionUsageUpdate` | `async (params) → void` | 持久化 session usage 更新 | IO |

#### `slack-directives.ts`（218 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `hasSlackDirectives` | `(text) → boolean` | 判斷是否有 Slack directives | Utility |
| `parseSlackDirectives` | `(payload) → ReplyPayload` | 解析 Slack directives（button/block-kit） | Utility |

#### `stage-sandbox-media.ts`（330 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `stageSandboxMedia` | `async (params) → void` | 將入站媒體暫存到 sandbox workspace | IO |

#### `streaming-directives.ts`（139 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `createStreamingDirectiveAccumulator` | `() → accumulator` | 建立 streaming directive 累加器 | Factory |

#### `strip-inbound-meta.ts`（244 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `stripInboundMetadata` | `(text) → string` | 剝離入站 metadata（envelope/timestamp/sender） | Utility |
| `stripLeadingInboundMetadata` | `(text) → string` | 剝離開頭的入站 metadata | Utility |
| `extractInboundSenderLabel` | `(text) → string \| null` | 擷取入站 sender label | Utility |

#### `subagents-utils.ts`（109 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `resolveSubagentLabel` / `formatRunLabel` / `formatRunStatus` / `sortSubagentRuns` | utility | Subagent 顯示/排序 | Utility |
| `SubagentTargetResolution` | type | Subagent target 解析結果 | Type |
| `resolveSubagentTargetFromRuns` | `(params) → SubagentTargetResolution` | 從 runs 解析 subagent 目標 | Utility |

#### `telegram-context.ts`（41 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `resolveTelegramConversationId` | `(params) → string` | 解析 Telegram conversation ID | Utility |

#### `typing*.ts`（三檔，~409 行合計）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `TypingModeContext` | type | Typing 模式上下文 | Type |
| `DEFAULT_GROUP_TYPING_MODE` | const | 群組預設 typing 模式 | Const |
| `resolveTypingMode` | `(params) → TypingMode` | 解析 typing 模式 | Utility |
| `TypingSignaler` | type | Typing 信號器介面 | Type |
| `createTypingSignaler` | `(params) → TypingSignaler` | 建立 typing 信號器 | Factory |
| `ResolveRunTypingPolicyParams` / `ResolvedRunTypingPolicy` | types | Typing policy 參數/結果 | Type |
| `resolveRunTypingPolicy` | `(params) → ResolvedRunTypingPolicy` | 解析 run 的 typing policy | Utility |
| `TypingController` | type | Typing 控制器介面 | Type |
| `createTypingController` | `(params) → TypingController` | 建立 typing 控制器 | Factory |

#### `untrusted-context.ts`（16 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `appendUntrustedContext` | `(base, untrusted?) → string` | 附加 untrusted context 到 prompt | Utility |

---

### src/cron/

#### `delivery.ts`（241 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `CronDeliveryPlan` | type | Cron 投遞計畫 | Type |
| `resolveCronDeliveryPlan` | `(job) → CronDeliveryPlan` | 解析 cron job 的投遞計畫 | Core |
| `CronFailureDeliveryPlan` / `CronFailureDestinationInput` | types | 失敗投遞型別 | Type |
| `resolveFailureDestination` | `(params) → result` | 解析失敗通知目的地 | Utility |
| `sendFailureNotificationAnnounce` | `async (params) → void` | 發送失敗通知 announce | IO |

#### `heartbeat-policy.ts`（41 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `HeartbeatDeliveryPayload` | type | 心跳投遞 payload | Type |
| `shouldSkipHeartbeatOnlyDelivery` | `(params) → boolean` | 判斷是否跳過僅心跳投遞 | Utility |
| `shouldEnqueueCronMainSummary` | `(params) → boolean` | 判斷是否排入 cron main 摘要 | Utility |

#### `isolated-agent.ts`（1 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| Re-export | `RunCronAgentTurnResult`, `runCronIsolatedAgentTurn` | Cron isolated agent re-export | Barrel |

#### `isolated-agent/run.ts`（~500 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `RunCronAgentTurnResult` | type | Cron agent turn 結果 | Type |
| `runCronIsolatedAgentTurn` | `async (params) → RunCronAgentTurnResult` | **Cron isolated agent 單 turn 執行**（model resolve → agent run → delivery） | Entry |

#### `isolated-agent/delivery-dispatch.ts`（~300 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `matchesMessagingToolDeliveryTarget` | `(params) → boolean` | 判斷是否匹配 messaging tool 投遞目標 | Utility |
| `resolveCronDeliveryBestEffort` | `(job) → boolean` | 解析 best-effort delivery | Utility |
| `SuccessfulDeliveryTarget` | type | 成功投遞目標 | Type |
| `DispatchCronDeliveryState` | type | Cron delivery dispatch 狀態 | Type |
| `dispatchCronDelivery` | `async (params) → void` | **派送 cron delivery**（announce/webhook/direct） | Core |

#### `isolated-agent/delivery-target.ts`（~80 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `DeliveryTargetResolution` | type | 投遞目標解析結果 | Type |
| `resolveDeliveryTarget` | `async (params) → DeliveryTargetResolution` | 解析 cron 投遞目標 | Core |

#### `isolated-agent/helpers.ts`（~100 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `pickSummaryFromOutput` | `(text?) → string` | 從 output 擷取摘要 | Utility |
| `pickSummaryFromPayloads` / `pickLastNonEmptyTextFromPayloads` / `pickLastDeliverablePayload` | `(payloads) → result` | 從 payloads 擷取摘要/最後文字/可投遞 payload | Utility |
| `isHeartbeatOnlyResponse` | `(payloads, ackMaxChars) → boolean` | 判斷是否為僅心跳回應 | Utility |
| `resolveHeartbeatAckMaxChars` | `(agentCfg?) → number` | 解析心跳 ack 最大字元數 | Utility |

#### `isolated-agent/session-key.ts`（~10 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `resolveCronAgentSessionKey` | `(params) → string` | 解析 cron agent session key | Utility |

#### `isolated-agent/session.ts`（~50 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `resolveCronSession` | `(params) → result` | 解析/建立 cron session | Core |

#### `isolated-agent/skills-snapshot.ts`（~30 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `resolveCronSkillsSnapshot` | `(params) → result` | 解析 cron skills snapshot | Utility |

#### `isolated-agent/subagent-followup.ts`（~120 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `isLikelyInterimCronMessage` | `(value) → boolean` | 判斷是否為 interim cron 訊息 | Utility |
| `expectsSubagentFollowup` | `(value) → boolean` | 判斷是否期待 subagent followup | Utility |
| `readDescendantSubagentFallbackReply` | `async (params) → result` | 讀取 descendant subagent fallback 回覆 | IO |
| `waitForDescendantSubagentSummary` | `async (params) → result` | 等待 descendant subagent 摘要 | IO |

#### `legacy-delivery.ts`（~150 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `hasLegacyDeliveryHints` | `(payload) → boolean` | 判斷是否有 legacy delivery hints | Utility |
| `buildDeliveryFromLegacyPayload` / `buildDeliveryPatchFromLegacyPayload` / `mergeLegacyDeliveryInto` / `normalizeLegacyDeliveryInput` / `stripLegacyDeliveryFields` | functions | Legacy delivery 遷移/正規化 | Migration |

#### `normalize.ts`（~540 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `normalizeCronJobInput` | `(params) → CronJob` | 正規化 cron job 輸入（完整驗證 + 轉換） | Core |
| `normalizeCronJobCreate` | `(params) → CronJobCreate` | 正規化 cron job 建立輸入 | Core |
| `normalizeCronJobPatch` | `(params) → CronJobPatch` | 正規化 cron job patch | Core |

#### `parse.ts`（~30 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `parseAbsoluteTimeMs` | `(input) → number \| null` | 解析絕對時間（ISO/Unix timestamp）為毫秒 | Utility |

#### `payload-migration.ts`（~30 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `migrateLegacyCronPayload` | `(payload) → boolean` | 遷移 legacy cron payload | Migration |

#### `run-log.ts`（~400 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `CronRunLogEntry` / `CronRunLogSortDir` / `CronRunLogStatusFilter` / `CronRunLogPageResult` / `ReadCronRunLogPageOptions` | types | Run log 型別 | Type |
| `resolveCronRunLogPath` | `(params) → string` | 解析 run log 路徑 | Utility |
| `DEFAULT_CRON_RUN_LOG_MAX_BYTES` / `DEFAULT_CRON_RUN_LOG_KEEP_LINES` | const | Run log 大小限制 | Const |
| `resolveCronRunLogPruneOptions` | `(cfg?) → options` | 解析 run log 裁剪選項 | Utility |
| `appendCronRunLog` | `async (params) → void` | 追加 run log 條目 | IO |
| `readCronRunLogEntries` | `async (params) → CronRunLogEntry[]` | 讀取 run log 條目 | IO |
| `readCronRunLogEntriesPage` / `readCronRunLogEntriesPageAll` | `async (params) → CronRunLogPageResult` | 分頁讀取 run log | IO |

#### `schedule.ts`（~170 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `coerceFiniteScheduleNumber` | `(value) → number \| undefined` | 強制轉換有限排程數字 | Utility |
| `computeNextRunAtMs` | `(schedule, nowMs) → number \| undefined` | 計算下次執行時間 | Core |
| `computePreviousRunAtMs` | `(schedule, nowMs) → number \| undefined` | 計算上次執行時間 | Core |

#### `service.ts`（60 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `CronService` | class | **Cron 排程服務 facade**（start/stop/add/update/remove/run/wake） | Entry |

#### `service/ops.ts`（~600 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `CronListPageOptions` / `CronListPageResult` | types | 分頁列表型別 | Type |
| `start` / `stop` / `status` / `list` / `listPage` / `add` / `update` / `remove` / `run` / `enqueueRun` / `wakeNow` | async functions | CronService 操作實作 | Core |

#### `service/jobs.ts`（~900 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `assertSupportedJobSpec` | `(job) → void` | 驗證 job 規格 | Guard |
| `findJobOrThrow` | `(state, id) → CronJob` | 查找 job（不存在拋錯） | Query |
| `computeJobNextRunAtMs` / `computeJobPreviousRunAtMs` | `(job, nowMs) → number \| undefined` | 計算 job 下次/上次執行時間 | Core |
| `recordScheduleComputeError` | `(params) → void` | 記錄排程計算錯誤 | IO |
| `recomputeNextRuns` / `recomputeNextRunsForMaintenance` | `(state) → boolean` | 重算所有 job 的下次執行時間 | Core |
| `nextWakeAtMs` | `(state) → number \| undefined` | 計算下次喚醒時間 | Core |
| `createJob` | `(state, input) → CronJob` | 建立 job | Core |
| `applyJobPatch` | `(state, job, patch) → CronJob` | 套用 job patch | Core |
| `isJobDue` | `(job, nowMs, opts) → boolean` | 判斷 job 是否到期 | Utility |
| `resolveJobPayloadTextForMain` | `(job) → string \| undefined` | 解析 job 的 main payload 文字 | Utility |

#### `service/state.ts`（~170 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `CronEvent` / `Logger` / `CronServiceDeps` / `CronServiceDepsInternal` / `CronServiceState` | types | Service 狀態相關型別 | Type |
| `createCronServiceState` | `(deps) → CronServiceState` | 建立 CronService 狀態 | Factory |
| `CronRunMode` / `CronWakeMode` / `CronStatusSummary` / `CronRunResult` 等 | types | 各種結果型別 | Type |

#### `service/timer.ts`（~1,300 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `executeJobCoreWithTimeout` | `async (state, job, mode) → result` | 有 timeout 的 job 核心執行 | Core |
| `applyJobResult` | `(state, job, result) → void` | 套用 job 結果到狀態 | Core |
| `armTimer` | `(state) → void` | 武裝 timer | Core |
| `onTimer` | `async (state) → void` | Timer 觸發回調 | Core |
| `runMissedJobs` | `async (state) → void` | 執行錯過的 jobs | Core |
| `runDueJobs` | `async (state) → void` | 執行到期的 jobs | Core |
| `executeJobCore` / `executeJob` | `async (state, job, mode) → result` | **Job 核心執行 + 完整執行（含投遞）** | Core |
| `wake` / `stopTimer` / `emit` | utility | Timer 控制 | Utility |

#### `service/store.ts`（~80 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `ensureLoaded` | `async (state) → void` | 確保 store 已載入 | IO |
| `warnIfDisabled` | `(state, action) → void` | 停用時警告 | Utility |
| `persist` | `async (state, opts?) → void` | 持久化 store | IO |

#### `service/timeout-policy.ts`（~30 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `DEFAULT_JOB_TIMEOUT_MS` / `AGENT_TURN_SAFETY_TIMEOUT_MS` | const | Timeout 常數 | Const |
| `resolveCronJobTimeoutMs` | `(job) → number \| undefined` | 解析 job timeout | Utility |

#### `service/normalize.ts`（~90 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `normalizeRequiredName` / `normalizeOptionalText` / `normalizeOptionalAgentId` / `normalizeOptionalSessionKey` / `inferLegacyName` / `normalizePayloadToSystemText` | functions | 正規化各種 cron 輸入欄位 | Utility |

#### `service/initial-delivery.ts`（~40 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `normalizeCronCreateDeliveryInput` | `(input) → CronJobCreate` | 正規化建立時的 delivery 輸入 | Utility |
| `resolveInitialCronDelivery` | `(input) → CronDelivery \| undefined` | 解析初始 delivery | Utility |

#### `service/locked.ts`（~20 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `locked` | `async <T>(state, fn) → T` | Lock 機制（防止並發操作） | Utility |

#### `session-reaper.ts`（~150 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `resolveRetentionMs` | `(cronConfig?) → number \| null` | 解析 session 保留時間 | Utility |
| `ReaperResult` | type | Session 清理結果 | Type |
| `sweepCronRunSessions` | `async (params) → ReaperResult` | **清掃過期 cron run sessions** | Core |
| `resetReaperThrottle` | `() → void` | 重設 reaper throttle | State |

#### `stagger.ts`（~50 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `DEFAULT_TOP_OF_HOUR_STAGGER_MS` | const | Top-of-hour 錯開預設值 | Const |
| `isRecurringTopOfHourCronExpr` | `(expr) → boolean` | 判斷是否為每小時整點 cron | Utility |
| `normalizeCronStaggerMs` / `resolveDefaultCronStaggerMs` / `resolveCronStaggerMs` | `(params) → number` | 解析 cron 錯開毫秒數 | Utility |

#### `store.ts`（~70 行）+ `store-migration.ts`

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `DEFAULT_CRON_DIR` / `DEFAULT_CRON_STORE_PATH` | const | Cron store 路徑常數 | Const |
| `resolveCronStorePath` | `(storePath?) → string` | 解析 cron store 路徑 | Utility |
| `loadCronStore` | `async (storePath) → CronStoreFile` | 載入 cron store | IO |
| `saveCronStore` | `async (storePath, store) → void` | 儲存 cron store | IO |
| `normalizeStoredCronJobs` | `(jobs) → CronJob[]` | 正規化儲存的 cron jobs（遷移） | Migration |

#### `types.ts` + `types-shared.ts`（~170 行合計）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `CronJobBase` | type | Cron job 基底型別（泛型） | Type |
| `CronSchedule` / `CronSessionTarget` / `CronWakeMode` / `CronDeliveryMode` | types | 排程相關型別 | Type |
| `CronDelivery` / `CronFailureAlert` / `CronPayload` / `CronJob` / `CronJobCreate` / `CronJobPatch` | types | Job 完整型別 | Type |
| `CronRunStatus` / `CronDeliveryStatus` / `CronUsageSummary` / `CronRunTelemetry` / `CronRunOutcome` | types | 執行結果型別 | Type |
| `CronStoreFile` | type | Store 檔案型別 | Type |

#### `validate-timestamp.ts`（~40 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `TimestampValidationError` / `TimestampValidationSuccess` / `TimestampValidationResult` | types | 時間戳驗證結果 | Type |
| `validateScheduleTimestamp` | `(params) → TimestampValidationResult` | 驗證排程時間戳 | Utility |

#### `webhook-url.ts`（~10 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `normalizeHttpWebhookUrl` | `(value) → string \| null` | 正規化 HTTP webhook URL | Utility |

---

### src/tts/

#### `tts-core.ts`（724 行）— TTS 底層引擎

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `DEFAULT_OPENAI_BASE_URL` | const | OpenAI API base URL | Const |
| `isValidVoiceId` | `(voiceId) → boolean` | 驗證 voice ID | Utility |
| `parseTtsDirectives` | `(params) → result` | 解析 TTS directives（voice/speed/format/model） | Core |
| `OPENAI_TTS_MODELS` / `OPENAI_TTS_VOICES` | const | OpenAI TTS 可用 models/voices | Const |
| `isValidOpenAIModel` / `isValidOpenAIVoice` | `(value, baseUrl?) → boolean` | 驗證 OpenAI TTS model/voice | Utility |
| `resolveOpenAITtsInstructions` | `(params) → string` | 解析 OpenAI TTS instructions | Utility |
| `summarizeText` | `async (params) → string` | **LLM 文字摘要**（TTS 前壓縮過長文字） | Core |
| `scheduleCleanup` | `(params) → void` | 排程 TTS 暫存檔清理 | Utility |
| `elevenLabsTTS` | `async (params) → Buffer` | **ElevenLabs TTS 引擎** | Provider |
| `openaiTTS` | `async (params) → Buffer` | **OpenAI TTS 引擎** | Provider |
| `inferEdgeExtension` | `(outputFormat) → string` | 推斷 Edge TTS 副檔名 | Utility |
| `edgeTTS` | `async (params) → Buffer` | **Edge TTS 引擎** | Provider |

#### `tts.ts`（1,003 行）— TTS 設定/管理/套用

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| Re-exports | `OPENAI_TTS_MODELS`, `OPENAI_TTS_VOICES` | from tts-core | Re-export |
| `ResolvedTtsConfig` / `ResolvedTtsModelOverrides` / `TtsDirectiveOverrides` / `TtsDirectiveParseResult` / `TtsResult` / `TtsTelephonyResult` | types | TTS 設定/結果型別 | Type |
| `normalizeTtsAutoMode` | `(value) → TtsAutoMode \| undefined` | 正規化 TTS auto mode | Utility |
| `resolveTtsConfig` | `(cfg) → ResolvedTtsConfig` | 從 config 解析 TTS 設定 | Core |
| `resolveTtsPrefsPath` | `(config) → string` | 解析 TTS prefs 路徑 | Utility |
| `resolveTtsAutoMode` | `(params) → TtsAutoMode` | 解析 TTS auto mode | Utility |
| `buildTtsSystemPromptHint` | `(cfg) → string \| undefined` | 建構 TTS system prompt hint | Utility |
| `isTtsEnabled` | `(params) → boolean` | 判斷 TTS 是否啟用 | Query |
| `setTtsAutoMode` / `setTtsEnabled` / `setTtsProvider` / `setTtsMaxLength` / `setSummarizationEnabled` | `(prefsPath, value) → void` | 設定 TTS 偏好 | IO |
| `getTtsProvider` / `getTtsMaxLength` / `isSummarizationEnabled` | `(prefsPath) → value` | 讀取 TTS 偏好 | IO |
| `getLastTtsAttempt` / `setLastTtsAttempt` | `(entry?) → TtsStatusEntry` | 讀寫最後 TTS 嘗試 | State |
| `resolveTtsApiKey` | `(params) → string \| undefined` | 解析 TTS API key | Utility |
| `TTS_PROVIDERS` | const `["openai", "elevenlabs", "edge"]` | TTS provider 列表 | Const |
| `resolveTtsProviderOrder` | `(primary) → TtsProvider[]` | 解析 TTS provider fallback 順序 | Utility |
| `isTtsProviderConfigured` | `(config, provider) → boolean` | 判斷 TTS provider 是否已設定 | Query |
| `textToSpeech` | `async (params) → TtsResult` | **文字轉語音主入口**（provider fallback） | Entry |
| `textToSpeechTelephony` | `async (params) → TtsTelephonyResult` | 電話語音合成 | Entry |
| `maybeApplyTtsToPayload` | `async (params) → void` | **自動對 reply payload 套用 TTS** | Core |

---

### src/context-engine/

#### `index.ts`（19 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| Re-exports | types + factories + init | Barrel 入口 | Barrel |

#### `init.ts`（23 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `ensureContextEnginesInitialized` | `() → void` | 確保所有 context engines 已初始化 | Init |

#### `legacy.ts`（128 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `LegacyContextEngine` | class implements ContextEngine | **Legacy context engine 實作**（基於 session transcript） | Core |
| `registerLegacyContextEngine` | `() → void` | 註冊 legacy context engine | Init |

#### `registry.ts`（85 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `ContextEngineFactory` | type | Context engine 工廠型別 | Type |
| `registerContextEngine` | `(id, factory) → void` | 註冊 context engine | Core |
| `getContextEngineFactory` | `(id) → factory \| undefined` | 取得 context engine 工廠 | Query |
| `listContextEngineIds` | `() → string[]` | 列出所有 context engine ID | Query |
| `resolveContextEngine` | `async (config?) → ContextEngine` | **解析當前使用的 context engine** | Core |

#### `types.ts`（177 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `AssembleResult` / `CompactResult` / `IngestResult` / `IngestBatchResult` / `BootstrapResult` | types | Context engine 操作結果 | Type |
| `ContextEngineInfo` | type | Engine 資訊 | Type |
| `SubagentSpawnPreparation` / `SubagentEndReason` / `ContextEngineRuntimeContext` | types | Subagent 相關型別 | Type |
| `ContextEngine` | interface | **Context engine 介面**（assemble/compact/ingest/bootstrap/info 等） | Interface |

---

## 呼叫關聯圖

```
入站訊息流（Inbound Pipeline）
═══════════════════════════════

Channel Adapter
  └→ dispatch.ts: dispatchInboundMessage()        ← 入口
       ├→ inbound-context.ts: finalizeInboundContext()
       └→ dispatch-from-config.ts: dispatchReplyFromConfig()   ← 主 dispatch
            ├→ abort.ts: tryFastAbortFromMessage()             ← 快速中斷路徑
            ├→ dispatch-acp.ts: tryDispatchAcpReply()          ← ACP session 分流
            ├→ inbound-dedupe.ts: shouldSkipDuplicateInbound()
            └→ reply/get-reply.ts: getReplyFromConfig()        ← Reply 入口
                 ├→ session.ts: initSessionState()             ← Session 初始化
                 ├→ get-reply-directives.ts: resolveReplyDirectives()
                 │    ├→ directive-handling.impl.ts: handleDirectiveOnly() ← 純 directive 路徑
                 │    ├→ directive-handling.fast-lane.ts: applyInlineDirectivesFastLane()
                 │    └→ commands-core.ts: handleCommands()    ← 指令路徑（含 permissionLevel gate）
                 ├→ get-reply-inline-actions.ts: handleInlineActions()  ← Inline action 路徑
                 ├─ [Guest gate] senderPermissionLevel === "guest" → 固定回覆（不進 LLM）
                 └→ get-reply-run.ts: runPreparedReply()       ← Agent run 路徑
                      ├→ model-selection.ts: createModelSelectionState()
                      ├→ agent-runner.ts: runReplyAgent()      ← Agent 執行
                      │    ├→ queue-policy.ts: resolveActiveRunQueueAction()
                      │    ├→ agent-runner-execution.ts: runAgentTurnWithFallback()
                      │    │    ├→ pi-embedded.ts: runEmbeddedPiAgent()  ← LLM 呼叫
                      │    │    └→ model-fallback.ts: runWithModelFallback()
                      │    ├→ agent-runner-payloads.ts: buildReplyPayloads()
                      │    ├→ agent-runner-memory.ts: runMemoryFlushIfNeeded()
                      │    └→ block-reply-pipeline.ts: createBlockReplyPipeline()
                      ├→ route-reply.ts: routeReply()          ← 路由投遞
                      └→ tts.ts: maybeApplyTtsToPayload()      ← TTS 套用

排程執行流（Cron Pipeline）
═══════════════════════════

CronService.run()
  └→ service/timer.ts: executeJob()
       └→ executeJobCore()
            └→ isolated-agent/run.ts: runCronIsolatedAgentTurn()  ← Cron agent 入口
                 ├→ agents/pi-embedded.ts: runEmbeddedPiAgent()   ← LLM 呼叫
                 ├→ isolated-agent/helpers.ts: pickSummaryFromPayloads()
                 ├→ isolated-agent/subagent-followup.ts: waitForDescendantSubagentSummary()
                 └→ isolated-agent/delivery-dispatch.ts: dispatchCronDelivery()  ← 投遞
                      └→ delivery.ts: resolveCronDeliveryPlan()

TTS Pipeline
═══════════

tts.ts: textToSpeech()                            ← TTS 入口
  ├→ tts-core.ts: summarizeText()                 ← 文字摘要（過長時）
  ├→ tts-core.ts: openaiTTS()                     ← OpenAI provider
  ├→ tts-core.ts: elevenLabsTTS()                 ← ElevenLabs provider
  └→ tts-core.ts: edgeTTS()                       ← Edge provider

Context Engine
═══════════════

registry.ts: resolveContextEngine()                ← Engine 解析
  ├→ legacy.ts: LegacyContextEngine                ← Legacy 實作
  └→ (plugin engines via registerContextEngine)     ← 插件擴充
```

---

## 系統歸屬分類

### 入站訊息 Pipeline
- `dispatch.ts`, `dispatch-from-config.ts`, `inbound-context.ts`, `inbound-dedupe.ts`, `inbound-meta.ts`, `inbound-text.ts`, `envelope.ts`, `inbound-debounce.ts`

### 指令系統
- `commands-registry*.ts`, `command-auth.ts`, `command-detection.ts`, `commands-args.ts`, `commands-core.ts`, `commands-types.ts`, `commands-slash-parse.ts`, `commands-setunset*.ts`, `config-commands.ts`, `debug-commands.ts`, `command-gates.ts`, `skill-commands.ts`
- **Handler 群**：`commands-acp*.ts`, `commands-allowlist.ts`, `commands-approve.ts`, `commands-bash.ts`, `commands-btw.ts`, `commands-compact.ts`, `commands-config.ts`, `commands-context*.ts`, `commands-export-session.ts`, `commands-info.ts`, `commands-models.ts`, `commands-plugin.ts`, `commands-session*.ts`, `commands-status.ts`, `commands-subagents/*.ts`, `commands-system-prompt.ts`, `commands-tts.ts`

### LLM Agent 執行
- `agent-runner.ts` (主入口), `agent-runner-execution.ts` (fallback loop), `agent-runner-helpers.ts`, `agent-runner-memory.ts` (memory flush), `agent-runner-payloads.ts`, `agent-runner-reminder-guard.ts`, `agent-runner-utils.ts`

### Inline Directive 系統
- `directive-handling*.ts`, `directive-parsing.ts`, `directives.ts`, `get-reply-directives*.ts`

### 回覆投遞 & Streaming
- `reply-dispatcher.ts`, `dispatcher-registry.ts`, `provider-dispatcher.ts`, `reply-delivery.ts`, `route-reply.ts`, `reply-payloads.ts`, `reply-threading.ts`, `reply-reference.ts`, `reply-tags.ts`, `reply-inline*.ts`, `reply-media-paths.ts`
- **Block streaming**: `block-reply-coalescer.ts`, `block-reply-pipeline.ts`, `block-streaming.ts`
- **ACP dispatch**: `dispatch-acp.ts`, `dispatch-acp-delivery.ts`, `acp-projector.ts`, `acp-stream-settings.ts`, `acp-reset-target.ts`

### Session 管理
- `session.ts`, `session-delivery.ts`, `session-fork.ts`, `session-hooks.ts`, `session-reset-model.ts`, `session-reset-prompt.ts`, `session-run-accounting.ts`, `session-updates.ts`, `session-usage.ts`

### 佇列系統
- `queue.ts`, `queue/*.ts`, `queue-policy.ts`, `followup-runner.ts`

### Model 選擇
- `model.ts`, `model-runtime.ts`, `model-selection.ts`, `thinking.ts`

### 上下文處理
- `history.ts`, `mentions.ts`, `groups.ts`, `post-compaction-context.ts`, `memory-flush.ts`, `body.ts`, `untrusted-context.ts`, `strip-inbound-meta.ts`, `response-prefix-template.ts`

### 中斷 & 生命週期
- `abort.ts`, `abort-cutoff.ts`, `heartbeat*.ts`, `fallback-state.ts`, `send-policy.ts`, `tokens.ts`

### 平台特化
- `line-directives.ts`, `slack-directives.ts`, `telegram-context.ts`, `discord-parent-channel.ts`, `channel-context.ts`, `elevated-allowlist-matcher.ts`, `elevated-unavailable.ts`, `reply-elevated.ts`

### 分塊 & 格式化
- `chunk.ts`, `templating.ts`, `tool-meta.ts`, `status.ts`, `media-note.ts`, `stage-sandbox-media.ts`, `normalize-reply.ts`

### 排程系統（Cron）
- **Service**: `service.ts`, `service/ops.ts`, `service/state.ts`, `service/timer.ts`, `service/jobs.ts`, `service/store.ts`, `service/locked.ts`, `service/normalize.ts`, `service/initial-delivery.ts`, `service/timeout-policy.ts`
- **Isolated Agent**: `isolated-agent/run.ts`, `isolated-agent/delivery-dispatch.ts`, `isolated-agent/delivery-target.ts`, `isolated-agent/helpers.ts`, `isolated-agent/session*.ts`, `isolated-agent/skills-snapshot.ts`, `isolated-agent/subagent-followup.ts`
- **資料層**: `store.ts`, `store-migration.ts`, `run-log.ts`, `types*.ts`, `schedule.ts`, `normalize.ts`, `parse.ts`, `stagger.ts`, `validate-timestamp.ts`, `webhook-url.ts`
- **投遞**: `delivery.ts`, `legacy-delivery.ts`, `heartbeat-policy.ts`, `session-reaper.ts`

### 語音合成（TTS）
- `tts-core.ts`（底層引擎：OpenAI/ElevenLabs/Edge）, `tts.ts`（設定/管理/payload 套用）

### 上下文引擎（Context Engine）
- `types.ts`（ContextEngine interface）, `registry.ts`（註冊/解析）, `legacy.ts`（Legacy 實作）, `init.ts`（初始化）
