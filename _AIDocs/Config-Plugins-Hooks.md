# Config + Plugin + Hook 系統

## 一、Config 子系統

### 載入管線

```
讀取檔案（JSON5）→ env 變數替換 → includes 遞迴合併 → merge patch
  → Zod Schema 驗證 → runtime defaults → SHA256 快取
```

**關鍵函式**：`loadConfig()`, `parseConfigJson5()`, `writeConfigFile()`, `getRuntimeConfigSnapshot()`

### 驗證層級

1. Legacy 格式偵測（`findLegacyConfigIssues()`）
2. Zod 結構驗證（`OpenClawSchema.safeParse()`）
3. 跨欄位驗證（duplicate agents, avatar, tailscale bind）
4. Plugin-aware 驗證（plugin manifest configSchema）
5. Defaults 套用（model, agent, session）

### Sensitive 欄位

- `$env:VAR_NAME` / `$secrets:secret-name` 語法
- 在 round-trip 時保留原始 reference
- UI 輸出時 redact

### JSON Schema + UI Hints

`buildConfigSchema({ plugins, channels })` 產出合併後 JSON Schema + uiHints。
快取 max 64 entries（LRU）。
`lookupConfigSchema(response, path)` 支援 wildcard 導航。

---

## 二、Plugin 子系統

### 完整生命週期

```
1. DISCOVERY → 掃描 bundled/global/workspace/config 路徑
2. MANIFEST → 讀取 openclaw.plugin.json，建立 PluginManifestRegistry
3. LOADING → Jiti import + register(api) + activate(api) → PluginRegistry
4. HOOK CONVERSION → TypedPluginHookRegistration → hook runner
5. GLOBAL INIT → createHookRunner(registry) → globalThis Symbol
```

### Discovery 來源

| 來源 | 路徑 | 優先級 |
|------|------|--------|
| bundled | dist/extensions/ | 最低 |
| global | ~/.openclaw/extensions/ | |
| workspace | {workspace}/.openclaw/extensions/ | |
| config | plugins.load.paths[] | 最高 |

### Enable State 決策樹

```
plugins.enabled === false → DISABLED
pluginId in deny[] → DISABLED
allow[] 非空 && pluginId not in allow[] → DISABLED
entries[id].enabled === false → DISABLED
origin=bundled && not in BUNDLED_ENABLED_BY_DEFAULT → DISABLED
否則 → ENABLED
```

### Plugin API（OpenClawPluginApi）

```typescript
api.registerTool(tool, opts?)
api.registerHook(events, handler, opts?)
api.registerHttpRoute(params)
api.registerChannel(plugin)
api.registerGatewayMethod(method, handler)
api.registerCli(registrar, opts?)
api.registerService(service)
api.registerProvider(provider)
api.registerCommand(definition)
api.registerContextEngine(id, factory)
api.on<K>(hookName, handler, opts?)
```

### Plugin Runtime 能力

config（getAll, getAgent）, system（env, platform）, media（download, tempFile）, tts, stt, tools（runCommand, git）, channel（phone normalize）, events（emitInternalHook）, logging, state, modelAuth, subagent（run, wait, getSessionMessages）

### Manifest 格式（openclaw.plugin.json）

```json
{
  "id": "plugin-id",
  "configSchema": { "type": "object", "properties": {...} },
  "channels": ["discord"],
  "providers": ["openai"],
  "uiHints": { "config.apiKey": { "label": "API Key", "sensitive": true } }
}
```

---

## 三、Hook 子系統

### 24 Plugin Hooks（typed）

**Agent Hooks**：
before_model_resolve, before_prompt_build, before_agent_start（legacy）, llm_input, llm_output, agent_end, before_compaction, after_compaction, before_reset

**Message Hooks**：
message_received, message_sending, message_sent

**Tool Hooks**：
before_tool_call, after_tool_call, tool_result_persist（SYNC）, before_message_write（SYNC）

**Session Hooks**：
session_start, session_end

**Subagent Hooks**：
subagent_spawning, subagent_delivery_target, subagent_spawned, subagent_ended

**Gateway Hooks**：
gateway_start, gateway_stop

### 執行模式

| 模式 | 執行方式 | 代表 Hooks |
|------|----------|-----------|
| Fire-and-forget | Promise.all 平行 | llm_input, agent_end, message_received |
| Modifying | 依 priority 循序，結果合併 | before_model_resolve, message_sending, before_tool_call |
| Synchronous | 循序，無 Promise | tool_result_persist, before_message_write |

### Internal Hooks（Legacy 事件系統）

10 個事件：gateway:startup, agent:bootstrap, message:received/transcribed/preprocessed/sent, command:stop/reset/new

**載入**：HOOK.md frontmatter → handler.ts/js → `registerInternalHook(eventKey, handler)`
**觸發**：`triggerInternalHook(event)` → type-only + type:action 雙查詢

### Bundled Hooks（4 個）

| Hook | 事件 | 功能 |
|------|------|------|
| boot-md | gateway:startup | 執行 BOOT.md |
| bootstrap-extra-files | agent:bootstrap | 注入 AGENTS.md 等 bootstrap 檔 |
| command-logger | command:* | 記錄指令到 commands.log |
| session-memory | command:new/reset | LLM slug + workspace memory |

### Prompt Injection 防護

`plugins.entries.{id}.hooks.allowPromptInjection?: boolean`（預設 false）
false 時 hook 結果中的 systemPrompt / prependContext 等被移除。
