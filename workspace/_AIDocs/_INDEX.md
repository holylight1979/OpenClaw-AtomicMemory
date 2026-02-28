# OpenClaw Workspace — AI 分析文件索引

> 本資料夾包含由 AI 輔助產出的專案分析文件。
> 最近更新：2026-02-28

---

## 文件清單

| # | 文件名稱 | 說明 |
|---|---------|------|
| 1 | Architecture.md | OpenClaw 架構概覽、配置結構、安全模型 |
| 2 | _CHANGELOG.md | 變更記錄（最近條目） |
| 3 | _CHANGELOG_ARCHIVE.md | 變更記錄（較舊條目，2026-02-26） |

---

## 原子記憶結構

```
atoms/
  _identity-map.md                    — ★ 平台 ID → 人員路徑 高速映射（session 最先讀）
  _pairing.md                         — 跨平台身份對照表（多人格式）
  global/decisions.md                  — 工程決策 atoms
  persons/                             — ★ 人員記憶（語意化路徑結構）
    _registry.md                       — 人員詳細索引
    _candidates/                       — 觀察中未確認使用者
    owner/holylight/                   — 擁有者
      _profile.md                      — 核心辨識檔
      personality/                     — 溝通風格、特徵
      principles/                      — AI 互動規則
      interests/{long-term,tracking}/  — 興趣（穩定/追蹤中）
      relationships/                   — 人際關係
      context/                         — 情境性記憶
    user/{alias}/                      — 一般使用者（同結構）
  events/                              — ★ 事件導向共享記憶
    _active.md                         — 進行中事件索引
  channels/                            — 頻道級 atoms（按需建立）
workspace/staging/                     — 待確認的觀察記憶
skills/atomic-memory/SKILL.md          — 原子記憶完整規格
```

---

## 架構一句話摘要

OpenClaw 自主 AI Agent 框架，Gateway 架構串接 Discord/LINE 至 OpenAI Codex LLM，原子記憶系統管理多使用者/多平台知識（人員辨識 + 事件系統 + 身份映射），config 級安全限制，Windows 10 原生部署。
