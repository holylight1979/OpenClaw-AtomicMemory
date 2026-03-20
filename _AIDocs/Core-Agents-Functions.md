# Core: Agents — 函式級索引

> Phase 2 deep read (2026-03-20). 涵蓋 `src/agents/` 全部非 test 檔案（~408 檔）。

## 總覽

`src/agents/` 是 OpenClaw 的核心 AI 代理引擎，負責管理 LLM 對話生命週期、模型選擇與認證、工具系統、sandbox 隔離執行，以及多 agent 協作（subagent / ACP spawn）。整個子系統圍繞「嵌入式 PI agent runner」運轉——將使用者訊息送入 LLM、處理串流回應、執行工具呼叫、管理上下文窗口壓縮，並將結果回報至 channel。

架構分為三大支柱：(1) **Runner 核心**（`pi-embedded-runner/`）處理單次 agent run 的完整生命週期——模型解析、API 串流、failover、compaction、tool 執行；(2) **Tool 系統**（`tools/` + `pi-tools.*`）定義並包裝所有可用工具（bash exec、web search/fetch、image/PDF 分析、browser 操控、messaging、session 管理等）；(3) **多 Agent 系統**（`subagent-*` + `acp-spawn.*`）管理子代理的生成、註冊、生命週期、通信與清理。

外圍子系統包括：auth-profiles（多 provider 認證與 OAuth 管理）、sandbox（Docker 容器隔離執行）、skills（技能檔案載入與管理）、models-config（多 provider 模型定義與發現）、bootstrap（工作區啟動檔載入）、context/compaction（上下文窗口管理與壓縮）。

## 子系統分類

| 子系統 | 目錄 | 檔案數 | 角色 |
|--------|------|--------|------|
| Root-level Core | `agents/` (root) | ~170 | Agent 生命週期、模型選擇、認證、工具政策、上下文管理、workspace 等核心模組 |
| PI Embedded Runner | `pi-embedded-runner/` + `run/` | ~40 | 嵌入式 LLM agent 執行引擎核心（run loop、attempt、compaction、stream wrapper） |
| PI Embedded Subscribe | `pi-embedded-subscribe.*` | ~10 | Agent 串流事件訂閱與處理（message/tool/lifecycle handler） |
| PI Embedded Helpers | `pi-embedded-helpers/` | ~10 | 輔助函式（error 分類、bootstrap、turn 驗證、image 處理） |
| PI Extensions | `pi-extensions/` | ~8 | Agent session extension（compaction safeguard、context pruning） |
| Tools | `tools/` | ~45 | 所有 agent 可用工具定義（exec/web/image/PDF/browser/messaging/session/gateway 等） |
| Auth Profiles | `auth-profiles/` | ~14 | 多 provider API key/OAuth 認證管理、profile 排序與健康檢查 |
| Sandbox | `sandbox/` | ~30 | Docker sandbox 容器管理、filesystem bridge、安全驗證 |
| Skills | `skills/` | ~12 | Workspace skill 載入、frontmatter 解析、環境變數覆蓋 |
| Schema | `schema/` | 3 | 工具 schema 清理（Gemini/xAI 相容）與 TypeBox helpers |
| Models Config | `models-config.*` | ~6 | 多 provider 模型 JSON 生成與合併 |
| Subagent System | `subagent-*` | ~15 | 子代理生成、註冊、控制、通信、生命週期管理 |
| CLI Runner | `cli-runner/` | 2 | CLI backend agent 執行輔助 |

---

## 函式索引

### Root-level — Agent 設定與路徑

#### agent-paths.ts
| Export | 說明 |
|--------|------|
| `resolveOpenClawAgentDir(): string` | 解析 agent 狀態目錄路徑（支援 env override） |
| `ensureOpenClawAgentEnv(): string` | 確保 agent dir env var 已設定並回傳路徑 |

#### agent-scope.ts
| Export | 說明 |
|--------|------|
| `listAgentEntries(cfg): AgentEntry[]` | 從 config 列出所有 agent 設定條目 |
| `listAgentIds(cfg): string[]` | 列出所有 agent ID（正規化後） |
| `resolveDefaultAgentId(cfg): string` | 解析預設 agent ID |
| `resolveSessionAgentIds(params): { defaultAgentId, sessionAgentId }` | 從 session key 解析 agent ID pair |
| `resolveSessionAgentId(params): string` | 從 session key 解析單一 agent ID |
| `resolveAgentConfig(cfg, agentId): ResolvedAgentConfig \| undefined` | 解析 agent 完整設定 |
| `resolveAgentSkillsFilter(cfg, agentId): string[] \| undefined` | 取得 agent skills 過濾清單 |
| `resolveAgentExplicitModelPrimary(cfg, agentId): string \| undefined` | 取得 agent 明確設定的主要模型 |
| `resolveAgentEffectiveModelPrimary(cfg, agentId): string \| undefined` | 取得 agent 有效主要模型（含 defaults fallback） |
| `resolveAgentModelPrimary(cfg, agentId): string \| undefined` | 向下相容 alias → resolveAgentExplicitModelPrimary |
| `resolveAgentModelFallbacksOverride(cfg, agentId): string[] \| undefined` | 取得 agent 模型 fallback 覆蓋清單 |
| `resolveFallbackAgentId(params): string` | 從 agentId 或 sessionKey 解析 fallback agent ID |
| `resolveRunModelFallbacksOverride(params): string[] \| undefined` | 解析 run 層級 model fallback override |
| `hasConfiguredModelFallbacks(params): boolean` | 檢查是否有設定 model fallbacks |
| `resolveEffectiveModelFallbacks(params): string[] \| undefined` | 解析有效 model fallback 清單 |
| `resolveAgentWorkspaceDir(cfg, agentId): string` | 解析 agent workspace 目錄 |
| `resolveAgentIdsByWorkspacePath(cfg, path): string[]` | 由 workspace path 反查匹配的 agent IDs |
| `resolveAgentIdByWorkspacePath(cfg, path): string \| undefined` | 由 workspace path 反查最佳匹配 agent ID |
| `resolveAgentDir(cfg, agentId): string` | 解析 agent state 目錄 |
| type `ResolvedAgentConfig` | Agent 完整設定型別 |

#### workspace.ts
| Export | 說明 |
|--------|------|
| `resolveDefaultAgentWorkspaceDir(env?): string` | 解析預設 workspace 目錄 |
| `DEFAULT_AGENT_WORKSPACE_DIR` | 預設 workspace 路徑常數 |
| `DEFAULT_AGENTS_FILENAME` / `DEFAULT_SOUL_FILENAME` / ... | 各種預設檔案名稱常數 |
| type `WorkspaceBootstrapFile` | Bootstrap 檔案資料結構 |
| `isWorkspaceOnboardingCompleted(dir): Promise<boolean>` | 檢查 workspace onboarding 是否完成 |
| `ensureAgentWorkspace(params?): Promise<...>` | 確保 agent workspace 已建立 |
| `loadWorkspaceBootstrapFiles(dir): Promise<WorkspaceBootstrapFile[]>` | 載入 workspace bootstrap 檔案 |
| `filterBootstrapFilesForSession(files, params): WorkspaceBootstrapFile[]` | 依 session 過濾 bootstrap 檔 |
| `loadExtraBootstrapFiles(params): Promise<...>` | 載入額外 bootstrap 檔案 |
| `loadExtraBootstrapFilesWithDiagnostics(params): Promise<...>` | 載入額外 bootstrap 檔案（含診斷） |

#### workspace-dir.ts
| Export | 說明 |
|--------|------|
| `normalizeWorkspaceDir(dir?): string \| null` | 正規化 workspace 目錄路徑 |
| `resolveWorkspaceRoot(dir?): string` | 解析 workspace root 路徑 |

#### workspace-dirs.ts
| Export | 說明 |
|--------|------|
| `listAgentWorkspaceDirs(cfg): string[]` | 列出所有 agent workspace 目錄 |

#### workspace-run.ts
| Export | 說明 |
|--------|------|
| `redactRunIdentifier(value): string` | 遮蔽 run identifier 用於 log |
| `resolveRunWorkspaceDir(params): ResolveRunWorkspaceResult` | **[Entry Point]** 解析 run 的 workspace 目錄 |
| type `WorkspaceFallbackReason` / `ResolveRunWorkspaceResult` | Run workspace 解析結果型別 |

#### workspace-templates.ts
| Export | 說明 |
|--------|------|
| `resolveWorkspaceTemplateDir(opts?): Promise<string>` | 解析 workspace template 目錄路徑 |
| `resetWorkspaceTemplateDirCache()` | 清除 template dir cache |

#### defaults.ts
| Export | 說明 |
|--------|------|
| `DEFAULT_PROVIDER = "anthropic"` | 預設 provider |
| `DEFAULT_MODEL = "claude-opus-4-6"` | 預設模型 |
| `DEFAULT_CONTEXT_TOKENS = 200_000` | 預設上下文 token 數 |

---

### Root-level — 上下文窗口與 Compaction

#### context.ts
| Export | 說明 |
|--------|------|
| `ANTHROPIC_CONTEXT_1M_TOKENS` | 1M token 上下文常數 |
| `applyDiscoveredContextWindows(params)` | 將模型發現結果寫入上下文窗口 cache |
| `applyConfiguredContextWindows(params)` | 將 config 設定寫入上下文窗口 cache |
| `lookupContextTokens(modelId?): number \| undefined` | 查詢模型上下文窗口 token 數 |
| `resolveContextTokensForModel(params): number \| undefined` | **[Key API]** 解析模型有效上下文 token 數（含 config override、discovery、cache） |

#### context-window-guard.ts
| Export | 說明 |
|--------|------|
| `CONTEXT_WINDOW_HARD_MIN_TOKENS = 16_000` | 上下文窗口硬性最低值 |
| `resolveContextWindowInfo(params): ContextWindowInfo` | 解析上下文窗口資訊（含來源） |
| `evaluateContextWindowGuard(params): ContextWindowGuardResult` | 評估上下文窗口是否安全 |
| type `ContextWindowSource` / `ContextWindowInfo` / `ContextWindowGuardResult` | 相關型別 |

#### compaction.ts
| Export | 說明 |
|--------|------|
| `BASE_CHUNK_RATIO` / `MIN_CHUNK_RATIO` / `SAFETY_MARGIN` | Compaction 常數 |
| `buildCompactionSummarizationInstructions(params): CompactionSummarizationInstructions` | 建構 compaction 摘要指令 |
| `estimateMessagesTokens(messages): number` | 估算訊息 token 數 |
| `splitMessagesByTokenShare(messages, ratio): [AgentMessage[], AgentMessage[]]` | 按 token 比例切分訊息 |
| `chunkMessagesByMaxTokens(messages, max): AgentMessage[][]` | 按最大 token 數切分訊息 |
| `computeAdaptiveChunkRatio(messages, contextWindow): number` | 計算自適應 chunk ratio |
| `isOversizedForSummary(msg, contextWindow): boolean` | 判斷訊息是否超大 |
| `summarizeWithFallback(params): Promise<...>` | 帶 fallback 的摘要生成 |
| `summarizeInStages(params): Promise<...>` | 分階段摘要 |
| `pruneHistoryForContextShare(params): ...` | 修剪歷史以分享上下文 |
| `resolveContextWindowTokens(model?): number` | 解析上下文窗口 token 數 |

---

### Root-level — 模型選擇與認證

#### model-selection.ts
| Export | 說明 |
|--------|------|
| type `ModelRef` / `ThinkLevel` / `ModelAliasIndex` | 模型參考與 thinking 層級型別 |
| `modelKey(provider, model): string` | 建構 provider/model key |
| `normalizeProviderId(provider): string` | **[Key API]** 正規化 provider ID（含 alias 展開） |
| `normalizeProviderIdForAuth(provider): string` | 正規化 provider ID 用於認證 |
| `isCliProvider(provider, cfg?): boolean` | 判斷是否為 CLI provider |
| `normalizeModelRef(provider, model): ModelRef` | 正規化 model ref |
| `parseModelRef(raw, defaultProvider): ModelRef \| null` | 解析 model ref 字串 |
| `resolveModelRefFromString(params): ModelRef` | 從字串解析 model ref |
| `resolveConfiguredModelRef(params): ModelRef` | 從設定解析 model ref |
| `resolveDefaultModelForAgent(params): ModelRef` | **[Key API]** 解析 agent 預設模型 |
| `buildAllowedModelSet(params): Set<string>` | 建構允許的模型集合 |
| `getModelRefStatus(params): ModelRefStatus` | 取得 model ref 狀態 |
| `resolveAllowedModelRef(params): ModelRef` | 解析允許的 model ref |
| `resolveThinkingDefault(params): ThinkLevel` | 解析 thinking 預設值 |
| `resolveReasoningDefault(params): ...` | 解析 reasoning 預設值 |
| `resolveHooksGmailModel(params): string` | 解析 hooks Gmail 模型 |

#### model-auth.ts
| Export | 說明 |
|--------|------|
| `getCustomProviderApiKey(provider): string \| undefined` | 取得自訂 provider API key |
| `resolveUsableCustomProviderApiKey(params): string \| undefined` | 解析可用的自訂 API key |
| `resolveAwsSdkEnvVarName(env?): string \| undefined` | 解析 AWS SDK env var 名稱 |
| `resolveApiKeyForProvider(params): Promise<ResolvedProviderAuth>` | **[Key API]** 解析 provider 的 API key（含 auth profile 輪替） |
| `resolveEnvApiKey(provider): EnvApiKeyResult \| undefined` | 從 env 解析 API key |
| `resolveModelAuthMode(provider): ModelAuthMode` | 解析模型認證模式 |
| `getApiKeyForModel(params): Promise<...>` | 取得模型的 API key |
| `requireApiKey(auth, provider): string` | 取得 API key 或拋出錯誤 |
| `applyLocalNoAuthHeaderOverride(model): Model` | 對本地模型套用 no-auth header |
| type `ResolvedProviderAuth` / `EnvApiKeyResult` / `ModelAuthMode` | 認證相關型別 |

#### model-catalog.ts
| Export | 說明 |
|--------|------|
| type `ModelInputType` / `ModelCatalogEntry` | 模型目錄型別 |
| `loadModelCatalog(params?): Promise<ModelCatalogEntry[]>` | 載入模型目錄 |
| `modelSupportsVision(entry): boolean` | 判斷模型是否支援視覺 |
| `modelSupportsDocument(entry): boolean` | 判斷模型是否支援文件 |
| `findModelInCatalog(catalog, provider, model): ModelCatalogEntry \| undefined` | 在目錄中查找模型 |

#### model-fallback.ts
| Export | 說明 |
|--------|------|
| `runWithModelFallback<T>(params): Promise<T>` | **[Key API]** 帶模型 fallback 的執行（自動切換失敗模型） |
| `runWithImageModelFallback<T>(params): Promise<T>` | 帶 fallback 的 image 模型執行 |
| type `ModelFallbackRunOptions` | Fallback 執行選項 |

#### model-forward-compat.ts
| Export | 說明 |
|--------|------|
| `resolveForwardCompatModel(params): ...` | 解析向前相容的模型 ID |

#### model-compat.ts
| Export | 說明 |
|--------|------|
| `normalizeModelCompat(model): Model` | 正規化模型相容性設定 |

#### model-scan.ts
| Export | 說明 |
|--------|------|
| `scanOpenRouterModels(params): Promise<ModelScanResult>` | 掃描 OpenRouter 可用模型 |
| type `ProbeResult` / `ModelScanResult` | 掃描結果型別 |

#### model-suppression.ts
| Export | 說明 |
|--------|------|
| `shouldSuppressBuiltInModel(params): boolean` | 判斷是否應隱藏內建模型 |
| `buildSuppressedBuiltInModelError(params): string` | 建構隱藏模型錯誤訊息 |

#### model-tool-support.ts
| Export | 說明 |
|--------|------|
| `supportsModelTools(model): boolean` | 判斷模型是否支援 tools |

#### model-alias-lines.ts
| Export | 說明 |
|--------|------|
| `buildModelAliasLines(cfg?): string[]` | 建構模型 alias 顯示行 |

#### model-ref-profile.ts
| Export | 說明 |
|--------|------|
| `splitTrailingAuthProfile(raw): { model, profile? }` | 分離 model ref 尾部的 auth profile |

#### model-fallback-observation.ts
| Export | 說明 |
|--------|------|
| `logModelFallbackDecision(params)` | 記錄 model fallback 決策 |

#### model-auth-env-vars.ts
| Export | 說明 |
|--------|------|
| `PROVIDER_ENV_API_KEY_CANDIDATES` | Provider → env var 名稱對應表 |
| `listKnownProviderEnvApiKeyNames(): string[]` | 列出所有已知 API key env var 名稱 |

#### model-auth-markers.ts
| Export | 說明 |
|--------|------|
| `MINIMAX_OAUTH_MARKER` / `QWEN_OAUTH_MARKER` / `OLLAMA_LOCAL_AUTH_MARKER` / ... | 各種認證 marker 常數 |
| `isAwsSdkAuthMarker(value): boolean` | 判斷是否為 AWS SDK auth marker |
| `isKnownEnvApiKeyMarker(value): boolean` | 判斷是否為已知 env API key marker |
| `isSecretRefHeaderValueMarker(value): boolean` | 判斷是否為 SecretRef header marker |

#### model-auth-label.ts
| Export | 說明 |
|--------|------|
| `resolveModelAuthLabel(params): string` | 解析模型認證標籤（用於顯示） |

#### failover-error.ts
| Export | 說明 |
|--------|------|
| `class FailoverError extends Error` | Failover 錯誤類別（含 reason + status） |
| `isFailoverError(err): err is FailoverError` | 型別守衛 |
| `resolveFailoverStatus(reason): number \| undefined` | 將 failover reason 映射到 HTTP status |
| `isTimeoutError(err): boolean` | 判斷是否為 timeout 錯誤 |
| `resolveFailoverReasonFromError(err): FailoverReason \| null` | 從任意錯誤解析 failover reason |
| `describeFailoverError(err): { reason, status }` | 描述 failover 錯誤 |
| `coerceToFailoverError(err): FailoverError` | 將任意錯誤轉換為 FailoverError |

---

### Root-level — API Key 與 Provider

#### api-key-rotation.ts
| Export | 說明 |
|--------|------|
| `collectProviderApiKeysForExecution(params): string[]` | 收集 provider 可用 API keys |
| `executeWithApiKeyRotation<T>(params): Promise<T>` | 帶 API key 輪替的執行 |

#### live-auth-keys.ts
| Export | 說明 |
|--------|------|
| `collectProviderApiKeys(provider): string[]` | 從 env 收集 provider API keys |
| `collectAnthropicApiKeys(): string[]` | 收集 Anthropic API keys |
| `isApiKeyRateLimitError(message): boolean` | 判斷是否為 API key rate limit 錯誤 |
| `isAnthropicRateLimitError(message): boolean` | 判斷是否為 Anthropic rate limit 錯誤 |
| `isAnthropicBillingError(message): boolean` | 判斷是否為 Anthropic billing 錯誤 |

#### cli-credentials.ts
| Export | 說明 |
|--------|------|
| `readClaudeCliCredentials(opts?): ClaudeCliCredential[]` | 讀取 Claude CLI 憑證 |
| `readClaudeCliCredentialsCached(opts?): ClaudeCliCredential[]` | 讀取 Claude CLI 憑證（快取版） |
| `writeClaudeCliCredentials(creds): void` | 寫入 Claude CLI 憑證 |
| `readCodexCliCredentialsCached(opts?): CodexCliCredential[]` | 讀取 Codex CLI 憑證（快取） |
| `readQwenCliCredentialsCached(opts?): ...` | 讀取 Qwen CLI 憑證（快取） |
| `readMiniMaxCliCredentialsCached(opts?): ...` | 讀取 MiniMax CLI 憑證（快取） |
| type `ClaudeCliCredential` / `CodexCliCredential` / `QwenCliCredential` / `MiniMaxCliCredential` | 憑證型別 |

#### pi-auth-credentials.ts
| Export | 說明 |
|--------|------|
| `convertAuthProfileCredentialToPi(cred): PiCredential \| null` | 將 auth profile credential 轉換為 PI 格式 |
| `resolvePiCredentialMapFromStore(store): PiCredentialMap` | 從 auth store 解析 PI credential map |
| `piCredentialsEqual(a, b): boolean` | 比較兩個 PI credential 是否相等 |

#### pi-auth-json.ts
| Export | 說明 |
|--------|------|
| `ensurePiAuthJsonFromAuthProfiles(agentDir): Promise<...>` | 確保 PI auth.json 從 auth profiles 同步 |

#### chutes-oauth.ts
| Export | 說明 |
|--------|------|
| `generateChutesPkce(): ChutesPkce` | 生成 Chutes PKCE 驗證 |
| `parseOAuthCallbackInput(input): ...` | 解析 OAuth callback 輸入 |
| `fetchChutesUserInfo(params): Promise<ChutesUserInfo>` | 取得 Chutes 使用者資訊 |
| `exchangeChutesCodeForTokens(params): Promise<...>` | 交換 Chutes auth code 為 token |
| `refreshChutesTokens(params): Promise<...>` | 刷新 Chutes token |

---

### Root-level — 模型 Provider 定義

#### ollama-models.ts / ollama-stream.ts
| Export | 說明 |
|--------|------|
| `resolveOllamaApiBase(url?): string` | 解析 Ollama API base URL |
| `fetchOllamaModels(params): Promise<...>` | 取得 Ollama 可用模型 |
| `buildOllamaModelDefinition(entry): ModelDefinitionConfig` | 建構 Ollama 模型定義 |
| `createOllamaStreamFn(params): StreamFn` | 建立 Ollama 串流函式 |
| `convertToOllamaMessages(messages): ...` | 轉換訊息為 Ollama 格式 |
| `createConfiguredOllamaStreamFn(params): StreamFn` | 建立設定好的 Ollama 串流函式 |

#### openai-ws-connection.ts / openai-ws-stream.ts
| Export | 說明 |
|--------|------|
| `class OpenAIWebSocketManager extends EventEmitter` | OpenAI WebSocket 連線管理器 |
| `createOpenAIWebSocketStreamFn(params): StreamFn` | 建立 OpenAI WebSocket 串流函式 |
| `convertTools(tools): FunctionToolDefinition[]` | 轉換工具定義為 OpenAI 格式 |
| `convertMessagesToInputItems(messages): InputItem[]` | 轉換訊息為 OpenAI input items |
| `releaseWsSession(sessionId)` | 釋放 WebSocket session |
| 大量 event type definitions | OpenAI WebSocket 事件型別定義 |

#### doubao-models.ts / byteplus-models.ts / volc-models.shared.ts
| Export | 說明 |
|--------|------|
| `buildDoubaoModelDefinition(entry): ModelDefinitionConfig` | 建構 Doubao 模型定義 |
| `buildBytePlusModelDefinition(entry): ModelDefinitionConfig` | 建構 BytePlus 模型定義 |
| `buildVolcModelDefinition(entry): ModelDefinitionConfig` | 建構 Volc 模型定義 |
| 各種 `*_MODEL_CATALOG` / `*_BASE_URL` / `*_DEFAULT_*` 常數 | Provider 常數 |

#### venice-models.ts
| Export | 說明 |
|--------|------|
| `buildVeniceModelDefinition(entry): ModelDefinitionConfig` | 建構 Venice 模型定義 |
| `discoverVeniceModels(): Promise<ModelDefinitionConfig[]>` | 動態發現 Venice 模型 |

#### huggingface-models.ts
| Export | 說明 |
|--------|------|
| `buildHuggingfaceModelDefinition(entry): ModelDefinitionConfig` | 建構 HuggingFace 模型定義 |
| `discoverHuggingfaceModels(apiKey): Promise<ModelDefinitionConfig[]>` | 動態發現 HuggingFace 模型 |

#### together-models.ts / synthetic-models.ts / kilocode-models.ts / opencode-zen-models.ts
| Export | 說明 |
|--------|------|
| `buildTogetherModelDefinition(entry): ModelDefinitionConfig` | 建構 Together 模型定義 |
| `buildSyntheticModelDefinition(entry): ModelDefinitionConfig` | 建構 Synthetic 模型定義 |
| `discoverKilocodeModels(): Promise<ModelDefinitionConfig[]>` | 發現 Kilocode 模型 |
| `fetchOpencodeZenModels(apiKey?): Promise<ModelDefinitionConfig[]>` | 取得 Opencode Zen 模型 |

#### cloudflare-ai-gateway.ts / vercel-ai-gateway.ts
| Export | 說明 |
|--------|------|
| `buildCloudflareAiGatewayModelDefinition(params?): ModelDefinitionConfig` | 建構 Cloudflare AI Gateway 模型定義 |
| `resolveCloudflareAiGatewayBaseUrl(params): string` | 解析 Cloudflare AI Gateway base URL |
| `getStaticVercelAiGatewayModelCatalog(): ModelDefinitionConfig[]` | 取得 Vercel AI Gateway 靜態模型目錄 |
| `discoverVercelAiGatewayModels(): Promise<ModelDefinitionConfig[]>` | 發現 Vercel AI Gateway 模型 |

#### bedrock-discovery.ts
| Export | 說明 |
|--------|------|
| `discoverBedrockModels(params): Promise<...>` | 發現 AWS Bedrock 模型 |

---

### Root-level — Models Config

#### models-config.ts
| Export | 說明 |
|--------|------|
| `ensureOpenClawModelsJson(cfg): Promise<void>` | **[Key API]** 確保 models.json 已生成（含所有 provider 發現/合併） |

#### models-config.merge.ts
| Export | 說明 |
|--------|------|
| `mergeProviderModels(existing, incoming): ...` | 合併 provider 模型定義 |
| `mergeProviders(params): ...` | 合併 provider 設定 |
| `mergeWithExistingProviderSecrets(params): ...` | 合併 provider secrets |

#### models-config.plan.ts
| Export | 說明 |
|--------|------|
| `planOpenClawModelsJson(params): Promise<ModelsJsonPlan>` | 規劃 models.json 生成方案 |

#### models-config.providers.ts
| Export | 說明 |
|--------|------|
| `normalizeGoogleModelId(id): string` | 正規化 Google model ID |
| `normalizeAntigravityModelId(id): string` | 正規化 Antigravity model ID |
| `enforceSourceManagedProviderSecrets(params)` | 強制 source-managed provider secrets |
| `normalizeProviders(params)` | 正規化所有 provider 設定 |
| `resolveImplicitProviders(env): Promise<ProviderConfig[]>` | **[Key API]** 解析隱含 provider（從 env/credential 自動偵測） |
| `resolveImplicitCopilotProvider(params): Promise<...>` | 解析隱含 Copilot provider |
| `resolveImplicitBedrockProvider(params): Promise<...>` | 解析隱含 Bedrock provider |

#### models-config.providers.static.ts
| Export | 說明 |
|--------|------|
| `buildMinimaxProvider()` / `buildMoonshotProvider()` / `buildQwenPortalProvider()` / ... | 各種靜態 provider 建構函式（共 ~20 個 provider） |

#### models-config.providers.discovery.ts
| Export | 說明 |
|--------|------|
| `buildVeniceProvider(): Promise<ProviderConfig>` | 建構 Venice provider（含動態發現） |
| `buildOllamaProvider(params): Promise<ProviderConfig>` | 建構 Ollama provider |
| `buildHuggingfaceProvider(key?): Promise<ProviderConfig>` | 建構 HuggingFace provider |
| `buildVercelAiGatewayProvider(): Promise<ProviderConfig>` | 建構 Vercel AI Gateway provider |
| `buildVllmProvider(params?): Promise<ProviderConfig>` | 建構 vLLM provider |
| `buildSglangProvider(params?): Promise<ProviderConfig>` | 建構 SGLang provider |
| `buildKilocodeProviderWithDiscovery(): Promise<ProviderConfig>` | 建構 Kilocode provider（含發現） |

---

### Root-level — Bash 工具

#### bash-tools.ts (barrel)
| Export | 說明 |
|--------|------|
| `createExecTool()` / `execTool` | Bash exec 工具（執行命令） |
| `createProcessTool()` / `processTool` | Bash process 工具（管理背景程序） |

#### bash-tools.exec.ts
| Export | 說明 |
|--------|------|
| `createExecTool(defaults?): AnyAgentTool` | **[Tool Factory]** 建立 exec 工具（AI 執行 shell 命令） |
| `execTool` | 預設 exec 工具實例 |

#### bash-tools.process.ts
| Export | 說明 |
|--------|------|
| `createProcessTool(defaults?): AnyAgentTool` | **[Tool Factory]** 建立 process 管理工具（查看/殺死背景程序） |
| `processTool` | 預設 process 工具實例 |

#### bash-tools.exec-runtime.ts
| Export | 說明 |
|--------|------|
| `sanitizeHostBaseEnv(env): Record<string, string>` | 清理 host 基礎環境變數 |
| `validateHostEnv(env)` | 驗證 host 環境變數 |
| `DEFAULT_MAX_OUTPUT` / `DEFAULT_PENDING_MAX_OUTPUT` / `DEFAULT_PATH` | 預設常數 |
| `execSchema` | Exec 工具 TypeBox schema |
| `renderExecHostLabel(host): string` | 渲染 exec host 標籤 |
| `runExecProcess(opts): Promise<...>` | **[Core]** 執行 shell 程序 |
| `buildApprovalPendingMessage(params): string` | 建構等待審核訊息 |

#### bash-tools.exec-approval-request.ts
| Export | 說明 |
|--------|------|
| `registerExecApprovalRequest(params): Promise<ExecApprovalRegistration>` | 註冊 exec 審核請求 |
| `waitForExecApprovalDecision(id): Promise<string \| null>` | 等待 exec 審核決定 |
| `requestExecApprovalDecision(params): Promise<...>` | **[Key API]** 請求 exec 審核決定（送至 channel） |
| `buildExecApprovalRequesterContext(params): ...` | 建構審核請求者上下文 |

#### bash-tools.exec-host-gateway.ts
| Export | 說明 |
|--------|------|
| `processGatewayAllowlist(params): Promise<ProcessGatewayAllowlistResult>` | 處理 gateway allowlist 命令審核 |

#### bash-tools.exec-host-node.ts
| Export | 說明 |
|--------|------|
| `executeNodeHostCommand(params): Promise<...>` | 在 node host 上執行命令 |

#### bash-tools.exec-host-shared.ts
| Export | 說明 |
|--------|------|
| 大量 exec approval 相關 helper 型別與函式 | Exec 審核共用邏輯 |

#### bash-tools.shared.ts
| Export | 說明 |
|--------|------|
| `buildSandboxEnv(params): Record<string, string>` | 建構 sandbox 環境變數 |
| `coerceEnv(env?): Record<string, string>` | 強制轉換環境變數 |
| `buildDockerExecArgs(params): string[]` | 建構 Docker exec 參數 |
| `resolveSandboxWorkdir(params): Promise<string>` | 解析 sandbox 工作目錄 |
| `chunkString(input, limit): string[]` | 切分字串 |
| `truncateMiddle(str, max): string` | 中間截斷字串 |
| `sliceLogLines(text, max): string[]` | 切片 log 行數 |
| `deriveSessionName(command): string \| undefined` | 從命令推導 session 名稱 |

#### bash-process-registry.ts
| Export | 說明 |
|--------|------|
| `addSession(session)` / `getSession(id)` / `deleteSession(id)` | 程序 session CRUD |
| `appendOutput(session, stream, chunk)` | 追加程序輸出 |
| `markExited(session, code)` | 標記程序已結束 |
| `markBackgrounded(session)` | 標記程序為背景 |
| `tail(text, max): string` | 截取文字尾部 |
| `trimWithCap(text, max): string` | 帶上限的截取 |
| `listRunningSessions()` / `listFinishedSessions()` | 列出運行/已完成的 sessions |

---

### Root-level — 系統提示

#### system-prompt.ts
| Export | 說明 |
|--------|------|
| type `PromptMode` = "full" \| "minimal" \| "none" | System prompt 模式 |
| `buildAgentSystemPrompt(params): string` | **[Key API]** 建構 agent 系統提示文字 |
| `buildRuntimeLine(params): string` | 建構執行時資訊行 |

#### system-prompt-params.ts
| Export | 說明 |
|--------|------|
| type `RuntimeInfoInput` / `SystemPromptRuntimeParams` | 系統提示參數型別 |
| `buildSystemPromptParams(params): SystemPromptRuntimeParams` | 建構系統提示參數 |

#### system-prompt-report.ts
| Export | 說明 |
|--------|------|
| `buildSystemPromptReport(params): string` | 建構系統提示報告（含 token 統計） |

---

### Root-level — Bootstrap

#### bootstrap-files.ts
| Export | 說明 |
|--------|------|
| type `BootstrapContextMode` / `BootstrapContextRunKind` | Bootstrap 上下文型別 |
| `makeBootstrapWarn(params): Function` | 建立 bootstrap 警告函式 |
| `resolveBootstrapFilesForRun(params): Promise<...>` | 解析 run 的 bootstrap 檔案 |
| `resolveBootstrapContextForRun(params): Promise<...>` | **[Key API]** 解析 run 的 bootstrap 上下文 |

#### bootstrap-cache.ts
| Export | 說明 |
|--------|------|
| `getOrLoadBootstrapFiles(params): Promise<...>` | 取得或載入 bootstrap 檔案（快取） |
| `clearBootstrapSnapshot(sessionKey)` | 清除 bootstrap 快照 |

#### bootstrap-budget.ts
| Export | 說明 |
|--------|------|
| `buildBootstrapInjectionStats(params): BootstrapInjectionStat[]` | 建構 bootstrap 注入統計 |
| `analyzeBootstrapBudget(params): BootstrapBudgetAnalysis` | 分析 bootstrap 預算（token limit） |
| `buildBootstrapPromptWarning(params): BootstrapPromptWarning \| null` | 建構 bootstrap 截斷警告 |
| `formatBootstrapTruncationWarningLines(params): string[]` | 格式化截斷警告行 |

#### bootstrap-hooks.ts
| Export | 說明 |
|--------|------|
| `applyBootstrapHookOverrides(params): Promise<...>` | 套用 bootstrap hook 覆蓋 |

---

### Root-level — Tool 政策

#### tool-policy.ts
| Export | 說明 |
|--------|------|
| `isOwnerOnlyToolName(name): boolean` | 判斷是否為 owner-only 工具 |
| `applyOwnerOnlyToolPolicy(tools, senderIsOwner): AnyAgentTool[]` | 套用 owner-only 工具政策 |
| `collectExplicitAllowlist(policies): string[]` | 收集明確 allowlist |
| `buildPluginToolGroups(params): PluginToolGroups` | 建構 plugin 工具群組 |
| `expandPluginGroups(allowlist, groups): string[]` | 展開 plugin 群組 |
| `mergeAlsoAllowPolicy(policy, additions): TPolicy` | 合併 also-allow 政策 |

#### tool-policy-pipeline.ts
| Export | 說明 |
|--------|------|
| `buildDefaultToolPolicyPipelineSteps(params): ToolPolicyPipelineStep[]` | 建構預設工具政策 pipeline |
| `applyToolPolicyPipeline(params): AnyAgentTool[]` | 套用工具政策 pipeline |

#### tool-policy-shared.ts
| Export | 說明 |
|--------|------|
| `TOOL_GROUPS` | 工具群組定義 |
| `normalizeToolName(name): string` | 正規化工具名稱 |
| `expandToolGroups(list?): string[]` | 展開工具群組 |
| `resolveToolProfilePolicy(profile?): ToolProfilePolicy \| undefined` | 解析工具 profile 政策 |

#### tool-catalog.ts
| Export | 說明 |
|--------|------|
| `CORE_TOOL_GROUPS` | 核心工具群組定義 |
| `resolveCoreToolProfilePolicy(profile?): ToolProfilePolicy \| undefined` | 解析核心工具 profile 政策 |
| `listCoreToolSections(): CoreToolSection[]` | 列出核心工具分區 |
| `isKnownCoreToolId(toolId): boolean` | 判斷是否為已知核心工具 |

#### tool-fs-policy.ts
| Export | 說明 |
|--------|------|
| `createToolFsPolicy(params): ToolFsPolicy` | 建立工具檔案系統政策 |
| `resolveToolFsConfig(params): ...` | 解析工具 FS 設定 |
| `resolveEffectiveToolFsWorkspaceOnly(params): boolean` | 解析有效的 workspace-only 設定 |

#### tool-loop-detection.ts
| Export | 說明 |
|--------|------|
| `hashToolCall(toolName, params): string` | 計算工具呼叫 hash |
| `detectToolCallLoop(state, params): LoopDetectionResult` | **[Key API]** 偵測工具呼叫迴圈 |
| `recordToolCall(state, params)` | 記錄工具呼叫 |
| `recordToolCallOutcome(state, params)` | 記錄工具呼叫結果 |
| `getToolCallStats(state): ...` | 取得工具呼叫統計 |

#### tool-mutation.ts
| Export | 說明 |
|--------|------|
| `isLikelyMutatingToolName(toolName): boolean` | 判斷工具名是否可能是變異操作 |
| `isMutatingToolCall(toolName, args): boolean` | 判斷工具呼叫是否為變異操作 |
| `buildToolActionFingerprint(toolName, args): string` | 建構工具動作指紋 |
| `buildToolMutationState(params): ToolMutationState` | 建構工具變異狀態 |

#### tool-call-id.ts
| Export | 說明 |
|--------|------|
| `sanitizeToolCallId(id, mode): string` | 清理 tool call ID |
| `extractToolCallsFromAssistant(msg): ToolCallLike[]` | 從 assistant 訊息提取 tool calls |
| `isValidCloudCodeAssistToolId(id): boolean` | 驗證 Cloud Code Assist tool ID |
| `sanitizeToolCallIdsForCloudCodeAssist(messages): ...` | 清理 Cloud Code Assist tool call IDs |

#### tool-display.ts / tool-display-common.ts
| Export | 說明 |
|--------|------|
| `resolveToolDisplay(params): ToolDisplay` | 解析工具顯示資訊 |
| `formatToolDetail(display): string \| undefined` | 格式化工具詳情 |
| `formatToolSummary(display): string` | 格式化工具摘要 |
| `resolveToolVerbAndDetail(params): ...` | 解析工具動詞與詳情 |
| `resolveExecDetail(args): string \| undefined` | 解析 exec 工具詳情 |
| `resolveActionSpec(params): ToolDisplayActionSpec` | 解析動作規格 |

#### tool-images.ts
| Export | 說明 |
|--------|------|
| `sanitizeContentBlocksImages(blocks): Promise<...>` | 清理內容區塊中的圖片 |
| `sanitizeImageBlocks(blocks): Promise<...>` | 清理圖片區塊 |
| `sanitizeToolResultImages(result): Promise<...>` | 清理工具結果中的圖片 |

#### tool-summaries.ts
| Export | 說明 |
|--------|------|
| `buildToolSummaryMap(tools): Record<string, string>` | 建構工具摘要對應表 |

---

### Root-level — Session 管理

#### session-dirs.ts
| Export | 說明 |
|--------|------|
| `resolveAgentSessionDirsFromAgentsDir(dir): Promise<string[]>` | 從 agents dir 解析 session 目錄 |
| `resolveAgentSessionDirs(stateDir): Promise<string[]>` | 解析所有 agent session 目錄 |

#### session-slug.ts
| Export | 說明 |
|--------|------|
| `createSessionSlug(isTaken?): string` | 建立 session slug（adjective-noun 格式） |

#### session-write-lock.ts
| Export | 說明 |
|--------|------|
| `acquireSessionWriteLock(params): Promise<...>` | **[Key API]** 取得 session 寫入鎖 |
| `cleanStaleLockFiles(params): Promise<...>` | 清理過期的鎖檔案 |
| `resolveSessionLockMaxHoldFromTimeout(params): number` | 從 timeout 計算最大鎖持有時間 |

#### session-file-repair.ts
| Export | 說明 |
|--------|------|
| `repairSessionFileIfNeeded(params): Promise<...>` | 修復損壞的 session 檔案 |

#### session-transcript-repair.ts
| Export | 說明 |
|--------|------|
| `stripToolResultDetails(messages): AgentMessage[]` | 移除工具結果詳情 |
| `repairToolCallInputs(messages): ToolCallInputRepairReport` | 修復工具呼叫輸入 |
| `sanitizeToolCallInputs(messages): AgentMessage[]` | 清理工具呼叫輸入 |
| `repairToolUseResultPairing(messages): ToolUseRepairReport` | 修復 tool use/result 配對 |

#### session-tool-result-guard.ts / session-tool-result-guard-wrapper.ts / session-tool-result-state.ts
| Export | 說明 |
|--------|------|
| `installSessionToolResultGuard(params): ...` | 安裝 session tool result guard |
| `guardSessionManager(sm): GuardedSessionManager` | 包裝 session manager 加入 guard |
| `createPendingToolCallState(): PendingToolCallState` | 建立 pending tool call 狀態 |

#### cli-session.ts
| Export | 說明 |
|--------|------|
| `getCliSessionId(entry, provider): string \| undefined` | 取得 CLI session ID |
| `setCliSessionId(entry, provider, sessionId)` | 設定 CLI session ID |

---

### Root-level — 身份與顯示

#### identity.ts
| Export | 說明 |
|--------|------|
| `resolveAgentIdentity(cfg, agentId): AgentIdentityFile \| undefined` | 解析 agent 身份設定 |
| `resolveAckReaction(cfg, agentId): string \| undefined` | 解析確認反應 |
| `resolveIdentityNamePrefix(cfg, agentId): string` | 解析身份名稱前綴 |
| `resolveIdentityName(cfg, agentId): string \| undefined` | 解析身份名稱 |
| `resolveMessagePrefix(cfg, agentId): string` | 解析訊息前綴 |
| `resolveResponsePrefix(cfg, agentId): string` | 解析回應前綴 |
| `resolveEffectiveMessagesConfig(cfg, agentId): ...` | 解析有效訊息設定 |
| `resolveHumanDelayConfig(cfg, agentId): ...` | 解析人工延遲設定 |

#### identity-file.ts
| Export | 說明 |
|--------|------|
| `parseIdentityMarkdown(content): AgentIdentityFile` | 解析 identity markdown 檔案 |
| `loadIdentityFromFile(path): AgentIdentityFile \| null` | 從檔案載入 identity |
| `loadAgentIdentityFromWorkspace(workspace): AgentIdentityFile \| null` | 從 workspace 載入 identity |

#### identity-avatar.ts
| Export | 說明 |
|--------|------|
| `resolveAgentAvatar(cfg, agentId): AgentAvatarResolution` | 解析 agent 頭像 |

#### owner-display.ts
| Export | 說明 |
|--------|------|
| `resolveOwnerDisplaySetting(config?): OwnerDisplaySetting` | 解析 owner 顯示設定 |
| `ensureOwnerDisplaySecret(store, agentDir): ...` | 確保 owner 顯示 secret |

---

### Root-level — Subagent 系統

#### subagent-spawn.ts
| Export | 說明 |
|--------|------|
| `spawnSubagentDirect(params): Promise<SpawnSubagentResult>` | **[Key API]** 直接生成子代理 |
| `splitModelRef(ref?): { provider, model }` | 分離模型參考 |
| type `SpawnSubagentParams` / `SpawnSubagentContext` / `SpawnSubagentResult` | 子代理生成型別 |

#### subagent-announce.ts
| Export | 說明 |
|--------|------|
| `captureSubagentCompletionReply(params): Promise<...>` | 捕獲子代理完成回覆 |
| `buildSubagentSystemPrompt(params): string` | 建構子代理系統提示 |
| `runSubagentAnnounceFlow(params): Promise<...>` | **[Key API]** 執行子代理公告流程（完成後回報結果） |

#### subagent-registry.ts
| Export | 說明 |
|--------|------|
| `registerSubagentRun(params): ...` | **[Key API]** 註冊子代理 run |
| `releaseSubagentRun(runId)` | 釋放子代理 run |
| `markSubagentRunTerminated(params)` | 標記子代理 run 已終止 |
| `listSubagentRunsForRequester(key): SubagentRunRecord[]` | 列出請求者的子代理 runs |
| `listSubagentRunsForController(key): SubagentRunRecord[]` | 列出控制者的子代理 runs |
| `countActiveRunsForSession(key): number` | 計算 session 活躍 run 數 |
| `countActiveDescendantRuns(key): number` | 計算後代活躍 run 數 |
| `initSubagentRegistry()` | 初始化子代理 registry |
| `isSubagentSessionRunActive(key): boolean` | 判斷子代理 session 是否活躍 |

#### subagent-control.ts
| Export | 說明 |
|--------|------|
| `resolveSubagentController(params): ResolvedSubagentController` | 解析子代理控制者 |
| `buildSubagentList(params): BuiltSubagentList` | **[Key API]** 建構子代理清單 |
| `killAllControlledSubagentRuns(params): Promise<...>` | 終止所有受控子代理 |
| `killControlledSubagentRun(params): Promise<...>` | 終止特定受控子代理 |
| `steerControlledSubagentRun(params): Promise<...>` | 引導受控子代理 |
| `sendControlledSubagentMessage(params): Promise<...>` | 向受控子代理發送訊息 |

#### subagent-capabilities.ts
| Export | 說明 |
|--------|------|
| `resolveSubagentRoleForDepth(params): SubagentSessionRole` | 依深度解析子代理角色 |
| `resolveSubagentCapabilities(params): ...` | 解析子代理能力 |

#### subagent-depth.ts
| Export | 說明 |
|--------|------|
| `getSubagentDepthFromSessionStore(params): number` | 從 session store 取得子代理深度 |

#### subagent-lifecycle-events.ts
| Export | 說明 |
|--------|------|
| 各種 `SUBAGENT_ENDED_*` / `SUBAGENT_TARGET_*` 常數 | 子代理生命週期事件常數 |
| `resolveSubagentSessionEndedOutcome(reason): SubagentLifecycleEndedOutcome` | 解析結束結果 |

#### subagent-announce-dispatch.ts / subagent-announce-queue.ts
| Export | 說明 |
|--------|------|
| `runSubagentAnnounceDispatch(params): Promise<...>` | 執行子代理公告分派 |
| `enqueueAnnounce(params): ...` | 將公告加入佇列 |
| type `SubagentDeliveryPath` / `SubagentAnnounceQueueOutcome` | 分派路徑型別 |

#### subagent-attachments.ts
| Export | 說明 |
|--------|------|
| `materializeSubagentAttachments(params): Promise<...>` | 物化子代理附件（base64 → 檔案） |
| `decodeStrictBase64(value, maxBytes): Buffer \| null` | 嚴格 base64 解碼 |

#### subagent-registry-cleanup.ts / subagent-registry-completion.ts / subagent-registry-queries.ts
| Export | 說明 |
|--------|------|
| `resolveDeferredCleanupDecision(params): DeferredCleanupDecision` | 解析延遲清理決策 |
| `emitSubagentEndedHookOnce(params): Promise<...>` | 發送子代理結束 hook（去重） |
| `findRunIdsByChildSessionKeyFromRuns(runs, key): string[]` | 由子 session key 查找 run IDs |
| `listRunsForRequesterFromRuns(runs, key): SubagentRunRecord[]` | 列出請求者的 runs |
| `countActiveRunsForSessionFromRuns(runs, key): number` | 計算活躍 run 數 |
| `countActiveDescendantRunsFromRuns(runs, key): number` | 計算後代活躍 run 數 |

#### subagent-registry.store.ts / subagent-registry-state.ts
| Export | 說明 |
|--------|------|
| `resolveSubagentRegistryPath(): string` | 解析 registry 檔案路徑 |
| `loadSubagentRegistryFromDisk(): Map<string, SubagentRunRecord>` | 從磁碟載入 registry |
| `saveSubagentRegistryToDisk(runs)` | 儲存 registry 至磁碟 |
| `persistSubagentRunsToDisk(runs)` | 持久化 runs 至磁碟 |
| `restoreSubagentRunsFromDisk(params): Map<string, SubagentRunRecord>` | 從磁碟恢復 runs |

---

### Root-level — ACP Spawn

#### acp-spawn.ts
| Export | 說明 |
|--------|------|
| `spawnAcpDirect(params): Promise<SpawnAcpResult>` | **[Key API]** 直接生成 ACP（Agent-to-Agent Communication Protocol）agent |
| `resolveAcpSpawnRuntimePolicyError(params): string \| undefined` | 解析 ACP spawn runtime 政策錯誤 |
| type `SpawnAcpParams` / `SpawnAcpContext` / `SpawnAcpResult` | ACP spawn 型別 |

#### acp-spawn-parent-stream.ts
| Export | 說明 |
|--------|------|
| `resolveAcpSpawnStreamLogPath(params): string` | 解析 ACP spawn stream log 路徑 |
| `startAcpSpawnParentStreamRelay(params): AcpSpawnParentRelayHandle` | 啟動 ACP spawn parent stream relay |

---

### Root-level — 其他核心

#### apply-patch.ts / apply-patch-update.ts
| Export | 說明 |
|--------|------|
| `createApplyPatchTool(params): AnyAgentTool` | **[Tool Factory]** 建立 apply-patch 工具 |
| `applyPatch(params): Promise<ApplyPatchResult>` | 套用 patch |
| `applyUpdateHunk(params): Promise<...>` | 套用更新 hunk |

#### auth-health.ts
| Export | 說明 |
|--------|------|
| `buildAuthHealthSummary(params): AuthHealthSummary` | 建構認證健康摘要 |
| `formatRemainingShort(ms): string` | 格式化剩餘時間 |
| type `AuthProfileHealth` / `AuthProviderHealth` / `AuthHealthSummary` | 認證健康型別 |

#### channel-tools.ts
| Export | 說明 |
|--------|------|
| `listChannelSupportedActions(params): ...` | 列出 channel 支援的動作 |
| `listAllChannelSupportedActions(params): ...` | 列出所有 channel 支援的動作 |
| `listChannelAgentTools(params): ChannelAgentTool[]` | 列出 channel agent 工具 |
| `resolveChannelMessageToolHints(params): string` | 解析 channel 訊息工具提示 |

#### cli-runner.ts
| Export | 說明 |
|--------|------|
| `runCliAgent(params): Promise<...>` | **[Key API]** 執行 CLI backend agent |
| `runClaudeCliAgent(params): Promise<...>` | 執行 Claude CLI agent |

#### cli-backends.ts
| Export | 說明 |
|--------|------|
| `resolveCliBackendIds(cfg?): Set<string>` | 解析 CLI backend IDs |
| `resolveCliBackendConfig(cfg, provider): ResolvedCliBackend` | 解析 CLI backend 設定 |

#### custom-api-registry.ts
| Export | 說明 |
|--------|------|
| `ensureCustomApiRegistered(api, streamFn): boolean` | 確保自訂 API 已註冊 |

#### date-time.ts
| Export | 說明 |
|--------|------|
| `resolveUserTimezone(configured?): string` | 解析使用者時區 |
| `resolveUserTimeFormat(preference?): ResolvedTimeFormat` | 解析使用者時間格式 |
| `normalizeTimestamp(ts, tz, format): string` | 正規化時間戳 |
| `formatUserTime(ts, tz, format): string` | 格式化使用者時間 |

#### fast-mode.ts
| Export | 說明 |
|--------|------|
| `resolveFastModeState(params): FastModeState` | 解析 fast mode 狀態 |

#### glob-pattern.ts
| Export | 說明 |
|--------|------|
| `compileGlobPattern(params): CompiledGlobPattern` | 編譯 glob pattern |
| `matchesAnyGlobPattern(value, patterns): boolean` | 匹配任意 glob pattern |

#### image-sanitization.ts
| Export | 說明 |
|--------|------|
| `resolveImageSanitizationLimits(cfg?): ImageSanitizationLimits` | 解析圖片清理限制 |

#### internal-events.ts
| Export | 說明 |
|--------|------|
| `formatAgentInternalEventsForPrompt(events?): string` | 格式化 agent 內部事件為 prompt 文字 |

#### lanes.ts
| Export | 說明 |
|--------|------|
| `resolveNestedAgentLane(lane?): string` | 解析巢狀 agent lane |

#### memory-search.ts
| Export | 說明 |
|--------|------|
| `resolveMemorySearchConfig(cfg, agentId): ResolvedMemorySearchConfig` | 解析記憶搜尋設定 |

#### openclaw-tools.ts
| Export | 說明 |
|--------|------|
| `createOpenClawTools(params): AnyAgentTool[]` | **[Key API]** 建立所有 OpenClaw 工具 |

#### path-policy.ts
| Export | 說明 |
|--------|------|
| `toRelativeWorkspacePath(path, workspace): string` | 轉換為相對 workspace 路徑 |
| `toRelativeSandboxPath(path, sandbox): string` | 轉換為相對 sandbox 路徑 |
| `resolvePathFromInput(filePath, cwd): string` | 從輸入解析絕對路徑 |

#### payload-redaction.ts
| Export | 說明 |
|--------|------|
| `redactImageDataForDiagnostics(value): unknown` | 遮蔽圖片資料用於診斷 |

#### provider-capabilities.ts
| Export | 說明 |
|--------|------|
| `resolveProviderCapabilities(provider?): ProviderCapabilities` | 解析 provider 能力 |
| `isOpenAiProviderFamily(provider?): boolean` | 判斷是否為 OpenAI 家族 provider |
| `isAnthropicProviderFamily(provider?): boolean` | 判斷是否為 Anthropic 家族 provider |
| `shouldDropThinkingBlocksForModel(params): boolean` | 判斷是否應丟棄 thinking blocks |

#### pty-dsr.ts / pty-keys.ts
| Export | 說明 |
|--------|------|
| `stripDsrRequests(input): { cleaned, requests }` | 移除 DSR 請求 |
| `encodeKeySequence(request): KeyEncodingResult` | 編碼鍵盤序列 |
| `encodePaste(text, bracketed?): string` | 編碼貼上文字 |

#### queued-file-writer.ts
| Export | 說明 |
|--------|------|
| `getQueuedFileWriter(path): QueuedFileWriter` | 取得佇列式檔案寫入器 |

#### runtime-plugins.ts
| Export | 說明 |
|--------|------|
| `ensureRuntimePluginsLoaded(params): Promise<...>` | 確保 runtime plugins 已載入 |

#### sanitize-for-prompt.ts
| Export | 說明 |
|--------|------|
| `sanitizeForPromptLiteral(value): string` | 清理文字用於 prompt literal |
| `wrapUntrustedPromptDataBlock(params): string` | 包裝不受信任的 prompt 資料區塊 |

#### shell-utils.ts
| Export | 說明 |
|--------|------|
| `getShellConfig(): { shell, args }` | 取得 shell 設定 |
| `detectRuntimeShell(): string \| undefined` | 偵測 runtime shell |
| `killProcessTree(pid)` | 終止程序樹 |
| `sanitizeBinaryOutput(text): string` | 清理二進位輸出 |

#### spawned-context.ts
| Export | 說明 |
|--------|------|
| `normalizeSpawnedRunMetadata(meta): NormalizedSpawnedRunMetadata` | 正規化 spawned run metadata |
| `resolveSpawnedWorkspaceInheritance(params): ...` | 解析 spawned workspace 繼承 |

#### stable-stringify.ts
| Export | 說明 |
|--------|------|
| `stableStringify(value): string` | 穩定 JSON stringify（key 排序） |

#### stream-message-shared.ts
| Export | 說明 |
|--------|------|
| `buildZeroUsage(): Usage` | 建構零使用量 |
| `buildAssistantMessage(params): AssistantMessage` | 建構 assistant 訊息 |
| `buildStreamErrorAssistantMessage(params): AssistantMessage` | 建構串流錯誤 assistant 訊息 |

#### timeout.ts
| Export | 說明 |
|--------|------|
| `resolveAgentTimeoutSeconds(cfg?): number` | 解析 agent timeout（秒） |
| `resolveAgentTimeoutMs(opts): number` | 解析 agent timeout（毫秒） |

#### transcript-policy.ts
| Export | 說明 |
|--------|------|
| `resolveTranscriptPolicy(params): TranscriptPolicy` | 解析 transcript 政策 |

#### usage.ts
| Export | 說明 |
|--------|------|
| `normalizeUsage(raw?): NormalizedUsage \| undefined` | 正規化 usage 資料 |
| `hasNonzeroUsage(usage?): boolean` | 判斷是否有非零使用量 |
| `derivePromptTokens(usage?): number` | 推導 prompt token 數 |
| `deriveSessionTotalTokens(params): number` | 推導 session 總 token 數 |
| `makeZeroUsageSnapshot(): AssistantUsageSnapshot` | 建構零使用量快照 |

#### announce-idempotency.ts
| Export | 說明 |
|--------|------|
| `buildAnnounceIdFromChildRun(params): string` | 建構公告 ID |
| `buildAnnounceIdempotencyKey(announceId): string` | 建構公告冪等 key |

#### anthropic-payload-log.ts
| Export | 說明 |
|--------|------|
| `createAnthropicPayloadLogger(params): AnthropicPayloadLogger` | 建立 Anthropic payload logger |

#### btw.ts
| Export | 說明 |
|--------|------|
| `runBtwSideQuestion(params): Promise<...>` | 執行 BTW 側邊問題（independent side query） |

#### cache-trace.ts
| Export | 說明 |
|--------|------|
| `createCacheTrace(params): CacheTrace \| null` | 建立 cache trace |

#### command-poll-backoff.ts
| Export | 說明 |
|--------|------|
| `calculateBackoffMs(consecutiveNoOutputPolls): number` | 計算 backoff 毫秒 |
| `recordCommandPoll(state, commandId)` | 記錄 command poll |
| `getCommandPollSuggestion(state, commandId): ...` | 取得 command poll 建議 |

#### content-blocks.ts
| Export | 說明 |
|--------|------|
| `collectTextContentBlocks(content): string[]` | 收集文字內容區塊 |

#### current-time.ts
| Export | 說明 |
|--------|------|
| `resolveCronStyleNow(cfg, nowMs): CronStyleNow` | 解析 cron 風格的現在時間 |

#### docs-path.ts
| Export | 說明 |
|--------|------|
| `resolveOpenClawDocsPath(params): Promise<string>` | 解析 OpenClaw docs 路徑 |

#### live-model-errors.ts / live-model-filter.ts
| Export | 說明 |
|--------|------|
| `isModelNotFoundErrorMessage(raw): boolean` | 判斷是否為 model not found 錯誤 |
| `isModernModelRef(ref): boolean` | 判斷是否為現代 model ref |

#### minimax-vlm.ts
| Export | 說明 |
|--------|------|
| `isMinimaxVlmProvider(provider): boolean` | 判斷是否為 MiniMax VLM provider |
| `minimaxUnderstandImage(params): Promise<...>` | MiniMax VLM 圖片理解 |

#### sandbox-paths.ts / sandbox-media-paths.ts / sandbox-tool-policy.ts / sandbox.ts
| Export | 說明 |
|--------|------|
| `resolveSandboxPath(params): ...` | 解析 sandbox 路徑 |
| `assertSandboxPath(params): Promise<...>` | 斷言 sandbox 路徑安全 |
| `resolveSandboxedMediaSource(params): Promise<...>` | 解析 sandbox 媒體來源 |
| `createSandboxBridgeReadFile(params): Function` | 建立 sandbox bridge 讀檔函式 |
| `pickSandboxToolPolicy(params): SandboxToolPolicy` | 選擇 sandbox 工具政策 |
| sandbox.ts 為 barrel 重新匯出 sandbox/ 子模組 | |

#### pi-settings.ts
| Export | 說明 |
|--------|------|
| `ensurePiCompactionReserveTokens(params): ...` | 確保 PI compaction reserve tokens |
| `resolveCompactionReserveTokensFloor(cfg?): number` | 解析 compaction reserve tokens floor |
| `applyPiCompactionSettingsFromConfig(params): ...` | 從 config 套用 PI compaction 設定 |
| `shouldDisablePiAutoCompaction(params): boolean` | 判斷是否應停用自動 compaction |

#### pi-project-settings.ts
| Export | 說明 |
|--------|------|
| `resolveEmbeddedPiProjectSettingsPolicy(params): EmbeddedPiProjectSettingsPolicy` | 解析嵌入式 PI 專案設定政策 |
| `createEmbeddedPiSettingsManager(params): ...` | 建立嵌入式 PI 設定管理器 |

#### pi-model-discovery.ts
| Export | 說明 |
|--------|------|
| `discoverAuthStorage(agentDir): AuthStorage` | 發現認證儲存 |
| `discoverModels(authStorage, agentDir): ModelRegistry` | 發現可用模型 |

---

### auth-profiles/

#### constants.ts
| Export | 說明 |
|--------|------|
| `AUTH_STORE_VERSION = 1` | Auth store 版本 |
| `AUTH_PROFILE_FILENAME` / `LEGACY_AUTH_FILENAME` | Auth 檔案名稱常數 |
| `CLAUDE_CLI_PROFILE_ID` / `CODEX_CLI_PROFILE_ID` / `QWEN_CLI_PROFILE_ID` / `MINIMAX_CLI_PROFILE_ID` | 各 CLI profile ID 常數 |

#### types.ts
| Export | 說明 |
|--------|------|
| type `ApiKeyCredential` / `TokenCredential` / `OAuthCredential` | 認證型別 |
| type `AuthProfileCredential` | 聯合認證型別 |
| type `AuthProfileStore` | 完整 auth profile store 型別 |
| type `AuthProfileFailureReason` | 認證失敗原因型別 |

#### store.ts
| Export | 說明 |
|--------|------|
| `loadAuthProfileStore(): AuthProfileStore` | 載入 auth profile store |
| `saveAuthProfileStore(store, agentDir?)` | 儲存 auth profile store |
| `ensureAuthProfileStore(agentDir?): AuthProfileStore` | **[Key API]** 確保 auth profile store 已載入 |
| `updateAuthProfileStoreWithLock(params): Promise<...>` | 帶鎖更新 auth profile store |
| `loadAuthProfileStoreForRuntime(params): AuthProfileStore` | 載入 runtime 用 auth profile store |

#### profiles.ts
| Export | 說明 |
|--------|------|
| `upsertAuthProfile(params)` | 新增/更新 auth profile |
| `upsertAuthProfileWithLock(params): Promise<...>` | 帶鎖新增/更新 auth profile |
| `setAuthProfileOrder(params): Promise<...>` | 設定 auth profile 順序 |
| `listProfilesForProvider(store, provider): string[]` | 列出 provider 的 profiles |
| `markAuthProfileGood(params): Promise<...>` | 標記 auth profile 為良好 |

#### order.ts
| Export | 說明 |
|--------|------|
| `resolveAuthProfileEligibility(params): AuthProfileEligibility` | 解析 auth profile 資格 |
| `resolveAuthProfileOrder(params): string[]` | **[Key API]** 解析 auth profile 排序 |

#### oauth.ts
| Export | 說明 |
|--------|------|
| `resolveApiKeyForProfile(params): Promise<string>` | 解析 profile 的 API key（含 OAuth token refresh） |

#### paths.ts
| Export | 說明 |
|--------|------|
| `resolveAuthStorePath(agentDir?): string` | 解析 auth store 路徑 |
| `ensureAuthStoreFile(pathname)` | 確保 auth store 檔案存在 |

#### credential-state.ts
| Export | 說明 |
|--------|------|
| `resolveTokenExpiryState(expires): TokenExpiryState` | 解析 token 過期狀態 |
| `evaluateStoredCredentialEligibility(params): ...` | 評估已儲存認證資格 |

#### display.ts
| Export | 說明 |
|--------|------|
| `resolveAuthProfileDisplayLabel(params): string` | 解析 auth profile 顯示標籤 |

#### doctor.ts
| Export | 說明 |
|--------|------|
| `formatAuthDoctorHint(params): string` | 格式化 auth doctor 提示 |

#### external-cli-sync.ts
| Export | 說明 |
|--------|------|
| `syncExternalCliCredentials(store): boolean` | 同步外部 CLI 憑證（Claude/Codex/Qwen/MiniMax） |

#### repair.ts
| Export | 說明 |
|--------|------|
| `suggestOAuthProfileIdForLegacyDefault(params): string \| null` | 建議舊版預設的 OAuth profile ID |
| `repairOAuthProfileIdMismatch(params): ...` | 修復 OAuth profile ID 不匹配 |

#### session-override.ts
| Export | 說明 |
|--------|------|
| `clearSessionAuthProfileOverride(params): Promise<...>` | 清除 session auth profile override |
| `resolveSessionAuthProfileOverride(params): Promise<...>` | 解析 session auth profile override |

#### state-observation.ts
| Export | 說明 |
|--------|------|
| `logAuthProfileFailureStateChange(params)` | 記錄 auth profile 失敗狀態變化 |

#### usage.ts
| Export | 說明 |
|--------|------|
| `markAuthProfileUsed(params): Promise<...>` | 標記 auth profile 已使用 |
| `markAuthProfileFailure(params): Promise<...>` | 標記 auth profile 失敗 |
| `markAuthProfileCooldown(params): Promise<...>` | 標記 auth profile 冷卻 |
| `clearAuthProfileCooldown(params): Promise<...>` | 清除 auth profile 冷卻 |
| `isProfileInCooldown(store, profileId): boolean` | 判斷 profile 是否在冷卻中 |
| `clearExpiredCooldowns(store, now?): boolean` | 清除過期冷卻 |
| `calculateAuthProfileCooldownMs(errorCount): number` | 計算冷卻毫秒（指數退避） |

---

### cli-runner/

#### helpers.ts
| Export | 說明 |
|--------|------|
| `enqueueCliRun<T>(key, task): Promise<T>` | 排隊 CLI run（序列化執行） |
| `buildSystemPrompt(params): string` | 建構 CLI 系統提示 |
| `normalizeCliModel(modelId, backend): string` | 正規化 CLI 模型 ID |
| `parseCliJson(raw, backend): CliOutput \| null` | 解析 CLI JSON 輸出 |
| `parseCliJsonl(raw, backend): CliOutput \| null` | 解析 CLI JSONL 輸出 |
| `resolvePromptInput(params): ...` | 解析 prompt 輸入 |
| `buildCliArgs(params): string[]` | 建構 CLI 參數 |

#### reliability.ts
| Export | 說明 |
|--------|------|
| `resolveCliNoOutputTimeoutMs(params): number` | 解析 CLI 無輸出 timeout |
| `buildCliSupervisorScopeKey(params): string` | 建構 CLI supervisor scope key |

---

### pi-embedded-runner/ — 嵌入式 Agent Runner 核心

#### run.ts
| Export | 說明 |
|--------|------|
| `runEmbeddedPiAgent(params): Promise<EmbeddedPiRunResult>` | **[Core Entry Point]** 執行嵌入式 PI agent（完整生命週期） |

#### run/attempt.ts
| Export | 說明 |
|--------|------|
| `runEmbeddedAttempt(params): Promise<EmbeddedRunAttemptResult>` | **[Core]** 執行單次 embedded agent 嘗試 |
| `resolvePromptBuildHookResult(params): Promise<...>` | 解析 prompt build hook 結果 |
| `composeSystemPromptWithHookContext(params): string` | 組合系統提示與 hook 上下文 |
| `resolvePromptModeForSession(sessionKey?): "minimal" \| "full"` | 解析 session prompt 模式 |
| `resolveAttemptFsWorkspaceOnly(params): boolean` | 解析 attempt FS workspace-only |
| `buildAfterTurnRuntimeContext(params): ...` | 建構 turn 後 runtime 上下文 |
| `isOllamaCompatProvider(model): boolean` | 判斷是否為 Ollama 相容 provider |
| `wrapStreamFnTrimToolCallNames(baseFn): StreamFn` | 包裝串流函式以修剪工具名稱 |
| `wrapStreamFnRepairMalformedToolCallArguments(baseFn): StreamFn` | 包裝串流函式以修復畸形工具參數 |
| `decodeHtmlEntitiesInObject(obj): unknown` | 解碼 HTML entities |

#### run/params.ts
| Export | 說明 |
|--------|------|
| type `RunEmbeddedPiAgentParams` | 嵌入式 PI agent 執行參數完整型別 |
| type `ClientToolDefinition` | 客戶端工具定義型別 |

#### run/payloads.ts
| Export | 說明 |
|--------|------|
| `buildEmbeddedRunPayloads(params): ...` | 建構嵌入式 run payloads |

#### run/images.ts
| Export | 說明 |
|--------|------|
| `detectImageReferences(prompt): DetectedImageRef[]` | 偵測 prompt 中的圖片參考 |
| `loadImageFromRef(ref): Promise<...>` | 從參考載入圖片 |
| `modelSupportsImages(model): boolean` | 判斷模型是否支援圖片 |
| `detectAndLoadPromptImages(params): Promise<...>` | 偵測並載入 prompt 圖片 |

#### run/failover-observation.ts
| Export | 說明 |
|--------|------|
| `createFailoverDecisionLogger(params): ...` | 建立 failover 決策 logger |

#### run/compaction-timeout.ts
| Export | 說明 |
|--------|------|
| `shouldFlagCompactionTimeout(signal): boolean` | 判斷是否應標記 compaction timeout |
| `selectCompactionTimeoutSnapshot(params): SnapshotSelection` | 選擇 compaction timeout snapshot |

#### run/history-image-prune.ts
| Export | 說明 |
|--------|------|
| `pruneProcessedHistoryImages(messages): boolean` | 修剪已處理的歷史圖片 |

#### compact.ts
| Export | 說明 |
|--------|------|
| `compactEmbeddedPiSession(params): Promise<...>` | **[Key API]** 壓縮嵌入式 PI session（觸發上下文壓縮） |
| `compactEmbeddedPiSessionDirect(params): Promise<...>` | 直接壓縮嵌入式 PI session |
| type `CompactEmbeddedPiSessionParams` | 壓縮參數型別 |

#### compaction-safety-timeout.ts
| Export | 說明 |
|--------|------|
| `EMBEDDED_COMPACTION_TIMEOUT_MS = 900_000` | Compaction timeout 常數 |
| `compactWithSafetyTimeout<T>(params): Promise<T>` | 帶安全 timeout 的壓縮 |

#### model.ts
| Export | 說明 |
|--------|------|
| `buildInlineProviderModels(params): ...` | 建構行內 provider 模型 |
| `resolveModelWithRegistry(params): ...` | 透過 registry 解析模型 |
| `resolveModel(params): ...` | 同步解析模型 |
| `resolveModelAsync(params): Promise<...>` | 非同步解析模型 |

#### extensions.ts
| Export | 說明 |
|--------|------|
| `buildEmbeddedExtensionFactories(params): ...` | 建構嵌入式 extension factories |

#### extra-params.ts
| Export | 說明 |
|--------|------|
| `resolveExtraParams(params): ...` | 解析額外參數 |
| `applyExtraParamsToAgent(agent, params)` | 將額外參數套用至 agent |

#### system-prompt.ts
| Export | 說明 |
|--------|------|
| `buildEmbeddedSystemPrompt(params): string` | 建構嵌入式系統提示 |
| `createSystemPromptOverride(params): ...` | 建立系統提示覆蓋 |
| `applySystemPromptOverrideToSession(params)` | 將系統提示覆蓋套用至 session |

#### history.ts
| Export | 說明 |
|--------|------|
| `limitHistoryTurns(messages, limit): AgentMessage[]` | 限制歷史 turn 數 |
| `getHistoryLimitFromSessionKey(key): number \| undefined` | 從 session key 取得歷史限制 |

#### lanes.ts
| Export | 說明 |
|--------|------|
| `resolveSessionLane(key): string` | 解析 session lane |
| `resolveGlobalLane(lane?): string` | 解析全域 lane |
| `resolveEmbeddedSessionLane(key): string` | 解析嵌入式 session lane |

#### runs.ts
| Export | 說明 |
|--------|------|
| `queueEmbeddedPiMessage(sessionId, text): boolean` | 排隊嵌入式 PI 訊息 |
| `abortEmbeddedPiRun(sessionId): boolean` | 中止嵌入式 PI run |
| `isEmbeddedPiRunActive(sessionId): boolean` | 判斷 run 是否活躍 |
| `isEmbeddedPiRunStreaming(sessionId): boolean` | 判斷 run 是否在串流 |
| `getActiveEmbeddedRunCount(): number` | 取得活躍 run 數 |
| `setActiveEmbeddedRun(params)` / `clearActiveEmbeddedRun(params)` | 設定/清除活躍 run |

#### session-manager-init.ts
| Export | 說明 |
|--------|------|
| `prepareSessionManagerForRun(params): Promise<...>` | 為 run 準備 session manager |

#### session-manager-cache.ts
| Export | 說明 |
|--------|------|
| `trackSessionManagerAccess(sessionFile)` | 追蹤 session manager 存取 |
| `prewarmSessionFile(sessionFile): Promise<...>` | 預熱 session 檔案 |

#### tool-result-truncation.ts
| Export | 說明 |
|--------|------|
| `HARD_MAX_TOOL_RESULT_CHARS = 400_000` | 工具結果硬性最大字元數 |
| `truncateToolResultText(text, max): string` | 截斷工具結果文字 |
| `calculateMaxToolResultChars(contextWindowTokens): number` | 計算最大工具結果字元數 |
| `truncateOversizedToolResultsInSession(params): Promise<...>` | 截斷 session 中過大的工具結果 |
| `sessionLikelyHasOversizedToolResults(params): boolean` | 判斷 session 是否可能有過大工具結果 |

#### tool-result-context-guard.ts
| Export | 說明 |
|--------|------|
| `installToolResultContextGuard(params): ...` | 安裝工具結果上下文 guard |

#### tool-result-char-estimator.ts
| Export | 說明 |
|--------|------|
| `estimateMessageCharsCached(msg, cache): number` | 估算訊息字元數（快取） |
| `estimateContextChars(messages): number` | 估算上下文字元數 |
| `isToolResultMessage(msg): boolean` | 判斷是否為工具結果訊息 |

#### tool-split.ts
| Export | 說明 |
|--------|------|
| `splitSdkTools(options): { sdkTools, clientTools }` | 分離 SDK 工具與客戶端工具 |

#### tool-name-allowlist.ts
| Export | 說明 |
|--------|------|
| `collectAllowedToolNames(params): Set<string>` | 收集允許的工具名稱 |

#### thinking.ts
| Export | 說明 |
|--------|------|
| `dropThinkingBlocks(messages): AgentMessage[]` | 丟棄 thinking 區塊 |
| `isAssistantMessageWithContent(message): boolean` | 判斷是否為有內容的 assistant 訊息 |

#### sandbox-info.ts
| Export | 說明 |
|--------|------|
| `buildEmbeddedSandboxInfo(params): EmbeddedSandboxInfo` | 建構嵌入式 sandbox 資訊 |

#### skills-runtime.ts
| Export | 說明 |
|--------|------|
| `resolveEmbeddedRunSkillEntries(params): SkillEntry[]` | 解析嵌入式 run 的技能條目 |

#### Stream wrappers (anthropic-stream-wrappers.ts / openai-stream-wrappers.ts / moonshot-stream-wrappers.ts / proxy-stream-wrappers.ts)
| Export | 說明 |
|--------|------|
| `createAnthropicBetaHeadersWrapper(baseFn): StreamFn` | Anthropic beta headers 包裝 |
| `createAnthropicToolPayloadCompatibilityWrapper(baseFn): StreamFn` | Anthropic 工具 payload 相容包裝 |
| `createAnthropicFastModeWrapper(baseFn): StreamFn` | Anthropic fast mode 包裝 |
| `createBedrockNoCacheWrapper(baseFn): StreamFn` | Bedrock no-cache 包裝 |
| `createOpenAIFastModeWrapper(baseFn): StreamFn` | OpenAI fast mode 包裝 |
| `createOpenAIServiceTierWrapper(baseFn): StreamFn` | OpenAI service tier 包裝 |
| `createOpenAIResponsesContextManagementWrapper(baseFn): StreamFn` | OpenAI responses context 管理包裝 |
| `createCodexDefaultTransportWrapper(baseFn): StreamFn` | Codex 預設 transport 包裝 |
| `createOpenRouterSystemCacheWrapper(baseFn): StreamFn` | OpenRouter system cache 包裝 |
| `createOpenRouterWrapper(baseFn): StreamFn` | OpenRouter 包裝 |
| `createSiliconFlowThinkingWrapper(baseFn): StreamFn` | SiliconFlow thinking 包裝 |
| `createMoonshotThinkingWrapper(baseFn): StreamFn` | Moonshot thinking 包裝 |

#### openrouter-model-capabilities.ts
| Export | 說明 |
|--------|------|
| `loadOpenRouterModelCapabilities(modelId): Promise<void>` | 載入 OpenRouter 模型能力 |
| `getOpenRouterModelCapabilities(modelId): OpenRouterModelCapabilities` | 取得 OpenRouter 模型能力 |

#### cache-ttl.ts
| Export | 說明 |
|--------|------|
| `isCacheTtlEligibleProvider(provider, modelId): boolean` | 判斷 provider 是否支援 cache TTL |
| `readLastCacheTtlTimestamp(sessionManager): number \| null` | 讀取最後 cache TTL 時間戳 |
| `appendCacheTtlTimestamp(sessionManager, data)` | 追加 cache TTL 時間戳 |

#### types.ts
| Export | 說明 |
|--------|------|
| type `EmbeddedPiAgentMeta` | 嵌入式 PI agent meta 型別 |
| type `EmbeddedPiRunMeta` | 嵌入式 PI run meta 型別 |
| type `EmbeddedPiRunResult` | 嵌入式 PI run 結果型別 |
| type `EmbeddedPiCompactResult` | 嵌入式 PI compaction 結果型別 |
| type `EmbeddedSandboxInfo` | 嵌入式 sandbox 資訊型別 |

#### utils.ts
| Export | 說明 |
|--------|------|
| `mapThinkingLevel(level?): ThinkingLevel` | 映射 thinking level |
| `describeUnknownError(error): string` | 描述未知錯誤 |

#### other files
| File | Export | 說明 |
|------|--------|------|
| google.ts | `sanitizeToolsForGoogle(tools): ...` | Google 工具 schema 清理 |
| google.ts | `applyGoogleTurnOrderingFix(params): ...` | 修正 Google turn 排序 |
| google.ts | `sanitizeSessionHistory(params): Promise<...>` | 清理 session history |
| model.provider-normalization.ts | `normalizeResolvedProviderModel(params): ...` | 正規化已解析 provider 模型 |
| stream-payload-utils.ts | `streamWithPayloadPatch(stream, patch): Stream` | 帶 payload patch 的串流 |
| wait-for-idle-before-flush.ts | `flushPendingToolResultsAfterIdle(opts): Promise<...>` | idle 後 flush pending 工具結果 |

---

### pi-embedded-helpers/

#### bootstrap.ts
| Export | 說明 |
|--------|------|
| `stripThoughtSignatures<T>(messages): T` | 移除 thought signatures |
| `DEFAULT_BOOTSTRAP_MAX_CHARS` / `DEFAULT_BOOTSTRAP_TOTAL_MAX_CHARS` | Bootstrap 字元限制常數 |
| `resolveBootstrapMaxChars(cfg?): number` | 解析 bootstrap 最大字元數 |
| `ensureSessionHeader(params): Promise<...>` | 確保 session header |
| `buildBootstrapContextFiles(params): EmbeddedContextFile[]` | 建構 bootstrap 上下文檔案 |
| `sanitizeGoogleTurnOrdering(messages): AgentMessage[]` | 清理 Google turn 排序 |

#### errors.ts
| Export | 說明 |
|--------|------|
| `formatBillingErrorMessage(provider?, model?): string` | 格式化帳單錯誤訊息 |
| `isContextOverflowError(msg?): boolean` | 判斷是否為上下文溢出錯誤 |
| `isLikelyContextOverflowError(msg?): boolean` | 判斷是否可能為上下文溢出 |
| `isCompactionFailureError(msg?): boolean` | 判斷是否為 compaction 失敗 |
| `extractObservedOverflowTokenCount(msg?): number \| undefined` | 提取觀察到的溢出 token 數 |
| `classifyFailoverReason(raw): FailoverReason \| null` | 分類 failover 原因 |
| `isFailoverErrorMessage(raw): boolean` | 判斷是否為 failover 錯誤訊息 |
| `formatAssistantErrorText(params): string` | 格式化 assistant 錯誤文字 |
| `sanitizeUserFacingText(text): string` | 清理面向使用者的文字 |
| `isRateLimitAssistantError(msg): boolean` | 判斷是否為 rate limit 錯誤 |
| `isBillingAssistantError(msg): boolean` | 判斷是否為帳單錯誤 |
| `parseImageDimensionError(raw): ...` | 解析圖片尺寸錯誤 |
| `parseApiErrorInfo(raw?): ApiErrorInfo \| null` | 解析 API 錯誤資訊 |
| 其他大量 error 分類函式 | |

#### failover-matches.ts
| Export | 說明 |
|--------|------|
| `isRateLimitErrorMessage(raw): boolean` | Rate limit 錯誤匹配 |
| `isTimeoutErrorMessage(raw): boolean` | Timeout 錯誤匹配 |
| `isBillingErrorMessage(raw): boolean` | Billing 錯誤匹配 |
| `isAuthErrorMessage(raw): boolean` | Auth 錯誤匹配 |
| `isOverloadedErrorMessage(raw): boolean` | Overloaded 錯誤匹配 |

#### turns.ts
| Export | 說明 |
|--------|------|
| `validateGeminiTurns(messages): AgentMessage[]` | 驗證 Gemini turn 格式 |
| `mergeConsecutiveUserTurns(messages): AgentMessage[]` | 合併連續 user turns |
| `validateAnthropicTurns(messages): AgentMessage[]` | 驗證 Anthropic turn 格式 |

#### thinking.ts
| Export | 說明 |
|--------|------|
| `pickFallbackThinkingLevel(params): ThinkLevel` | 選擇 fallback thinking level |

#### images.ts
| Export | 說明 |
|--------|------|
| `isEmptyAssistantMessageContent(content): boolean` | 判斷 assistant 訊息內容是否為空 |
| `sanitizeSessionMessagesImages(messages): Promise<...>` | 清理 session 訊息圖片 |

#### messaging-dedupe.ts
| Export | 說明 |
|--------|------|
| `isMessagingToolDuplicate(text, sentTexts): boolean` | 判斷是否為重複的 messaging tool 結果 |

#### openai.ts
| Export | 說明 |
|--------|------|
| `downgradeOpenAIFunctionCallReasoningPairs(messages): AgentMessage[]` | 降級 OpenAI function call reasoning pairs |
| `downgradeOpenAIReasoningBlocks(messages): AgentMessage[]` | 降級 OpenAI reasoning blocks |

#### google.ts
| Export | 說明 |
|--------|------|
| `isGoogleModelApi(api?): boolean` | 判斷是否為 Google 模型 API |

#### types.ts
| Export | 說明 |
|--------|------|
| type `EmbeddedContextFile` | 嵌入式上下文檔案型別 |
| type `FailoverReason` | Failover 原因型別 |

---

### pi-embedded-subscribe.*

#### pi-embedded-subscribe.ts
| Export | 說明 |
|--------|------|
| `subscribeEmbeddedPiSession(params): ...` | **[Key API]** 訂閱嵌入式 PI session 事件 |

#### pi-embedded-subscribe.handlers.ts
| Export | 說明 |
|--------|------|
| `createEmbeddedPiSessionEventHandler(ctx): Function` | 建立嵌入式 PI session 事件處理器 |

#### pi-embedded-subscribe.handlers.lifecycle.ts
| Export | 說明 |
|--------|------|
| `handleAgentStart(ctx)` | 處理 agent 開始事件 |
| `handleAgentEnd(ctx)` | 處理 agent 結束事件 |

#### pi-embedded-subscribe.handlers.messages.ts
| Export | 說明 |
|--------|------|
| `handleMessageStart(ctx, msg)` | 處理訊息開始 |
| `handleMessageUpdate(ctx, msg)` | 處理訊息更新（串流 delta） |
| `handleMessageEnd(ctx, msg)` | 處理訊息結束 |
| `resolveSilentReplyFallbackText(params): string` | 解析靜默回覆 fallback 文字 |

#### pi-embedded-subscribe.handlers.tools.ts
| Export | 說明 |
|--------|------|
| `handleToolExecutionStart(ctx, params): Promise<...>` | 處理工具執行開始 |
| `handleToolExecutionUpdate(ctx, params)` | 處理工具執行更新 |
| `handleToolExecutionEnd(ctx, params): Promise<...>` | 處理工具執行結束 |

#### pi-embedded-subscribe.handlers.compaction.ts
| Export | 說明 |
|--------|------|
| `handleAutoCompactionStart(ctx)` | 處理自動 compaction 開始 |
| `handleAutoCompactionEnd(ctx, result)` | 處理自動 compaction 結束 |

#### pi-embedded-subscribe.tools.ts
| Export | 說明 |
|--------|------|
| `sanitizeToolResult(result): unknown` | 清理工具結果 |
| `extractToolResultText(result): string \| undefined` | 提取工具結果文字 |
| `isToolResultMediaTrusted(toolName?): boolean` | 判斷工具結果媒體是否可信 |
| `extractToolResultMediaPaths(result): string[]` | 提取工具結果媒體路徑 |
| `isToolResultError(result): boolean` | 判斷工具結果是否為錯誤 |
| `extractMessagingToolSend(result): MessagingToolSend \| undefined` | 提取 messaging tool send |

#### pi-embedded-subscribe.types.ts / pi-embedded-subscribe.handlers.types.ts
| Export | 說明 |
|--------|------|
| type `SubscribeEmbeddedPiSessionParams` | 訂閱參數型別 |
| type `EmbeddedPiSubscribeContext` | 訂閱上下文型別 |
| type `EmbeddedPiSubscribeState` | 訂閱狀態型別 |
| type `ToolHandlerContext` / `ToolHandlerState` | 工具處理器上下文/狀態型別 |

---

### pi-extensions/

#### compaction-safeguard.ts
| Export | 說明 |
|--------|------|
| `default compactionSafeguardExtension(api): void` | **[Extension]** Compaction safeguard extension（防止過度壓縮） |

#### compaction-instructions.ts
| Export | 說明 |
|--------|------|
| `DEFAULT_COMPACTION_INSTRUCTIONS` | 預設 compaction 指令 |
| `resolveCompactionInstructions(params): string` | 解析 compaction 指令 |
| `composeSplitTurnInstructions(params): string` | 組合分段 turn 指令 |

#### context-pruning/extension.ts
| Export | 說明 |
|--------|------|
| `default contextPruningExtension(api): void` | **[Extension]** Context pruning extension |

#### context-pruning/pruner.ts
| Export | 說明 |
|--------|------|
| `pruneContextMessages(params): AgentMessage[]` | 修剪上下文訊息 |

#### context-pruning/settings.ts
| Export | 說明 |
|--------|------|
| `computeEffectiveSettings(raw): EffectiveContextPruningSettings \| null` | 計算有效 context pruning 設定 |
| type `ContextPruningMode` / `ContextPruningConfig` / `EffectiveContextPruningSettings` | 設定型別 |

#### context-pruning/tools.ts
| Export | 說明 |
|--------|------|
| `makeToolPrunablePredicate(params): Function` | 建立工具可修剪判斷函式 |

#### session-manager-runtime-registry.ts
| Export | 說明 |
|--------|------|
| `createSessionManagerRuntimeRegistry<T>(): ...` | 建立 session manager runtime registry |

---

### pi-tools.* — 工具定義與包裝

#### pi-tools.ts
| Export | 說明 |
|--------|------|
| `createOpenClawCodingTools(options?): AnyAgentTool[]` | **[Key API]** 建立 OpenClaw coding 工具集 |
| `resolveToolLoopDetectionConfig(params): ...` | 解析工具迴圈偵測設定 |

#### pi-tools.read.ts
| Export | 說明 |
|--------|------|
| `wrapToolWorkspaceRootGuard(tool, root): AnyAgentTool` | 包裝工具加入 workspace root guard |
| `resolveToolPathAgainstWorkspaceRoot(params): ...` | 解析工具路徑（相對 workspace root） |
| `createSandboxedReadTool(params): AnyAgentTool` | 建立 sandboxed read 工具 |
| `createSandboxedWriteTool(params): AnyAgentTool` | 建立 sandboxed write 工具 |
| `createSandboxedEditTool(params): AnyAgentTool` | 建立 sandboxed edit 工具 |
| `createHostWorkspaceWriteTool(root): AnyAgentTool` | 建立 host workspace write 工具 |
| `createHostWorkspaceEditTool(root): AnyAgentTool` | 建立 host workspace edit 工具 |
| `createOpenClawReadTool(params): AnyAgentTool` | 建立 OpenClaw read 工具 |
| `wrapToolMemoryFlushAppendOnlyWrite(tool): AnyAgentTool` | 包裝工具加入 memory flush append-only write |

#### pi-tools.schema.ts
| Export | 說明 |
|--------|------|
| `normalizeToolParameters(schema): ...` | 正規化工具參數 schema |
| `cleanToolSchemaForGemini(schema): unknown` | 清理工具 schema 用於 Gemini |

#### pi-tools.params.ts
| Export | 說明 |
|--------|------|
| `normalizeToolParams(params): Record<string, unknown> \| undefined` | 正規化工具參數 |
| `patchToolSchemaForClaudeCompatibility(tool): AnyAgentTool` | Patch 工具 schema 用於 Claude 相容 |
| `assertRequiredParams(params, groups)` | 斷言必要參數 |
| `wrapToolParamNormalization(tool): AnyAgentTool` | 包裝工具加入參數正規化 |

#### pi-tools.policy.ts
| Export | 說明 |
|--------|------|
| `resolveSubagentToolPolicy(cfg?, depth?): SandboxToolPolicy` | 解析子代理工具政策 |
| `isToolAllowedByPolicyName(name, policy?): boolean` | 判斷工具是否被政策允許 |
| `filterToolsByPolicy(tools, policy): AnyAgentTool[]` | 依政策過濾工具 |
| `resolveEffectiveToolPolicy(params): ...` | 解析有效工具政策 |
| `resolveGroupToolPolicy(params): ...` | 解析群組工具政策 |
| `isToolAllowedByPolicies(name, policies): boolean` | 判斷工具是否被多重政策允許 |

#### pi-tools.abort.ts
| Export | 說明 |
|--------|------|
| `wrapToolWithAbortSignal(tool, signal): AnyAgentTool` | 包裝工具加入 abort signal |

#### pi-tools.before-tool-call.ts
| Export | 說明 |
|--------|------|
| `runBeforeToolCallHook(args): Promise<...>` | **[Hook Handler]** 執行 before-tool-call hook |
| `wrapToolWithBeforeToolCallHook(tool): AnyAgentTool` | 包裝工具加入 before-tool-call hook |
| `isToolWrappedWithBeforeToolCallHook(tool): boolean` | 判斷工具是否已包裝 hook |

#### pi-tools.host-edit.ts
| Export | 說明 |
|--------|------|
| `wrapHostEditToolWithPostWriteRecovery(tool): AnyAgentTool` | 包裝 host edit 工具加入 post-write recovery |

#### pi-tool-definition-adapter.ts
| Export | 說明 |
|--------|------|
| `toToolDefinitions(tools): ToolDefinition[]` | 將工具轉換為 tool definition 格式 |
| `toClientToolDefinitions(tools): ...` | 將工具轉換為 client tool definition |

---

### sandbox/ — Docker Sandbox 系統

#### types.ts
| Export | 說明 |
|--------|------|
| type `SandboxToolPolicy` / `SandboxConfig` / `SandboxContext` / `SandboxScope` / ... | Sandbox 相關型別定義 |

#### constants.ts
| Export | 說明 |
|--------|------|
| `DEFAULT_SANDBOX_IMAGE` / `DEFAULT_SANDBOX_WORKDIR` / ... | Sandbox Docker 預設常數 |

#### docker.ts
| Export | 說明 |
|--------|------|
| `execDocker(args, opts?): Promise<...>` | 執行 Docker 命令 |
| `buildSandboxCreateArgs(params): string[]` | 建構 sandbox 建立參數 |
| `ensureSandboxContainer(params): Promise<...>` | **[Key API]** 確保 sandbox 容器存在 |
| `ensureDockerImage(image): Promise<...>` | 確保 Docker image 存在 |
| `dockerContainerState(name): Promise<...>` | 取得 Docker 容器狀態 |

#### context.ts
| Export | 說明 |
|--------|------|
| `resolveSandboxContext(params): Promise<SandboxContext>` | **[Key API]** 解析 sandbox 上下文 |
| `ensureSandboxWorkspaceForSession(params): Promise<...>` | 確保 sandbox workspace |

#### config.ts
| Export | 說明 |
|--------|------|
| `resolveSandboxConfigForAgent(cfg, agentId): SandboxConfig` | 解析 agent 的 sandbox 設定 |
| `resolveSandboxDockerConfig(params): ...` | 解析 Docker 設定 |
| `resolveSandboxBrowserConfig(params): ...` | 解析 browser sandbox 設定 |

#### fs-bridge.ts
| Export | 說明 |
|--------|------|
| `createSandboxFsBridge(params): SandboxFsBridge` | **[Key API]** 建立 sandbox 檔案系統 bridge |
| type `SandboxFsBridge` | FS bridge 介面 |

#### fs-paths.ts
| Export | 說明 |
|--------|------|
| `buildSandboxFsMounts(sandbox): SandboxFsMount[]` | 建構 sandbox FS mounts |
| `resolveSandboxFsPathWithMounts(params): SandboxResolvedFsPath` | 解析 sandbox FS 路徑 |

#### fs-bridge-path-safety.ts
| Export | 說明 |
|--------|------|
| `class SandboxFsPathGuard` | Sandbox FS 路徑安全 guard |

#### fs-bridge-mutation-helper.ts
| Export | 說明 |
|--------|------|
| `buildPinnedWritePlan(params): ...` | 建構 pinned write plan |
| `buildPinnedMkdirpPlan(params): ...` | 建構 pinned mkdirp plan |
| `buildPinnedRemovePlan(params): ...` | 建構 pinned remove plan |

#### registry.ts
| Export | 說明 |
|--------|------|
| `readRegistry(): Promise<SandboxRegistry>` | 讀取 sandbox registry |
| `updateRegistry(entry)` | 更新 registry 條目 |
| `removeRegistryEntry(containerName)` | 移除 registry 條目 |

#### manage.ts
| Export | 說明 |
|--------|------|
| `listSandboxContainers(): Promise<SandboxContainerInfo[]>` | 列出 sandbox 容器 |
| `removeSandboxContainer(containerName): Promise<void>` | 移除 sandbox 容器 |
| `listSandboxBrowsers(): Promise<SandboxBrowserInfo[]>` | 列出 sandbox 瀏覽器 |
| `removeSandboxBrowserContainer(containerName): Promise<void>` | 移除 sandbox 瀏覽器容器 |

#### validate-sandbox-security.ts
| Export | 說明 |
|--------|------|
| `validateSandboxSecurity(params)` | **[Key API]** 驗證 sandbox 安全性（bind mounts、network、seccomp） |
| `validateBindMounts(params)` | 驗證 bind mounts 安全性 |
| `validateNetworkMode(params)` | 驗證網路模式安全性 |
| `BLOCKED_HOST_PATHS` | 被封鎖的 host 路徑清單 |

#### browser.ts
| Export | 說明 |
|--------|------|
| `ensureSandboxBrowser(params): Promise<...>` | 確保 sandbox 瀏覽器容器存在 |

#### prune.ts
| Export | 說明 |
|--------|------|
| `maybePruneSandboxes(cfg): Promise<...>` | 可能修剪過期 sandbox 容器 |

#### network-mode.ts / host-paths.ts / path-utils.ts / shared.ts / ...
| Export | 說明 |
|--------|------|
| 各種 sandbox 路徑、網路模式、hash、NoVNC 等輔助函式 | Sandbox 基礎設施 |

---

### schema/

#### clean-for-gemini.ts
| Export | 說明 |
|--------|------|
| `GEMINI_UNSUPPORTED_SCHEMA_KEYWORDS` | Gemini 不支援的 schema 關鍵字集合 |
| `cleanSchemaForGemini(schema): unknown` | 清理 schema 用於 Gemini |

#### clean-for-xai.ts
| Export | 說明 |
|--------|------|
| `stripXaiUnsupportedKeywords(schema): unknown` | 移除 xAI 不支援的 schema 關鍵字 |
| `isXaiProvider(provider?, modelId?): boolean` | 判斷是否為 xAI provider |

#### typebox.ts
| Export | 說明 |
|--------|------|
| `stringEnum<T>(values): TSchema` | 建立字串枚舉 schema |
| `channelTargetSchema(opts?): TSchema` | Channel target schema |

---

### skills/

#### workspace.ts
| Export | 說明 |
|--------|------|
| `buildWorkspaceSkillSnapshot(params): SkillSnapshot` | 建構 workspace 技能快照 |
| `buildWorkspaceSkillsPrompt(params): string` | 建構 workspace 技能 prompt |
| `resolveSkillsPromptForRun(params): string` | **[Key API]** 解析 run 的技能 prompt |
| `loadWorkspaceSkillEntries(params): SkillEntry[]` | 載入 workspace 技能條目 |
| `syncSkillsToWorkspace(params): Promise<...>` | 同步技能至 workspace |
| `filterWorkspaceSkillEntries(entries, filter): SkillEntry[]` | 過濾 workspace 技能條目 |
| `buildWorkspaceSkillCommandSpecs(entries): SkillCommandSpec[]` | 建構 workspace 技能命令規格 |

#### frontmatter.ts
| Export | 說明 |
|--------|------|
| `parseFrontmatter(content): ParsedSkillFrontmatter` | 解析 skill frontmatter |
| `resolveOpenClawMetadata(frontmatter): OpenClawSkillMetadata` | 解析 OpenClaw 技能 metadata |
| `resolveSkillInvocationPolicy(metadata): SkillInvocationPolicy` | 解析技能呼叫政策 |
| `resolveSkillKey(skill, entry?): string` | 解析技能 key |

#### config.ts
| Export | 說明 |
|--------|------|
| `resolveSkillConfig(entry, cfg): ...` | 解析技能設定 |
| `isBundledSkillAllowed(entry, allowlist?): boolean` | 判斷 bundled 技能是否被允許 |
| `shouldIncludeSkill(params): boolean` | 判斷是否應包含技能 |

#### env-overrides.ts
| Export | 說明 |
|--------|------|
| `getActiveSkillEnvKeys(): ReadonlySet<string>` | 取得活躍技能 env keys |
| `applySkillEnvOverrides(params)` | 套用技能環境變數覆蓋 |

#### filter.ts
| Export | 說明 |
|--------|------|
| `normalizeSkillFilter(filter?): string[] \| undefined` | 正規化技能過濾 |
| `matchesSkillFilter(name, filter): boolean` | 判斷技能是否匹配過濾 |

#### refresh.ts
| Export | 說明 |
|--------|------|
| `registerSkillsChangeListener(listener)` | 註冊技能變更監聽器 |
| `ensureSkillsWatcher(params)` | 確保技能 watcher |
| `bumpSkillsSnapshotVersion(params?)` | 遞增技能快照版本 |
| `getSkillsSnapshotVersion(workspaceDir?): number` | 取得技能快照版本 |

#### types.ts
| Export | 說明 |
|--------|------|
| type `SkillEntry` / `SkillSnapshot` / `SkillCommandSpec` / `SkillInvocationPolicy` / `SkillsInstallPreferences` | 技能相關型別 |

#### plugin-skills.ts / bundled-dir.ts / bundled-context.ts / tools-dir.ts / serialize.ts
| Export | 說明 |
|--------|------|
| `resolvePluginSkillDirs(params): string[]` | 解析 plugin 技能目錄 |
| `resolveBundledSkillsDir(opts?): string` | 解析 bundled 技能目錄 |
| `resolveBundledSkillsContext(opts?): BundledSkillsContext` | 解析 bundled 技能上下文 |
| `resolveSkillToolsRootDir(entry): string` | 解析技能工具 root 目錄 |
| `serializeByKey<T>(key, task): Promise<T>` | 依 key 序列化執行 |

---

### tools/ — Agent 可用工具集

#### common.ts
| Export | 說明 |
|--------|------|
| type `AnyAgentTool` | 任意 agent 工具型別 |
| `class ToolInputError extends Error` | 工具輸入錯誤 |
| `class ToolAuthorizationError extends ToolInputError` | 工具授權錯誤 |
| `readStringParam(params, key): string` | 讀取字串參數 |
| `readNumberParam(params, key): number` | 讀取數字參數 |
| `jsonResult(payload): AgentToolResult` | 建構 JSON 工具結果 |
| `imageResult(params): Promise<AgentToolResult>` | 建構圖片工具結果 |
| `wrapOwnerOnlyToolExecution(tool): AnyAgentTool` | 包裝 owner-only 工具執行 |
| `createActionGate(gates): Function` | 建立動作閘門 |

#### browser-tool.ts / browser-tool.actions.ts / browser-tool.schema.ts
| Export | 說明 |
|--------|------|
| `createBrowserTool(opts?): AnyAgentTool` | **[Tool Factory]** 建立瀏覽器工具 |
| `executeTabsAction(params): Promise<...>` | 執行 tabs 動作 |
| `executeSnapshotAction(params): Promise<...>` | 執行 snapshot 動作 |
| `executeConsoleAction(params): Promise<...>` | 執行 console 動作 |
| `executeActAction(params): Promise<...>` | 執行 act 動作（click/type/scroll 等） |
| `BrowserToolSchema` | 瀏覽器工具 TypeBox schema |

#### web-fetch.ts / web-search.ts / web-tools.ts
| Export | 說明 |
|--------|------|
| `createWebFetchTool(options?): AnyAgentTool` | **[Tool Factory]** 建立 web fetch 工具 |
| `createWebSearchTool(options?): AnyAgentTool` | **[Tool Factory]** 建立 web search 工具 |
| `fetchFirecrawlContent(params): Promise<...>` | Firecrawl 內容取得 |
| `extractReadableContent(params): Promise<...>` | 提取可讀內容 |

#### web-fetch-utils.ts / web-fetch-visibility.ts / web-shared.ts / web-guarded-fetch.ts
| Export | 說明 |
|--------|------|
| `htmlToMarkdown(html): { text, title? }` | HTML 轉 markdown |
| `markdownToText(markdown): string` | Markdown 轉純文字 |
| `truncateText(text, max): string` | 截斷文字 |
| `sanitizeHtml(html): Promise<string>` | 清理 HTML |
| `stripInvisibleUnicode(text): string` | 移除不可見 Unicode |
| `fetchWithWebToolsNetworkGuard(url, opts): Promise<Response>` | 帶網路 guard 的 fetch |

#### image-tool.ts / image-tool.helpers.ts
| Export | 說明 |
|--------|------|
| `createImageTool(options?): AnyAgentTool` | **[Tool Factory]** 建立圖片分析工具 |
| `resolveImageModelConfigForTool(params): ImageModelConfig` | 解析圖片模型設定 |
| `coerceImageModelConfig(cfg?): ImageModelConfig` | 強制轉換圖片模型設定 |

#### pdf-tool.ts / pdf-tool.helpers.ts / pdf-native-providers.ts
| Export | 說明 |
|--------|------|
| `createPdfTool(options?): AnyAgentTool` | **[Tool Factory]** 建立 PDF 分析工具 |
| `anthropicAnalyzePdf(params): Promise<...>` | Anthropic 原生 PDF 分析 |
| `geminiAnalyzePdf(params): Promise<...>` | Gemini 原生 PDF 分析 |
| `providerSupportsNativePdf(provider): boolean` | 判斷 provider 是否原生支援 PDF |

#### canvas-tool.ts
| Export | 說明 |
|--------|------|
| `createCanvasTool(options?): AnyAgentTool` | **[Tool Factory]** 建立 canvas 工具 |

#### tts-tool.ts
| Export | 說明 |
|--------|------|
| `createTtsTool(opts?): AnyAgentTool` | **[Tool Factory]** 建立 TTS 工具 |

#### memory-tool.ts
| Export | 說明 |
|--------|------|
| `createMemorySearchTool(options): AnyAgentTool` | **[Tool Factory]** 建立記憶搜尋工具 |
| `createMemoryGetTool(options): AnyAgentTool` | **[Tool Factory]** 建立記憶取得工具 |

#### message-tool.ts
| Export | 說明 |
|--------|------|
| `createMessageTool(options?): AnyAgentTool` | **[Tool Factory]** 建立 messaging 工具（跨 channel 發訊） |

#### cron-tool.ts
| Export | 說明 |
|--------|------|
| `createCronTool(opts?): AnyAgentTool` | **[Tool Factory]** 建立 cron 排程工具 |

#### gateway-tool.ts / gateway.ts
| Export | 說明 |
|--------|------|
| `createGatewayTool(opts?): AnyAgentTool` | **[Tool Factory]** 建立 gateway 工具 |
| `callGatewayTool<T>(params): Promise<T>` | 呼叫 gateway 工具 |

#### nodes-tool.ts / nodes-utils.ts
| Export | 說明 |
|--------|------|
| `createNodesTool(options?): AnyAgentTool` | **[Tool Factory]** 建立 nodes 管理工具 |
| `listNodes(opts): Promise<NodeListNode[]>` | 列出 nodes |
| `resolveNodeId(params): Promise<string>` | 解析 node ID |

#### session-status-tool.ts
| Export | 說明 |
|--------|------|
| `createSessionStatusTool(opts?): AnyAgentTool` | **[Tool Factory]** 建立 session status 工具 |

#### sessions-list-tool.ts / sessions-history-tool.ts / sessions-send-tool.ts / sessions-spawn-tool.ts / sessions-yield-tool.ts
| Export | 說明 |
|--------|------|
| `createSessionsListTool(opts?): AnyAgentTool` | **[Tool Factory]** 建立 sessions list 工具 |
| `createSessionsHistoryTool(opts?): AnyAgentTool` | **[Tool Factory]** 建立 sessions history 工具 |
| `createSessionsSendTool(opts?): AnyAgentTool` | **[Tool Factory]** 建立 sessions send 工具 |
| `createSessionsSpawnTool(opts?): AnyAgentTool` | **[Tool Factory]** 建立 sessions spawn 工具 |
| `createSessionsYieldTool(opts?): AnyAgentTool` | **[Tool Factory]** 建立 sessions yield 工具 |

#### sessions-access.ts / sessions-resolution.ts / sessions-helpers.ts / sessions-send-helpers.ts / sessions-announce-target.ts
| Export | 說明 |
|--------|------|
| `resolveSessionToolsVisibility(cfg): SessionToolsVisibility` | 解析 session tools 可見性 |
| `createSessionVisibilityGuard(params): Promise<...>` | 建立 session 可見性 guard |
| `resolveSessionReference(params): Promise<SessionReferenceResolution>` | 解析 session 參考 |
| `resolveVisibleSessionReference(params): Promise<...>` | 解析可見 session 參考 |
| `resolveSessionToolContext(opts?): ...` | 解析 session 工具上下文 |
| `classifySessionKind(params): SessionKind` | 分類 session 類型 |
| `resolveAnnounceTarget(params): Promise<AnnounceTarget>` | 解析公告目標 |

#### sessions-send-tool.a2a.ts
| Export | 說明 |
|--------|------|
| `runSessionsSendA2AFlow(params): Promise<...>` | 執行 sessions send A2A 流程 |

#### agents-list-tool.ts / subagents-tool.ts
| Export | 說明 |
|--------|------|
| `createAgentsListTool(opts?): AnyAgentTool` | **[Tool Factory]** 建立 agents list 工具 |
| `createSubagentsTool(opts?): AnyAgentTool` | **[Tool Factory]** 建立 subagents 管理工具 |

#### agent-step.ts
| Export | 說明 |
|--------|------|
| `readLatestAssistantReply(params): Promise<...>` | 讀取最新 assistant 回覆 |
| `runAgentStep(params): Promise<...>` | 執行 agent step |

#### discord-actions.ts / discord-actions-*.ts
| Export | 說明 |
|--------|------|
| `handleDiscordAction(params): Promise<...>` | **[Channel Tool Handler]** 處理 Discord 動作 |
| `handleDiscordGuildAction(params): Promise<...>` | 處理 Discord guild 動作 |
| `handleDiscordMessagingAction(params): Promise<...>` | 處理 Discord messaging 動作 |
| `handleDiscordModerationAction(params): Promise<...>` | 處理 Discord moderation 動作 |
| `handleDiscordPresenceAction(params): Promise<...>` | 處理 Discord presence 動作 |

#### slack-actions.ts
| Export | 說明 |
|--------|------|
| `handleSlackAction(params): Promise<...>` | **[Channel Tool Handler]** 處理 Slack 動作 |

#### telegram-actions.ts
| Export | 說明 |
|--------|------|
| `handleTelegramAction(params): Promise<...>` | **[Channel Tool Handler]** 處理 Telegram 動作 |
| `readTelegramButtons(params): ...` | 讀取 Telegram 按鈕 |

#### whatsapp-actions.ts / whatsapp-target-auth.ts
| Export | 說明 |
|--------|------|
| `handleWhatsAppAction(params): Promise<...>` | **[Channel Tool Handler]** 處理 WhatsApp 動作 |
| `resolveAuthorizedWhatsAppOutboundTarget(params): ...` | 解析授權的 WhatsApp 出站目標 |

#### media-tool-shared.ts
| Export | 說明 |
|--------|------|
| `applyImageModelConfigDefaults(config): ...` | 套用圖片模型設定預設值 |
| `resolveMediaToolLocalRoots(params): string[]` | 解析媒體工具本地 roots |
| `resolveModelFromRegistry(params): ...` | 從 registry 解析模型 |
| `resolveModelRuntimeApiKey(params): Promise<...>` | 解析模型 runtime API key |

#### model-config.helpers.ts
| Export | 說明 |
|--------|------|
| `resolveDefaultModelRef(cfg?): { provider, model }` | 解析預設模型參考 |
| `hasAuthForProvider(params): boolean` | 判斷 provider 是否有認證 |

#### tool-runtime.helpers.ts (barrel re-export)
| Export | 說明 |
|--------|------|
| Re-exports from model-auth, model-fallback, models-config, pi-model-discovery, workspace-dir | 工具 runtime 共用 helpers |

#### web-search-citation-redirect.ts
| Export | 說明 |
|--------|------|
| `resolveCitationRedirectUrl(url): Promise<string>` | 解析引用重導向 URL |

---

### pi-embedded-utils.ts — 嵌入式工具函式

| Export | 說明 |
|--------|------|
| `isAssistantMessage(msg): msg is AssistantMessage` | Assistant 訊息型別守衛 |
| `stripMinimaxToolCallXml(text): string` | 移除 MiniMax 工具呼叫 XML |
| `stripModelSpecialTokens(text): string` | 移除模型特殊 token |
| `stripDowngradedToolCallText(text): string` | 移除降級的工具呼叫文字 |
| `stripThinkingTagsFromText(text): string` | 移除 thinking tags |
| `extractAssistantText(msg): string` | 提取 assistant 文字 |
| `extractAssistantThinking(msg): string` | 提取 assistant thinking |
| `formatReasoningMessage(text): string` | 格式化 reasoning 訊息 |
| `splitThinkingTaggedText(text): ThinkTaggedSplitBlock[] \| null` | 分割 thinking tagged 文字 |
| `promoteThinkingTagsToBlocks(message)` | 將 thinking tags 提升為 blocks |
| `inferToolMetaFromArgs(toolName, args): string \| undefined` | 從參數推導工具 meta |

---

## Agent Lifecycle 關鍵路徑

Agent 從建立到完成的關鍵函式呼叫鏈：

1. **`resolveRunWorkspaceDir()`** → 解析 workspace 目錄
2. **`ensureAgentWorkspace()`** → 確保 workspace 已建立
3. **`loadWorkspaceBootstrapFiles()`** → 載入 AGENTS.md/SOUL.md 等 bootstrap 檔
4. **`resolveDefaultModelForAgent()`** → 解析 agent 要用的模型
5. **`resolveApiKeyForProvider()`** → 取得認證（含 profile rotation）
6. **`createOpenClawCodingTools()`** → 建立工具集
7. **`buildAgentSystemPrompt()`** → 建構系統提示
8. **`runEmbeddedPiAgent()`** → **核心 run loop**
   - 8a. `resolveModelAsync()` → 解析模型 instance
   - 8b. `buildEmbeddedRunPayloads()` → 建構 run payloads
   - 8c. `runEmbeddedAttempt()` → 執行單次 LLM 呼叫
   - 8d. Stream wrappers (anthropic/openai/moonshot/proxy) → 包裝串流
   - 8e. `subscribeEmbeddedPiSession()` → 訂閱事件
     - `handleMessageStart/Update/End()` → 處理訊息
     - `handleToolExecutionStart/End()` → 處理工具呼叫
   - 8f. `compactEmbeddedPiSession()` → 上下文壓縮（若需要）
   - 8g. `detectToolCallLoop()` → 偵測工具迴圈
9. **`runSubagentAnnounceFlow()`** → 子代理完成回報（若為子代理）

## Tool 系統

### 工具註冊

工具透過 factory 函式建立（`create*Tool()`），統一在 `createOpenClawCodingTools()` 中組裝。每個工具是 `AgentTool<TSchema, TResult>` 實例，包含：
- `name`: 工具識別名稱
- `description`: 工具描述
- `parameters`: TypeBox schema
- `execute(params)`: 執行函式

### 工具包裝管線

工具建立後經過多層包裝：
1. `patchToolSchemaForClaudeCompatibility()` → Claude schema 相容
2. `wrapToolParamNormalization()` → 參數正規化
3. `wrapToolWithBeforeToolCallHook()` → Before-tool-call hook
4. `wrapToolWithAbortSignal()` → Abort signal
5. `wrapToolWorkspaceRootGuard()` → Workspace root 存取 guard
6. `filterToolsByPolicy()` → 工具政策過濾
7. `applyOwnerOnlyToolPolicy()` → Owner-only 限制

### 工具分類

| 類別 | 工具 |
|------|------|
| **Exec** | exec (bash), process (background jobs) |
| **File** | read, write, edit, apply-patch |
| **Web** | web-fetch, web-search |
| **Media** | image (vision), pdf, tts, canvas |
| **Browser** | browser (CDP-based) |
| **Messaging** | message (cross-channel), discord/slack/telegram/whatsapp actions |
| **Session** | sessions-list, sessions-history, sessions-send, sessions-spawn, sessions-yield |
| **Agent** | agents-list, subagents, agent-step |
| **Infrastructure** | gateway, nodes, cron, session-status, memory-search, memory-get |

## 跨模組依賴

`src/agents/` 依賴以下 `src/` 子目錄：

| 依賴模組 | 用途 |
|----------|------|
| `config/` | 配置載入（OpenClawConfig）、路徑解析、model input |
| `routing/` | Session key 解析與路由 |
| `infra/` | Backoff、CLI root options、path prepend、secure random、network |
| `logging/` | Subsystem logger、diagnostic state |
| `plugins/` | Hook runner、plugin types |
| `process/` | Command queue（lane-based 序列化）、supervisor |
| `sessions/` | Session state、input provenance |
| `context-engine/` | Context engine 初始化與解析 |
| `auto-reply/` | Heartbeat、thinking、tokens、tool-meta、reply queue、status |
| `channels/` | Channel capabilities、plugin definitions |
| `extensions/` | Discord/Slack/Telegram/WhatsApp/Signal channel extensions（actions/send/accounts） |
| `utils/` | 通用工具（message-channel、provider-utils） |
| `shared/` | Text utilities |
| `config/sessions/` | Session 型別 |
| `secrets/` | Secret management |
| `security/` | Security validation |
| `media/` | Media constants |
| `memory/` | Memory search |
| `browser/` | Browser bridge/client/config/proxy |
| `gateway/` | Gateway protocol |
| `hooks/` | Hook definitions |
| `tts/` | TTS engine |
| `providers/` | Provider definitions |
| `markdown/` | Markdown processing |
| `cron/` | Cron scheduling |
| `acp/` | ACP (Agent Communication Protocol) |
