# Extensions（40 插件）

## Memory（3）

| Extension | 說明 | 行數 |
|-----------|------|------|
| **atomic-memory** | 結構化知識記憶（信心分層 [固]/[觀]/[臨]、Ollama 萃取、ChromaDB 向量搜尋） | 1238 |
| **memory-core** | 檔案型記憶搜尋工具 + CLI `/memory` | 38 |
| **memory-lancedb** | LanceDB 向量長期記憶（auto-recall + auto-capture） | 678 |

---

## Channel（21+）

### 主流平台
- **discord** — Discord bot（Carbon SDK）
- **telegram** — Telegram Bot API
- **slack** — Slack Socket Mode（Bolt.js）
- **msteams** — Microsoft Teams（Bot Framework）
- **googlechat** — Google Chat webhook

### 亞洲
- **feishu** — 飛書/Lark（最豐富的 tools：Chat/Doc/Wiki/Drive/DB/Permission）
- **line** — LINE Messaging API
- **zalo** — Zalo Bot API（越南）
- **zalouser** — Zalo 個人帳號（QR login, zca-js）

### 自託管
- **matrix** — Matrix protocol（E2E crypto, @vector-im/matrix-bot-sdk）
- **mattermost** — Self-hosted（WebSocket）
- **nextcloud-talk** — Nextcloud Talk webhook
- **synology-chat** — Synology NAS Chat
- **irc** — IRC protocol

### 去中心化
- **nostr** — Nostr NIP-04 encrypted DMs
- **tlon** — Tlon/Urbit（@tloncorp/api）

### 個人通訊
- **bluebubbles** — iMessage via BlueBubbles macOS
- **imessage** — Native iMessage
- **signal** — Signal encrypted
- **whatsapp** — WhatsApp messaging
- **twitch** — Twitch chat

---

## Provider/Auth（4）

| Extension | 說明 |
|-----------|------|
| **copilot-proxy** | VS Code Copilot Proxy（gpt-5.2, claude-opus-4.6, gemini-3-pro 等） |
| **google-gemini-cli-auth** | Google Gemini CLI OAuth（PKCE + localhost） |
| **qwen-portal-auth** | Qwen Portal OAuth（device code flow） |
| **minimax-portal-auth** | MiniMax OAuth（CN + Global regions） |

---

## System/Tool（9+）

| Extension | 說明 | 行數 |
|-----------|------|------|
| **diagnostics-otel** | OpenTelemetry exporter | - |
| **diffs** | Read-only diff viewer + PNG/PDF render | - |
| **voice-call** | Twilio/Telnyx 語音通話 + TTS + streaming | 542 |
| **talk-voice** | ElevenLabs voice selection for iOS Talk | - |
| **llm-task** | JSON-only LLM task（TypeBox + AJV） | - |
| **lobster** | Workflow tool（typed pipelines + approvals） | - |
| **open-prose** | OpenProse VM skill pack | - |
| **device-pair** | iOS gateway 配對（QR, tokens, Tailscale） | 549 |
| **phone-control** | Mobile node 遠端控制（camera, screen） | 421 |
| **thread-ownership** | Slack multi-agent thread 獨佔 | 133 |

---

## 整合模式

### Hook 註冊
onLoad, before_agent_start, before_prompt_build, message_received, message_sending, agent_end

### Tool 註冊
`api.registerTool(toolDef, { optional?, names? })`

### Channel 註冊
`api.registerChannel({ plugin })` — 實作 ChannelPlugin 介面

### HTTP Route
`api.registerHttpRoute()` — streaming/webhook handlers

### CLI
`api.registerCli()` — Commander.js programs
