# OpenClaw 系統架構總覽

## 專案概要

OpenClaw 是 TypeScript/Node.js 多頻道 AI 助理平台（MIT），採 CLI + Gateway（HTTP/WS）+ Plugin 架構。
- **Monorepo**: pnpm workspace | 2878 TS 原始檔 | 52 src 子目錄 | 40 extensions | 52 skills
- **Runtime**: Node.js >=22.12.0 | TypeScript 5.9.3 | Build: tsdown | Test: Vitest
- **版本**: 2026.3.9

## 核心資料流

```
使用者訊息
  ↓
[CLI / App / Web UI]
  ↓ (WebSocket / HTTP)
[Gateway Server]
  ├─ Auth（token/password/device/tailscale）
  ├─ Route Resolution（peer→role→account→default 四層）
  ├─ Session Key 產生（dmScope + thread）
  ↓
[Auto-Reply Pipeline]
  ├─ Envelope（頻道 metadata + timestamp）
  ├─ Memory Search（hybrid vector + FTS）
  ├─ Media Understanding（image/audio/video）
  ├─ Link Understanding（URL 內容抓取）
  ↓
[Agent Runner（pi-embedded-runner）]
  ├─ Model/Auth Profile 解析 + 輪替
  ├─ Context Engine（bootstrap → assemble → compact）
  ├─ System Prompt 建構（bootstrap files + skills + docs）
  ├─ LLM Streaming（Anthropic/OpenAI/Google/Ollama/Copilot）
  ├─ Tool 執行（Bash/Files/Browser/Message/Cron/Custom）
  ├─ 24 Plugin Hooks（before_model_resolve → agent_end）
  ↓
[Outbound Delivery]
  ├─ Text Chunking + Media Hosting
  ├─ TTS（Edge/OpenAI/ElevenLabs）
  ├─ Channel Adapter（Telegram/Discord/Slack/LINE/Signal/WhatsApp/...）
  ↓
通訊平台 → 使用者
```

## 子系統關聯圖

```
┌──────────────────────────────────────────────────────────────────────┐
│                         openclaw.mjs (Bootstrap)                     │
│                              ↓                                       │
│                         src/entry.ts (CLI Dispatcher)                │
│                              ↓                                       │
│                     src/cli/run-main.ts                              │
│                    ┌─────────┼──────────┐                            │
│                    ↓         ↓          ↓                            │
│               [Routes]  [Commander]  [Config Guard]                  │
│                    └─────────┼──────────┘                            │
│                              ↓                                       │
│  ┌───────────────────────────┼───────────────────────────┐          │
│  │              GATEWAY SERVER (server.impl.ts)           │          │
│  │  ┌──────┬──────┬──────┬──────┬──────┬──────┐         │          │
│  │  │ WS   │ HTTP │ Auth │ Node │Broad-│Config│         │          │
│  │  │Server│Routes│      │Reg.  │cast  │Reload│         │          │
│  │  └──┬───┴──┬───┴──┬───┴──┬───┴──┬───┴──┬───┘         │          │
│  │     │      │      │      │      │      │              │          │
│  │  70+ RPC Methods (chat/agent/config/nodes/cron/...)   │          │
│  └───────────────────────┬───────────────────────────────┘          │
│                          │                                           │
│  ┌───────────┬───────────┼───────────┬───────────┐                  │
│  ↓           ↓           ↓           ↓           ↓                  │
│ [Channels] [Agents]   [Plugins]   [Cron]      [ACP]                │
│ Telegram   pi-embed   registry    service     session              │
│ Discord    run.ts     hooks.ts    delivery    control-plane        │
│ Slack      attempt    plugin-sdk  isolated    translator           │
│ LINE       auth-prof  loader.ts   agent                            │
│ Signal     tools                                                    │
│ WhatsApp   model.ts                                                 │
│ Web/iMsg                                                            │
│  ↑           ↑           ↑                                          │
│  └───────────┼───────────┘                                          │
│              ↓                                                       │
│  ┌───────────────────────────────────────────┐                      │
│  │           INFRASTRUCTURE                    │                      │
│  │  config/  security/  secrets/  infra/      │                      │
│  │  logging/ process/   daemon/   shared/     │                      │
│  │  terminal/ utils/    types/                │                      │
│  └───────────────────────────────────────────┘                      │
│              ↓                                                       │
│  ┌───────────────────────────────────────────┐                      │
│  │           FEATURE SUBSYSTEMS               │                      │
│  │  memory/        auto-reply/    media/      │                      │
│  │  browser/       context-engine/ tts/       │                      │
│  │  media-understanding/  link-understanding/ │                      │
│  │  sessions/      providers/                 │                      │
│  └───────────────────────────────────────────┘                      │
└──────────────────────────────────────────────────────────────────────┘

外圍：
  extensions/ (40 plugins) ← Plugin SDK API
  ui/ (Lit.js Dashboard) ← WebSocket Protocol
  skills/ (52 skills) ← SKILL.md + subprocess
  apps/ (Android/iOS/macOS) ← WebSocket Protocol
  scripts/ (100+ build/test/CI scripts)
```

## 關鍵入口檔案

| 檔案 | 角色 | 行數 |
|------|------|------|
| `openclaw.mjs` | Node.js Bootstrap（版本檢查、compile cache） | ~80 |
| `src/entry.ts` | CLI Dispatcher（respawn、profile、fast-path） | ~200 |
| `src/cli/run-main.ts` | CLI 主流程（config、program、parse） | ~300 |
| `src/cli/program/command-registry.ts` | 核心指令 Lazy Loading | ~200 |
| `src/cli/program/register.subclis.ts` | 27 Sub-CLI 註冊 | ~300 |
| `src/gateway/server.impl.ts` | Gateway 核心（WS/HTTP/Auth/Channels） | ~2100 |
| `src/agents/pi-embedded-runner/run.ts` | Agent Turn 執行器（retry loop） | ~1500 |
| `src/agents/pi-embedded-runner/run/attempt.ts` | 單次 LLM 呼叫 | ~1700 |
| `src/plugins/registry.ts` | Plugin 註冊 | ~400 |
| `src/plugins/hooks.ts` | Hook Runner（24 hooks） | ~600 |
| `src/config/io.ts` | Config 載入（JSON5 + Zod） | ~500 |
| `src/routing/resolve-route.ts` | Agent 路由解析 | ~400 |

## 設計模式摘要

| 模式 | 用途 | 位置 |
|------|------|------|
| Lazy Loading | 指令/子指令按需載入，加速 CLI 啟動 | cli/program/ |
| Fast-Path Routes | 9 條快速路由繞過 Commander 解析 | cli/program/routes.ts |
| Symbol-Based DI | ProgramContext 用 Symbol 避免污染公開 API | cli/program/program-context.ts |
| WeakMap Cache | Route 快取隨 config GC 自動失效 | routing/resolve-route.ts |
| Plugin Adapter | ChannelPlugin 統一 9 頻道的 20+ adapter 介面 | channels/plugins/types.ts |
| Hook Runner | 24 typed hooks（modifying/void/sync 三種模式） | plugins/hooks.ts |
| Auth Profile Rotation | Round-robin + cooldown + failover | agents/auth-profiles/ |
| Context Engine | bootstrap → assemble → compact 生命週期 | context-engine/ |
| Atomic Write | temp file + rename 防止 TOCTOU | infra/fs-safe.ts |
| Gateway Lock | File-based 單 Gateway 協調 | infra/gateway-lock.ts |
