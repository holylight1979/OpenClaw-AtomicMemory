---
name: atomic-memory
description: "原子記憶系統 — 高效精準的知識管理工作流。將對話中的重要邏輯、判斷原則、使用者偏好拆解為最小可參照的知識單元（atom），按 scope 分層儲存，自動追蹤信心度（固/觀/臨），支援跨平台使用者合併與隱私分級。Always active: 每次對話前載入相關 atoms，對話後評估 staging 提升。觸發：使用者說記住或以後都這樣、重複模式>=3次、觸及已存在 atom 時主動引用。"
user-invocable: false
disable-model-invocation: false
metadata:
  {
    "openclaw": {
      "emoji": "🧬",
      "always": true
    }
  }
---

# Atomic Memory — 原子記憶系統

低 token 消耗、高指向性、高判斷精確度的知識管理。

---

## 核心原則

1. **原子化**：每個 atom 只記一件事，20-40 行，有明確來源和觸發條件
2. **分層 scope**：global → channel → user（平台級）→ merged-user（跨平台）
3. **溯源**：每條知識標註來源（對話日期、使用者、情境）
4. **自然衰退**：未使用的 [觀]/[臨] atom 經檢視後歸檔或刪除
5. **不猜測**：不確定的事實查 atom 或原始資料，禁止從記憶推斷
6. **隱私優先**：merged-user 層有嚴格存取條件，敏感資料分級處理

---

## Atom 格式

每個 atom 是一個 `.md` 檔案，存放在 `atoms/` 對應的 scope 目錄下。

```markdown
# Atom: [簡短標題]

- Scope: global | user:{platform}:{id} | channel:{platform}:{id} | merged:{alias}
- Confidence: [固] | [觀] | [臨]
- Source: {YYYY-MM-DD} {platform}:{displayName} — {簡述情境}
- Last-used: {YYYY-MM-DD}
- Trigger: {什麼情境下應載入此 atom}
- Privacy: public | private | sensitive

## 知識

[核心事實，10-30 行，每條可追溯]

## 行動

[遇到觸發條件時該怎麼做]
```

---

## Scope 結構與目錄

```
atoms/
  global/                              — 跨所有人/頻道的通用知識
  channels/
    discord_{guildId}_{channelId}/     — 特定 Discord 頻道的主題/規則
    line_group_{groupId}/              — 特定 LINE 群組
  users/
    discord_{userId}/                  — Discord 使用者的平台級偏好
    line_{userId}/                     — LINE 使用者的平台級偏好
  merged/
    {alias}/                           — 跨平台合併的使用者記憶（隱私保護層）
  _pairing.md                          — 平台 ID → merged alias 對照表
```

### Scope 載入優先順序

對話開始時，根據來源依序載入（token 節省：先讀標題+Trigger，按需完整載入）：
1. `atoms/global/` — 一律載入
2. `atoms/channels/{platform}_{channelId}/` — 若來自群組
3. `atoms/users/{platform}_{userId}/` — 來源使用者的平台級 atoms
4. `atoms/merged/{alias}/` — **僅限私人對話（1:1 DM）且無第三人** 時載入

---

## 跨平台使用者合併（Pairing）

### _pairing.md 格式

```markdown
# Atom Pairing Map

| Alias | Platform IDs | Confirmed |
|-------|-------------|-----------|
| holylight | discord:{{DISCORD_USER_ID}}, line:{{LINE_USER_ID}} | 2026-02-26 [固] |
```

### 合併偵測流程

當偵測到**極度相似條件**時（以下任意兩項以上符合），主動詢問是否合併：
- 相同語言使用習慣且高度重疊的偏好 atoms
- 同時段在不同平台活躍
- 使用者名稱/暱稱高度相似
- 使用者自行告知

**合併確認**：
1. 在其中一個平台的私人對話中詢問：「你在 {另一平台} 也有帳號嗎？看起來非常相似。」
2. 使用者確認後，建立 _pairing.md 條目
3. 將共通偏好提升到 `atoms/merged/{alias}/`
4. 平台級 atoms 保留平台特有的資訊

---

## 隱私分級系統

### Privacy 標籤

| 等級 | 含義 | 存取條件 |
|------|------|----------|
| `public` | 安全的一般知識 | 任何 session 可載入 |
| `private` | 個人偏好，非敏感 | 僅 1:1 DM 可載入，群組中不引用 |
| `sensitive` | 高度敏感個人資料 | 僅 1:1 DM + 認證通過後可存取 |

### 絕對禁止記憶的資料

以下類型**永不存為 atom**，即使使用者要求：
- 信用卡號、CVV、金融帳號
- 密碼、API key、token（臨時使用後立即遺忘）
- 身分證/護照號碼
- 醫療診斷細節

若使用者提供這類資料用於當前操作，**只在 session 記憶中使用，不寫入任何檔案**。

### Sensitive 存取認證

使用者首次要求存取 `sensitive` 層的 atom 時：

1. 提示：「這涉及敏感個人資料。要設定一個認證規則嗎？（例如約定密語）」
2. 使用者設定密語 → 存為 `atoms/merged/{alias}/_auth.md`（密語以 hash 儲存，不明文）
3. 後續存取 sensitive atoms 時：「請輸入認證密語。」
4. 驗證通過 → 本次 session 解鎖 sensitive 層
5. Session 結束 → 自動重新鎖定

**_auth.md 格式**（不存明文）：
```markdown
# Auth: {alias}
- Method: passphrase
- Hash: sha256:{hash_value}
- Created: {YYYY-MM-DD}
- Last-verified: {YYYY-MM-DD}
```

---

## Confidence 分類

| 符號 | 等級 | ai-kb-framework 對照 | 行為 |
|------|------|----------------------|------|
| `[固]` | VERIFIED | PERMANENT | 直接遵循，不需確認 |
| `[觀]` | OBSERVED | STAGING（已提升） | 觸及時簡短確認 |
| `[臨]` | INFERRED | STAGING（待提升） | 下次觸及時主動問是否仍適用 |

---

## Memory Lifecycle

### 1. 載入（對話開始）

按 scope 優先順序載入（見上方）。
**Token 節省**：只讀 atom 的標題 + Trigger 行，判斷相關性後才完整載入。

### 2. 捕捉（對話進行中）

| 情境 | 動作 | Confidence |
|------|------|------------|
| 使用者說「記住」「以後都這樣」 | 直接建 atom | `[固]` |
| 使用者做了取捨（A 不做 B） | 寫入 staging | `[臨]` |
| 發現重要事實/偏好 | 寫入 staging | `[觀]` |
| 使用者糾正了 AI 回應 | 寫入 staging | `[觀]` |
| 重複出現的模式（>=3 次） | 建議使用者建立 atom | 待確認 |

Staging 寫入 `workspace/staging/`，格式：
```markdown
# Staging: [標題]
- Scope: [判斷的 scope]
- Confidence: [臨] 或 [觀]
- Source: {日期} {platform}:{displayName} — {情境}
- Occurrences: 1
- Created: {日期}

## 觀察
[記錄的內容]
```

### 3. 提升（REFINE）

對話結束或 heartbeat 時掃描 `workspace/staging/`：
- **Occurrences >= 3** 或使用者明確確認 → 提升為正式 atom
- **> 14 天未確認 + Occurrences < 3** → 下次 heartbeat 刪除
- **其他** → 保留，觸及時遞增 occurrence count

### 4. 衰退

Last-used 超過 30 天：
- `[臨]` → 歸檔到 `workspace/archived/`
- `[觀]` → 下次觸及時確認，有效則更新日期，否則歸檔
- `[固]` → 不自動衰退，heartbeat 時列出供人工審閱

---

## 自成長：模式偵測

對話結束時掃描 session：
- 同類問題/操作出現 >= 3 次 → 建議建 atom：「我注意到 X 出現了 N 次，要建立固定處理方式嗎？」
- **不自動建立** — messaging 環境中需使用者明確同意

---

## Post-Work 同步

完成有意義互動後主動詢問：
> 「這次對話涉及 [摘要]，要我更新相關 atoms 和 _CHANGELOG 嗎？」

---

## 與 OpenClaw 原生系統的整合

| 系統 | 定位 | 何時用 |
|------|------|--------|
| `MEMORY.md` | Agent 長期策展記憶 | 只在 main session |
| `memory/YYYY-MM-DD.md` | 每日原始記錄 | 所有 session |
| `atoms/` | **原子知識**（結構化、可查詢、有 scope 和 privacy） | 按 scope + privacy 載入 |
| `workspace/staging/` | **待確認觀察** | REFINE 時檢查 |
| `_AIDocs/` | **專案知識庫**（架構、配置、變更） | 修改前讀 |

**分工原則**：
- 技術架構事實 → `_AIDocs/`
- 使用者偏好/判斷原則/人際脈絡 → `atoms/`
- 每日瑣事 → `memory/YYYY-MM-DD.md`
- Agent 自身記憶 → `MEMORY.md`
