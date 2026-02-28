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
  _identity-map.md                     — ★ 平台 ID → 人員路徑 高速映射（最先讀取）
  _pairing.md                          — 跨平台身份配對對照表
  global/                              — 跨所有人/頻道的通用知識
  channels/
    discord_{guildId}_{channelId}/     — 特定 Discord 頻道的主題/規則
    line_group_{groupId}/              — 特定 LINE 群組
  persons/                             — ★ 以人為單位的記憶（語意化路徑）
    _registry.md                       — 人員詳細索引
    _candidates/                       — 觀察中的未確認使用者
    owner/{alias}/                     — 擁有者（最高權限）
      _profile.md                      — 核心辨識檔
      personality/                     — 個性特徵、溝通風格
      principles/                      — 對談原則、AI 應對規則
      interests/long-term/             — 穩定興趣（[固]）
      interests/tracking/              — 短期關注（[觀]/[臨]）
      relationships/                   — 與其他人的關係
      context/                         — 情境性記憶
    user/{alias}/                      — 一般使用者（同上結構）
  events/                              — ★ 事件導向的共享記憶
    _active.md                         — 進行中事件索引
    {event-slug}/                      — 每個事件的資料夾
      _event.md                        — 事件核心檔
  users/                               — （舊結構，保留相容）平台級偏好
    discord_{userId}/
    line_{userId}/
```

**路徑即 metadata**：`persons/{role}/{alias}/{facet}/atom.md` — AI 從路徑即可推斷角色、權限、身份、分類。

### Scope 載入優先順序

對話開始時，根據來源依序載入（token 節省：先讀標題+Trigger，按需完整載入）：
1. `atoms/_identity-map.md` — **最先讀取**，平台 ID → 人員路徑映射
2. `atoms/global/` — 一律載入
3. `atoms/channels/{platform}_{channelId}/` — 若來自群組
4. `atoms/persons/{role}/{alias}/_profile.md` — 當前發話者的人員檔案
5. `atoms/events/_active.md` — 進行中事件索引
6. `atoms/persons/_registry.md` — 需要更多人員資訊時查詢

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

## 身份映射（Identity Map）

### `_identity-map.md`

位於 `atoms/` 根目錄，是所有身份解析的入口點。每個已知身份只佔一行。

```markdown
# Identity Map
> 格式：{platform}:{userId} → {role}/{alias}
> 未知 ID 查 persons/_candidates/

discord:831783571513278464 → owner/holylight
line:U556bc083405a12bb3a9d2dbb66983386 → owner/holylight
```

**載入流程**：
```
收到訊息 from platform:userId
  → 查 _identity-map.md（已在 context 中）
    → 找到 → persons/{role}/{alias}/ → 按需載入 _profile.md
    → 找不到 → 查 _candidates/ → 有就載入 → 沒有就建新候選檔
```

**與 identityLinks 的分工**：
- `openclaw.json` 的 `identityLinks`：底層 session 合併
- `_identity-map.md`：應用層的 atom 記憶查詢入口
- 兩者獨立但一致，新增已確認人員時兩邊同步更新

---

## 人員辨識（Person Identification）

### _profile.md 格式

```markdown
# Person: {alias}

- Role: owner | user
- Confidence: [固] | [觀] | [臨]
- Created: {YYYY-MM-DD}
- Last-seen: {YYYY-MM-DD}
- Named-by: owner | ai-observed | self-introduced
- Privacy: public

## 身份

| Platform | ID | Display Name | Confirmed |
|----------|----|-------------|-----------|
| discord | {userId} | {顯示名} | [固] 2026-02-28 |

## 特徵標籤

- language: {語言}
- active-hours: {活躍時段}
- topics: [...]
- style: [...]

## 關係

- {與其他已知人員的關係}

## 備註

- {補充資訊}
```

### 候選人觀察檔（_candidates/）

未確認的使用者存在 `persons/_candidates/{platform}_{userId}.md`：

```markdown
# Candidate: {platform}_{userId}

- Platform: {discord | line}
- Platform-ID: {userId}
- Display-Name: {顯示名}
- First-seen: {YYYY-MM-DD}
- Last-seen: {YYYY-MM-DD}
- Interactions: {次數}
- Candidate-for: {person alias} | none
- Match-confidence: {0-100} | n/a

## 觀察特徵

- language / active-hours / topics / style

## 互動摘要

- {YYYY-MM-DD}: {1-2 行摘要}
```

**候選人衰退**：14 天無互動 → 歸檔；30 天無互動 → 刪除。

### 自動建立 Person 的判斷邏輯

AI 觀察到候選人有**有意義的互動模式**時，自動建立 [觀] person 記錄：

```
判斷條件（滿足任一）：
  a. 互動次數 >= 3 次，跨越 2+ 天
  b. 對方主動自我介紹
  c. 對方提供了跨平台身份資訊
  d. 與已知 person 有高度相似（Match >= 70%）

執行：
  1. 在 persons/user/{alias}/ 建立 _profile.md（Confidence: [觀]）
  2. 新增一行到 _identity-map.md
  3. 更新 _registry.md
  4. 事後在 weekly report 或 owner DM 中通知
```

Owner 主動命名時直接建立 [固] 記錄。

### Facet 分類演算法

每個人員的 atom 按以下決策樹歸入對應 facet 資料夾：

```
1. X 的本質特徵（性格、風格、習慣）？ → personality/
2. 「AI 應該怎麼對 X 做」的規則？ → principles/
3. X 關心/投入的事物？
   a. >= 3 次，跨越 30+ 天 → interests/long-term/
   b. 近期（<30 天）或 <3 次 → interests/tracking/
4. X 與另一人的關係？ → relationships/
5. 特定專案/事件/有時效性的情境？ → context/
6. 以上都不符合 → 寫入 _profile.md 備註；同類 >= 3 個時建議新 facet
```

**Facet 自成長**：同一 facet 下 atom 聚集出子分類（>= 5 個相關 atom）→ AI 提議新增子目錄 → 需 owner 確認。命名規則：全小寫英文、連字號分隔。

### 權限系統

| 角色 | 路徑段 | 權限範圍 |
|------|--------|---------|
| **owner** | `persons/owner/` | 全域讀寫。調閱任何人資料、修改規則、合併/刪除人員 |
| **user** | `persons/user/` | 僅自身資料。1:1 DM 中可調整自己的偏好和原則 |
| **OpenClaw** | （系統角色） | 規則執行者。依分類演算法管理 atom，不可覆寫 owner 決策 |

**存取限制**：
- 不暴露 user A 的記憶給 user B
- owner 不在場時，不在群組中引用任何人的 private atom
- user 在 1:1 DM 中的私人資訊 → `Privacy: private`
- owner 提供的關於他人資訊 → `Privacy: private`，只在 owner DM 中引用

### 背景辨識演算（跨平台配對偵測）

| 特徵 | 權重 | 比對方式 |
|------|------|---------|
| 語言風格 | 20% | 語言代碼 + 慣用句式 |
| 活躍時段 | 20% | 時段重疊比例 |
| 話題偏好 | 25% | topics 標籤 Jaccard 相似度 |
| 互動模式 | 15% | 回應速度、訊息長度、語氣 |
| 名稱相似 | 20% | display name 字串相似度 |

```
相似度 = Σ (權重 × 匹配分數)
>= 70 → 高度疑似，記入 _registry.md + weekly report
50-69 → 可能相關，僅在候選檔記錄
< 50 → 不建立關聯
```

**觸發時機**：Heartbeat（每 30 分鐘）掃描近 24h 活躍候選人；Session 結束時一次比對。不在即時訊息處理中執行。

**通知方式**：每週三 21:00 透過 LINE DM 彙整 Weekly Identity Report。Owner 回覆確認 → [觀]→[固]；不回應 → 繼續觀察。

---

## 事件系統（Event System）

多人參與同一事件的共享記憶。

### _event.md 格式

```markdown
# Event: {事件名稱}

- Slug: {event-slug}
- Type: meeting | project | activity | incident | recurring
- Status: active | completed | archived
- Created: {YYYY-MM-DD}
- Last-updated: {YYYY-MM-DD}
- Privacy: public | private
- Participants: [owner/holylight, user/xiaoming, ...]
- Channels: [line_group_{groupId}, discord_{guildId}_{channelId}]

## 摘要
{1-3 行事件概述}

## 時間軸
- {YYYY-MM-DD}: {1 行描述}

## 關聯 Atom
- persons/{role}/{alias}/context/{slug}.md
```

### 事件索引（_active.md）

```markdown
# Active Events
| Slug | Name | Participants | Last-updated |
```

### 事件 × 人員雙向連結

- 事件 → 人員：`_event.md` 的 Participants 列表
- 人員 → 事件：`persons/{role}/{alias}/context/` 下的 atom 引用事件 slug

### 事件生命週期

| 狀態 | 行為 |
|------|------|
| `active` | 列在 _active.md，參與者對話時自動載入摘要 |
| `completed` | 從 _active.md 移除，僅被引用時載入 |
| `archived` | 移至 `workspace/archived/events/`，30 天後刪除 |

### 事件建立觸發

```
a. 群組中 >= 2 人持續討論同一主題 >= 2 次對話
b. Owner 明確指定「這是一個事件/專案」
c. 已有 cron job 對應的週期性活動

AI 建 [臨]/[觀] 事件 → 通知 owner → 確認則 [固]
```

### 事件載入規則

- 群組：讀 _active.md → 發話者是 participant → 載入 _event.md 摘要
- 1:1 DM：owner 可查詢任何事件；user 只載入自己參與的
- Token 預算：每次 session 最多 2 個 _event.md

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
