# Gateway 伺服器

## 架構概要

Gateway 是 OpenClaw 的中央 HTTP/WS 伺服器，協調 agent 執行、管理客戶端連線、處理 RPC 派發、整合多頻道。

**核心檔案**: `src/gateway/server.impl.ts`（~2100 行）

## 啟動流程

1. Config 載入 + 驗證 + secrets 快照
2. Logger 子系統建立（gateway, canvas, discovery, channels, browser, health, cron, hooks, plugins, ws, secrets）
3. Plugin Registry + Channel Manager 載入
4. HTTP/WS Server 建立 + TLS
5. 背景服務：Discovery（mDNS）、Health Monitor、Cron、Heartbeat、Skills Remote、Delivery Recovery
6. Handler 註冊（Core RPC + Channel + Plugin）
7. Config Hot-Reload Watcher

## WebSocket 連線生命週期

```
Socket 開啟 → 產生 connId → 發送 connect.challenge（nonce）
  ↓
Client 回傳 connect 請求（metadata + auth + device identity + nonce 簽名）
  ↓
驗證：Protocol 版本 + Browser Origin + Auth Mode + Device Identity + 配對狀態
  ↓
連線建立 → 註冊 client → Node Registry（若 role=node）→ Presence 追蹤
  ↓
訊息迴圈：JSON frame → handleGatewayRequest() → 回應
  ↓
關閉 → Unregister + Cleanup
```

## HTTP Routes

| 路徑 | 用途 |
|------|------|
| `/health`, `/healthz`, `/ready` | 健康探針 |
| `/{controlUiBasePath}` | Control UI 靜態資產 |
| `POST /v1/chat/completions` | OpenAI 相容 API（可選） |
| `POST /v1/responses` | OpenResponses API（可選） |
| `/{hookPaths}` | Agent dispatch / Wake hooks |
| `/{plugin}/{routes}` | Plugin HTTP 端點 |
| `/{canvas}` | Canvas Host A2UI |
| Slack webhooks | 簽名驗證 + 派發 |

## RPC Methods（70+）

### 連線 & Auth
`health`, `status`

### Chat（WebChat）
`chat.send`（串流回應）, `chat.history`, `chat.abort`

### Agent
`agent`（單訊息等待完成）, `agent.wait`, `agent.identity.get`

### Agents CRUD
`agents.list/create/update/delete`, `agents.files.list/get/set`

### Sessions
`sessions.list/preview/patch/reset/delete/compact/resolve`

### Config
`config.get/set/apply/patch/schema/schema.lookup`

### Channels
`channels.status`, `channels.logout`

### Nodes（Mobile/IoT）
`node.list/describe/invoke/invoke.result/event`
`node.pending.enqueue/pull/ack/drain`
`node.pair.request/list/approve/reject/verify`
`node.rename`, `node.canvas.capability.refresh`
`device.pair.list/approve/reject/remove`
`device.token.rotate/revoke`

### Cron
`cron.list/status/add/update/remove/run/runs`

### Exec Approvals
`exec.approvals.get/set`, `exec.approvals.node.get/set`
`exec.approval.request/waitDecision/resolve`

### TTS
`tts.status/providers/enable/disable/convert/setProvider`

### Models & Skills
`models.list`, `skills.status/bins/install/update`, `tools.catalog`

### System
`system-presence`, `system-event`, `last-heartbeat`, `set-heartbeats`, `wake`, `send`, `browser.request`

### Updates & Usage
`update.run`, `usage.status/cost`

### Secrets
`secrets.reload/resolve`

## 協議格式

```typescript
// 請求
{ type: "req", id: string, method: string, params?: object }
// 回應
{ type: "res", id: string, ok: boolean, payload?: any, error?: { code, message } }
// 事件（廣播）
{ type: "event", event: string, payload: any, seq?: number, stateVersion?: object }
```

## Auth 模式

| 模式 | 說明 |
|------|------|
| none | 無認證 |
| token | Bearer Token |
| password | 共用密碼 |
| trusted-proxy | 反向代理 HTTP header |
| tailscale | Tailscale 身份 |

+ Device Auth（Ed25519 keypair 簽名）+ Rate Limiting（防暴力破解）

## Node Registry

管理連線的 mobile/IoT nodes：
- `register/unregister`：連線/斷線時
- `invoke`：RPC → node → 等待 result（30s timeout）
- `sendEvent`：推送事件到 node
- Pending Actions：離線 node 的命令佇列（TTL 10min, max 64）

## Graceful Shutdown

1. 停止 sidecars（Bonjour, Tailscale, Canvas, Browser）
2. 停止所有 channels
3. 停止 plugin services
4. 停止 cron + heartbeat
5. 廣播 shutdown 事件
6. 清除 timers + chat run state
7. 關閉所有 WS clients + HTTP servers
