# OpenClaw _AIDocs Index

> 專案知識庫。2026-03-12 建立，2026-03-21 更新（Phase 4 完成 — 全 src/ 47 子目錄函式級索引，28 份文件）。

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
| 23 | [Core-Media-Functions.md](Core-Media-Functions.md) | Browser+Media+Link+Markdown+Canvas 函式級索引 — 169 檔 26,631 行、6 子系統（Playwright/Chrome MCP/CDP/Provider/Markdown IR/Canvas）、跨模組呼叫圖 |
| 24 | [Core-Channels-Functions.md](Core-Channels-Functions.md) | Channels/LINE/WhatsApp/Pairing/Sessions 函式級索引 — ~156 檔、9 channel adapter、Plugin 註冊/Outbound/Allowlist/Typing/Thread Binding/Draft Stream/Run State/Rich Menu/Flex/Pairing Store/Session Key、呼叫圖 |
| 25 | [Core-SDK-Functions.md](Core-SDK-Functions.md) | Plugin SDK + Memory + Secrets + Security 函式級索引 — 198 檔 35,182 行、SDK public API 面（webhook/auth/lifecycle/group-access）、Memory hybrid search engine（6 embedding providers + batch + MMR + temporal-decay）、Secrets runtime snapshot + target registry、Security audit（25+ checks）+ sensitive-filter + external-content 防護、呼叫圖 |
| 26 | [Core-Utilities-Functions.md](Core-Utilities-Functions.md) | Core Utilities 函式級索引 — 227 檔 27,323 行、13 目錄（shared/utils/logging/process/daemon/terminal/tui/wizard/node-host/providers/compat/test-helpers/test-utils）、IP 解析+SSRF 防護、Command Queue 多 lane 併發、Process Supervisor、三平台 Daemon、TUI 全功能、呼叫圖 |
| 27 | [Core-AutoReply-Functions.md](Core-AutoReply-Functions.md) | AutoReply+Cron+TTS+Context Engine 函式級索引 — 226 檔 ~44,500 行、入站 dispatch/指令系統(40+ handlers)/LLM Agent 執行(fallback+memory flush)/Directive 解析/Block Streaming/Session 管理/Followup Queue/Model Selection/Cron Service(timer+jobs+delivery)/Isolated Agent/TTS 3-provider/Context Engine registry、呼叫圖+系統歸屬分類 |
| 28 | [Core-Infra-Functions.md](Core-Infra-Functions.md) | Infra 函式級索引 — 227 檔 40,751 行、5 子目錄（format-time/net/outbound/tls/根）、Exec Approval 全鏈/Outbound 遞送(33 檔)/Heartbeat/Device+Node 配對/APNS 推播/檔案系統安全/網路安全(SSRF)/更新安裝系統/Provider 用量/狀態遷移、呼叫關聯圖+24 系統歸屬分類 |
