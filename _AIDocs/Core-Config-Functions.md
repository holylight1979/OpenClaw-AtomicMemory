# Config 函式級索引

> 掃描日期：2026-03-21 | 檔案數：136 檔 | 總行數：~27,851 行

## 目錄結構

```
src/config/
├── config.ts                          (28)   # barrel re-export
├── io.ts                             (1559)  # 核心 I/O：讀取/寫入/快取/runtime snapshot
├── schema.ts                          (711)  # JSON Schema 生成 + UI hints + lookup API
├── schema.help.ts                    (1611)  # 欄位說明文字 (FIELD_HELP)
├── schema.hints.ts                    (239)  # UI hints 建構 + sensitive path 標記
├── schema.labels.ts                   (872)  # 欄位顯示名稱 (FIELD_LABELS)
├── schema.tags.ts                     (187)  # Config tag 推導 (channel/agent/security…)
├── schema.irc.ts                       (26)  # IRC 欄位 labels/help
├── validation.ts                      (611)  # Zod 驗證 + plugin/channel 跨模組驗證
├── defaults.ts                        (536)  # 執行期預設值套用 (model/agent/session/logging…)
├── paths.ts                           (272)  # 路徑解析：state dir / config path / OAuth / port
├── types.ts                            (36)  # barrel re-export 所有 types.*
├── types.openclaw.ts                  (156)  # OpenClawConfig 主型別 + ConfigFileSnapshot
├── types.base.ts                      (238)  # 共用基礎型別 (session/logging/diagnostics/web)
├── types.agent-defaults.ts            (359)  # AgentDefaultsConfig + compaction/pruning
├── types.agents.ts                     (95)  # AgentConfig / AgentsConfig / bindings
├── types.agents-shared.ts              (37)  # AgentModelConfig / AgentSandboxConfig
├── types.tools.ts                     (624)  # MediaUnderstanding / LinkTools / ToolPolicy
├── types.gateway.ts                   (446)  # Gateway 全部子型別 (TLS/auth/reload/remote…)
├── types.channels.ts                   (71)  # ChannelsConfig / ChannelDefaultsConfig
├── types.discord.ts                   (371)  # Discord 完整 config 型別
├── types.telegram.ts                  (268)  # Telegram 完整 config 型別
├── types.slack.ts                     (209)  # Slack 完整 config 型別
├── types.whatsapp.ts                  (121)  # WhatsApp config 型別
├── types.googlechat.ts                (123)  # Google Chat config 型別
├── types.msteams.ts                   (124)  # MS Teams config 型別
├── types.signal.ts                     (62)  # Signal config 型別
├── types.imessage.ts                   (94)  # iMessage config 型別
├── types.irc.ts                        (61)  # IRC config 型別
├── types.secrets.ts                   (224)  # SecretRef / SecretInput / provider config
├── types.models.ts                     (76)  # ModelDefinitionConfig / ModelProviderConfig
├── types.messages.ts                  (177)  # MessagesConfig / CommandsConfig
├── types.hooks.ts                     (142)  # HooksConfig / HookMappingConfig
├── types.memory.ts                     (67)  # MemoryConfig / QMD sub-configs
├── types.plugins.ts                    (36)  # PluginsConfig / PluginEntryConfig
├── types.skills.ts                     (47)  # SkillsConfig
├── types.approvals.ts                  (29)  # ApprovalsConfig
├── types.auth.ts                       (29)  # AuthConfig / AuthProfileConfig
├── types.acp.ts                        (48)  # AcpConfig
├── types.browser.ts                    (75)  # BrowserConfig
├── types.cron.ts                       (60)  # CronConfig
├── types.sandbox.ts                    (96)  # SandboxDockerSettings / SandboxBrowserSettings
├── types.tts.ts                        (89)  # TtsConfig / TtsAutoMode
├── types.queue.ts                      (22)  # QueueMode / QueueDropPolicy
├── types.cli.ts                        (13)  # CliConfig
├── types.node-host.ts                  (11)  # NodeHostConfig
├── types.security.ts                   (10)  # SecurityConfig
├── types.installs.ts                   (14)  # InstallRecordBase
├── types.channel-messaging-common.ts   (55)  # CommonChannelMessagingConfig
├── zod-schema.ts                      (953)  # OpenClawSchema 主 Zod schema
├── zod-schema.core.ts                 (731)  # Secret/Model/GroupChat/Queue schema
├── zod-schema.agents.ts               (108)  # AgentsSchema / BindingsSchema / BroadcastSchema
├── zod-schema.agent-defaults.ts       (198)  # AgentDefaultsSchema
├── zod-schema.agent-model.ts           (11)  # AgentModelSchema
├── zod-schema.agent-runtime.ts        (871)  # ToolsSchema / HeartbeatSchema / SandboxSchema
├── zod-schema.approvals.ts             (28)  # ApprovalsSchema
├── zod-schema.session.ts              (215)  # SessionSchema / MessagesSchema / CommandsSchema
├── zod-schema.hooks.ts                (161)  # HookMappingSchema / InternalHooksSchema
├── zod-schema.providers.ts             (47)  # ChannelsSchema barrel
├── zod-schema.providers-core.ts      (1534)  # Telegram/Discord/GoogleChat schema
├── zod-schema.providers-whatsapp.ts   (174)  # WhatsApp schema
├── zod-schema.channels.ts              (17)  # ChannelHeartbeatVisibilitySchema
├── zod-schema.installs.ts              (22)  # InstallRecordShape
├── zod-schema.allowdeny.ts             (40)  # createAllowDenyChannelRulesSchema
├── zod-schema.sensitive.ts              (5)  # sensitive registry
├── zod-schema.secret-input-validation.ts (102) # Telegram/Slack secret 驗證
├── merge-patch.ts                      (97)  # RFC 7396 merge-patch 實作
├── merge-config.ts                     (38)  # mergeConfigSection / mergeWhatsAppConfig
├── runtime-overrides.ts                (91)  # 執行期覆蓋 (set/unset/apply)
├── config-paths.ts                     (82)  # dot-path parse/set/unset/get
├── env-substitution.ts                (203)  # ${VAR} 環境變數替換
├── env-preserve.ts                    (134)  # 寫回時還原 ${VAR} 參照
├── env-vars.ts                         (97)  # config.env → process.env 套用
├── includes.ts                        (346)  # $include 指令解析 (含安全檢查)
├── includes-scan.ts                    (87)  # 遞迴收集 include 路徑
├── normalize-paths.ts                  (69)  # 正規化 ~ 路徑
├── normalize-exec-safe-bin.ts          (37)  # 正規化 exec safe bin profiles
├── legacy.ts                           (58)  # 偵測 legacy key + 套用 migrations
├── legacy-migrate.ts                   (19)  # migrateLegacyConfig 入口
├── legacy.rules.ts                    (212)  # LEGACY_CONFIG_RULES 陣列
├── legacy.shared.ts                   (133)  # migration 共用工具函式
├── legacy.migrations.ts                 (9)  # barrel: 合併 part-1/2/3
├── legacy.migrations.part-1.ts        (615)  # migration 實作 part 1
├── legacy.migrations.part-2.ts        (426)  # migration 實作 part 2
├── legacy.migrations.part-3.ts        (384)  # migration 實作 part 3
├── redact-snapshot.ts                 (688)  # config redaction (sensitive 欄位遮蔽)
├── redact-snapshot.raw.ts              (32)  # raw JSON 層級 sensitive 替換
├── redact-snapshot.secret-ref.ts       (20)  # SecretRef 形狀偵測 + id 遮蔽
├── group-policy.ts                    (428)  # channel group policy 解析
├── runtime-group-policy.ts            (118)  # runtime group policy 解析
├── commands.ts                         (90)  # native commands/skills 啟用判斷
├── agent-dirs.ts                      (112)  # agent dir 重複偵測
├── agent-limits.ts                     (22)  # agent 並行數常數/解析
├── allowed-values.ts                   (98)  # validation issue 允許值摘要
├── backup-rotation.ts                 (125)  # config 備份輪轉 (.bak)
├── bindings.ts                         (26)  # binding type guard + list helpers
├── byte-size.ts                        (29)  # byte size 字串解析
├── cache-utils.ts                      (37)  # cache TTL / file stat snapshot
├── channel-capabilities.ts             (68)  # channel capabilities 解析
├── dangerous-name-matching.ts          (84)  # dangerous name matching config 解析
├── discord-preview-streaming.ts       (158)  # streaming mode 解析/轉換
├── doc-baseline.ts                    (578)  # config doc baseline 生成
├── gateway-control-ui-origins.ts       (91)  # Control UI allowed origins 解析
├── issue-format.ts                     (68)  # validation issue 格式化
├── logging.ts                          (18)  # config path 格式化 + log 更新
├── markdown-tables.ts                  (62)  # markdown table mode 解析
├── media-audio-field-metadata.ts       (54)  # audio 欄位 metadata
├── model-input.ts                      (36)  # agent model primary/fallback 解析
├── plugin-auto-enable.ts             (536)  # plugin 自動啟用邏輯
├── plugins-allowlist.ts                (15)  # 確保 plugin 在 allowlist
├── port-defaults.ts                    (43)  # 預設 port 推導
├── prototype-keys.ts                    (1)  # re-export isBlockedObjectKey
├── talk.ts                            (353)  # TTS/Talk config 正規化
├── talk-defaults.ts                    (11)  # Talk 沉默逾時預設
├── telegram-custom-commands.ts         (95)  # Telegram custom commands 驗證
├── version.ts                          (49)  # OpenClaw 版本號解析/比較
├── test-helpers.ts                     (74)  # 測試輔助 (temp home/config)
├── sessions.ts                         (14)  # barrel re-export sessions/*
└── sessions/
    ├── types.ts                       (382)  # SessionEntry / SessionOrigin / helpers
    ├── store.ts                       (883)  # session store CRUD + maintenance
    ├── store-cache.ts                  (81)  # store 快取讀寫
    ├── store-maintenance.ts           (327)  # prune/cap/rotate session file
    ├── store-migrations.ts             (27)  # session store migration
    ├── paths.ts                       (329)  # session file path 解析
    ├── targets.ts                     (344)  # multi-agent session store 目標
    ├── disk-budget.ts                 (375)  # session disk budget 管理
    ├── transcript.ts                  (243)  # session transcript 讀寫
    ├── reset.ts                       (176)  # session reset policy 解析
    ├── metadata.ts                    (172)  # session metadata patch 推導
    ├── group.ts                       (107)  # group session key 建構
    ├── main-session.ts                 (79)  # main session key 解析
    ├── session-key.ts                  (48)  # session key 推導
    ├── session-file.ts                 (50)  # session file 寫入
    ├── artifacts.ts                    (67)  # session archive artifact 判斷
    ├── delivery-info.ts                (57)  # delivery info 提取
    ├── disk-budget.ts                 (375)  # disk budget sweep
    └── explicit-session-key-normalization.ts (50) # 顯式 session key 正規化
```

## 函式清單

### 根目錄 — 核心入口

#### `config.ts`（28 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| barrel re-exports | — | 從 `io.ts`, `paths.ts`, `types.ts`, `validation.ts`, `runtime-overrides.ts`, `legacy-migrate.ts` 彙整匯出 | public API |

#### `io.ts`（1559 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `ConfigRuntimeRefreshError` | `class extends Error` | runtime snapshot refresh 失敗時拋出 | public API |
| `ParseConfigJson5Result` | `type` | JSON5 解析結果聯合型別 | public API |
| `ConfigWriteOptions` | `type` | 寫入選項（env snapshot、unset paths） | public API |
| `ReadConfigFileSnapshotForWriteResult` | `type` | snapshot + writeOptions 組合型別 | public API |
| `RuntimeConfigSnapshotRefreshParams` | `type` | refresh handler 參數 | public API |
| `RuntimeConfigSnapshotRefreshHandler` | `type` | runtime refresh 回呼介面 | public API |
| `ConfigIoDeps` | `type` | DI 依賴注入介面（fs/json5/env/logger） | public API |
| `createConfigIO` | `(overrides?: ConfigIoDeps) => { configPath, loadConfig, readConfigFileSnapshot, readConfigFileSnapshotForWrite, writeConfigFile }` | 建立 config I/O 實例（核心工廠） | public API |
| `parseConfigJson5` | `(raw: string, json5?) => ParseConfigJson5Result` | 安全解析 JSON5 字串 | public API |
| `resolveConfigSnapshotHash` | `(snapshot: { hash?, raw? }) => string \| null` | 解析或計算 config snapshot hash | public API |
| `loadConfig` | `() => OpenClawConfig` | 讀取並快取 config（runtime snapshot 優先） | public API |
| `readBestEffortConfig` | `() => Promise<OpenClawConfig>` | best-effort 讀取（無效時回傳 raw） | public API |
| `readConfigFileSnapshot` | `() => Promise<ConfigFileSnapshot>` | 讀取完整 config snapshot | public API |
| `readConfigFileSnapshotForWrite` | `() => Promise<ReadConfigFileSnapshotForWriteResult>` | 讀取 snapshot + 保留 env snapshot 供寫回 | public API |
| `writeConfigFile` | `(cfg: OpenClawConfig, options?: ConfigWriteOptions) => Promise<void>` | 寫入 config（含 merge-patch、env 還原、備份） | public API |
| `clearConfigCache` | `() => void` | 清除 config 快取 | public API |
| `setRuntimeConfigSnapshot` | `(config: OpenClawConfig, sourceConfig?: OpenClawConfig) => void` | 設定 runtime config snapshot | public API |
| `clearRuntimeConfigSnapshot` | `() => void` | 清除 runtime snapshot | public API |
| `getRuntimeConfigSnapshot` | `() => OpenClawConfig \| null` | 取得 runtime snapshot | public API |
| `getRuntimeConfigSourceSnapshot` | `() => OpenClawConfig \| null` | 取得 runtime source snapshot（替換前） | public API |
| `projectConfigOntoRuntimeSourceSnapshot` | `(config: OpenClawConfig) => OpenClawConfig` | 將 config 變更投影回 source snapshot | public API |
| `setRuntimeConfigSnapshotRefreshHandler` | `(handler: ... \| null) => void` | 註冊 runtime refresh 回呼 | public API |
| `CircularIncludeError` | re-export from includes.ts | 循環 include 錯誤 | re-export |
| `ConfigIncludeError` | re-export from includes.ts | include 錯誤基類 | re-export |
| `MissingEnvVarError` | re-export from env-substitution.ts | 缺少環境變數錯誤 | re-export |

#### `schema.ts`（711 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `ConfigSchema` | `type = ReturnType<typeof OpenClawSchema.toJSONSchema>` | JSON Schema 型別別名 | public API |
| `ConfigSchemaResponse` | `type { schema, uiHints, version, generatedAt }` | schema 回應封裝 | public API |
| `ConfigSchemaLookupChild` | `type` | lookup child 節點描述 | public API |
| `ConfigSchemaLookupResult` | `type` | lookup 結果（schema + hint + children） | public API |
| `PluginUiMetadata` | `type` | plugin UI metadata 描述 | public API |
| `ChannelUiMetadata` | `type` | channel UI metadata 描述 | public API |
| `buildConfigSchema` | `(params?: { plugins?, channels? }) => ConfigSchemaResponse` | 建構完整 config schema（含 plugin/channel 合併） | public API |
| `lookupConfigSchema` | `(response: ConfigSchemaResponse, path: string) => ConfigSchemaLookupResult \| null` | 按 dot-path 查找 schema 節點 | public API |
| `ConfigUiHint` | re-export type | UI hint 型別 | re-export |
| `ConfigUiHints` | re-export type | UI hints map 型別 | re-export |

#### `validation.ts`（611 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `validateConfigObjectRaw` | `(raw: unknown) => { ok, config } \| { ok, issues }` | Zod 驗證（不套用 runtime defaults） | public API |
| `validateConfigObject` | `(raw: unknown) => { ok, config } \| { ok, issues }` | Zod 驗證 + 套用 runtime defaults | public API |
| `validateConfigObjectWithPlugins` | `(raw: unknown, params?) => ValidateConfigWithPluginsResult` | 完整驗證（含 plugin schema + channel + heartbeat） | public API |
| `validateConfigObjectRawWithPlugins` | `(raw: unknown, params?) => ValidateConfigWithPluginsResult` | 完整驗證（不套用 defaults，用於寫回） | public API |

#### `defaults.ts`（536 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `SessionDefaultsOptions` | `type { warn?, warnState? }` | session 預設套用選項 | public API |
| `applyMessageDefaults` | `(cfg: OpenClawConfig) => OpenClawConfig` | 套用 message 預設（ackReactionScope） | public API |
| `applySessionDefaults` | `(cfg: OpenClawConfig, options?) => OpenClawConfig` | 套用 session 預設（mainKey 強制為 "main"） | public API |
| `applyTalkApiKey` | `(config: OpenClawConfig) => OpenClawConfig` | 從環境注入 Talk API key | public API |
| `applyTalkConfigNormalization` | `(config: OpenClawConfig) => OpenClawConfig` | Talk config 正規化 | public API |
| `applyModelDefaults` | `(cfg: OpenClawConfig) => OpenClawConfig` | 套用 model 預設（cost/input/maxTokens/alias） | public API |
| `applyAgentDefaults` | `(cfg: OpenClawConfig) => OpenClawConfig` | 套用 agent 並行數預設 | public API |
| `applyLoggingDefaults` | `(cfg: OpenClawConfig) => OpenClawConfig` | 套用 logging.redactSensitive 預設 | public API |
| `applyContextPruningDefaults` | `(cfg: OpenClawConfig) => OpenClawConfig` | 套用 context pruning 預設（cache-ttl/heartbeat/cacheRetention） | public API |
| `applyCompactionDefaults` | `(cfg: OpenClawConfig) => OpenClawConfig` | 套用 compaction mode 預設（safeguard） | public API |
| `resetSessionDefaultsWarningForTests` | `() => void` | 測試用：重設 session warning 狀態 | internal |

### 根目錄 — 路徑與環境

#### `paths.ts`（272 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `resolveIsNixMode` | `(env?) => boolean` | 偵測 Nix mode | public API |
| `isNixMode` | `const boolean` | 快取的 Nix mode 結果 | public API |
| `resolveLegacyStateDir` | `(homedir?) => string` | 解析 legacy state dir | public API |
| `resolveLegacyStateDirs` | `(homedir?) => string[]` | 列出所有 legacy state dirs | public API |
| `resolveNewStateDir` | `(homedir?) => string` | 解析新版 state dir (~/.openclaw) | public API |
| `resolveStateDir` | `(env?, homedir?) => string` | 解析有效 state dir（含 legacy fallback） | public API |
| `STATE_DIR` | `const string` | 快取的 state dir | public API |
| `resolveCanonicalConfigPath` | `(env?, stateDir?) => string` | 解析 canonical config path | public API |
| `resolveConfigPathCandidate` | `(env?, homedir?) => string` | 解析優先候選 config path | public API |
| `resolveConfigPath` | `(env?, stateDir?, homedir?) => string` | 解析最終 config path | public API |
| `CONFIG_PATH` | `const string` | 快取的 config path | public API |
| `resolveDefaultConfigCandidates` | `(env?, homedir?) => string[]` | 列出所有 config 候選路徑 | public API |
| `DEFAULT_GATEWAY_PORT` | `const 18789` | 預設 gateway port | public API |
| `resolveGatewayLockDir` | `(tmpdir?) => string` | 解析 gateway lock dir | public API |
| `resolveOAuthDir` | `(env?, stateDir?) => string` | 解析 OAuth 目錄 | public API |
| `resolveOAuthPath` | `(env?, stateDir?) => string` | 解析 OAuth 檔案路徑 | public API |
| `resolveGatewayPort` | `(cfg?, env?) => number` | 解析 gateway port（env > config > default） | public API |

#### `config-paths.ts`（82 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `parseConfigPath` | `(raw: string) => { ok, path?, error? }` | 解析 dot-path 字串為段落陣列 | public API |
| `setConfigValueAtPath` | `(root, path: string[], value) => void` | 依 path 設值（自動建立中間物件） | public API |
| `unsetConfigValueAtPath` | `(root, path: string[]) => boolean` | 依 path 刪值（自動清理空物件） | public API |
| `getConfigValueAtPath` | `(root, path: string[]) => unknown` | 依 path 取值 | public API |

#### `env-substitution.ts`（203 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `MissingEnvVarError` | `class extends Error { varName, configPath }` | 缺少環境變數錯誤 | public API |
| `EnvSubstitutionWarning` | `type { varName, configPath }` | 環境變數替換警告 | public API |
| `SubstituteOptions` | `type { onMissing? }` | 替換選項 | public API |
| `containsEnvVarReference` | `(value: string) => boolean` | 檢查字串是否包含 ${VAR} | public API |
| `resolveConfigEnvVars` | `(obj, env?, opts?) => unknown` | 遞迴替換 config 中的 ${VAR} | public API |

#### `env-preserve.ts`（134 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `restoreEnvVarRefs` | `(incoming, parsed, env?) => unknown` | 寫回時還原 ${VAR} 參照（避免明文覆寫） | public API |

#### `env-vars.ts`（97 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `collectConfigRuntimeEnvVars` | `(cfg?) => Record<string, string>` | 收集 config.env 中的 runtime 環境變數 | public API |
| `collectConfigServiceEnvVars` | `(cfg?) => Record<string, string>` | 收集 config.env 中的 service 環境變數 | public API |
| `collectConfigEnvVars` | `(cfg?) => Record<string, string>` | (deprecated) 同 collectConfigRuntimeEnvVars | public API |
| `createConfigRuntimeEnv` | `(cfg, baseEnv?) => NodeJS.ProcessEnv` | 建立含 config env 的 process env 副本 | public API |
| `applyConfigEnvVars` | `(cfg, env?) => void` | 將 config.env 寫入 process.env（不覆蓋已設值） | public API |

### 根目錄 — Include / Merge / Patch

#### `includes.ts`（346 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `INCLUDE_KEY` | `const "$include"` | include 指令 key | public API |
| `MAX_INCLUDE_DEPTH` | `const 10` | 最大 include 深度 | public API |
| `MAX_INCLUDE_FILE_BYTES` | `const 2 * 1024 * 1024` | 最大 include 檔案大小 | public API |
| `IncludeResolver` | `type` | include 解析器介面 | public API |
| `IncludeFileReadParams` | `type` | include 讀取參數 | public API |
| `ConfigIncludeError` | `class extends Error` | include 錯誤基類 | public API |
| `CircularIncludeError` | `class extends ConfigIncludeError` | 循環 include 錯誤 | public API |
| `deepMerge` | `(target, source) => unknown` | 深層合併（array concat，object merge） | public API |
| `readConfigIncludeFileWithGuards` | `(params: IncludeFileReadParams) => string` | 帶安全檢查的 include 檔案讀取 | public API |
| `resolveConfigIncludes` | `(obj, configPath, resolver?) => unknown` | 解析所有 $include 指令 | public API |

#### `includes-scan.ts`（87 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `collectIncludePathsRecursive` | `(params: { configPath, parsed }) => Promise<string[]>` | 遞迴收集所有 include 路徑 | public API |

#### `merge-patch.ts`（97 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `applyMergePatch` | `(base, patch, options?) => unknown` | RFC 7396 merge-patch（支援 mergeObjectArraysById） | public API |

#### `merge-config.ts`（38 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `MergeSectionOptions<T>` | `type { unsetOnUndefined? }` | section merge 選項 | public API |
| `mergeConfigSection<T>` | `(base, patch, options?) => T` | 合併 config 子區段 | public API |
| `mergeWhatsAppConfig` | `(cfg, patch, options?) => OpenClawConfig` | 合併 WhatsApp config | public API |

#### `runtime-overrides.ts`（91 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `getConfigOverrides` | `() => OverrideTree` | 取得目前 overrides | public API |
| `resetConfigOverrides` | `() => void` | 重設所有 overrides | public API |
| `setConfigOverride` | `(pathRaw, value) => { ok, error? }` | 設定 runtime override | public API |
| `unsetConfigOverride` | `(pathRaw) => { ok, removed, error? }` | 移除 runtime override | public API |
| `applyConfigOverrides` | `(cfg: OpenClawConfig) => OpenClawConfig` | 套用所有 overrides 到 config | public API |

### 根目錄 — Zod Schema

#### `zod-schema.ts`（953 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `OpenClawSchema` | `z.ZodObject` | 完整 OpenClaw config Zod schema（頂層） | schema definition |

#### `zod-schema.core.ts`（731 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `SecretRefSchema` | `z.ZodDiscriminatedUnion` | SecretRef 驗證 schema | schema definition |
| `SecretInputSchema` | `z.ZodUnion` | string \| SecretRef | schema definition |
| `SecretProviderSchema` | `z.ZodDiscriminatedUnion` | secret provider 驗證 | schema definition |
| `SecretsConfigSchema` | `z.ZodObject` | secrets 完整 schema | schema definition |
| `ModelApiSchema` | `z.ZodEnum` | model API 列舉 | schema definition |
| `ModelCompatSchema` / `ModelDefinitionSchema` / `ModelProviderSchema` / `ModelsConfigSchema` | Zod objects | model 相關 schema | schema definition |
| `HexColorSchema` | `z.ZodString` | hex color 驗證 | schema definition |
| `GroupChatSchema` / `DmConfigSchema` / `IdentitySchema` | Zod objects | 共用 sub-schema | schema definition |
| `QueueModeSchema` / `QueueDropSchema` | Zod unions | queue 設定 schema | schema definition |

#### `zod-schema.agents.ts`（108 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `AgentsSchema` | `z.ZodObject` | agents 完整 schema | schema definition |
| `BindingsSchema` | `z.ZodArray` | bindings array schema | schema definition |
| `BroadcastStrategySchema` | `z.ZodEnum` | broadcast strategy enum | schema definition |
| `BroadcastSchema` / `AudioSchema` | Zod objects | broadcast/audio schema | schema definition |

#### `zod-schema.agent-runtime.ts`（871 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `HeartbeatSchema` | Zod object | heartbeat 設定 schema | schema definition |
| `SandboxDockerSchema` / `SandboxBrowserSchema` / `SandboxPruneSchema` | Zod objects | sandbox 設定 schemas | schema definition |
| `ToolPolicySchema` / `ToolPolicyWithProfileSchema` / `ToolProfileSchema` | Zod objects | tool policy schemas | schema definition |
| `ToolsWebSearchSchema` / `ToolsWebFetchSchema` / `ToolsWebSchema` | Zod objects | web tool schemas | schema definition |
| `ElevatedAllowFromSchema` | Zod object | elevated permission schema | schema definition |
| `AgentSandboxSchema` / `AgentToolsSchema` | Zod objects | agent sandbox/tools 組合 schema | schema definition |
| `MemorySearchSchema` | Zod object | memory search 設定 schema | schema definition |
| `ToolsSchema` | Zod object | tools 頂層 schema | schema definition |
| `AgentModelSchema` | re-export | agent model union schema | schema definition |

#### `zod-schema.session.ts`（215 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `SessionSendPolicySchema` | Zod object | session send policy schema | schema definition |
| `SessionSchema` | Zod object | session 完整 schema | schema definition |
| `MessagesSchema` | Zod object | messages 完整 schema | schema definition |
| `CommandsSchema` | Zod object | commands 完整 schema | schema definition |

#### `zod-schema.providers-core.ts`（1534 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `TelegramAccountSchema` / `TelegramConfigSchema` | Zod objects | Telegram provider schema | schema definition |
| `DiscordAccountSchema` / `DiscordConfigSchema` | Zod objects | Discord provider schema | schema definition |
| `GoogleChatAccountSchema` / `GoogleChatConfigSchema` | Zod objects | Google Chat provider schema | schema definition |
| 多個 sub-schema（Topic/Group/Direct/Dm/Guild…） | Zod objects | channel 子結構 schemas | schema definition |

#### `zod-schema.providers-whatsapp.ts`（174 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `WhatsAppAccountSchema` / `WhatsAppConfigSchema` | Zod objects | WhatsApp provider schema | schema definition |

#### 其他 zod-schema 檔

| 檔案 | Export | 說明 |
|------|--------|------|
| `zod-schema.agent-defaults.ts` | `AgentDefaultsSchema` | agent defaults schema |
| `zod-schema.agent-model.ts` | `AgentModelSchema` | agent model union |
| `zod-schema.approvals.ts` | `ApprovalsSchema` | approvals schema |
| `zod-schema.hooks.ts` | `HookMappingSchema`, `InternalHookHandlerSchema`, `InternalHooksSchema`, `HooksGmailSchema` | hooks schemas |
| `zod-schema.channels.ts` | `ChannelHeartbeatVisibilitySchema`, `ChannelHealthMonitorSchema` | channel shared schemas |
| `zod-schema.providers.ts` | `ChannelsSchema` (barrel) | channels 頂層 schema |
| `zod-schema.installs.ts` | `InstallSourceSchema`, `InstallRecordShape` | install record schema |
| `zod-schema.allowdeny.ts` | `createAllowDenyChannelRulesSchema()` | allow/deny rules factory |
| `zod-schema.sensitive.ts` | `sensitive` (z.registry) | sensitive 欄位 registry |
| `zod-schema.secret-input-validation.ts` | `validateTelegramWebhookSecretRequirements`, `validateSlackSigningSecretRequirements` | secret 格式驗證 |

### 根目錄 — Schema Hints / Labels / Help

#### `schema.help.ts`（1611 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `FIELD_HELP` | `Record<string, string>` | 每個 config 欄位的說明文字（600+ 筆） | schema definition |

#### `schema.hints.ts`（239 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `ConfigUiHint` / `ConfigUiHints` | re-export types | UI hint 型別 | re-export |
| `isSensitiveConfigPath` | `(path: string) => boolean` | 判斷路徑是否為 sensitive | public API |
| `buildBaseHints` | `() => ConfigUiHints` | 建構基礎 UI hints（labels + help + sensitive） | public API |
| `applySensitiveHints` | `(hints, extensionKeys) => ConfigUiHints` | 標記 sensitive 欄位 | internal |
| `mapSensitivePaths` | `(schema, prefix, hints) => ConfigUiHints` | 從 Zod schema 推導 sensitive 路徑 | internal |

#### `schema.labels.ts`（872 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `FIELD_LABELS` | `Record<string, string>` | 每個 config 欄位的顯示名稱 | schema definition |

#### `schema.tags.ts`（187 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `CONFIG_TAGS` | `const [...]` | 所有 tag 列舉（channel/agent/security/gateway…） | schema definition |
| `ConfigTag` | `type` | tag union type | schema definition |
| `deriveTagsForPath` | `(path: string, hint?) => ConfigTag[]` | 依路徑推導 tags | internal |
| `applyDerivedTags` | `(hints: ConfigUiHints) => ConfigUiHints` | 對所有 hints 套用 tag 推導 | internal |

### 根目錄 — Legacy Migration

#### `legacy.ts`（58 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `findLegacyConfigIssues` | `(raw, sourceRaw?) => LegacyConfigIssue[]` | 偵測 legacy config key | public API |
| `applyLegacyMigrations` | `(raw) => { next, changes }` | 套用所有 legacy migrations | public API |

#### `legacy-migrate.ts`（19 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `migrateLegacyConfig` | `(raw) => { config, changes }` | migrate + validate 一步到位 | public API |

#### `legacy.rules.ts`（212 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `LEGACY_CONFIG_RULES` | `LegacyConfigRule[]` | 所有 legacy rule 定義（27 條） | schema definition |

#### `legacy.shared.ts`（133 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `LegacyConfigRule` / `LegacyConfigMigration` | types | migration 型別定義 | internal |
| `getRecord` / `ensureRecord` / `mergeMissing` | utility functions | migration 共用工具 | internal |
| `mapLegacyAudioTranscription` | `(value) => Record \| null` | legacy audio transcription 轉換 | internal |
| `getAgentsList` / `resolveDefaultAgentIdFromRaw` / `ensureAgentEntry` | utility functions | agent list 操作工具 | internal |

#### `legacy.migrations.ts` + `part-1/2/3`（1425 行合計）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `LEGACY_CONFIG_MIGRATIONS` | `LegacyConfigMigration[]` | 所有 migration 實作合併 | internal |
| `LEGACY_CONFIG_MIGRATIONS_PART_1` | `LegacyConfigMigration[]` | migration part 1（channel 遷移等） | internal |
| `LEGACY_CONFIG_MIGRATIONS_PART_2` | `LegacyConfigMigration[]` | migration part 2（routing/agent 遷移等） | internal |
| `LEGACY_CONFIG_MIGRATIONS_PART_3` | `LegacyConfigMigration[]` | migration part 3（gateway/tts/heartbeat 遷移等） | internal |

### 根目錄 — Redaction / Security

#### `redact-snapshot.ts`（688 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `REDACTED_SENTINEL` | `const "__OPENCLAW_REDACTED__"` | 遮蔽標記值 | public API |
| `redactConfigObject<T>` | `(value: T, uiHints?) => T` | 遮蔽 config 中的 sensitive 值 | public API |
| `redactConfigSnapshot` | `(snapshot: ConfigFileSnapshot, hints?) => ConfigFileSnapshot` | 遮蔽整個 snapshot | public API |
| `RedactionResult` | `type` | 還原結果型別 | public API |
| `restoreRedactedValues` | `(params) => RedactionResult` | 從 original snapshot 還原被遮蔽的值 | public API |

#### `redact-snapshot.raw.ts`（32 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `replaceSensitiveValuesInRaw` | `(params) => string` | 在 raw JSON 字串中替換 sensitive 值 | internal |
| `shouldFallbackToStructuredRawRedaction` | `(params) => boolean` | 判斷是否需要 structured fallback | internal |

#### `redact-snapshot.secret-ref.ts`（20 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `isSecretRefShape` | `(value) => boolean` | 判斷值是否為 SecretRef 形狀 | internal |
| `redactSecretRefId` | `(params) => string` | 遮蔽 SecretRef 中的 id | internal |

### 根目錄 — Policy / Commands / Bindings

#### `group-policy.ts`（428 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `GroupPolicyChannel` / `ChannelGroupConfig` / `ChannelGroupPolicy` / `GroupToolPolicySender` | types | group policy 型別 | public API |
| `resolveToolsBySender` | `(params) => ...` | 依 sender 解析 tool policy | public API |
| `resolveChannelGroupPolicy` | `(params) => ChannelGroupPolicy` | 解析 channel group policy | public API |
| `resolveChannelGroupRequireMention` | `(params) => boolean` | 解析 group require mention | public API |
| `resolveChannelGroupToolsPolicy` | `(params) => ...` | 解析 group tools policy | public API |

#### `runtime-group-policy.ts`（118 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `RuntimeGroupPolicyResolution` / `RuntimeGroupPolicyParams` | types | runtime group policy 型別 | public API |
| `resolveRuntimeGroupPolicy` | `(params) => RuntimeGroupPolicyResolution` | 解析 runtime group policy | public API |
| `resolveDefaultGroupPolicy` | `(cfg) => GroupPolicy \| undefined` | 解析預設 group policy | public API |
| `GROUP_POLICY_BLOCKED_LABEL` | `Record<...>` | blocked label 常數 | public API |
| `resolveOpenProviderRuntimeGroupPolicy` / `resolveAllowlistProviderRuntimeGroupPolicy` | functions | provider 層級 group policy | public API |
| `warnMissingProviderGroupPolicyFallbackOnce` | `(params) => void` | 首次缺少 policy 警告 | public API |

#### `commands.ts`（90 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `CommandFlagKey` | `type` | command flag key 型別 | public API |
| `resolveNativeSkillsEnabled` | `(params) => boolean` | 判斷 native skills 是否啟用 | public API |
| `resolveNativeCommandsEnabled` | `(params) => boolean` | 判斷 native commands 是否啟用 | public API |
| `isNativeCommandsExplicitlyDisabled` | `(params) => boolean` | 判斷是否明確停用 | public API |
| `isCommandFlagEnabled` | `(params) => boolean` | 檢查 command flag 啟用狀態 | public API |
| `isRestartEnabled` | `(config?) => boolean` | 判斷 restart 是否啟用 | public API |

#### `bindings.ts`（26 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `isRouteBinding` | `(binding) => boolean` | route binding type guard | public API |
| `isAcpBinding` | `(binding) => boolean` | ACP binding type guard | public API |
| `listConfiguredBindings` | `(cfg) => AgentBinding[]` | 列出 config bindings | public API |
| `listRouteBindings` | `(cfg) => AgentRouteBinding[]` | 列出 route bindings | public API |
| `listAcpBindings` | `(cfg) => AgentAcpBinding[]` | 列出 ACP bindings | public API |

### 根目錄 — 其他工具

#### `agent-dirs.ts`（112 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `DuplicateAgentDir` | `type { agentDir, agentIds }` | 重複 agent dir 描述 | public API |
| `DuplicateAgentDirError` | `class extends Error` | 重複 agent dir 錯誤 | public API |
| `findDuplicateAgentDirs` | `(cfg, deps?) => DuplicateAgentDir[]` | 偵測重複 agent dirs | validator |
| `formatDuplicateAgentDirError` | `(dups) => string` | 格式化錯誤訊息 | internal |

#### `agent-limits.ts`（22 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `DEFAULT_AGENT_MAX_CONCURRENT` | `const 4` | agent 預設最大並行數 | public API |
| `DEFAULT_SUBAGENT_MAX_CONCURRENT` | `const 8` | subagent 預設最大並行數 | public API |
| `DEFAULT_SUBAGENT_MAX_SPAWN_DEPTH` | `const 1` | subagent 預設最大生成深度 | public API |
| `resolveAgentMaxConcurrent` | `(cfg?) => number` | 解析 agent 最大並行數 | public API |
| `resolveSubagentMaxConcurrent` | `(cfg?) => number` | 解析 subagent 最大並行數 | public API |

#### `backup-rotation.ts`（125 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `CONFIG_BACKUP_COUNT` | `const 5` | 備份保留數量 | public API |
| `BackupRotationFs` / `BackupMaintenanceFs` | interfaces | 檔案操作介面 | public API |
| `rotateConfigBackups` | `(configPath, ioFs) => Promise<void>` | 輪轉備份檔案 | internal |
| `hardenBackupPermissions` | `(configPath, ioFs) => Promise<void>` | 強化備份權限 | internal |
| `cleanOrphanBackups` | `(configPath, ioFs) => Promise<void>` | 清理孤立備份 | internal |
| `maintainConfigBackups` | `(configPath, ioFs) => Promise<void>` | 完整備份維護流程 | internal |

#### `plugin-auto-enable.ts`（536 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `PluginAutoEnableResult` | `type` | 自動啟用結果 | public API |
| `isChannelConfigured` | `(params) => boolean` | 判斷 channel 是否已設定 | public API |
| `applyPluginAutoEnable` | `(params) => PluginAutoEnableResult` | 依據 channel/auth 自動啟用 plugins | public API |

#### `doc-baseline.ts`（578 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `ConfigDocBaselineKind` / `ConfigDocBaselineEntry` / `ConfigDocBaseline` | types | doc baseline 型別 | public API |
| `collectConfigDocBaselineEntries` | `(params) => ConfigDocBaselineEntry[]` | 收集 config doc baseline 條目 | public API |
| `dedupeConfigDocBaselineEntries` | `(entries) => ConfigDocBaselineEntry[]` | 去重 baseline 條目 | public API |
| `buildConfigDocBaseline` | `() => Promise<ConfigDocBaseline>` | 建構完整 doc baseline | public API |
| `renderConfigDocBaselineStatefile` | `(params) => Promise<...>` | 渲染 baseline statefile | public API |
| `writeConfigDocBaselineStatefile` | `(params?) => Promise<...>` | 寫入 baseline statefile | public API |
| `normalizeConfigDocBaselineHelpPath` | `(pathValue) => string` | 正規化 help path | public API |
| `getNormalizedFieldHelp` | `() => Record<string, string>` | 取得正規化 field help | public API |

#### 其他小型工具檔

| 檔案 | Export | 說明 | 入口類型 |
|------|--------|------|----------|
| `allowed-values.ts` | `AllowedValuesSummary` type, `summarizeAllowedValues()`, `appendAllowedValuesHint()` | validation issue 允許值摘要 | internal |
| `byte-size.ts` | `parseNonNegativeByteSize()`, `isValidNonNegativeByteSizeString()` | byte size 解析 | public API |
| `cache-utils.ts` | `resolveCacheTtlMs()`, `isCacheEnabled()`, `FileStatSnapshot`, `getFileStatSnapshot()` | cache TTL 工具 | public API |
| `channel-capabilities.ts` | `resolveChannelCapabilities()` | channel capabilities 解析 | public API |
| `dangerous-name-matching.ts` | `DangerousNameMatchingConfig`, `isDangerousNameMatchingEnabled()`, `collectProviderDangerousNameMatchingScopes()` | dangerous name matching 設定 | public API |
| `discord-preview-streaming.ts` | `StreamingMode`, `parseStreamingMode()`, `resolveDiscordPreviewStreamMode()`, `resolveSlackStreamingMode()` 等 | streaming mode 解析/轉換（8 functions） | public API |
| `gateway-control-ui-origins.ts` | `isGatewayNonLoopbackBindMode()`, `hasConfiguredControlUiAllowedOrigins()`, `buildDefaultControlUiAllowedOrigins()`, `ensureControlUiAllowedOriginsForNonLoopbackBind()` | Control UI origins 管理 | public API |
| `issue-format.ts` | `normalizeConfigIssuePath()`, `normalizeConfigIssue()`, `normalizeConfigIssues()`, `formatConfigIssueLine()`, `formatConfigIssueLines()` | validation issue 格式化 | public API |
| `logging.ts` | `formatConfigPath()`, `logConfigUpdated()` | config 日誌工具 | public API |
| `markdown-tables.ts` | `DEFAULT_TABLE_MODES`, `resolveMarkdownTableMode()` | markdown table mode 解析 | public API |
| `media-audio-field-metadata.ts` | `MEDIA_AUDIO_FIELD_KEYS`, `MEDIA_AUDIO_FIELD_HELP`, `MEDIA_AUDIO_FIELD_LABELS` | audio 欄位 metadata 常數 | schema definition |
| `model-input.ts` | `resolveAgentModelPrimaryValue()`, `resolveAgentModelFallbackValues()`, `toAgentModelListLike()` | agent model config 解析 | public API |
| `normalize-exec-safe-bin.ts` | `normalizeExecSafeBinProfilesInConfig()` | exec safe bin profiles 正規化 | internal |
| `normalize-paths.ts` | `normalizeConfigPaths()` | 正規化 ~ 路徑 | internal |
| `plugins-allowlist.ts` | `ensurePluginAllowlisted()` | 確保 plugin 在 allowlist | public API |
| `port-defaults.ts` | `PortRange`, `DEFAULT_BRIDGE_PORT`, `DEFAULT_BROWSER_*`, `deriveDefault*Port/Range()` | port 預設值與推導 | public API |
| `prototype-keys.ts` | `isBlockedObjectKey` (re-export) | prototype pollution 防護 | internal |
| `talk.ts` | `DEFAULT_TALK_PROVIDER`, `normalizeTalkConfig()`, `resolveActiveTalkProviderConfig()`, `buildTalkConfigResponse()`, `readTalkApiKeyFromProfile()`, `resolveTalkApiKey()` | Talk/TTS config 管理 | public API |
| `talk-defaults.ts` | `TALK_SILENCE_TIMEOUT_MS_BY_PLATFORM`, `describeTalkSilenceTimeoutDefaults()` | Talk 沉默逾時預設 | public API |
| `telegram-custom-commands.ts` | `TELEGRAM_COMMAND_NAME_PATTERN`, `normalizeTelegramCommandName()`, `normalizeTelegramCommandDescription()`, `resolveTelegramCustomCommands()` | Telegram custom commands | public API |
| `version.ts` | `OpenClawVersion` type, `parseOpenClawVersion()`, `compareOpenClawVersions()` | 版本號解析/比較 | public API |
| `test-helpers.ts` | `withTempHome()`, `writeOpenClawConfig()`, `withTempHomeConfig()`, `withEnvOverride()`, `buildWebSearchProviderConfig()` | 測試輔助 | internal |

### sessions/ 子目錄

#### `sessions/types.ts`（382 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `SessionEntry` | `type` | session 條目完整型別（70+ 欄位） | public API |
| `SessionOrigin` / `SessionAcpIdentity` / `SessionAcpMeta` | types | session 來源/ACP 型別 | public API |
| `normalizeSessionRuntimeModelFields` | `(entry) => SessionEntry` | 正規化 runtime model 欄位 | public API |
| `setSessionRuntimeModel` | `(entry, model) => SessionEntry` | 設定 runtime model | public API |
| `mergeSessionEntry` / `mergeSessionEntryWithPolicy` / `mergeSessionEntryPreserveActivity` | merge functions | session entry 合併策略 | public API |
| `resolveFreshSessionTotalTokens` / `isSessionTotalTokensFresh` | token functions | session token 新鮮度 | public API |
| `GroupKeyResolution` / `SessionSkillSnapshot` / `SessionSystemPromptReport` | types | session 子型別 | public API |
| `DEFAULT_RESET_TRIGGER(S)` / `DEFAULT_IDLE_MINUTES` | constants | session 預設常數 | public API |

#### `sessions/store.ts`（883 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `normalizeStoreSessionKey` | `(sessionKey) => string` | 正規化 session key | public API |
| `resolveSessionStoreEntry` | `(params) => SessionEntry \| undefined` | 查找 session entry | public API |
| `loadSessionStore` | `(params) => Record<string, SessionEntry>` | 載入 session store | public API |
| `readSessionUpdatedAt` | `(params) => number \| undefined` | 讀取 session 更新時間 | public API |
| `saveSessionStore` | `(params) => Promise<void>` | 儲存 session store | public API |
| `updateSessionStore<T>` | `(params) => Promise<T>` | 原子更新 session store（with lock） | public API |
| `archiveRemovedSessionTranscripts` | `(params) => void` | 歸檔已移除 session transcripts | public API |
| `updateSessionStoreEntry` | `(params) => Promise<void>` | 更新單一 session entry | public API |
| `recordSessionMetaFromInbound` | `(params) => Promise<void>` | 從 inbound 記錄 session metadata | public API |
| `updateLastRoute` | `(params) => Promise<void>` | 更新 last route 資訊 | public API |

#### `sessions/paths.ts`（329 行）

| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `resolveSessionTranscriptsDir` / `resolveSessionTranscriptsDirForAgent` | path resolvers | session transcripts 目錄 | public API |
| `resolveDefaultSessionStorePath` | `(agentId?) => string` | 預設 session store 路徑 | public API |
| `SAFE_SESSION_ID_RE` | RegExp | 安全 session ID 正則 | public API |
| `validateSessionId` | `(sessionId) => string` | 驗證 session ID | public API |
| `resolveSessionTranscriptPath` / `resolveSessionFilePath` / `resolveStorePath` | path resolvers | 各種 session path 解析 | public API |
| `resolveAgentsDirFromSessionStorePath` | `(storePath) => string \| undefined` | 從 store path 反推 agents dir | public API |

#### 其他 sessions/ 檔案摘要

| 檔案 | 主要 Export | 說明 |
|------|------------|------|
| `store-cache.ts` | `clearSessionStoreCaches()`, `readSessionStoreCache()`, `writeSessionStoreCache()` | session store 快取管理 |
| `store-maintenance.ts` | `resolveMaintenanceConfig()`, `pruneStaleEntries()`, `capEntryCount()`, `rotateSessionFile()` | session store 維護 |
| `store-migrations.ts` | `applySessionStoreMigrations()` | session store migration |
| `targets.ts` | `resolveAllAgentSessionStoreTargets()`, `resolveSessionStoreTargets()` | multi-agent session store 目標解析 |
| `disk-budget.ts` | `enforceSessionDiskBudget()` | session disk budget 管理 |
| `transcript.ts` | `resolveSessionTranscriptFile()`, `appendAssistantMessageToSessionTranscript()` | session transcript 讀寫 |
| `reset.ts` | `resolveSessionResetPolicy()`, `evaluateSessionFreshness()`, `resolveChannelResetConfig()` | session reset policy |
| `metadata.ts` | `deriveSessionOrigin()`, `deriveSessionMetaPatch()`, `deriveGroupSessionPatch()` | session metadata 推導 |
| `group.ts` | `buildGroupDisplayName()`, `resolveGroupSessionKey()` | group session key 建構 |
| `main-session.ts` | `resolveMainSessionKey()`, `resolveAgentMainSessionKey()`, `canonicalizeMainSessionAlias()` | main session key 解析 |
| `session-key.ts` | `deriveSessionKey()`, `resolveSessionKey()` | session key 推導 |
| `session-file.ts` | `resolveAndPersistSessionFile()` | session file 寫入 |
| `artifacts.ts` | `isSessionArchiveArtifactName()`, `formatSessionArchiveTimestamp()`, `parseSessionArchiveTimestamp()` | session archive artifact 判斷 |
| `delivery-info.ts` | `parseSessionThreadInfo()`, `extractDeliveryInfo()` | delivery info 提取 |
| `explicit-session-key-normalization.ts` | `normalizeExplicitSessionKey()` | 顯式 session key 正規化 |

## 呼叫關聯圖

```
loadConfig() ─────────────────────────────────────────────────┐
  ├─ getRuntimeConfigSnapshot() → 有則直接回傳               │
  ├─ createConfigIO()                                         │
  │    ├─ resolveConfigPath() / resolveDefaultConfigCandidates() ← paths.ts
  │    └─ .loadConfig()                                       │
  │         ├─ maybeLoadDotEnvForConfig()                     │
  │         ├─ resolveConfigIncludes() ← includes.ts          │
  │         ├─ resolveConfigForRead()                         │
  │         │    ├─ applyConfigEnvVars() ← env-vars.ts        │
  │         │    └─ resolveConfigEnvVars() ← env-substitution.ts
  │         ├─ findDuplicateAgentDirs() ← agent-dirs.ts       │
  │         ├─ validateConfigObjectWithPlugins() ← validation.ts
  │         │    ├─ validateConfigObject()                    │
  │         │    │    ├─ validateConfigObjectRaw()             │
  │         │    │    │    ├─ findLegacyConfigIssues() ← legacy.ts
  │         │    │    │    └─ OpenClawSchema.safeParse() ← zod-schema.ts
  │         │    │    └─ applyModelDefaults/AgentDefaults/SessionDefaults ← defaults.ts
  │         │    └─ loadPluginManifestRegistry() (plugin 驗證) │
  │         ├─ applyMessageDefaults() ← defaults.ts           │
  │         ├─ applySessionDefaults()                         │
  │         ├─ applyLoggingDefaults()                         │
  │         ├─ applyAgentDefaults()                           │
  │         ├─ applyContextPruningDefaults()                  │
  │         ├─ applyCompactionDefaults()                      │
  │         ├─ applyModelDefaults()                           │
  │         ├─ applyTalkConfigNormalization() → talk.ts        │
  │         ├─ normalizeConfigPaths() ← normalize-paths.ts    │
  │         ├─ normalizeExecSafeBinProfilesInConfig()         │
  │         ├─ applyConfigEnvVars()                           │
  │         ├─ ensureOwnerDisplaySecret()                     │
  │         └─ applyConfigOverrides() ← runtime-overrides.ts  │
  └─ config 快取 (200ms TTL)                                  │
                                                               │
writeConfigFile() ────────────────────────────────────────────┘
  ├─ projectConfigOntoRuntimeSourceSnapshot() (merge-patch)
  ├─ createConfigIO().writeConfigFile()
  │    ├─ readConfigFileSnapshotInternal() (讀取目前 config)
  │    ├─ createMergePatch() → applyMergePatch() ← merge-patch.ts
  │    ├─ restoreEnvVarRefs() ← env-preserve.ts
  │    ├─ validateConfigObjectRawWithPlugins() ← validation.ts
  │    ├─ maintainConfigBackups() ← backup-rotation.ts
  │    └─ atomic write (tmp → rename/copyFile fallback)
  └─ runtimeConfigSnapshotRefreshHandler.refresh()

buildConfigSchema() ← schema.ts
  ├─ OpenClawSchema.toJSONSchema() ← zod-schema.ts
  ├─ buildBaseHints() ← schema.hints.ts
  │    ├─ FIELD_LABELS ← schema.labels.ts
  │    └─ FIELD_HELP ← schema.help.ts
  ├─ mapSensitivePaths() (Zod sensitive registry)
  ├─ applyDerivedTags() ← schema.tags.ts
  ├─ applyPluginSchemas/Hints() (plugin UI metadata)
  └─ applyChannelSchemas/Hints() (channel UI metadata)

Session Store 呼叫鏈:
  updateSessionStore()
  ├─ acquireSessionWriteLock()
  ├─ loadSessionStore()
  │    ├─ readSessionStoreCache() ← store-cache.ts
  │    └─ applySessionStoreMigrations() ← store-migrations.ts
  ├─ user callback
  ├─ pruneStaleEntries() / capEntryCount() ← store-maintenance.ts
  └─ saveSessionStore()
       └─ writeSessionStoreCache()
```

## 系統歸屬分類

| 分類 | 檔案群 | 說明 |
|------|--------|------|
| **Config I/O 核心** | `io.ts`, `config.ts` | 讀取/寫入/快取/runtime snapshot 管理 |
| **Schema 定義** | `zod-schema*.ts` (14 檔) | Zod schema 定義（~4,900 行） |
| **Schema UI** | `schema.ts`, `schema.help.ts`, `schema.hints.ts`, `schema.labels.ts`, `schema.tags.ts`, `schema.irc.ts` | JSON Schema 生成 + UI hints/labels/help |
| **型別定義** | `types*.ts` (31 檔) | TypeScript 型別（~4,600 行） |
| **驗證** | `validation.ts`, `allowed-values.ts`, `issue-format.ts` | Config 驗證 + 格式化 |
| **預設值** | `defaults.ts`, `agent-limits.ts`, `port-defaults.ts`, `talk-defaults.ts` | 執行期預設值套用 |
| **路徑解析** | `paths.ts`, `config-paths.ts`, `normalize-paths.ts` | State dir / config path 解析 |
| **環境變數** | `env-substitution.ts`, `env-preserve.ts`, `env-vars.ts` | ${VAR} 替換/還原/套用 |
| **Include** | `includes.ts`, `includes-scan.ts` | $include 指令 |
| **Merge/Patch** | `merge-patch.ts`, `merge-config.ts`, `runtime-overrides.ts` | Config 合併與覆蓋 |
| **Legacy Migration** | `legacy*.ts` (7 檔) | Legacy config 偵測/遷移（~2,500 行） |
| **安全/Redaction** | `redact-snapshot*.ts`, `prototype-keys.ts` | Sensitive 值遮蔽 |
| **Policy** | `group-policy.ts`, `runtime-group-policy.ts`, `commands.ts`, `bindings.ts` | 群組/命令/binding policy 解析 |
| **Session Store** | `sessions/*.ts` (16 檔) | Session 管理全棧（~4,000 行） |
| **Plugin/Channel** | `plugin-auto-enable.ts`, `plugins-allowlist.ts`, `channel-capabilities.ts`, `dangerous-name-matching.ts` | Plugin/Channel 運行期邏輯 |
| **Streaming/UI** | `discord-preview-streaming.ts`, `markdown-tables.ts`, `gateway-control-ui-origins.ts` | 各 channel streaming mode + UI |
| **Talk/TTS** | `talk.ts`, `talk-defaults.ts` | 語音 config 管理 |
| **文件生成** | `doc-baseline.ts`, `media-audio-field-metadata.ts` | Config 文件 baseline |
| **備份** | `backup-rotation.ts` | Config 備份輪轉 |
| **工具** | `byte-size.ts`, `cache-utils.ts`, `version.ts`, `model-input.ts`, `telegram-custom-commands.ts`, `logging.ts` | 雜項工具 |
| **測試** | `test-helpers.ts` | 測試輔助函式 |
