# OpenClaw _AIDocs Index

> 專案知識庫。2026-03-12 建立，2026-03-21 更新（Phase 3 完成 — CLI/Commands/Config/Plugins/Hooks 函式級索引）。

| # | 文件 | 說明 |
|---|------|------|
| 1 | [Architecture.md](Architecture.md) | 系統架構總覽 — 資料流、子系統關聯圖、關鍵入口檔 |
| 2 | [CLI-Layer.md](CLI-Layer.md) | CLI 入口 + 指令層 — Bootstrap、Commander、Lazy Loading、Route |
| 3 | [Gateway.md](Gateway.md) | Gateway 伺服器 — WS/HTTP、70+ RPC methods、Auth、Node Registry |
| 4 | [Agents.md](Agents.md) | Agent 子系統 — 生命週期、LLM 執行、Auth Profile、Tool 執行 |
| 5 | [Config-Plugins-Hooks.md](Config-Plugins-Hooks.md) | Config + Plugin + Hook — JSON5/Zod、Plugin SDK、24 Hook 清單 |
| 6 | [Channels-Routing.md](Channels-Routing.md) | Channels + Routing — 9 頻道抽象層、Tier 路由、Session Key |
| 7 | [Infrastructure.md](Infrastructure.md) | 基礎設施 — Infra/Security/Secrets/Process/Daemon/Logging/Shared |
| 8 | [Features.md](Features.md) | 功能子系統 — Memory/Auto-reply/Media/Browser/ACP/Cron/TTS |
| 9 | [Extensions.md](Extensions.md) | Extensions（44 插件）— Memory/Channel/Provider/System 分類 |
| 10 | [UI-Skills-Apps.md](UI-Skills-Apps.md) | UI Dashboard + 51 Skills + Scripts + Native Apps |
| 11 | [Docs-Config-Map.md](Docs-Config-Map.md) | MD 文件與設定檔角色對照 — 運作流程、Workspace 注入、設定檔協作 |
| 12 | [FileTree.md](FileTree.md) | 完整檔案樹 + 結構映射 — 6,350+ 檔案、47 src 子目錄、44 extensions、差異分析 |
| 13 | [Evolution-Plan.md](Evolution-Plan.md) | 進化計畫 — 指令權限矩陣、多層級權限方案、自我迭代路線圖、Phase 2-5 拆分 |
| 14 | [Core-Routing-Functions.md](Core-Routing-Functions.md) | Routing 函式級索引 — 6 檔 1,272 行、全 export 簽名、7 層 tier 匹配、呼叫圖 |
| 15 | [Core-ACP-Functions.md](Core-ACP-Functions.md) | ACP 函式級索引 — 36 檔 6,500+ 行、全 export 簽名、server/client/translator/control-plane/runtime/persistent-bindings、呼叫圖 |
| 16 | [Core-Gateway-Functions.md](Core-Gateway-Functions.md) | Gateway 函式級索引 — ~180 檔、106 RPC methods、14 HTTP routes、18 WS events、16 子系統、跨模組依賴 |
| 17 | [Core-Agents-Functions.md](Core-Agents-Functions.md) | Agents 函式級索引 — ~408 檔、13 子系統、模型認證/Runner/Tool/Sandbox/Subagent/Skills 完整 export 簽名 |
| 18 | [Core-Hooks-Functions.md](Core-Hooks-Functions.md) | Hooks 函式級索引 — 25 檔 4,333 行、事件引擎/4 bundled handlers/Gmail 子系統/安裝/訊息橋接、呼叫圖 |
| 19 | [Core-CLI-Functions.md](Core-CLI-Functions.md) | CLI 函式級索引 — 182 檔 27,600 行、Bootstrap/Commander/Route/Gateway/Daemon/Browser/Nodes/Cron/Update 全子系統、呼叫圖 |
| 20 | [Core-Plugins-Functions.md](Core-Plugins-Functions.md) | Plugins 函式級索引 — 55 檔 9,573 行、Loader/Discovery/Manifest/Registry/Hooks(24)/Runtime/Install/Update/Commands/Provider/Tools 全子系統、呼叫圖 |
| 21 | [Core-Config-Functions.md](Core-Config-Functions.md) | Config 函式級索引 — 136 檔 27,851 行、I/O 核心/Zod Schema/驗證/預設值/路徑解析/環境變數/$include/merge-patch/Legacy Migration/Redaction/Session Store 全子系統、呼叫圖 |
| 22 | [Core-Commands-Functions.md](Core-Commands-Functions.md) | Commands 函式級索引 — 235 檔 43,510 行、21 子系統、Agent/Auth/Channel/Doctor/Models/Onboard/Status/Sandbox CLI handlers 完整 export 簽名、呼叫圖 |
