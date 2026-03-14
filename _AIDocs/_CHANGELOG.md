# _AIDocs Changelog

| 日期 | 變更 | 影響文件 |
|------|------|---------|
| 2026-03-14 | **atomic-memory S3**: Session State + Intent + Blind-Spot — session-state.ts（SessionStateManager: Map + 2h TTL 自動清理）; intent-classifier.ts（7 種 intent, 中英文 keyword matching + category boosts）; blind-spot.ts（空結果/弱匹配偵測, inject <13 tokens）; index.ts 整合 session_start hook + before_agent_start intent/blind-spot | Extensions.md |
| 2026-03-14 | **atomic-memory S5**: Cross-session consolidation — cross-session.ts（consolidateNewFacts: 每 fact 查 ChromaDB 找跨 session 重複，自動遞增 confirmations）; promotion.ts 加 immediatePromotionCheck（[臨]→[觀] 即時晉升，[觀]→[固] suggest only）; index.ts agent_end hook 整合 | Extensions.md |
| 2026-03-14 | **atomic-memory S0-S2 (Wave 1)**: S0 index.ts 拆分為模組化入口 + logger/types/forget-engine/context-formatter/workspace-reader 抽出; S1 ACT-R activation scoring + 3 階段 token budget + summary fallback; S2 Ollama 3-stage resilience + write gate CJK operationality | Extensions.md |
| 2026-03-12 | **read-project**: 深度閱讀全專案（2878 TS 檔），建立 10 份文件索引 | _INDEX.md, Architecture.md, CLI-Layer.md, Gateway.md, Agents.md, Config-Plugins-Hooks.md, Channels-Routing.md, Infrastructure.md, Features.md, Extensions.md, UI-Skills-Apps.md |
| 2026-03-12 | **read-project**: 深度閱讀所有 *.md + 設定檔，新增 Docs-Config-Map（MD 角色對照 + 設定檔詳解 + 運作流程） | Docs-Config-Map.md, _INDEX.md |
