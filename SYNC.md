# OpenClaw 同步指南（已有安裝 → 套用原子記憶設定）

> 適用場景：另一台電腦**已安裝 OpenClaw**（含推薦 MCP + Skills），
> 需要從此 git repo 同步自訂設定（workspace、extensions、Claude Code 設定）。
>
> 全新安裝請看 [INSTALL.md](INSTALL.md)。

---

## 前提

- OpenClaw 已安裝且可執行（`openclaw --version` 正常）
- 已 clone 此 repo：
  ```
  git clone --recurse-submodules https://github.com/holylight1979/OpenClaw-AtomicMemory.git
  ```
- 使用者已提供 secrets（Discord token、LINE token 等），AI 不需要猜

---

## Step 1：確認本機環境

```powershell
# 確認 OpenClaw 版本
openclaw --version

# 確認設定檔位置
echo $env:USERPROFILE\.openclaw\openclaw.json

# 確認 workspace 路徑（讀 openclaw.json 的 agents.defaults.workspace）
```

記下：
- **WORKSPACE_PATH**：本機 OpenClaw workspace 路徑（通常是 `C:\OpenClawWorkspace`）

---

## Step 2：同步 Workspace 檔案

將 repo 的 `workspace/` 內容複製到本機 workspace。

```powershell
# Agent 人格 + 知識庫（覆蓋）
Copy-Item -Force repo\workspace\*.md $WORKSPACE_PATH\

# _AIDocs
Copy-Item -Recurse -Force repo\workspace\_AIDocs\* $WORKSPACE_PATH\_AIDocs\

# Memory + Atoms + Skills
Copy-Item -Recurse -Force repo\workspace\memory\* $WORKSPACE_PATH\memory\
Copy-Item -Recurse -Force repo\workspace\atoms\* $WORKSPACE_PATH\atoms\
Copy-Item -Recurse -Force repo\workspace\skills\* $WORKSPACE_PATH\skills\

# ai-kb-framework（submodule）
Copy-Item -Recurse -Force repo\workspace\ai-kb-framework\* $WORKSPACE_PATH\ai-kb-framework\
```

> **注意**：workspace 內有些檔案含 `{{PLACEHOLDER}}`（如 `_pairing.md`、`SKILL.md`），
> 需要替換為實際的 Discord/LINE user ID。

---

## Step 3：合併 openclaw.json

**不是直接覆蓋！** repo 裡的是模板，需要合併到本機已有的設定。

1. 讀取本機 `~/.openclaw/openclaw.json`（保留 `meta`、`wizard`、`auth`）
2. 從 `repo/dotopenclaw/openclaw.json` 讀取以下區塊覆蓋：
   - `browser`、`agents`、`tools`、`messages`、`commands`
   - `session`、`channels`、`gateway`、`plugins`
3. 替換所有 `{{PLACEHOLDER}}` 為使用者提供的實際值
4. `agents.defaults.workspace` 改為本機的 WORKSPACE_PATH
5. `gateway.auth.token`：執行 `openclaw doctor` 自動生成，或填入自訂值

---

## Step 4：複製自訂 Extensions

```powershell
Copy-Item -Recurse -Force repo\dotopenclaw\extensions\* "$env:USERPROFILE\.openclaw\extensions\"
```

---

## Step 5：Claude Code 設定

```powershell
# CLAUDE.md（全域工作流引擎）
Copy-Item -Force repo\claude\CLAUDE.md "$env:USERPROFILE\.claude\CLAUDE.md"

# 自訂指令
New-Item -ItemType Directory -Force "$env:USERPROFILE\.claude\commands"
Copy-Item -Recurse -Force repo\claude\commands\* "$env:USERPROFILE\.claude\commands\"
```

**hooks.json** 和 **mcp-servers.json**：
- `repo/claude/hooks.json` → 合併到 `~/.claude/settings.json` 的 `hooks` key
- `repo/claude/mcp-servers.json` → 合併到 `~/.claude.json` 的 `mcpServers` key
- 替換 `{{BRIDGE_TOKEN}}`、`{{DISCORD_CHANNEL_ID}}`、`{{OPENCLAW_WORKSPACE}}`

---

## Step 6：啟動腳本

```powershell
Copy-Item repo\scripts\*.bat "$env:USERPROFILE\Desktop\"
```

---

## Step 7：驗證

```powershell
openclaw status --all
openclaw security audit --deep
```

---

# 雙機持續同步 SOP

兩台電腦都會迭代原子記憶和設定。以下是同步工作流：

## 推送本機變更到 git

當本機做了有意義的設定或記憶變更後：

```bash
cd <repo-path>  # e.g. C:\OpenClawWorkspace\OpenClaw-AtomicMemory

# 1. 從 live 複製到 repo（只複製安全的檔案，不含 secrets）
#    workspace 檔案：直接覆蓋
cp -r /c/OpenClawWorkspace/{_AIDocs,atoms,memory,skills,*.md} workspace/

#    extensions：直接覆蓋
cp -r ~/.openclaw/extensions/* dotopenclaw/extensions/

# 2. 安全檢查（確認無真實 token）
grep -r "MTA2\|61hN6d\|15b0e7a\|821c06e" . --include="*.json" --include="*.ts" --include="*.js" --include="*.md" | grep -v ".git/"
# 預期：無輸出。如果有輸出，表示有 token 外洩，不要 commit

# 3. Commit + Push
git add -A
git commit -m "sync: <簡述變更>"
git push
```

## 拉取另一台的變更

```bash
cd <repo-path>

# 1. Pull
git pull

# 2. 複製 repo → live
cp -r workspace/* /c/OpenClawWorkspace/
cp -r dotopenclaw/extensions/* ~/.openclaw/extensions/

# 3. 如果 openclaw.json 模板有變更，需要手動合併
#    （比對 dotopenclaw/openclaw.json 的變更，merge 到 ~/.openclaw/openclaw.json）

# 4. 驗證
openclaw status --all
```

## 衝突處理

如果兩台同時修改了同一個檔案：
- **_CHANGELOG.md**：通常是追加，git 合併通常不會衝突
- **atoms / memory**：以最新修改為準，保留兩邊的新增內容
- **extensions**：如果都改了同一個 plugin，需要人工判斷哪邊的版本是對的

---

## 重要提醒

- `openclaw.json` **永遠不直接 push**（含 secrets），只 push 模板版
- workspace 裡的 `_pairing.md`、`SKILL.md` 含 user ID placeholder，push 前確認是 `{{PLACEHOLDER}}`
- 每次 push 前都跑安全檢查 grep
