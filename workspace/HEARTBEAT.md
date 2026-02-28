# HEARTBEAT.md

## Atomic Memory Maintenance

On each heartbeat, check these in rotation (not all every time):

1. **Staging REFINE**: Scan `workspace/staging/` for items ready to promote (occurrences >= 3 or > 14 days stale)
2. **Atom decay check**: Scan atoms with `Last-used` > 30 days — [臨] archive, [觀] flag for confirmation, [固] list for review
3. **Daily notes distill**: Check recent `memory/YYYY-MM-DD.md` for insights worth extracting into atoms
4. **CHANGELOG 滾動淘汰**: 若 `_AIDocs/_CHANGELOG.md` 超過 8 筆條目，將最舊的移至 `_CHANGELOG_ARCHIVE.md`
5. **MEMORY.md 瘦身檢查**: 若 MEMORY.md 超過 ~30 行，檢查是否有可移至 `Extra_Efficiently_TokenSafe.md` 或 daily notes 的內容
6. **Recurring reminder 萃取**: 掃描近期 daily notes 與 staging，識別週期性提醒類事件（每天/每週/固定頻率），若同類事件 >=3 次則建議建立 atom 或 cron job
7. **候選人背景比對**: 掃描 `atoms/persons/_candidates/` 近 24h 有互動的候選人（`Last-seen` 在 24h 內），執行背景辨識演算：
   - 讀取候選人觀察特徵（language、active-hours、topics、style）
   - 與 `atoms/persons/_registry.md` 已確認人員 + 其他候選人做特徵比對
   - 比對權重：語言風格 20% / 活躍時段 20% / 話題偏好 25% / 互動模式 15% / 名稱相似 20%
   - Match >= 70 → 記入 `_registry.md` 觀察中候選人表 + 標記 `Candidate-for`
   - Match 50-69 → 僅在候選檔內記錄
   - 同時檢查候選人衰退：`Last-seen` > 14 天 → 歸檔到 `workspace/archived/candidates/`

If nothing needs attention, reply HEARTBEAT_OK.
