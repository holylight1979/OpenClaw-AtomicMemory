# Agent 子系統

## 架構概要

Agent 子系統管理 LLM 生命週期：model 解析 → auth profile 輪替 → context 組裝 → LLM streaming → tool 執行 → 回覆組裝。

**核心檔案**: `src/agents/pi-embedded-runner/run.ts`（~1500 行）

## Agent 生命週期

### runEmbeddedPiAgent()（主 Orchestrator）

```
1. 初始化：workspace + plugin hooks + before_model_resolve
2. Model/Auth 解析：resolveModel() + context window 驗證 + auth profile 排序
3. 主迴圈（max 24 + 8×profiles, cap 160 iterations）：
   ├─ Auth Profile 選擇（round-robin + cooldown probe）
   ├─ runEmbeddedAttempt()（單次 LLM 呼叫）
   ├─ 錯誤回復：auth rotation → fallback model → context overflow handling
   └─ 結果組裝
```

### runEmbeddedAttempt()（單次 LLM 呼叫）

```
1. Session + Sandbox 設定
2. Skill + Bootstrap 解析（OPENCLAW.md, AGENTS.md 等）
3. Tool 設定：createOpenClawCodingTools() + 過濾 + 清理
4. System Prompt 建構
5. Session Manager：載入/修復 session + 歷史清理
6. Context Engine：bootstrap() → assemble() → compact()
7. Stream Function 組裝（provider-specific wrappers）
8. Subscription 設定（text_delta, tool_calls, tool_results）
9. Agent Loop：session.steer(prompt) → streaming → tool execution
10. Result Assembly
```

## Model 解析

```typescript
resolveModel(provider, modelId, agentDir, config) → { model, error, authStorage, modelRegistry }
```

**Model 結構**：
- id, provider, api（openai/anthropic/ollama/openai-responses）
- baseUrl, headers, input, contextWindow, maxTokens
- reasoning（extended thinking）, cost, compat

**Provider-Specific 處理**：
- Anthropic：scrubAnthropicRefusalMagic
- Google/Vertex：Tool call 清理、thinking block 驗證
- Ollama：Native /api/chat + num_ctx 注入
- OpenAI：Response format 驗證、function call 降級
- GitHub Copilot：Token refresh（5 分鐘排程）
- X.AI/Grok：Tool argument 解碼

## Auth Profile 系統

**存儲**：`~/.openclaw/state/auth-profiles.json`

```typescript
AuthProfileStore = {
  profiles: Record<string, ApiKeyCredential | TokenCredential | OAuthCredential>
  order?: Record<provider, string[]>     // 輪替順序
  lastGood?: Record<provider, string>    // 上次成功
  usageStats?: Record<profileId, { lastUsed, cooldownUntil, errorCount, failureCounts }>
}
```

**輪替邏輯**：locked profile > config-specified > round-robin > random
**Cooldown**：rate_limit → exponential backoff；success → reset

**Error 分類**：auth(401/403), rate_limit(429), billing, overloaded(503), timeout(408), format, unknown

## Tool 系統

**內建 Tools**：
Bash/Exec, Read/Write/List Files, Sessions（subagents）, Message（channels）, Browser（Playwright）, Cron, Search, Ollama, Vision, Custom

**Tool 呼叫流程**：
1. Session 收到 tool_calls
2. Agent loop 派發到 tool handler
3. Tool 執行（可能 sandbox）
4. Result 累積 → onToolResult callback
5. Tool result 截斷（超 context window 時）
6. 重送 history + result → 下次 model call

## Context Window 管理

```
evaluateContextWindowGuard() → warnBelowTokens: 32K, hardMinTokens: 8K
fallback: config contextTokens → model contextWindow → 200K default
```

**Overflow 回復**：
1. Context Engine compact()（max 3 attempts）
2. truncateOversizedToolResultsInSession()（最舊優先）
3. 全部失敗 → context_overflow error

## Agent Scope 解析

**優先順序**：
1. 顯式 agentId
2. Session key 解析
3. Config default agent
4. `DEFAULT_AGENT_ID`（"default"）

**Agent Config**：name, workspace, model（primary + fallbacks）, skills, humanDelay, heartbeat, identity, groupChat, sandbox, tools.disabled

## Streaming 訂閱（subscribeEmbeddedPiSession）

累積 agent 輸出：assistantTexts, toolMetas, blockState（thinking/final）, messagingToolSentTexts

**事件**：onAssistantMessageStart, onTextDelta, onText, onToolCall, onToolResult, onAssistantMessage, onCompaction, onError

## Failover Error

```typescript
FailoverError { reason, provider, model, profileId?, status? }
```

Gateway 捕獲 → 嘗試下一個 model
