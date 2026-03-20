# Commands 函式級索引

> 掃描日期：2026-03-21 | 檔案數：235 檔 | 總行數：~43,510 行

## 目錄結構

```
src/commands/
├── agent/                          # 5 檔  668 行 — Agent 執行 session / delivery
├── channels/                       # 9 檔 1,901 行 — Channel CRUD / status / capabilities
├── gateway-status/                 # 1 檔  358 行 — Gateway status helpers
├── models/                         # 23 檔 3,930 行 — Model discovery / auth / fallbacks / scan
├── onboard-non-interactive/        # 3 檔  447 行 — Non-interactive onboarding entry
│   └── local/                      # 9 檔 1,688 行 — Local onboarding auth / daemon / gateway / skills
├── onboarding/                     # 3 檔  285 行 — Plugin-based onboarding registry
│   └── __tests__/                  # 1 檔   24 行 — Test utils
├── status-all/                     # 7 檔 1,398 行 — `status --all` report builders
└── (root)                          # 174 檔 32,811 行 — 頂層 command handlers + shared helpers
```

## CLI 指令對照

以下為 CLI 層（`src/cli/program/register.*.ts`）註冊的主要指令及其 handler 來源：

| CLI Command | Handler | 來源檔案 |
|-------------|---------|----------|
| `setup` | `setupCommand` | `setup.ts` |
| `setup --wizard` | `onboardCommand` | `onboard.ts` |
| `configure` | `configureCommandFromSectionsArg` | `configure.ts` |
| `status` | `statusCommand` | `status.command.ts` |
| `status --all` | `statusAllCommand` | `status-all.ts` |
| `health` | `healthCommand` | `health.ts` |
| `sessions` | `sessionsCommand` | `sessions.ts` |
| `sessions cleanup` | `sessionsCleanupCommand` | `sessions-cleanup.ts` |
| `agent` | `agentCliCommand` | `agent-via-gateway.ts` |
| `agents add` | `agentsAddCommand` | `agents.commands.add.ts` |
| `agents list` | `agentsListCommand` | `agents.commands.list.ts` |
| `agents delete` | `agentsDeleteCommand` | `agents.commands.delete.ts` |
| `agents bind` | `agentsBindCommand` | `agents.commands.bind.ts` |
| `agents unbind` | `agentsUnbindCommand` | `agents.commands.bind.ts` |
| `agents identity set` | `agentsSetIdentityCommand` | `agents.commands.identity.ts` |
| `channels add` | `channelsAddCommand` | `channels/add.ts` |
| `channels list` | `channelsListCommand` | `channels/list.ts` |
| `channels remove` | `channelsRemoveCommand` | `channels/remove.ts` |
| `channels status` | `channelsStatusCommand` | `channels/status.ts` |
| `channels logs` | `channelsLogsCommand` | `channels/logs.ts` |
| `channels resolve` | `channelsResolveCommand` | `channels/resolve.ts` |
| `channels capabilities` | `channelsCapabilitiesCommand` | `channels/capabilities.ts` |
| `message` | `messageCommand` | `message.ts` |
| `models list` | `modelsListCommand` | `models/list.list-command.ts` |
| `models status` | `modelsStatusCommand` | `models/list.status-command.ts` |
| `models scan` | `modelsScanCommand` | `models/scan.ts` |
| `models set` | `modelsSetCommand` | `models/set.ts` |
| `models set-image` | `modelsSetImageCommand` | `models/set-image.ts` |
| `models aliases add/list/remove` | `modelsAliases*Command` | `models/aliases.ts` |
| `models auth *` | `modelsAuth*Command` | `models/auth.ts` |
| `models auth-order *` | `modelsAuthOrder*Command` | `models/auth-order.ts` |
| `models fallbacks *` | `modelsFallbacks*Command` | `models/fallbacks.ts` |
| `doctor` | `doctorCommand` | `doctor.ts` |
| `dashboard` | `dashboardCommand` | `dashboard.ts` |
| `reset` | `resetCommand` | `reset.ts` |
| `uninstall` | `uninstallCommand` | `uninstall.ts` |
| `backup create` | `backupCreateCommand` | `backup.ts` |
| `backup verify` | `backupVerifyCommand` | `backup-verify.ts` |
| `sandbox list` | `sandboxListCommand` | `sandbox.ts` |
| `sandbox recreate` | `sandboxRecreateCommand` | `sandbox.ts` |
| `sandbox explain` | `sandboxExplainCommand` | `sandbox-explain.ts` |
| `gateway status` | `gatewayStatusCommand` | `gateway-status.ts` |
| `docs` | `docsSearchCommand` | `docs.ts` |

## 函式清單

### agent/

#### `delivery.ts`（240 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `deliverAgentCommandResult` | `(params: { ... }) => Promise<void>` | 將 agent 回覆投遞至 channel | internal |

#### `run-context.ts`（55 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `resolveAgentRunContext` | `(opts: AgentCommandOpts) => AgentRunContext` | 解析 agent 執行上下文 | helper |

#### `session-store.ts`（111 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `updateSessionStoreAfterAgentRun` | `(params: { ... }) => Promise<void>` | Agent 執行後更新 session store | internal |

#### `session.ts`（172 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `SessionResolution` | type | Session 解析結果 | type |
| `resolveSessionKeyForRequest` | `(opts: { ... }) => ...` | 從請求參數推導 session key | helper |
| `resolveSession` | `(opts: { ... }) => ...` | 完整 session 解析（key + store） | helper |

#### `types.ts`（90 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `ImageContent` | type | 圖片內容結構 | type |
| `AgentStreamParams` | type | Agent 串流參數 | type |
| `AgentRunContext` | type | Agent 執行上下文 | type |
| `AgentCommandOpts` | type | Agent command 選項 | type |
| `AgentCommandIngressOpts` | type | Agent ingress 選項（省略 senderIsOwner） | type |

### (root) — Agent 指令

#### `agent-via-gateway.ts`（196 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `AgentCliOpts` | type | Agent CLI 選項結構 | type |
| `agentViaGatewayCommand` | `(opts: AgentCliOpts, runtime: RuntimeEnv) => Promise<void>` | 透過 Gateway 執行 agent turn | slash command handler |
| `agentCliCommand` | `(opts: AgentCliOpts, runtime: RuntimeEnv, deps?: CliDeps) => Promise<void>` | Agent CLI 入口（routing 到 gateway 或 local） | slash command handler |

#### `agent.ts`（1,257 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `agentCommand` | `(...) => Promise<void>` | Agent 核心執行（local embedded） | slash command handler |
| `agentCommandFromIngress` | `(...) => Promise<void>` | 從 ingress 觸發 agent 執行 | internal |

### (root) — Agents 管理

#### `agents.ts`（7 行）— Barrel re-export

re-export `agents.bindings`, `agents.commands.bind/add/delete/identity/list`, `agents.config`。

#### `agents.bindings.ts`（326 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `describeBinding` | `(binding: AgentRouteBinding) => string` | 格式化 binding 描述 | helper |
| `applyAgentBindings` | `(...) => ...` | 套用 agent route bindings 到 config | helper |
| `removeAgentBindings` | `(...) => ...` | 移除 agent route bindings | helper |
| `buildChannelBindings` | `(params: { ... }) => ...` | 建構 channel-level bindings | helper |
| `parseBindingSpecs` | `(params: { ... }) => ...` | 解析 binding spec 字串 | parser |

#### `agents.command-shared.ts`（11 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `createQuietRuntime` | `(runtime: RuntimeEnv) => RuntimeEnv` | 建立靜默 runtime | helper |
| `requireValidConfig` | `(runtime: RuntimeEnv) => Promise<OpenClawConfig \| null>` | 載入並驗證 config | helper |

#### `agents.commands.add.ts`（369 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `agentsAddCommand` | `(...) => Promise<void>` | 新增 agent 到 config | slash command handler |

#### `agents.commands.bind.ts`（386 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `agentsBindingsCommand` | `(...) => Promise<void>` | 列出 agent bindings | slash command handler |
| `agentsBindCommand` | `(...) => Promise<void>` | 綁定 agent 到 channel/route | slash command handler |
| `agentsUnbindCommand` | `(...) => Promise<void>` | 解除 agent binding | slash command handler |

#### `agents.commands.delete.ts`（101 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `agentsDeleteCommand` | `(...) => Promise<void>` | 刪除 agent | slash command handler |

#### `agents.commands.identity.ts`（233 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `agentsSetIdentityCommand` | `(...) => Promise<void>` | 設定 agent identity markdown | slash command handler |

#### `agents.commands.list.ts`（135 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `agentsListCommand` | `(...) => Promise<void>` | 列出所有 agents | slash command handler |

#### `agents.config.ts`（211 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `AgentSummary` | type | Agent 摘要結構 | type |
| `AgentIdentity` | type alias | = AgentIdentityFile | type |
| `listAgentEntries` | re-export | 列出 agent entries | helper |
| `findAgentEntryIndex` | `(list: AgentEntry[], agentId: string) => number` | 在 list 中找 agent index | helper |
| `parseIdentityMarkdown` | `(content: string) => AgentIdentity` | 解析 identity markdown | parser |
| `loadAgentIdentity` | `(workspace: string) => AgentIdentity \| null` | 從 workspace 載入 identity | helper |
| `buildAgentSummaries` | `(cfg: OpenClawConfig) => AgentSummary[]` | 從 config 建構 agent 摘要列表 | helper |
| `applyAgentConfig` | `(...) => ...` | 套用 agent config 修改 | helper |
| `pruneAgentConfig` | `(...) => ...` | 清理無效 agent config | helper |

#### `agents.providers.ts`（188 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `buildProviderStatusIndex` | `(...) => Promise<...>` | 建構 provider 狀態索引 | helper |
| `summarizeBindings` | `(cfg, bindings) => string[]` | 摘要 binding 描述 | helper |
| `listProvidersForAgent` | `(params: { ... }) => ...` | 列出 agent 可用 providers | helper |

### (root) — Auth Choice 系統

> 以下 ~20 檔處理認證方式選擇與套用，遵循統一模式：`applyAuthChoice{Provider}` 函式接收 onboarding context 並將 API key / OAuth 設定寫入 config。

#### `auth-choice.ts`（3 行）— Barrel re-export

re-export `applyAuthChoice`, `warnIfModelConfigLooksOff`, `resolvePreferredProviderForAuthChoice`。

#### `auth-choice-options.ts`（445 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `AuthChoiceOption` | type | 認證選項結構 | type |
| `AuthChoiceGroup` | type | 認證選項群組 | type |
| `formatAuthChoiceChoicesForCli` | `(params?) => string` | 格式化 auth choices 供 CLI 顯示 | helper |
| `buildAuthChoiceOptions` | `(params: { ... }) => AuthChoiceOption[]` | 建構可用 auth choice 列表 | helper |
| `buildAuthChoiceGroups` | `(params: { ... }) => AuthChoiceGroup[]` | 依群組分類 auth choices | helper |

#### `auth-choice-prompt.ts`（64 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `promptAuthChoiceGrouped` | `(params: { ... }) => Promise<...>` | 互動式 prompt 分組 auth choice | helper |

#### `auth-choice.apply.ts`（62 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `ApplyAuthChoiceParams` | type | 套用參數 | type |
| `ApplyAuthChoiceResult` | type | 套用結果 | type |
| `applyAuthChoice` | `(params: ApplyAuthChoiceParams) => Promise<ApplyAuthChoiceResult>` | 統一 dispatcher — 依 choice 路由到對應 provider apply | internal |

#### `auth-choice.apply-helpers.ts`（537 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `promptSecretRefForOnboarding` | `(params: { ... }) => Promise<...>` | 互動式 prompt secret ref | helper |
| `createAuthChoiceAgentModelNoter` | `(...) => ...` | 建立 model noter callback | helper |
| `ApplyAuthChoiceModelState` | interface | Model state bridge 介面 | type |
| `createAuthChoiceModelStateBridge` | `(bindings: { ... }) => ...` | 建立 model state bridge | helper |
| `createAuthChoiceDefaultModelApplier` | `(...) => ...` | 建立預設 model applier | helper |
| `createAuthChoiceDefaultModelApplierForMutableState` | `(...) => ...` | Mutable state 版 model applier | helper |
| `normalizeTokenProviderInput` | `(...) => ...` | 正規化 token provider 輸入 | helper |
| `normalizeSecretInputModeInput` | `(...) => ...` | 正規化 secret input mode | helper |
| `resolveSecretInputModeForEnvSelection` | `(params: { ... }) => Promise<...>` | 解析 env 的 secret input mode | helper |
| `maybeApplyApiKeyFromOption` | `(params: { ... }) => Promise<...>` | 從 CLI option 套用 API key | helper |
| `ensureApiKeyFromOptionEnvOrPrompt` | `(params: { ... }) => Promise<...>` | 確保 API key（option → env → prompt） | helper |
| `ensureApiKeyFromEnvOrPrompt` | `(params: { ... }) => Promise<...>` | 確保 API key（env → prompt） | helper |

#### Auth Choice Provider Apply 檔案（共 14 檔，模式統一）

以下檔案皆 export 一個 `applyAuthChoice{Provider}` async 函式，簽名：`(params: ...) => Promise<ApplyAuthChoiceResult>`

| 檔案 | Provider | 行數 |
|------|----------|------|
| `auth-choice.apply.anthropic.ts` | Anthropic | 134 |
| `auth-choice.apply.api-key-providers.ts` | LiteLLM + 簡易 API key providers | 538 |
| `auth-choice.apply.api-providers.ts` | 批量 API providers dispatcher | 322 |
| `auth-choice.apply.byteplus.ts` | BytePlus | 46 |
| `auth-choice.apply.copilot-proxy.ts` | Copilot Proxy | 14 |
| `auth-choice.apply.github-copilot.ts` | GitHub Copilot | 63 |
| `auth-choice.apply.google-gemini-cli.ts` | Google Gemini CLI | 37 |
| `auth-choice.apply.huggingface.ts` | HuggingFace | 137 |
| `auth-choice.apply.minimax.ts` | MiniMax | 106 |
| `auth-choice.apply.oauth.ts` | OAuth 通用 | 94 |
| `auth-choice.apply.openai.ts` | OpenAI | 123 |
| `auth-choice.apply.openrouter.ts` | OpenRouter | 93 |
| `auth-choice.apply.plugin-provider.ts` | Plugin Provider（動態載入）| 232 |
| `auth-choice.apply.qwen-portal.ts` | Qwen Portal | 14 |
| `auth-choice.apply.volcengine.ts` | Volcengine | 46 |
| `auth-choice.apply.xai.ts` | xAI | 65 |

#### `auth-choice-legacy.ts`（26 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `AUTH_CHOICE_LEGACY_ALIASES_FOR_CLI` | `ReadonlyArray<AuthChoice>` | 舊版 CLI alias 列表 | const |
| `normalizeLegacyOnboardAuthChoice` | `(...) => ...` | 正規化舊版 auth choice | helper |
| `isDeprecatedAuthChoice` | `(...) => boolean` | 檢查 auth choice 是否已棄用 | helper |

#### `auth-choice.default-model.ts`（30 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `applyDefaultModelChoice` | `(params: { ... }) => Promise<void>` | 套用預設 model 選擇 | helper |

#### `auth-choice.model-check.ts`（56 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `warnIfModelConfigLooksOff` | `(...) => Promise<void>` | 檢查 model config 是否異常並警告 | helper |

#### `auth-choice.preferred-provider.ts`（76 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `resolvePreferredProviderForAuthChoice` | `(params: { ... }) => ...` | 從 auth choice 推導 preferred provider | helper |

#### `auth-token.ts`（38 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `ANTHROPIC_SETUP_TOKEN_PREFIX` | const `"sk-ant-oat01-"` | Anthropic setup token prefix | const |
| `ANTHROPIC_SETUP_TOKEN_MIN_LENGTH` | const `80` | 最小長度 | const |
| `DEFAULT_TOKEN_PROFILE_NAME` | const `"default"` | 預設 profile 名稱 | const |
| `normalizeTokenProfileName` | `(raw: string) => string` | 正規化 token profile 名 | helper |
| `buildTokenProfileId` | `(params: { provider, name }) => string` | 組合 profile ID | helper |
| `validateAnthropicSetupToken` | `(raw: string) => string \| undefined` | 驗證 Anthropic token 格式 | helper |

### channels/

#### `channels.ts`（14 行）— Barrel re-export

re-export `channels/add`, `channels/capabilities`, `channels/list`, `channels/logs`, `channels/remove`, `channels/resolve`, `channels/status`。

#### `add.ts`（301 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `ChannelsAddOptions` | type | 新增 channel 選項 | type |
| `channelsAddCommand` | `(opts, runtime) => Promise<void>` | 新增 channel 到 config | slash command handler |

#### `add-mutators.ts`（33 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `applyAccountName` | `(params: { ... }) => ...` | 套用 account 名稱到 config | helper |
| `applyChannelAccountConfig` | `(params: { ... }) => ...` | 套用 channel account config | helper |

#### `capabilities.ts`（554 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `ChannelsCapabilitiesOptions` | type | 查詢選項 | type |
| `channelsCapabilitiesCommand` | `(opts, runtime) => Promise<void>` | 查詢 channel 功能支援度 | slash command handler |

#### `list.ts`（183 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `ChannelsListOptions` | type | 列表選項 | type |
| `channelsListCommand` | `(opts, runtime) => Promise<void>` | 列出已設定 channels | slash command handler |

#### `logs.ts`（113 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `ChannelsLogsOptions` | type | Logs 選項 | type |
| `channelsLogsCommand` | `(opts, runtime) => Promise<void>` | 尾隨 channel logs | slash command handler |

#### `remove.ts`（148 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `ChannelsRemoveOptions` | type | 移除選項 | type |
| `channelsRemoveCommand` | `(opts, runtime) => Promise<void>` | 移除 channel | slash command handler |

#### `resolve.ts`（160 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `ChannelsResolveOptions` | type | 解析選項 | type |
| `channelsResolveCommand` | `(opts, runtime) => Promise<void>` | 解析 channel + account 路由 | slash command handler |

#### `shared.ts`（71 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `ChatChannel` | type alias | = ChannelId | type |
| `requireValidConfigSnapshot` | re-export | 載入驗證 config snapshot | helper |
| `requireValidConfig` | `(runtime) => Promise<OpenClawConfig>` | 載入驗證 config 或 exit | helper |
| `formatAccountLabel` | `(params: { accountId, name? }) => string` | 格式化 account 標籤 | helper |
| `channelLabel` | `(channel: ChatChannel) => string` | 格式化 channel 標籤 | helper |
| `formatChannelAccountLabel` | `(params: { ... }) => string` | 格式化 channel + account 標籤 | helper |
| `shouldUseWizard` | `(params?: { hasFlags? }) => boolean` | 是否啟用 wizard 模式 | helper |

#### `status.ts`（338 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `ChannelsStatusOptions` | type | Status 選項 | type |
| `formatGatewayChannelsStatusLines` | `(payload) => string[]` | 格式化 gateway channel status | helper |
| `formatConfigChannelsStatusLines` | `(...) => Promise<string[]>` | 格式化 config channel status | helper |
| `channelsStatusCommand` | `(opts, runtime) => Promise<void>` | 顯示 channel 狀態 | slash command handler |

### (root) — Configure 系統

#### `configure.ts`（12 行）— Barrel re-export

re-export `configureCommand`, `configureCommandWithSections`, `configureCommandFromSectionsArg`, `buildGatewayAuthConfig`, `promptGatewayConfig`, `runConfigureWizard`。

#### `configure.shared.ts`（94 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `CONFIGURE_WIZARD_SECTIONS` | const array | Wizard section 列表 | const |
| `WizardSection` | type | Section 類型 | type |
| `parseConfigureWizardSections` | `(raw) => { ... }` | 解析 section 參數 | parser |
| `ChannelsWizardMode` | type | `"configure" \| "remove"` | type |
| `ConfigureWizardParams` | type | Wizard 參數 | type |
| `CONFIGURE_SECTION_OPTIONS` | const array | Section 選項描述 | const |
| `intro`, `outro`, `text`, `confirm`, `select` | styled clack wrappers | 帶主題的 clack UI wrappers | helper |

#### `configure.commands.ts`（37 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `configureCommand` | `(runtime?) => Promise<void>` | configure 主入口 | slash command handler |
| `configureCommandWithSections` | `(...) => Promise<void>` | 帶 sections 的 configure | slash command handler |
| `configureCommandFromSectionsArg` | `(...) => Promise<void>` | 從 CLI arg 解析 sections 執行 configure | slash command handler |

#### `configure.wizard.ts`（705 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `runConfigureWizard` | `(...) => Promise<void>` | 執行互動式設定 wizard（channels + gateway + agent defaults） | internal |

#### `configure.gateway.ts`（353 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `promptGatewayConfig` | `(...) => Promise<...>` | 互動式 prompt gateway 設定 | helper |

#### `configure.gateway-auth.ts`（146 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `buildGatewayAuthConfig` | `(params: { ... }) => ...` | 建構 gateway auth config 物件 | helper |
| `promptAuthConfig` | `(...) => Promise<...>` | 互動式 prompt auth 設定 | helper |

#### `configure.channels.ts`（82 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `removeChannelConfigWizard` | `(...) => Promise<void>` | 互動式移除 channel wizard | helper |

#### `configure.daemon.ts`（162 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `maybeInstallDaemon` | `(params: { ... }) => Promise<void>` | 條件式安裝 daemon service | helper |

### (root) — Doctor 系統

> Doctor 系統由 `doctor.ts` 主指令 + 17 個子模組組成，各子模組為獨立的健康檢查 / 修復單元。

#### `doctor.ts`（369 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `doctorCommand` | `(runtime, opts) => Promise<void>` | Doctor 主入口 — 執行所有健康檢查 + 修復 | slash command handler |

#### Doctor 子模組（模式統一）

每個子模組通常 export `note*` / `maybeRepair*` / `detect*` / `format*` 函式。

| 檔案 | 行數 | 主要 export | 說明 |
|------|------|-------------|------|
| `doctor-auth.ts` | 357 | `maybeRepairAnthropicOAuthProfileId`, `maybeRemoveDeprecatedCliAuthProfiles`, `resolveUnusableProfileHint`, `noteAuthProfileHealth` | Auth profile 健檢與修復 |
| `doctor-bootstrap-size.ts` | 101 | `noteBootstrapFileSize` | Bootstrap 檔案大小警告 |
| `doctor-completion.ts` | 179 | `checkShellCompletionStatus`, `doctorShellCompletion`, `ensureCompletionCacheExists` | Shell 自動完成健檢 |
| `doctor-config-analysis.ts` | 156 | `formatConfigPath`, `resolveConfigPathTarget`, `stripUnknownConfigKeys`, `noteOpencodeProviderOverrides`, `noteIncludeConfinementWarning` | Config 分析與警告 |
| `doctor-config-flow.ts` | 2,002 | `collectMissingDefaultAccountBindingWarnings`, `collectMissingExplicitDefaultAccountWarnings`, `loadAndMaybeMigrateDoctorConfig` | Config 流程修復（最大子模組） |
| `doctor-cron.ts` | 183 | `maybeRepairLegacyCronStore` | Cron store 修復 |
| `doctor-format.ts` | 81 | `formatGatewayRuntimeSummary`, `buildGatewayRuntimeHints` | 格式化 gateway runtime 摘要 |
| `doctor-gateway-auth-token.ts` | 30 | `resolveGatewayAuthTokenForService` | Gateway auth token 解析 |
| `doctor-gateway-daemon-flow.ts` | 288 | `maybeRepairGatewayDaemon` | Gateway daemon 修復流程 |
| `doctor-gateway-health.ts` | 92 | `checkGatewayHealth`, `probeGatewayMemoryStatus` | Gateway 健康檢查 |
| `doctor-gateway-services.ts` | 452 | `maybeRepairGatewayServiceConfig`, `maybeScanExtraGatewayServices` | Gateway service config 修復 |
| `doctor-install.ts` | 40 | `noteSourceInstallIssues` | Source install 問題偵測 |
| `doctor-legacy-config.ts` | 452 | `normalizeCompatibilityConfigValues` | 舊版 config 遷移 |
| `doctor-memory-search.ts` | 233 | `noteMemorySearchHealth` | Memory search 健檢 |
| `doctor-platform-notes.ts` | 221 | `noteMacLaunchAgentOverrides`, `noteMacLaunchctlGatewayEnvOverrides`, `noteDeprecatedLegacyEnvVars`, `noteStartupOptimizationHints` | 平台特定警告 |
| `doctor-prompter.ts` | 113 | `DoctorOptions` type, `DoctorPrompter` type, `createDoctorPrompter` | Doctor UI prompter 建構 |
| `doctor-sandbox.ts` | 297 | `maybeRepairSandboxImages`, `noteSandboxScopeWarnings` | Sandbox image 修復 |
| `doctor-security.ts` | 233 | `noteSecurityWarnings` | 安全警告 |
| `doctor-session-locks.ts` | 85 | `noteSessionLockHealth` | Session lock 健檢 |
| `doctor-state-integrity.ts` | 825 | `detectLinuxSdBackedStateDir`, `detectMacCloudSyncedStateDir`, `noteStateIntegrity`, `noteWorkspaceBackupTip` | State 完整性深度檢查 |
| `doctor-state-migrations.ts` | 12 | re-export from `infra/state-migrations` | State migration 代理 |
| `doctor-ui.ts` | 154 | `maybeRepairUiProtocolFreshness` | UI protocol 修復 |
| `doctor-update.ts` | 88 | `maybeOfferUpdateBeforeDoctor` | Doctor 前版本更新建議 |
| `doctor-workspace-status.ts` | 68 | `noteWorkspaceStatus` | Workspace 狀態檢查 |
| `doctor-workspace.ts` | 60 | `shouldSuggestMemorySystem`, `detectLegacyWorkspaceDirs`, `formatLegacyWorkspaceWarning` | Workspace 相關建議 |

### models/

#### `models.ts`（33 行）— Barrel re-export

re-export 所有 models 子指令（list, scan, set, set-image, aliases, auth, auth-order, fallbacks, image-fallbacks）。

#### `list.ts`（2 行）— Barrel re-export `list-command` + `status-command`

#### `list.list-command.ts`（119 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `modelsListCommand` | `(...) => Promise<void>` | `models list` — 列出可用 models | slash command handler |

#### `list.status-command.ts`（687 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `modelsStatusCommand` | `(...) => Promise<void>` | `models status` — 詳細 model 狀態含 auth probe | slash command handler |

#### `list.probe.ts`（614 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `AuthProbeStatus` / `AuthProbeReasonCode` / `AuthProbeResult` / `AuthProbeSummary` / `AuthProbeOptions` | types | Auth probe 結構定義 | type |
| `mapFailoverReasonToProbeStatus` | `(reason?) => AuthProbeStatus` | Failover reason 對映 probe status | helper |
| `buildProbeTargets` | `(params: { ... }) => Promise<...>` | 建構 probe 目標列表 | helper |
| `runAuthProbes` | `(params: { ... }) => Promise<...>` | 執行 auth probes | internal |
| `formatProbeLatency` | `(latencyMs?) => string` | 格式化延遲 | helper |
| `groupProbeResults` | `(results) => Map<...>` | 依 provider 分群結果 | helper |
| `sortProbeResults` | `(results) => AuthProbeResult[]` | 排序 probe 結果 | helper |
| `describeProbeSummary` | `(summary) => string` | 描述 probe 摘要 | helper |

#### `list.registry.ts`（197 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `loadModelRegistry` | `(...) => Promise<...>` | 載入 model registry | helper |
| `toModelRow` | `(params: { ... }) => ...` | 轉換為 model 顯示行 | helper |

#### `list.rows.ts`（182 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `loadListModelRegistry` | `(...) => Promise<...>` | 載入 list 用 model registry | helper |
| `appendDiscoveredRows` | `(params: { ... }) => ...` | 附加已發現 model rows | helper |
| `appendCatalogSupplementRows` | `(params: { ... }) => Promise<...>` | 附加 catalog 補充 rows | helper |
| `appendConfiguredRows` | `(params: { ... }) => ...` | 附加已設定 model rows | helper |

#### `list.auth-overview.ts`（159 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `resolveProviderAuthOverview` | `(params: { ... }) => ...` | 解析 provider auth 概覽 | helper |

#### `list.configured.ts`（92 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `resolveConfiguredEntries` | `(cfg) => ...` | 解析 config 中已設定 model entries | helper |

#### `list.table.ts`（91 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `printModelTable` | `(...) => void` | 輸出 model 表格到 terminal | helper |

#### `list.format.ts`（58 行）、`list.errors.ts`（16 行）、`list.types.ts`（34 行）

格式化工具函式 + 錯誤處理 + 共用 types（`ConfiguredEntry`, `ModelRow`, `ProviderAuthOverview`）。

#### `aliases.ts`（119 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `modelsAliasesListCommand` | `(...) => Promise<void>` | 列出 model aliases | slash command handler |
| `modelsAliasesAddCommand` | `(...) => Promise<void>` | 新增 model alias | slash command handler |
| `modelsAliasesRemoveCommand` | `(aliasRaw, runtime) => Promise<void>` | 移除 model alias | slash command handler |

#### `auth.ts`（496 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `modelsAuthSetupTokenCommand` | `(...) => Promise<void>` | 設定 auth setup token | slash command handler |
| `modelsAuthPasteTokenCommand` | `(...) => Promise<void>` | 貼上 auth token | slash command handler |
| `modelsAuthAddCommand` | `(_opts, runtime) => Promise<void>` | 新增 auth profile | slash command handler |
| `resolveRequestedLoginProviderOrThrow` | `(...) => ...` | 解析 login provider | helper |
| `modelsAuthLoginCommand` | `(opts, runtime) => Promise<void>` | OAuth login 流程 | slash command handler |

#### `auth-order.ts`（135 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `modelsAuthOrderGetCommand` | `(...) => Promise<void>` | 取得 auth order | slash command handler |
| `modelsAuthOrderClearCommand` | `(...) => Promise<void>` | 清除 auth order | slash command handler |
| `modelsAuthOrderSetCommand` | `(...) => Promise<void>` | 設定 auth order | slash command handler |

#### `fallbacks.ts`（42 行）+ `image-fallbacks.ts`（42 行）

> 模式統一：各 export `models{Image}Fallbacks{List|Add|Remove|Clear}Command`

| Export 模式 | 說明 |
|-------------|------|
| `*FallbacksListCommand` | 列出 fallback models |
| `*FallbacksAddCommand` | 新增 fallback model |
| `*FallbacksRemoveCommand` | 移除 fallback model |
| `*FallbacksClearCommand` | 清除所有 fallbacks |

#### `fallbacks-shared.ts`（156 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `listFallbacksCommand` | `(...) => Promise<void>` | 通用 list fallbacks | internal |
| `addFallbackCommand` | `(...) => Promise<void>` | 通用 add fallback | internal |
| `removeFallbackCommand` | `(...) => Promise<void>` | 通用 remove fallback | internal |
| `clearFallbacksCommand` | `(...) => Promise<void>` | 通用 clear fallbacks | internal |

#### `scan.ts`（359 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `modelsScanCommand` | `(...) => Promise<void>` | 掃描本地/遠端 model providers | slash command handler |

#### `set.ts`（15 行）+ `set-image.ts`（15 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `modelsSetCommand` | `(modelRaw, runtime) => Promise<void>` | 設定預設 model | slash command handler |
| `modelsSetImageCommand` | `(modelRaw, runtime) => Promise<void>` | 設定預設 image model | slash command handler |

#### `shared.ts`（242 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `ensureFlagCompatibility` | `(opts) => ...` | 確保 --json/--plain 互斥 | helper |
| `formatTokenK` / `formatMs` | `(value?) => string` | 格式化 token 數/毫秒 | helper |
| `isLocalBaseUrl` | `(baseUrl) => boolean` | 判斷是否為本地 URL | helper |
| `loadValidConfigOrThrow` | `() => Promise<OpenClawConfig>` | 載入 config 或拋錯 | helper |
| `updateConfig` | `(...) => Promise<void>` | 更新 config 檔 | helper |
| `resolveModelTarget` | `(params) => { ... }` | 解析 model 目標（ref → provider + id） | parser |
| `resolveModelKeysFromEntries` | `(params) => ...` | 從 entries 解析 model keys | helper |
| `buildAllowlistSet` | `(cfg) => Set<string>` | 建構 model allowlist set | helper |
| `normalizeAlias` | `(alias) => string` | 正規化 alias | helper |
| `resolveKnownAgentId` | `(params) => ...` | 解析已知 agent ID | helper |
| `upsertCanonicalModelConfigEntry` | `(...) => ...` | Upsert model config entry | helper |
| `mergePrimaryFallbackConfig` | `(...) => ...` | 合併 primary + fallback config | helper |
| `applyDefaultModelPrimaryUpdate` | `(params) => ...` | 套用預設 model primary 更新 | helper |

#### `load-config.ts`（58 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `LoadedModelsConfig` | type | 載入結果結構 | type |
| `loadModelsConfigWithSource` | `(params) => Promise<...>` | 載入 config 並附帶來源 | helper |
| `loadModelsConfig` | `(params) => Promise<...>` | 載入 models config | helper |

### (root) — Status 系統

#### `status.ts`（3 行）— Barrel re-export `statusCommand`, `getStatusSummary`, `StatusSummary`

#### `status.command.ts`（685 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `statusCommand` | `(...) => Promise<void>` | `status` 主指令 — 顯示 channel health + session | slash command handler |

#### `status.summary.ts`（245 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `redactSensitiveStatusSummary` | `(summary) => StatusSummary` | 脫敏 status summary | helper |
| `getStatusSummary` | `(...) => Promise<StatusSummary>` | 收集完整 status summary | internal |

#### `status.scan.ts`（402 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `StatusScanResult` | type | 掃描結果結構 | type |
| `scanStatus` | `(...) => Promise<StatusScanResult>` | 深度掃描 channel / gateway 狀態 | internal |

#### `status.types.ts`（63 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `SessionStatus` | type | Session 狀態結構 | type |
| `HeartbeatStatus` | type | Heartbeat 狀態結構 | type |
| `StatusSummary` | type | 完整狀態摘要 | type |

#### `status.update.ts`（133 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `getUpdateCheckResult` | `(params) => Promise<...>` | 取得版本更新檢查結果 | helper |
| `UpdateAvailability` | type | 更新可用性結構 | type |
| `resolveUpdateAvailability` | `(update) => UpdateAvailability` | 解析更新可用性 | helper |
| `formatUpdateAvailableHint` | `(update) => string \| null` | 格式化更新提示 | helper |
| `formatUpdateOneLiner` | `(update) => string` | 格式化更新單行摘要 | helper |

其餘 `status.*.ts` 檔（`agent-local`, `daemon`, `format`, `gateway-probe`, `link-channel`, `service-summary`）為 helper / formatter，支撐 `statusCommand`。

### status-all/

#### `status-all.ts`（365 行，根層）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `statusAllCommand` | `(...) => Promise<void>` | `status --all` — 完整診斷報告 | slash command handler |

#### 子模組（7 檔）

| 檔案 | 行數 | 主要 export | 說明 |
|------|------|-------------|------|
| `agents.ts` | 72 | `getAgentLocalStatuses` | 取得本地 agent 狀態 |
| `channel-issues.ts` | 15 | `groupChannelIssuesByChannel` | 依 channel 分群問題 |
| `channels.ts` | 659 | `buildChannelsTable` | 建構 channel 表格（最大子模組） |
| `diagnosis.ts` | 248 | `appendStatusAllDiagnosis` | 附加診斷結果 |
| `format.ts` | 36 | `formatGatewayAuthUsed`, `redactSecrets` | 格式化 + 脫敏 |
| `gateway.ts` | 183 | `readFileTailLines`, `summarizeLogTail` | Gateway log 摘要 |
| `report-lines.ts` | 185 | `buildStatusAllReportLines` | 建構完整報告行 |

### (root) — Onboard 系統

> Onboarding 由 `onboard.ts` 入口 + ~20 個子模組組成，分為 interactive / non-interactive 兩條路徑。

#### `onboard.ts`（96 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `onboardCommand` | `(opts: OnboardOptions, runtime?) => Promise<void>` | Onboarding 主入口 | slash command handler |

#### `onboard-types.ts`（170 行）

核心 type exports：`OnboardMode`, `AuthChoice`, `BuiltInAuthChoice`, `AuthChoiceGroupId`, `GatewayAuthChoice`, `ResetScope`, `GatewayBind`, `TailscaleMode`, `NodeManagerChoice`, `ChannelChoice`, `SecretInputMode`, `OnboardOptions`。

#### `onboard-interactive.ts`（31 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `runInteractiveOnboarding` | `(...) => Promise<void>` | 互動式 onboarding | internal |

#### `onboard-non-interactive.ts`（37 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `runNonInteractiveOnboarding` | `(...) => Promise<void>` | 非互動式 onboarding | internal |

#### `onboard-channels.ts`（745 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `noteChannelStatus` | `(params) => Promise<void>` | 記錄 channel 狀態 | helper |
| `setupChannels` | `(...) => Promise<void>` | 設定 channels | internal |

#### `onboard-auth.ts`（133 行）— Barrel re-export

re-export credentials 函式、model 常數、provider config 函式（40+ re-exports）。

#### `onboard-auth.credentials.ts`（540 行）

> 30+ `set{Provider}ApiKey` 函式。模式統一：`(key, agentDir?, options?) => Promise<void>`

主要 providers：Anthropic, OpenAI, Gemini, MiniMax, Moonshot, KimiCoding, Volcengine, BytePlus, Synthetic, Venice, Zai, Xiaomi, OpenRouter, CloudflareAiGateway, LiteLLM, VercelAiGateway, OpencodeZen, OpencodeGo, Together, HuggingFace, Qianfan, ModelStudio, xAI, Mistral, Kilocode。

#### `onboard-auth.models.ts`（329 行）

Provider model 常數與 `build{Provider}ModelDefinition` 函式（MiniMax, Moonshot, Mistral, Zai, xAI, Kilocode）。

#### `onboard-auth.config-core.ts`（673 行）

> 30+ `apply{Provider}ProviderConfig` / `apply{Provider}Config` 函式對。

模式統一：`(cfg: OpenClawConfig) => OpenClawConfig`，將 provider 設定套用到 config。

Providers：Zai, OpenRouter, Moonshot(+CN), KimiCode, Synthetic, Xiaomi, Venice, Together, HuggingFace, xAI, Mistral, Kilocode, AuthProfile, Qianfan, ModelStudio(+CN)。

#### `onboard-auth.config-gateways.ts`（91 行）

| Export | 說明 |
|--------|------|
| `applyVercelAiGateway{Provider}Config` / `applyCloudflareAiGateway{Provider}Config` | AI Gateway provider config |

#### `onboard-auth.config-litellm.ts`（65 行）

| Export | 說明 |
|--------|------|
| `applyLitellmProviderConfig` / `applyLitellmConfig` | LiteLLM config |

#### `onboard-auth.config-shared.ts`（213 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `applyOnboardAuthAgentModelsAndProviders` | `(...) => ...` | 套用 agent models + providers | helper |
| `applyAgentDefaultModelPrimary` | `(...) => ...` | 套用 agent 預設 primary model | helper |
| `applyProviderConfigWithDefaultModels` | `(...) => ...` | 含預設 models 的 provider config | helper |
| `applyProviderConfigWithDefaultModel` | `(...) => ...` | 含單一預設 model 的 provider config | helper |
| `applyProviderConfigWithModelCatalog` | `(...) => ...` | 含 model catalog 的 provider config | helper |

#### `onboard-helpers.ts`（488 行）

通用 onboarding helpers：`guardCancel`, `summarizeExistingConfig`, `randomToken`, `normalizeGatewayTokenInput`, `printWizardHeader`, `applyWizardMetadata`, `resolveBrowserOpenCommand`, `detectBrowserOpenSupport`, `openUrl`, `openUrlInBackground`, `ensureWorkspaceAndSessions`, `probeGatewayReachable`, `waitForGatewayReachable`, `resolveControlUiLinks` 等。

### onboard-non-interactive/

#### `local.ts`（266 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `runNonInteractiveOnboardingLocal` | `(params) => Promise<void>` | Local non-interactive onboarding 主流程 | internal |

#### `local/auth-choice.ts`（501 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `applyNonInteractiveAuthChoice` | `(params) => Promise<void>` | Non-interactive auth choice 套用 | internal |

#### `local/auth-choice-inference.ts`（78 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `AuthChoiceInference` | type | 推論結果結構 | type |
| `inferAuthChoiceFromFlags` | `(opts: OnboardOptions) => AuthChoiceInference` | 從 CLI flags 推論 auth choice | helper |

#### `remote.ts`（53 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `runNonInteractiveOnboardingRemote` | `(params) => Promise<void>` | Remote non-interactive onboarding | internal |

### (root) — 其他指令

#### `health.ts`（751 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `ChannelAccountHealthSummary` / `ChannelHealthSummary` / `AgentHealthSummary` / `HealthSummary` | types | 健康摘要結構 | type |
| `formatHealthChannelLines` | `(...) => string[]` | 格式化 channel 健康行 | helper |
| `getHealthSnapshot` | `(params?) => Promise<HealthSummary>` | 取得健康快照 | internal |
| `healthCommand` | `(...) => Promise<void>` | `health` 指令 | slash command handler |

#### `message.ts`（77 行）+ `message-format.ts`（415 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `messageCommand` | `(...) => Promise<void>` | `message` 指令 | slash command handler |
| `MessageCliJsonEnvelope` | type | CLI JSON 輸出結構 | type |
| `buildMessageCliJson` | `(result) => MessageCliJsonEnvelope` | 建構 CLI JSON 輸出 | helper |
| `formatMessageCliText` | `(result) => string[]` | 格式化 CLI 文字輸出 | helper |

#### `sessions.ts`（227 行）+ `sessions-cleanup.ts`（468 行）+ `sessions-table.ts`（148 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `sessionsCommand` | `(...) => Promise<void>` | `sessions` 指令 | slash command handler |
| `sessionsCleanupCommand` | `(opts, runtime) => Promise<void>` | `sessions cleanup` 指令 | slash command handler |
| `toSessionDisplayRows` / `formatSession*Cell` | helpers | Session 表格格式化 | helper |

#### `dashboard.ts`（117 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `dashboardCommand` | `(...) => Promise<void>` | 開啟 Control UI | slash command handler |

#### `docs.ts`（195 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `docsSearchCommand` | `(queryParts, runtime) => Promise<void>` | 搜尋 OpenClaw 文件 | slash command handler |

#### `setup.ts`（91 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `setupCommand` | `(opts, runtime) => Promise<void>` | 初始化 config + workspace | slash command handler |

#### `reset.ts`（151 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `ResetScope` / `ResetOptions` | types | Reset 選項 | type |
| `resetCommand` | `(runtime, opts) => Promise<void>` | 重設 config / state | slash command handler |

#### `uninstall.ts`（199 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `UninstallOptions` | type | 選項 | type |
| `uninstallCommand` | `(runtime, opts) => Promise<void>` | 完整移除 OpenClaw | slash command handler |

#### `backup.ts`（31 行）+ `backup-shared.ts`（254 行）+ `backup-verify.ts`（324 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `backupCreateCommand` | `(...) => Promise<void>` | 建立 backup 封存 | slash command handler |
| `backupVerifyCommand` | `(opts, runtime) => Promise<void>` | 驗證 backup 封存 | slash command handler |
| `buildBackupArchiveRoot` / `buildBackupArchivePath` / `resolveBackupPlanFromDisk` | helpers | Backup 規劃與路徑 | helper |

#### `sandbox.ts`（200 行）+ `sandbox-explain.ts`（337 行）+ `sandbox-display.ts`（136 行）+ `sandbox-formatters.ts`（37 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `sandboxListCommand` | `(...) => Promise<void>` | 列出 sandbox containers | slash command handler |
| `sandboxRecreateCommand` | `(...) => Promise<void>` | 重建 sandbox containers | slash command handler |
| `sandboxExplainCommand` | `(...) => Promise<void>` | 解說 sandbox 設定 | slash command handler |
| `displayContainers` / `displayBrowsers` / `displaySummary` | helpers | Sandbox 顯示格式化 | helper |

#### `gateway-status.ts`（445 行）+ `gateway-status/helpers.ts`（358 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `gatewayStatusCommand` | `(...) => Promise<void>` | `gateway status` 指令 | slash command handler |
| `GatewayStatusTarget` / `GatewayConfigSummary` | types | 目標與摘要結構 | type |
| `resolveTargets` / `resolveAuthForTarget` / `extractConfigSummary` | helpers | Gateway 狀態解析 | helper |
| `renderTargetHeader` / `renderProbeSummaryLine` | helpers | 渲染 | helper |

#### `gateway-install-token.ts`（147 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `GatewayInstallTokenResolution` | type | Token 解析結果 | type |
| `resolveGatewayInstallToken` | `(...) => Promise<...>` | 解析 gateway install token | helper |

#### `gateway-presence.ts`（27 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `GatewaySelfPresence` | type | Gateway 自身 presence 結構 | type |
| `pickGatewaySelfPresence` | `(presence) => GatewaySelfPresence \| null` | 從 raw 挑出 presence | helper |

### (root) — Provider 設定 Helpers

#### Provider Default Model 檔案（模式統一，共 6 檔）

| 檔案 | Default Model | 主要 export |
|------|--------------|-------------|
| `google-gemini-model-default.ts` | `google/gemini-3.1-pro-preview` | `applyGoogleGeminiModelDefault` |
| `openai-model-default.ts` | `openai/gpt-5.1-codex` | `applyOpenAIProviderConfig`, `applyOpenAIConfig` |
| `openai-codex-model-default.ts` | `openai-codex/gpt-5.4` | `applyOpenAICodexModelDefault` |
| `opencode-go-model-default.ts` | `opencode-go/kimi-k2.5` | `applyOpencodeGoModelDefault` |
| `opencode-zen-model-default.ts` | `opencode/claude-opus-4-6` | `applyOpencodeZenModelDefault` |
| `model-default.ts` | (通用) | `resolvePrimaryModel`, `applyAgentDefaultPrimaryModel` |

#### `model-picker.ts`（619 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `promptDefaultModel` | `(...) => Promise<...>` | 互動式選擇預設 model | helper |
| `promptModelAllowlist` | `(params) => Promise<...>` | 互動式選擇 model allowlist | helper |
| `applyPrimaryModel` | `(cfg, model) => OpenClawConfig` | 套用 primary model | helper |
| `applyModelAllowlist` | `(cfg, models) => OpenClawConfig` | 套用 model allowlist | helper |
| `applyModelFallbacksFromSelection` | `(...) => ...` | 從選擇套用 fallbacks | helper |

#### `model-allowlist.ts`（41 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `ensureModelAllowlistEntry` | `(params) => ...` | 確保 model 在 allowlist 中 | helper |

#### `self-hosted-provider-setup.ts`（302 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `SELF_HOSTED_DEFAULT_*` | consts | Self-hosted 預設值 | const |
| `applyProviderDefaultModel` | `(cfg, modelRef) => OpenClawConfig` | 套用 provider 預設 model | helper |
| `promptAndConfigureOpenAICompatibleSelfHostedProvider` | `(...) => Promise<...>` | 互動式設定 self-hosted provider | helper |
| `discoverOpenAICompatibleSelfHostedProvider` | `(...) => Promise<...>` | 自動偵測 self-hosted provider | helper |
| `configureOpenAICompatibleSelfHostedProviderNonInteractive` | `(params) => Promise<...>` | Non-interactive 設定 | helper |

#### `ollama-setup.ts`（531 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `OLLAMA_DEFAULT_MODEL` | const `"glm-4.7-flash"` | Ollama 預設 model | const |
| `promptAndConfigureOllama` | `(params) => Promise<void>` | 互動式設定 Ollama | helper |
| `configureOllamaNonInteractive` | `(params) => Promise<void>` | Non-interactive 設定 Ollama | helper |
| `ensureOllamaModelPulled` | `(params) => Promise<void>` | 確保 model 已 pull | helper |

#### `vllm-setup.ts`（36 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `VLLM_DEFAULT_BASE_URL` | const | vLLM 預設 URL | const |
| `promptAndConfigureVllm` | `(params) => Promise<void>` | 互動式設定 vLLM | helper |

#### `zai-endpoint-detect.ts`（179 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `ZaiEndpointId` / `ZaiDetectedEndpoint` | types | Zai endpoint 結構 | type |
| `detectZaiEndpoint` | `(params) => Promise<...>` | 偵測 Zai endpoint (global/cn) | helper |

### (root) — 基礎設施 Helpers

#### `daemon-runtime.ts`（19 行）

| Export | 說明 |
|--------|------|
| `GatewayDaemonRuntime` type, `DEFAULT_GATEWAY_DAEMON_RUNTIME`, `GATEWAY_DAEMON_RUNTIME_OPTIONS`, `isGatewayDaemonRuntime` | Daemon runtime 定義 |

#### `daemon-install-helpers.ts`（110 行）

| Export | 說明 |
|--------|------|
| `GatewayInstallPlan` type, `buildGatewayInstallPlan`, `gatewayInstallErrorHint` | Daemon 安裝規劃 |

#### `daemon-install-plan.shared.ts`（44 行）

| Export | 說明 |
|--------|------|
| `resolveGatewayDevMode`, `resolveDaemonInstallRuntimeInputs`, `emitDaemonInstallRuntimeWarning` | Daemon install 共享邏輯 |

#### `systemd-linger.ts`（121 行）

| Export | 說明 |
|--------|------|
| `ensureSystemdUserLingerInteractive`, `ensureSystemdUserLingerNonInteractive` | Linux systemd linger 設定 |

#### `signal-install.ts`（302 行）

| Export | 說明 |
|--------|------|
| `extractSignalCliArchive`, `looksLikeArchive`, `pickAsset`, `installSignalCli` | Signal CLI 安裝 |

#### OAuth 相關（3 檔）

| 檔案 | 主要 export | 說明 |
|------|-------------|------|
| `oauth-env.ts` (22 行) | `isRemoteEnvironment` | 偵測遠端環境 |
| `oauth-flow.ts` (53 行) | `createVpsAwareOAuthHandlers` | VPS-aware OAuth handlers |
| `oauth-tls-preflight.ts` (164 行) | `runOpenAIOAuthTlsPreflight`, `formatOpenAIOAuthTlsPreflightFix` | OpenAI OAuth TLS 前置檢查 |

#### `chutes-oauth.ts`（217 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `loginChutes` | `(params) => Promise<void>` | Chutes OAuth 登入流程 | helper |

#### `openai-codex-oauth.ts`（65 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `loginOpenAICodexOAuth` | `(params) => Promise<void>` | OpenAI Codex OAuth 登入 | helper |

#### Cleanup（3 檔）

| 檔案 | 主要 export | 說明 |
|------|-------------|------|
| `cleanup-plan.ts` (25 行) | `resolveCleanupPlanFromDisk` | 建構 cleanup 計畫 |
| `cleanup-utils.ts` (153 行) | `collectWorkspaceDirs`, `buildCleanupPlan`, `removePath`, `removeStateAndLinkedPaths` | Cleanup 工具函式 |
| `config-validation.ts` (21 行) | `requireValidConfigSnapshot` | Config 驗證 |

#### 格式化 Helpers

| 檔案 | 主要 export | 說明 |
|------|-------------|------|
| `text-format.ts` (7 行) | `shortenText` | 文字截短 |
| `health-format.ts` (49 行) | `formatHealthCheckFailure` | 健檢失敗格式化 |

#### `channel-account-context.ts`（29 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `ChannelDefaultAccountContext` | type | Channel 預設 account context | type |
| `resolveDefaultChannelAccountContext` | `(...) => Promise<...>` | 解析預設 channel account context | helper |

#### `provider-auth-helpers.ts`（82 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `resolveProviderMatch` | `(...) => ...` | 解析 provider 匹配 | helper |
| `pickAuthMethod` | `(...) => ...` | 挑選 auth method | helper |
| `mergeConfigPatch` | `<T>(base, patch) => T` | 合併 config patch | helper |
| `applyDefaultModel` | `(cfg, model) => OpenClawConfig` | 套用預設 model | helper |

### (root) — Test Helpers（非生產碼）

以下為測試輔助檔，不參與生產運行：

- `channel-test-helpers.ts`（81 行）
- `channels.mock-harness.ts`（34 行）
- `doctor.e2e-harness.ts`（426 行）
- `doctor.fast-path-mocks.ts`（59 行）
- `doctor-config-flow.test-utils.ts`（26 行）
- `onboard-non-interactive.test-helpers.ts`（54 行）
- `sessions.test-helpers.ts`（83 行）
- `test-runtime-config-helpers.ts`（31 行）
- `test-wizard-helpers.ts`（92 行）
- `onboarding/__tests__/test-utils.ts`（24 行）

## 呼叫關聯圖

```
CLI Layer (src/cli/program/register.*.ts)
│
├── register.setup.ts ──────→ setupCommand (setup.ts)
│                        └──→ onboardCommand (onboard.ts)
│                               ├── runInteractiveOnboarding
│                               │   ├── setupChannels (onboard-channels.ts)
│                               │   ├── setupSkills (onboard-skills.ts)
│                               │   ├── setupSearch (onboard-search.ts)
│                               │   ├── setupInternalHooks (onboard-hooks.ts)
│                               │   ├── applyAuthChoice (auth-choice.apply.ts)
│                               │   │   └── applyAuthChoice{Provider} (auth-choice.apply.*.ts)
│                               │   │       └── set{Provider}ApiKey (onboard-auth.credentials.ts)
│                               │   │       └── apply{Provider}Config (onboard-auth.config-core.ts)
│                               │   └── promptDefaultModel (model-picker.ts)
│                               └── runNonInteractiveOnboarding
│                                   ├── runNonInteractiveOnboardingLocal (onboard-non-interactive/local.ts)
│                                   │   ├── applyNonInteractiveAuthChoice
│                                   │   │   └── inferAuthChoiceFromFlags
│                                   │   └── installGatewayDaemonNonInteractive
│                                   └── runNonInteractiveOnboardingRemote
│
├── register.configure.ts ──→ configureCommandFromSectionsArg (configure.commands.ts)
│                              └── runConfigureWizard (configure.wizard.ts)
│                                  ├── promptGatewayConfig (configure.gateway.ts)
│                                  ├── promptAuthConfig (configure.gateway-auth.ts)
│                                  └── removeChannelConfigWizard (configure.channels.ts)
│
├── register.agent.ts ──────→ agentCliCommand (agent-via-gateway.ts)
│                              ├── agentViaGatewayCommand → Gateway RPC
│                              └── agentCommand (agent.ts) → local embedded
│                                  ├── resolveAgentRunContext (agent/run-context.ts)
│                                  ├── resolveSession (agent/session.ts)
│                                  ├── deliverAgentCommandResult (agent/delivery.ts)
│                                  └── updateSessionStoreAfterAgentRun (agent/session-store.ts)
│                          └──→ agents{Add|Delete|Bind|Unbind|List|SetIdentity}Command
│                                  └── agents.bindings.ts (apply/remove bindings)
│                                  └── agents.config.ts (apply/prune config)
│
├── register.status-health-sessions.ts
│   ├── statusCommand (status.command.ts)
│   │   ├── getStatusSummary (status.summary.ts) → scanStatus (status.scan.ts)
│   │   ├── getAgentLocalStatuses (status.agent-local.ts)
│   │   └── getDaemonStatusSummary (status.daemon.ts)
│   ├── healthCommand (health.ts) → getHealthSnapshot
│   ├── sessionsCommand (sessions.ts)
│   └── sessionsCleanupCommand (sessions-cleanup.ts)
│
├── register.maintenance.ts
│   ├── doctorCommand (doctor.ts)
│   │   ├── loadAndMaybeMigrateDoctorConfig (doctor-config-flow.ts)
│   │   ├── noteAuthProfileHealth (doctor-auth.ts)
│   │   ├── checkGatewayHealth (doctor-gateway-health.ts)
│   │   ├── maybeRepairGatewayDaemon (doctor-gateway-daemon-flow.ts)
│   │   ├── maybeRepairGatewayServiceConfig (doctor-gateway-services.ts)
│   │   ├── noteStateIntegrity (doctor-state-integrity.ts)
│   │   ├── noteSecurityWarnings (doctor-security.ts)
│   │   ├── noteMemorySearchHealth (doctor-memory-search.ts)
│   │   └── ...（20+ 子模組）
│   ├── dashboardCommand (dashboard.ts)
│   ├── resetCommand (reset.ts)
│   └── uninstallCommand (uninstall.ts)
│
├── register.subclis.ts
│   ├── models → modelsListCommand / modelsStatusCommand / modelsScanCommand / ...
│   ├── sandbox → sandboxListCommand / sandboxRecreateCommand / sandboxExplainCommand
│   ├── gateway → gatewayStatusCommand
│   ├── docs → docsSearchCommand
│   └── ...（acp, daemon, logs, system, nodes, devices, cron, dns, hooks, webhooks, ...）
│
├── register.message.ts ────→ messageCommand (message.ts)
│
├── register.backup.ts ─────→ backupCreateCommand / backupVerifyCommand
│
└── register.onboard.ts ────→ onboardCommand（同 setup --wizard）
```

## 系統歸屬分類

| 系統 | 檔案數 | 行數 | 說明 |
|------|--------|------|------|
| **Agent Execution** | 7 | ~1,800 | Agent 執行、session、delivery |
| **Agents CRUD** | 9 | ~1,400 | Agent 新增/刪除/binding/identity/config |
| **Auth Choice** | 22 | ~3,200 | 認證方式選擇與套用（15+ providers） |
| **Channels** | 10 | ~1,900 | Channel CRUD + status + capabilities |
| **Configure** | 8 | ~1,500 | 互動式設定 wizard |
| **Doctor** | 24 | ~5,600 | 健康檢查與修復（20+ 子模組） |
| **Gateway Status** | 3 | ~830 | Gateway 狀態查詢 |
| **Health** | 2 | ~800 | Channel + agent 健康快照 |
| **Message** | 2 | ~490 | 訊息發送與格式化 |
| **Models** | 24 | ~4,200 | Model 探索/設定/auth/fallbacks/scan |
| **Onboarding** | 28 | ~6,500 | 初始化 wizard（interactive + non-interactive） |
| **Provider Setup** | 12 | ~2,100 | Provider 設定（Ollama/vLLM/self-hosted/OAuth/model-defaults） |
| **Sessions** | 4 | ~900 | Session 管理與清理 |
| **Status** | 18 | ~3,200 | 系統狀態報告（status + status --all） |
| **Backup** | 3 | ~610 | Backup 建立與驗證 |
| **Sandbox** | 4 | ~710 | Sandbox container 管理 |
| **Reset/Uninstall** | 2 | ~350 | 重設與移除 |
| **Setup** | 1 | ~90 | 基本初始化 |
| **Dashboard/Docs** | 2 | ~310 | UI + 文件搜尋 |
| **Infrastructure** | 12 | ~1,100 | Daemon/systemd/signal/OAuth/cleanup |
| **Test Helpers** | 10 | ~910 | 非生產測試輔助 |
| **Types/Barrel** | ~8 | ~350 | Type-only + re-export |
