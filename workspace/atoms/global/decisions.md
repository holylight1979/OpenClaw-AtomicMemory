# Atom: Engineering Decisions

- Scope: global
- Confidence: [固]
- Source: 2026-02-26 multi-platform — OpenClaw installation session
- Last-used: 2026-02-26
- Trigger: when making infrastructure, security, or deployment decisions
- Privacy: public

## 知識

- [固] LLM: OpenAI Codex OAuth (gpt-5.3-codex) via ChatGPT subscription. Anthropic API is separate pay-per-use; Claude Max subscription OAuth is banned for third-party tools.
- [固] Security: config-level `tools.deny` + `fs.workspaceOnly` > prompt-level instructions. Context compaction silently drops prompt-level safety rules.
- [固] Installation: `npm install -g openclaw`, NOT from source (pnpm build fails on Windows: Issue #26065).
- [固] No Docker/WSL: sandbox.mode=off, compensated by config deny.
- [固] Discord: allowlist + requireMention + pairing.
- [固] LINE: ngrok free tier webhook. URL changes on restart → update LINE Console manually.
- [固] Cross-platform session: `dmScope: "per-peer"` + `identityLinks` maps holylight across LINE/Discord to one canonical session. `tools.sessions.visibility: "agent"` for cross-session tool access.
- [固] Tool profile: `"full"` + deny list. Removing profile without setting "full" causes agent to lose message read/search tools.
- [固] Cross-channel read: LINE plugin lacks message read. Custom `discord-reader` plugin at `~/.openclaw/extensions/discord-reader/` bridges the gap via Discord REST API. `plugins.allow` must list trusted plugin IDs.
- [觀] Gateway runs as foreground process, not Scheduled Task. May install as service later.

## 行動

- When touching LLM/security/deployment topics, reference these decisions rather than re-analyzing.
- Briefly mention relevant decision to confirm it still holds.
