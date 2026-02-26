# HEARTBEAT.md

## Atomic Memory Maintenance

On each heartbeat, check these in rotation (not all every time):

1. **Staging REFINE**: Scan `workspace/staging/` for items ready to promote (occurrences >= 3 or > 14 days stale)
2. **Atom decay check**: Scan atoms with `Last-used` > 30 days — [臨] archive, [觀] flag for confirmation, [固] list for review
3. **Daily notes distill**: Check recent `memory/YYYY-MM-DD.md` for insights worth extracting into atoms

If nothing needs attention, reply HEARTBEAT_OK.
