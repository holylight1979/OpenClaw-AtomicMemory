# OpenClaw Workspace — AI 分析文件索引

> 本資料夾包含由 AI 輔助產出的專案分析文件。
> 最近更新：2026-02-26

---

## 文件清單

| # | 文件名稱 | 說明 |
|---|---------|------|
| 1 | Architecture.md | OpenClaw 架構概覽、配置結構、安全模型 |
| 2 | _CHANGELOG.md | 變更記錄 |

---

## 原子記憶結構

```
atoms/
  _pairing.md                         — 跨平台身份對照表
  global/decisions.md                  — 工程決策 atoms
  merged/holylight/preferences.md     — holylight 跨平台偏好
  users/discord_{id}/                  — Discord 平台級 atoms
  users/line_{id}/                     — LINE 平台級 atoms
  channels/                            — 頻道級 atoms（按需建立）
workspace/staging/                     — 待確認的觀察記憶
skills/atomic-memory/SKILL.md          — 原子記憶完整規格
```

---

## 架構一句話摘要

OpenClaw 自主 AI Agent 框架，Gateway 架構串接 Discord/LINE 至 OpenAI Codex LLM，原子記憶系統管理多使用者/多平台知識，config 級安全限制，Windows 11 原生部署。
