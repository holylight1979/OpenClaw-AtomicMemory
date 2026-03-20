# OpenClaw 完整檔案樹 + 結構映射

> Phase 1 產出。2026-03-20 掃描。
> 總計 **6,350+ 檔案**（src 4,465 + extensions 1,175 + scripts 174 + skills 51 + apps/docs/root 485+）

---

## 專案規模概覽

| 區塊 | TS 檔案 | 其中 test | 非 test | 入口檔 |
|------|---------|-----------|---------|--------|
| src/ | 4,465 | 1,880 | 2,585 | openclaw.mjs → src/entry.ts |
| extensions/ | 1,175 | ~250 | ~923 | 各 extension/index.ts |
| scripts/ | 174 | — | — | 獨立腳本 |
| skills/ | 51 (MD) | — | — | SKILL.md format |
| docs/ | 728 (MD) | — | — | 文件站 |
| apps/ | 4 平台 | — | — | Android/iOS/macOS/Shared |
| root | 47 config | — | — | package.json, tsconfig, vitest.* |

---

## src/ 子系統映射（47 目錄）

### 入口層

| 目錄 | 檔案 | test | 入口 | 角色 | 子目錄 |
|------|------|------|------|------|--------|
| cli/ | 287 | 105 | — | CLI 主框架：program、browser-cli、cron-cli、daemon-cli、gateway-cli、node-cli、update-cli | browser-cli-actions-input/, cron-cli/, daemon-cli/, gateway-cli/, node-cli/, nodes-cli/, program/, shared/, update-cli/ |
| commands/ | 373 | 138 | — | 37+ 指令實作：agent、channels、gateway-status、models、onboarding、status-all | agent/, channels/, gateway-status/, models/, onboard-non-interactive/, onboarding/, status-all/ |

### 核心層

| 目錄 | 檔案 | test | 入口 | 角色 | 子目錄 |
|------|------|------|------|------|--------|
| agents/ | 871 | 433 | — | Agent 生命週期：spawn、auth-profiles、skills、tool-catalog、sandbox、schema | auth-profiles/, cli-runner/, pi-embedded-helpers/, pi-embedded-runner/, pi-extensions/, sandbox/, schema/, skills/, test-helpers/, tools/ |
| gateway/ | 365 | 145 | — | WS/HTTP server：protocol、server、70+ RPC methods | protocol/, server/, server-methods/ |
| routing/ | 11 | 5 | — | 四層路由解析、Session Key | — |
| acp/ | 56 | 20 | — | Agent Control Protocol：control-plane、session、translator | control-plane/, runtime/ |

### 擴展層

| 目錄 | 檔案 | test | 入口 | 角色 | 子目錄 |
|------|------|------|------|------|--------|
| plugins/ | 95 | 40 | — | Plugin discovery、registry、hook runner、config state | runtime/, test-helpers/ |
| plugin-sdk/ | 112 | 25 | index.ts | Plugin SDK 介面：channel helpers、account resolution、atomic memory SDK | — |
| hooks/ | 43 | 18 | — | 24 typed hooks + bundled hooks、Gmail watchers | bundled/ |

### 設定層

| 目錄 | 檔案 | test | 入口 | 角色 | 子目錄 |
|------|------|------|------|------|--------|
| config/ | 238 | 100 | — | JSON5/Zod config pipeline、limits、capabilities、paths、bindings | sessions/ |
| secrets/ | 50 | 17 | — | Secret management、provider auth、key rotation | — |
| security/ | 29 | 10 | — | Audit（channel/fs/extra）、dangerous tools、DM policy | — |

### 頻道層

| 目錄 | 檔案 | test | 入口 | 角色 | 子目錄 |
|------|------|------|------|------|--------|
| channels/ | 163 | 54 | — | 9 頻道 ChannelPlugin 統一介面、allowlists、transport | allowlists/, plugins/, transport/, web/ |
| line/ | 48 | 18 | — | LINE 平台整合 | flex-templates/ |
| whatsapp/ | 4 | 2 | — | WhatsApp channel normalization | — |

### 功能層

| 目錄 | 檔案 | test | 入口 | 角色 | 子目錄 |
|------|------|------|------|------|--------|
| auto-reply/ | 291 | 92 | — | Auto-reply pipeline：command registry、dispatch、envelope、skill binding | reply/, test-helpers/ |
| memory/ | 103 | 39 | index.ts | 向量記憶：batch processing（OpenAI/Gemini/Voyage）、hybrid search | test-helpers/ |
| browser/ | 168 | 68 | — | Chrome/Chromium 控制：CDP proxy、MCP、40+ tools | routes/ |
| media/ | 41 | 18 | — | Audio/image 操作：FFmpeg、base64、fetch、tags | — |
| media-understanding/ | 65 | 23 | — | Vision/audio understanding：image recognition、audio processing | providers/ |
| link-understanding/ | 6 | 1 | — | Link extraction & understanding | — |
| context-engine/ | 6 | 1 | index.ts | Context assembly、ingestion、registry | — |
| cron/ | 109 | 65 | — | Cron jobs：isolated agent、delivery、heartbeat、lane management | isolated-agent/, service/ |
| tts/ | 5 | 3 | — | Text-to-speech | — |
| providers/ | 11 | 5 | — | External provider（Copilot、Google、Qwen）| — |
| sessions/ | 13 | 4 | — | Session management、actor bindings | — |

### 基建層

| 目錄 | 檔案 | test | 入口 | 角色 | 子目錄 |
|------|------|------|------|------|--------|
| infra/ | 485 | 251 | — | 跨平台基礎設施：archives、backups、binary、abort、bonjour、cache、net、outbound、tls | format-time/, net/, outbound/, tls/ |
| process/ | 28 | 12 | — | Process management、supervisor | supervisor/ |
| daemon/ | 54 | 22 | — | Daemon lifecycle：launchd（macOS）、node service | test-helpers/ |
| logging/ | 29 | 13 | — | Console、diagnostic、levels、redaction | test-helpers/ |
| shared/ | 72 | 33 | — | Shared types：chat envelopes、device auth、avatar、entry metadata | net/, text/ |
| terminal/ | 19 | 6 | — | Terminal operations | — |
| utils/ | 29 | 11 | — | Chunk、fetch timeout、message channels、queue | — |
| types/ | 9 | 0 | — | TypeScript type definitions（.d.ts）| — |

### UI / 互動層

| 目錄 | 檔案 | test | 入口 | 角色 | 子目錄 |
|------|------|------|------|------|--------|
| tui/ | 47 | 18 | — | Terminal UI：commands、events、formatters、overlays | components/, theme/ |
| wizard/ | 16 | 7 | — | Onboarding wizard、prompts、session setup | — |
| canvas-host/ | 5 | 2 | — | Canvas rendering host | a2ui/ |
| node-host/ | 16 | 6 | — | Node.js host runtime | — |
| pairing/ | 9 | 4 | — | Device pairing | — |

### 其他

| 目錄 | 檔案 | test | 入口 | 角色 |
|------|------|------|------|------|
| test-utils/ | 35 | 3 | — | Test utilities |
| test-helpers/ | 7 | 1 | — | Test kit |
| markdown/ | 14 | 7 | — | Markdown processing |
| scripts/ | 2 | 2 | — | Build scripts |
| i18n/ | 1 | 1 | — | i18n stub |
| compat/ | 1 | 0 | — | Compatibility layer |
| docs/ | 1 | 1 | — | Documentation entry |

---

## extensions/ 映射（44 插件）

### Memory（3）

| 插件 | TS 檔 | 入口 | Hooks | Tools | Commands | CLI | 角色 |
|------|-------|------|-------|-------|----------|-----|------|
| atomic-memory | 31 | index.ts | session_start, before_prompt_build, before_agent_start, agent_end, session_end | atom_recall, atom_store, atom_forget, atom_clear_test, atom_link, atom_whois, atom_permission | /atoms | atoms | 結構化原子記憶（ACT-R 評分、信心分層、跨平台身份） |
| memory-lancedb | 3 | index.ts | before_agent_start, agent_end | memory_recall, memory_store, memory_forget | — | ltm | LanceDB 向量長期記憶 |
| memory-core | 1 | index.ts | — | memory_search, memory_get | — | memory | 檔案式記憶搜尋 |

### Channel（21）

| 插件 | TS 檔 | 入口 | 主要特性 |
|------|-------|------|---------|
| discord | 190 | index.ts | Guild/channel/user resolution、components、PluralKit、thread、approval |
| telegram | 154 | index.ts | 完整 Bot API、media、sticker、reactions |
| slack | 130 | index.ts | Thread/message/reaction、Block Kit |
| feishu | 94 | index.ts | Doc/Chat/Wiki/Drive/Bitable tools、card building |
| whatsapp | 93 | index.ts | Cloud API、media、reactions |
| matrix | 93 | index.ts | Crypto runtime、E2E encryption |
| msteams | 81 | index.ts | Bot Framework integration |
| mattermost | 53 | index.ts | Slash command routing、HTTP handler |
| bluebubbles | 46 | index.ts | macOS Messages relay、webhook |
| zalouser | 37 | index.ts | Zalo personal messaging、tool actions |
| signal | 37 | index.ts | Signal protocol integration |
| imessage | 37 | index.ts | iMessage integration |
| tlon | 35 | index.ts | Tlon/Urbit CLI wrapper |
| twitch | 32 | index.ts | Streaming platform |
| nextcloud-talk | 31 | index.ts | Nextcloud Talk |
| zalo | 29 | index.ts | Zalo Bot API |
| irc | 28 | index.ts | IRC protocol |
| nostr | 24 | index.ts | NIP-04 DM、profile HTTP |
| googlechat | 23 | index.ts | Google Chat |
| synology-chat | 16 | index.ts | Synology Chat |
| line | 7 | index.ts | LINE Messaging API |

### Provider（7）

| 插件 | TS 檔 | 入口 | Provider ID | Auth 方式 | Models |
|------|-------|------|-------------|-----------|--------|
| ollama | 1 | index.ts | ollama | Custom prompt | Auto-detected |
| copilot-proxy | 1 | index.ts | copilot-proxy | Config | Manual（GPT/Claude/Gemini/Grok） |
| google-gemini-cli-auth | 3 | index.ts | google-gemini-cli | OAuth PKCE | Gemini 3.1 Pro |
| minimax-portal-auth | 2 | index.ts | minimax-portal | Device code | M2.5 系列 |
| qwen-portal-auth | 2 | index.ts | qwen-portal | Device code | Coder, Vision |
| sglang | 1 | index.ts | sglang | OpenAI-compat | User-specified |
| vllm | 1 | index.ts | vllm | OpenAI-compat | User-specified |

### System / Tool（13）

| 插件 | TS 檔 | 入口 | 類型 | 角色 |
|------|-------|------|------|------|
| acpx | 22 | index.ts | Service | ACP runtime backend |
| voice-call | 64 | index.ts | Tool + Gateway | 電話撥打（Telnyx/Twilio/Plivo） |
| diffs | 24 | index.ts | Tool + HTTP | Diff viewer & PNG/PDF renderer |
| llm-task | 3 | index.ts | Tool | LLM task execution |
| lobster | 6 | index.ts | Tool | Code execution/debugging |
| phone-control | 2 | index.ts | Command | 高風險 phone 指令管控 |
| talk-voice | 1 | index.ts | Command | ElevenLabs voice config |
| device-pair | 2 | index.ts | Command + Service | iOS device pairing |
| diagnostics-otel | 3 | index.ts | Service | OpenTelemetry |
| thread-ownership | 2 | index.ts | Hook | Slack thread owner enforcement |
| open-prose | 1 | index.ts | Stub | Shipped skills delivery |
| shared | 8 | — | Utility | 共用模組（channel-status、config-schema、deferred、passive-monitor） |
| test-utils | 8 | — | Test | 測試工具 |

---

## scripts/ 分類（174 檔）

| 分類 | 數量 | 代表檔案 |
|------|------|---------|
| Build & Package | ~15 | build-docs-list.mjs, sparkle-build.ts, bundle-a2ui.sh |
| Quality & Check | ~15 | check-ts-max-loc.ts, check-plugin-sdk-exports.mjs, check-channel-agnostic-boundaries.mjs |
| Test Infrastructure | ~10 | test-perf-budget.mjs, test-hotspots.mjs, test-parallel.mjs |
| macOS / iOS | ~15 | codesign-mac-app.sh, notarize-mac-artifact.sh, ios-beta-*.sh |
| Cloud Deploy | ~20 | k8s/, gcp/, hetzner/, fly/, railway/, render/, northflank/ |
| Docker / Container | ~15 | docker/, podman/, sandbox-*.sh |
| Dev / Debug | ~10 | dev/gateway-smoke.ts, dev/gateway-ws-client.ts |
| CI / Release | ~10 | release-check.ts, openclaw-npm-release-check.ts, pr-* |
| Docs i18n | ~10 | docs-i18n/*.go |
| Auth / System | ~10 | auth-monitor.sh, systemd/, setup-auth-system.sh |
| Misc Utilities | ~40+ | install.sh, install.ps1, sync-*.ts, label-open-issues.ts |

---

## skills/ 分類（51 modules）

| 分類 | Skills |
|------|--------|
| 通訊 | discord, slack, telegram, imsg, voice-call, bluebubbles, blucli, himalaya, tmux |
| 筆記 / 組織 | apple-notes, bear-notes, notion, obsidian, apple-reminders, things-mac, trello |
| 開發 | github, gh-issues, coding-agent, 1password, skill-creator, node-connect, session-logs |
| 媒體 | spotify-player, sonoscli, songsee, video-frames, gifgrep, camsnap, peekaboo, nano-pdf, summarize |
| Web / 資訊 | canvas, blogwatcher, xurl, weather, healthcheck |
| AI | gemini, openai-image-gen, openai-whisper, openai-whisper-api, sherpa-onnx-tts |
| 系統 / 工具 | gog, goplaces, mcporter, model-usage, clawhub, oracle, wacli, eightctl, nano-banana-pro, ordercli, openhue |

---

## apps/ 平台

| 平台 | 語言 | 核心元件 |
|------|------|---------|
| Android | Kotlin | MainActivity, NodeRuntime, GatewaySession, ChatController, WakeWords |
| iOS | Swift | Xcode project, Gateway bridge |
| macOS | Swift | Desktop app, XPC, Sparkle updates |
| Shared | — | 跨平台共用元件 |

---

## Root 設定檔（47 檔）

| 分類 | 檔案 |
|------|------|
| Package | package.json, pnpm-lock.yaml, pnpm-workspace.yaml, .npmrc, .npmignore |
| TypeScript | tsconfig.json, tsconfig.plugin-sdk.dts.json |
| Build | tsdown.config.ts, knip.config.ts, write-*.ts |
| Test | vitest.config.ts, vitest.unit/e2e/extensions/gateway/live/channels/scoped-config.ts |
| Lint | .oxlintrc.json, .oxfmtrc.jsonc, .markdownlint-cli2.jsonc, .jscpd.json, .shellcheckrc, .swiftformat, .swiftlint.yml, zizmor.yml |
| Security | .pre-commit-config.yaml, .secrets.baseline, .detect-secrets.cfg |
| Docker | Dockerfile (×4), docker-compose.yml |
| Deploy | render.yaml |
| Entry | openclaw.mjs |
| Docs | README.md, CHANGELOG.md, CONTRIBUTING.md, SECURITY.md, AGENTS.md, VISION.md, LICENSE, CLAUDE.md, docs.acp.md |

---

## 差異分析（vs 2026-03-12 深度閱讀）

### 規模變化

| 項目 | 2026-03-12 | 2026-03-20 | 差異 |
|------|-----------|-----------|------|
| src/ TS files | ~2,878（全專案） | 4,465（僅 src/） | +55% |
| extensions/ TS (excl. node_modules) | 包含在上方 | 1,175 | 獨立計算 |
| 近 50 commits 變動 | — | 2,274 files, +108K/-35K lines | 大量活躍 |

### 近期重大變更（2026-03-12 ~ 03-20）

1. **atomic-memory**: owner challenge auth、unified identity registry、workspace recall、cross-group broadcast、permission system、stale test cleanup（7+ commits）
2. **gateway**: health monitor hardening、auth.mode=none bypass fix、compaction timeout configurable
3. **feishu**: structured cards、identity header、reactions、card actions
4. **whatsapp**: recency filter restore、QR pairing 515 error fix
5. **zalouser/zalo**: DM allowlist fix、webhook IP resolution
6. **telegram**: word boundary preservation in rechunking
7. **general**: strict mode tools fix、tool call ID dedup、forceDocument forwarding

### 新增/重大擴充子系統

- `acp/` — Agent Control Protocol（56 files, 上次記錄較少）
- `context-engine/` — Context assembly（6 files, 新增）
- `canvas-host/` — Canvas rendering（5 files, 新增）
- `node-host/` — Node.js host（16 files, 新增）
- Extensions `acpx/`（22 files）、`voice-call/`（64 files）顯著擴充

---

## Plugin Registration API 模式

Extensions 使用的 registration API：

| API | 用途 | 使用者數 |
|-----|------|---------|
| `api.registerChannel()` | 訊息頻道 | 21 extensions |
| `api.registerProvider()` | LLM provider | 7 extensions |
| `api.registerTool()` | Agent tool | 5 extensions |
| `api.registerService()` | Background service | 5 extensions |
| `api.registerCommand()` | Slash command | 5 extensions |
| `api.registerCli()` | CLI subcommand | 5 extensions |
| `api.on()` | Lifecycle hooks | 3 extensions |
| `api.registerHttpRoute()` | HTTP endpoint | 3 extensions |
| `api.registerGatewayMethod()` | RPC method | 1 extension |

---

## 後續 Phase 規劃

| Phase | 範圍 | 預估檔案 | 產出 |
|-------|------|---------|------|
| 2 | Core: agents/ + gateway/ + routing/ + acp/ | ~1,300 | 函式級入口/API 文件 |
| 3 | CLI + Commands + Config + Plugins + Hooks | ~1,030 | 函式級文件 |
| 4 | Features: auto-reply, memory, browser, media, cron... | ~870 | 函式級文件 |
| 5 | Infrastructure: infra, process, daemon, logging, shared... | ~800 | 函式級文件 |
| 6 | Channels + Channel Extensions | ~1,400 | 函式級文件 |
| 7 | Non-channel Extensions | ~530 | 函式級文件 |
| 8 | UI + Skills + Scripts + Apps | ~190 | 函式級文件 |
