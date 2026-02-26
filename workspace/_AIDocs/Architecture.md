# OpenClaw 架構概覽

## 部署拓撲

```
使用者 (Discord/LINE)
  │
  ▼
[Discord WebSocket]  [LINE Webhook ← ngrok tunnel]
  │                    │
  ▼                    ▼
┌─────────────────────────────┐
│  OpenClaw Gateway           │
│  ws://127.0.0.1:18789       │
│  (Node.js foreground proc)  │
├─────────────────────────────┤
│  Agent: main                │
│  Model: openai-codex/       │
│         gpt-5.3-codex       │
│  Auth: Codex OAuth           │
├─────────────────────────────┤
│  Workspace:                 │
│  C:\OpenClawWorkspace       │
└─────────────────────────────┘
```

## 配置檔位置

| 檔案 | 路徑 | 說明 |
|------|------|------|
| 主配置 | `%USERPROFILE%\.openclaw\openclaw.json` | 全域設定、頻道、安全 |
| 工作區 | `C:\OpenClawWorkspace\` | Agent workspace |
| Agent sessions | `%USERPROFILE%\.openclaw\agents\main\sessions\` | 對話記錄 |
| Gateway log | `\tmp\openclaw\openclaw-YYYY-MM-DD.log` | 每日 log |

## 安全模型

**原則**: config 級限制 > prompt 級指令（compaction 會吃掉 prompt）

```json
"tools.deny": ["group:automation", "group:runtime", "group:fs", ...]
"tools.fs.workspaceOnly": true
"tools.exec.security": "deny"
"tools.elevated.enabled": false
"agents.defaults.sandbox.mode": "off"  // 無 Docker，用 deny 補償
```

## 頻道配置

### Discord
- groupPolicy: allowlist
- requireMention: true
- dmPolicy: pairing
- 單一 guild + 單一 user

### LINE
- dmPolicy: pairing
- webhook: ngrok → http://127.0.0.1:18789/line/webhook
- 免費 ngrok URL 每次重啟會變

## 已知問題

- LINE status WARN "token not configured" 是顯示 bug，provider 實際正常
- Gateway 非服務模式，關 PowerShell 即停
- ngrok 免費方案 URL 不固定
