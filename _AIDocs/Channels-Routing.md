# Channels + Routing

## 路由解析

### resolveAgentRoute()

**輸入**：channel, accountId, peer, parentPeer, guildId, teamId, memberRoleIds
**輸出**：`ResolvedAgentRoute { agentId, channel, accountId, sessionKey, matchedBy }`

### 四層路由（優先順序）

| Tier | Match | 用途 |
|------|-------|------|
| 1 | binding.peer | DM / 特定群組 |
| 2 | binding.peer.parent | Thread 繼承父級 |
| 3 | binding.guild+roles | Discord 角色路由 |
| 4 | binding.guild/team | Guild/Workspace 預設 |
| 5 | binding.account | Account 預設 |
| 6 | binding.channel | Channel 預設 |
| 7 | default | 系統預設 agent |

**快取**：WeakMap per config, max 4000 entries, config 變更自動失效

### Session Key 格式

```
主 Key: agent:{agentId}:{mainKey}
DM Scope:
  main         → agent:main:main（合併所有 DM）
  per-peer     → agent:main:direct:{peerId}
  per-channel-peer → agent:main:{channel}:direct:{peerId}
Thread: {baseKey}:thread:{threadId}
```

---

## Channel 抽象層

### ChannelPlugin 介面（20+ adapters）

```typescript
ChannelPlugin<ResolvedAccount> = {
  id, meta, capabilities,
  config: ChannelConfigAdapter,       // 載入/儲存 config
  outbound?: ChannelOutboundAdapter,  // 發送訊息
  gateway?: ChannelGatewayAdapter,    // 連線生命週期
  security?: ChannelSecurityAdapter,  // DM/Group 存取控制
  pairing?: ChannelPairingAdapter,    // Approval/Allowlist UI
  mentions?: ChannelMentionAdapter,   // @mention 清除
  threading?: ChannelThreadingAdapter, // Reply/Thread
  directory?: ChannelDirectoryAdapter, // 使用者/群組查詢
  status?: ChannelStatusAdapter,      // 健康探針
  actions?: ChannelMessageActionAdapter, // Reactions/Edit/Unsend
  agentTools?: ChannelAgentToolFactory,  // Agent 工具
  // ...
}
```

### Channel Capabilities

chatTypes（direct/group/channel/thread）, polls, reactions, edit, unsend, reply, effects, groupManagement, threads, media, nativeCommands, blockStreaming

---

## 內建頻道（9 個）

| 頻道 | SDK | 特色 |
|------|-----|------|
| Telegram | Grammy | Reactions, media, forum threads, multi-account |
| Discord | Carbon | Guilds, roles, webhooks, threads |
| Slack | Bolt.js | Socket Mode, workspaces, threads |
| LINE | LINE SDK | Rich menus, groups |
| Signal | signal-cli | Groups, attachments, E2E |
| WhatsApp | Baileys | QR link, groups, status |
| Web | 內建 | HTTP 傳輸 |
| iMessage | BlueBubbles | DMs, groups, reactions |
| IRC | 原生 | Channels, PRIVMSG |

---

## 訊息流水線

```
[Channel 收到訊息]
  ↓ Preflight：正規化 sender + 提取 text/media/mentions + allowlist 驗證 + mention 檢查
  ↓ resolveAgentRoute()：config → bindings → 四層匹配 → cache
  ↓ Session Key 推導：dmScope + thread suffix
  ↓ 排隊（per sessionKey 序列化）
  ↓ Dispatch to Agent：MsgContext + envelope
  ↓ 收到 ReplyPayload
  ↓ Outbound Delivery：chunking + media hosting + channel adapter
  ↓ 通訊平台
```

## Allowlist 系統

**DM**：direct config allowFrom > store allowlist > account default
**Group**：group-specific groupAllowFrom > account allowFrom（fallback）

**匹配方式**：wildcard(`*`), id, name, tag, slug

## Mention Gating

`requireMention: true` 時，群組訊息必須 @mention bot 才觸發。
例外：已授權的 control commands（/ping, /help）跳過 mention 要求。
