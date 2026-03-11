# UI Dashboard + Skills + Scripts + Apps

## UI Layer（ui/）

**Framework**: Lit 3.3.2 + @lit-labs/signals + marked + DomPurify
**Build**: Vite 7.3.1 → dist/control-ui

### 架構

- `app.ts` — Root LitElement，集中狀態管理
- `gateway.ts` — WebSocket client（frame 序列化、device auth、自動重連）

### 核心模組（app-*.ts）

| 模組 | 職責 |
|------|------|
| app-gateway.ts | WS 連線 + frame 處理 |
| app-lifecycle.ts | Connect/disconnect + polling |
| app-chat.ts | Chat 訊息佇列/發送/中止 |
| app-channels.ts | Channel config + auth |
| app-events.ts | 事件日誌 |
| app-settings.ts | Tab 切換 + theme + i18n |
| app-tool-stream.ts | Streaming agent events |
| app-render.ts | View 派發 |

### Views（ui/views/）

agents, chat, channels, config, cron, sessions, logs, skills, devices, overview, debug

### 通訊協議

WebSocket frames：Event（串流）, Request（RPC）, Response（correlated by id）
Device Auth：Ed25519 keypair 簽名 handshake

### I18n

6 locales: en, zh-CN, zh-TW, de, es, pt-BR

---

## Skills（skills/ — 52 個）

### 格式

每個 skill 是一個目錄 + SKILL.md：
```yaml
---
name: github
description: "GitHub operations via gh CLI..."
metadata:
  openclaw:
    emoji: "🐙"
    requires: { bins: ["gh"] }
    install: [{ id: "brew", kind: "brew", formula: "gh" }]
allowed-tools: ["message"]
---
# 使用說明、範例、模板
```

### 分類

**通訊**: discord, slack, telegram, imsg, whatsapp, bluebubbles
**開發**: github, coding-agent, tmux
**媒體**: video-frames, nano-pdf, openai-whisper, sherpa-onnx-tts, canvas
**生產力**: apple-reminders, apple-notes, bear-notes, obsidian, things-mac, notion, spotify-player
**工具**: weather, xurl, summarize, 1password, session-logs, skill-creator

### 執行流程

1. 從 skills/ 目錄探索 → metadata 解析
2. Agent/CLI 引用 skill → gateway spawn subprocess
3. 部分 skills 暴露 `message` tool（Discord, Slack, Telegram）

---

## Scripts（scripts/ — 100+）

### 建置 & 打包
- `install.sh`（79KB）— 通用安裝腳本
- `package-mac-app.sh`（11KB）— macOS 簽名 + 公證 + DMG
- `ios-beta-*.sh` — iOS TestFlight workflow

### 開發
- `run-node.mjs`, `watch-node.mjs` — Dev server
- `ui.js` — UI dev server（port 5173）

### 測試 & 驗證
- `test-parallel.mjs` — Vitest parallel + profiling
- `test-perf-budget.mjs` — Bundle size budgets（1024KB chunk limit）
- `check-*.mjs` — 52+ 架構/品質檢查

### CI/CD & Release
- `release-check.ts` — Pre-release 驗證
- `pr`（60KB）— Full PR workflow automation

### Build Pipeline
```
pnpm install → pnpm build → pnpm test → pnpm check → scripts/pr → release-check.ts → npm publish
```

---

## Native Apps

### macOS（apps/macos/）
Swift + SwiftUI | Named pipe → gateway WS | Menubar + voice wake
DMG + Sparkle auto-update

### iOS（apps/ios/）
Swift + SwiftUI（iOS 15+）| WS → gateway via Tailscale
Chat + voice + push notifications | TestFlight → App Store

### Android（apps/android/）
Kotlin + Jetpack Compose | WS → gateway
Chat + notifications + offline | Play Store

### 共用
- `apps/shared/` — OpenClawKit（Swift）
- 所有 app 透過 gateway WebSocket 連線
- Device identity pairing（Ed25519 token）

---

## Packages（packages/）

- `clawdbot` — 相容性轉發套件
- `moltbot` — 相容性轉發套件
