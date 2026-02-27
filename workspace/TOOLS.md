# TOOLS.md - Local Notes

Skills define _how_ tools work. This file is for _your_ specifics — the stuff that's unique to your setup.

## What Goes Here

Things like:

- Camera names and locations
- SSH hosts and aliases
- Preferred voices for TTS
- Speaker/room names
- Device nicknames
- Anything environment-specific

## Examples

```markdown
### Cameras

- living-room → Main area, 180° wide angle
- front-door → Entrance, motion-triggered

### SSH

- home-server → 192.168.1.100, user: admin

### TTS

- Preferred voice: "Nova" (warm, slightly British)
- Default speaker: Kitchen HomePod
```

## Why Separate?

Skills are shared. Your setup is yours. Keeping them apart means you can update skills without losing your notes, and share skills without leaking your infrastructure.

---

Add whatever helps you do your job. This is your cheat sheet.

---

## Claude Code Bridge (LINE → VS Code)

### 觸發條件

- **指令前綴**: `/vscc`, `/vsccc`, `/vscodeclaudecode`
- **語意判斷**: 「用 claude code」「請用電腦執行」「用本機的 claude 做」「幫我跑 claude」「叫 claude code 幫我」

### 使用流程

1. 收到觸發 → 用 `claude_code_inject` 注入 prompt 到 VS Code Claude
2. 等待 30-120 秒（依任務複雜度判斷）
3. 用 `claude_code_observe` 截圖觀察結果
4. 解讀截圖內容，摘要回傳 LINE
5. 若 VS Code 未開啟或注入失敗 → 改用 `claude_code_execute`（CLI headless 模式）

### Computer Use（通用桌面操作）

可用工具：`computer_screenshot`, `computer_click`, `computer_type`, `computer_key`,
`computer_window_focus`, `computer_window_list`, `computer_clipboard_set`

用於任何需要桌面互動的場景（不限於 Claude Code）。

### 通知

透過 bridge service 可直接發 Discord/LINE 訊息通知使用者。
- Discord: POST bridge `/notify/discord` with `{ channelId, message }`
- LINE: POST bridge `/notify/line` with `{ userId, message }`
