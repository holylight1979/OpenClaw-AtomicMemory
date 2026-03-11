# 功能子系統

## Memory（src/memory/ — 59 files）

**架構**：MemoryIndexManager（核心）→ SQLite + vector extension + FTS

**資料流**：
1. Ingest：memory/ + sessions/ → chunked → embedded → indexed
2. Search：query → embeddings/FTS → hybrid ranking（BM25 + semantic）→ top-k
3. Sync：file watchers + interval syncing

**Embedding Providers**：OpenAI, Gemini, Voyage, Mistral, Ollama, local

**關鍵 Export**：`search(query, opts?)`, `readFile(relPath)`, `status()`

---

## Auto-Reply（src/auto-reply/ — 120+ files）

**Pipeline**：
```
Inbound → Envelope（channel metadata）→ Templating（context vars）
  → Memory Search → Media Understanding → Link Understanding
  → Agent Runner（pi-agent-core）→ Block Streaming（async coalescing）
  → Dispatch（throttling, buffering, typing indicators）
```

**核心函式**：
- `getReplyFromConfig()` — 從 config 取得回覆
- `dispatchInboundMessage()` — 完整 pipeline 協調
- `extractModelDirective()` — 解析 /model, /think, /verbose 指令

**Command Registry**：內建 + extension commands

---

## Media Processing（src/media/ — 23 files）

- `host.ts` — 確保 media 可透過 URL 存取（with TTL）
- `store.ts` — 存儲 + dedup + 安全路徑
- `server.ts` — HTTP server（range request 支援）
- `parse.ts` — 從文字提取 `MEDIA:` tokens

---

## Media Understanding（src/media-understanding/ — 22 files）

多 provider 圖片/音訊/影片分析：Anthropic, Deepgram, Google, Groq, Mistral, Moonshot, OpenAI, Zai

**流程**：偵測附件 → 解析 capabilities → 快取檢查 → 平行轉錄/描述 → 注入訊息

---

## Browser Automation（src/browser/ — 73 files）

Playwright-based：
- `pw-session.ts` — Browser/Context/Page lifecycle
- `pw-ai.ts` — Accessibility tree snapshots + AI
- `pw-tools-core.ts` — 40+ actions（click, fill, scroll, screenshot...）
- `server.ts` — HTTP control server
- Auth: OAuth + token gating

---

## ACP — Agent Control Protocol（src/acp/ — 18 files）

- `session.ts` — In-memory session registry（5k max, 24h TTL）
- `control-plane/manager.ts` — Runtime state + identity reconciliation
- `translator.ts` — OpenClaw config → ACP messages/events
- SDK-based: `@agentclientprotocol/sdk`

---

## Cron（src/cron/ — 23 files）

Job 排程 + periodic agent 執行：
- `service.ts` — Event loop + job timer
- `store.ts` — SQLite 持久化
- `isolated-agent.ts` — Subprocess/container 執行
- `delivery.ts` — 結果路由到 channels

---

## Context Engine（src/context-engine/ — 5 files）

Pluggable message history + compaction 介面：
- `bootstrap()` — 初始化 session + 歷史 context
- `assemble()` — 組裝 model context（token budget 內）
- `compact()` — 摘要壓縮（減少 token）
- `afterTurn()` — 後處理
- `prepareSubagentSpawn()` / `onSubagentEnded()`

---

## Link Understanding（src/link-understanding/ — 5 files）

URL 提取 → CLI 工具抓取 → 注入 context

---

## TTS（src/tts/ — 4 files）

Providers: OpenAI, ElevenLabs, Edge（預設）
Modes: off, always, inbound（voice trigger）, tagged（[[tts]]）

---

## Providers（src/providers/ — 6 files）

GitHub Copilot token auth, Qwen Portal OAuth, Google function call ordering, Kilocode helpers

---

## Sessions（src/sessions/ — 11 files）

Session ID 驗證, Level/Model overrides, Send Policy, Transcript Events
