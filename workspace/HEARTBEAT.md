# HEARTBEAT.md

## Atomic Memory Maintenance

On each heartbeat, check these in rotation (not all every time):

1. **Staging REFINE**: Scan `workspace/staging/` for items ready to promote (occurrences >= 3 or > 14 days stale)
2. **Atom decay check**: Scan atoms with `Last-used` > 30 days — [臨] archive, [觀] flag for confirmation, [固] list for review
3. **Daily notes distill**: Check recent `memory/YYYY-MM-DD.md` for insights worth extracting into atoms
4. **CHANGELOG 滾動淘汰**: 若 `_AIDocs/_CHANGELOG.md` 超過 8 筆條目，將最舊的移至 `_CHANGELOG_ARCHIVE.md`
5. **MEMORY.md 瘦身檢查**: 若 MEMORY.md 超過 ~30 行，檢查是否有可移至 `Extra_Efficiently_TokenSafe.md` 或 daily notes 的內容

If nothing needs attention, reply HEARTBEAT_OK.
