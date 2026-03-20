# Browser + Media + Link + Markdown + Canvas 函式級索引

> 掃描日期：2026-03-21 | 檔案數：169 檔 | 總行數：~26,631 行

---

## 目錄結構

```
src/browser/                          (90 檔, ~14,800 行) — 瀏覽器自動化控制
├── routes/                           (16 檔) — HTTP API 路由層
│   ├── index.ts                      — 路由總入口
│   ├── agent.ts                      — Agent 路由註冊
│   ├── agent.act.ts                  — 互動操作路由 (click/type/fill 等)
│   ├── agent.act.download.ts         — 下載相關操作路由
│   ├── agent.act.hooks.ts            — dialog/fileChooser/download hook 路由
│   ├── agent.act.shared.ts           — Act 類型定義與解析工具
│   ├── agent.debug.ts                — Debug 路由
│   ├── agent.shared.ts               — 路由共用工具 (readBody/error handling)
│   ├── agent.snapshot.ts             — 快照 (aria/dom/screenshot) 路由
│   ├── agent.snapshot.plan.ts        — 快照策略計算
│   ├── agent.storage.ts              — Cookie/Storage 路由
│   ├── basic.ts                      — 基礎路由 (status/start/stop)
│   ├── dispatcher.ts                 — 路由分發器（不依賴 Express）
│   ├── output-paths.ts               — 輸出路徑解析
│   ├── tabs.ts                       — Tab 管理路由
│   ├── types.ts                      — 路由型別定義
│   └── utils.ts                      — 路由工具函式
├── pw-session.ts                     — Playwright session 管理（核心）
├── pw-tools-core.ts                  — Playwright 工具 barrel export
├── pw-tools-core.interactions.ts     — Playwright 互動 (click/type/fill/evaluate)
├── pw-tools-core.snapshot.ts         — Playwright 快照 (aria/navigate/resize)
├── pw-tools-core.downloads.ts        — Playwright 下載/上傳/dialog
├── pw-tools-core.activity.ts         — Playwright console/network/errors
├── pw-tools-core.state.ts            — Playwright 狀態設定 (offline/headers/geo)
├── pw-tools-core.storage.ts          — Playwright cookies/storage
├── pw-tools-core.trace.ts            — Playwright trace 錄製
├── pw-tools-core.responses.ts        — Playwright response body 讀取
├── pw-tools-core.shared.ts           — Playwright 工具共用邏輯
├── chrome-mcp.ts                     — Chrome DevTools MCP 整合
├── chrome-mcp.snapshot.ts            — Chrome MCP snapshot 解析
├── cdp.ts                            — CDP 協定操作（screenshot/evaluate/aria）
├── cdp.helpers.ts                    — CDP HTTP/WS 工具
├── cdp-proxy-bypass.ts               — CDP proxy 繞過
├── cdp-timeouts.ts                   — CDP 超時常數
├── chrome.ts                         — Chrome 啟動/停止/偵測
├── chrome.executables.ts             — Chrome 可執行檔搜尋
├── chrome.profile-decoration.ts      — Chrome profile 裝飾
├── server.ts                         — Browser HTTP server 啟動入口
├── server-context.ts                 — Server context 建構
├── server-context.types.ts           — Server context 型別
├── server-context.tab-ops.ts         — Tab 操作 (open/close/focus/list)
├── server-context.selection.ts       — Tab 選取邏輯
├── server-context.availability.ts    — Profile 可用性偵測
├── server-context.reset.ts           — Profile 重置操作
├── server-context.constants.ts       — Server context 常數
├── client.ts                         — Browser client API (高階封裝)
├── client-actions.ts                 — Client actions barrel export
├── client-actions-core.ts            — Client 核心動作 (navigate/act/screenshot)
├── client-actions-observe.ts         — Client 觀察動作 (console/network/trace)
├── client-actions-state.ts           — Client 狀態動作 (cookies/storage/offline)
├── client-actions-types.ts           — Client action 回應型別
├── client-actions-url.ts             — Client URL 工具
├── client-fetch.ts                   — Browser fetch 封裝 (rate limit/retry)
├── config.ts                         — Browser config 解析
├── control-auth.ts                   — Browser 控制端認證
├── control-service.ts                — Browser 控制服務 (不含 HTTP server)
├── extension-relay.ts                — Chrome Extension Relay Server
├── extension-relay-auth.ts           — Extension Relay 認證
├── bridge-server.ts                  — Browser Bridge Server (sandbox 隔離)
├── bridge-auth-registry.ts           — Bridge 認證 registry
├── and 20+ more utility files...

src/media-understanding/              (34 檔, ~5,400 行) — 媒體理解
├── providers/                        (14 檔) — 多 provider 音訊/影片/圖片分析
│   ├── index.ts                      — Provider registry
│   ├── shared.ts                     — 共用 HTTP 工具
│   ├── image.ts / image-runtime.ts   — 圖片描述 (多 provider)
│   ├── anthropic/index.ts            — Anthropic provider
│   ├── deepgram/audio.ts + index.ts  — Deepgram 語音轉錄
│   ├── google/audio.ts + video.ts + inline-data.ts + index.ts — Gemini 音訊/影片
│   ├── groq/index.ts                 — Groq provider
│   ├── minimax/index.ts              — Minimax provider
│   ├── mistral/index.ts              — Mistral provider
│   ├── moonshot/video.ts + index.ts  — Moonshot 影片描述
│   ├── openai/audio.ts + index.ts    — OpenAI Whisper 轉錄
│   └── zai/index.ts                  — Zai provider
├── runner.ts                         — 媒體理解執行引擎（核心）
├── runner.entries.ts                 — Provider entry 執行/CLI entry 執行
├── apply.ts                          — 對訊息套用媒體理解結果
├── attachments.ts                    — Attachments barrel export
├── attachments.cache.ts              — 附件 binary cache
├── attachments.normalize.ts          — 附件路徑/類型正規化
├── attachments.select.ts             — 附件篩選邏輯
├── resolve.ts                        — Config 解析 (timeout/prompt/model)
├── scope.ts                          — 作用域決策 (allow/deny)
├── types.ts                          — 核心型別定義
├── defaults.ts                       — 預設值常數
├── format.ts                         — 輸出格式化
├── transcribe-audio.ts               — 音訊轉錄入口
├── audio-preflight.ts                — 首筆音訊前置轉錄
├── audio-transcription-runner.ts     — 音訊轉錄 runner
├── echo-transcript.ts                — 轉錄結果回顯
├── video.ts                          — 影片 base64 大小計算
├── concurrency.ts                    — 並行控制
├── errors.ts                         — 錯誤型別
├── fs.ts                             — 檔案存在檢查
└── output-extract.ts                 — JSON/Gemini 回應解析

src/media/                            (22 檔, ~4,600 行) — 媒體處理
├── server.ts                         — Media HTTP server (Express)
├── store.ts                          — 媒體檔案儲存/清理
├── fetch.ts                          — 遠端媒體下載
├── image-ops.ts                      — 圖片操作 (resize/convert/EXIF)
├── input-files.ts                    — 輸入檔案處理 (fetch + extract)
├── parse.ts                          — MEDIA: token 解析
├── mime.ts                           — MIME 偵測/轉換
├── pdf-extract.ts                    — PDF 內容萃取
├── inbound-path-policy.ts            — 入站路徑安全策略
├── audio.ts                          — 音訊格式判斷
├── audio-tags.ts                     — 音訊 tag 解析
├── base64.ts                         — Base64 解碼/正規化
├── ffmpeg-exec.ts                    — ffmpeg/ffprobe 執行封裝
├── ffmpeg-limits.ts                  — ffmpeg 限制常數
├── png-encode.ts                     — PNG 編碼 (raw RGBA)
├── host.ts                           — 媒體託管 (store + URL)
├── load-options.ts                   — Outbound 媒體載入設定
├── local-roots.ts                    — 本地媒體根目錄
├── outbound-attachment.ts            — Outbound 附件 URL 解析
├── constants.ts                      — 媒體大小限制常數
├── read-response-with-limit.ts       — 限制大小讀取 Response
├── sniff-mime-from-base64.ts         — 從 base64 偵測 MIME
└── temp-files.ts                     — 暫存檔清理

src/link-understanding/               (5 檔, ~220 行) — 連結理解
├── runner.ts                         — 連結理解執行引擎
├── apply.ts                          — 套用連結理解結果
├── detect.ts                         — 訊息中連結擷取
├── format.ts                         — 輸出格式化
└── defaults.ts                       — 預設常數

src/markdown/                         (7 檔, ~1,200 行) — Markdown 處理
├── ir.ts                             — Markdown → IR 解析器（核心，973 行）
├── render.ts                         — IR → 目標格式渲染
├── tables.ts                         — Markdown 表格轉換
├── whatsapp.ts                       — Markdown → WhatsApp 格式
├── fences.ts                         — Code fence 解析
├── code-spans.ts                     — Inline code span 索引
└── frontmatter.ts                    — YAML frontmatter 解析

src/canvas-host/                      (3 檔, ~580 行) — Canvas 宿主
├── server.ts                         — Canvas HTTP/WS server
├── a2ui.ts                           — A2UI 路由 + live reload 注入
└── file-resolver.ts                  — 安全檔案路徑解析
```

---

## 函式清單

### src/browser/

#### 🔧 Server 啟動與生命週期

| 函式 | 檔案 | 回傳 | 說明 | 入口 |
|------|------|------|------|------|
| `startBrowserControlServerFromConfig()` | server.ts | `Promise<BrowserServerState \| null>` | 啟動 Browser HTTP 控制 server（含認證） | 系統入口 |
| `stopBrowserControlServer()` | server.ts | `Promise<void>` | 停止 HTTP server 及所有 profile | 系統入口 |
| `getBrowserControlState()` | control-service.ts | `BrowserServerState \| null` | 取得目前控制服務狀態 | 內部 |
| `createBrowserControlContext()` | control-service.ts | `BrowserRouteContext` | 建立 route context（無 HTTP server） | 內部 |
| `startBrowserControlServiceFromConfig()` | control-service.ts | `Promise<BrowserServerState \| null>` | 啟動控制服務（不含 HTTP server） | 系統入口 |
| `stopBrowserControlService()` | control-service.ts | `Promise<void>` | 停止控制服務 | 系統入口 |
| `createBrowserRuntimeState(params)` | runtime-lifecycle.ts | `Promise<BrowserServerState>` | 建立 runtime 狀態（啟動 profile） | 內部 |
| `stopBrowserRuntime(params)` | runtime-lifecycle.ts | `Promise<void>` | 停止所有 browser runtime 資源 | 內部 |
| `createBrowserRouteContext(opts)` | server-context.ts | `BrowserRouteContext` | 建構 route context（含 profile ops） | 內部 |
| `listKnownProfileNames(state)` | server-context.ts | `string[]` | 列出所有已知 profile 名稱 | 內部 |

#### 🔧 Server Context — Profile 管理

| 函式 | 檔案 | 回傳 | 說明 | 入口 |
|------|------|------|------|------|
| `createProfileAvailability(params)` | server-context.availability.ts | `object` | 建立 profile 可用性偵測邏輯 | 內部 |
| `createProfileTabOps(params)` | server-context.tab-ops.ts | `object` | 建立 tab 操作集（open/close/focus/list） | 內部 |
| `createProfileSelectionOps(params)` | server-context.selection.ts | `object` | 建立 tab 選取邏輯 | 內部 |
| `createProfileResetOps(params)` | server-context.reset.ts | `object` | 建立 profile 重置操作集 | 內部 |
| `createBrowserProfilesService(ctx)` | profiles-service.ts | `object` | 建立 profile CRUD 服務 | 內部 |

#### 🔧 Chrome 啟動與偵測

| 函式 | 檔案 | 回傳 | 說明 | 入口 |
|------|------|------|------|------|
| `launchOpenClawChrome(params)` | chrome.ts | `Promise<RunningChrome>` | 啟動 Chrome（含 CDP port/profile） | 核心 |
| `stopOpenClawChrome(params)` | chrome.ts | `Promise<void>` | 停止 Chrome 程序 | 核心 |
| `isChromeReachable(params)` | chrome.ts | `Promise<boolean>` | 檢查 Chrome CDP 是否可達 | 內部 |
| `getChromeWebSocketUrl(params)` | chrome.ts | `Promise<string>` | 取得 Chrome CDP WebSocket URL | 內部 |
| `isChromeCdpReady(params)` | chrome.ts | `Promise<boolean>` | 檢查 CDP WebSocket 是否就緒 | 內部 |
| `resolveOpenClawUserDataDir(profileName?)` | chrome.ts | `string` | 解析 Chrome user data 目錄 | 內部 |
| `findChromeExecutableMac()` | chrome.executables.ts | `BrowserExecutable \| null` | 搜尋 macOS Chrome 路徑 | 內部 |
| `findChromeExecutableLinux()` | chrome.executables.ts | `BrowserExecutable \| null` | 搜尋 Linux Chrome 路徑 | 內部 |
| `findChromeExecutableWindows()` | chrome.executables.ts | `BrowserExecutable \| null` | 搜尋 Windows Chrome 路徑 | 內部 |
| `resolveBrowserExecutableForPlatform(params)` | chrome.executables.ts | `BrowserExecutable \| null` | 跨平台解析 Chrome 可執行檔 | 內部 |
| `isProfileDecorated(params)` | chrome.profile-decoration.ts | `boolean` | 檢查 profile 是否已裝飾 | 內部 |
| `decorateOpenClawProfile(params)` | chrome.profile-decoration.ts | `void` | 為 profile 加入 OpenClaw 標記 | 內部 |
| `ensureProfileCleanExit(userDataDir)` | chrome.profile-decoration.ts | `void` | 確保 profile 乾淨退出 | 內部 |

#### 🔧 Chrome MCP 整合

| 函式 | 檔案 | 回傳 | 說明 | 入口 |
|------|------|------|------|------|
| `ensureChromeMcpAvailable(profileName)` | chrome-mcp.ts | `Promise<void>` | 確保 Chrome MCP session 可用 | 內部 |
| `getChromeMcpPid(profileName)` | chrome-mcp.ts | `number \| null` | 取得 Chrome MCP 程序 PID | 內部 |
| `closeChromeMcpSession(profileName)` | chrome-mcp.ts | `Promise<boolean>` | 關閉 Chrome MCP session | 內部 |
| `stopAllChromeMcpSessions()` | chrome-mcp.ts | `Promise<void>` | 停止所有 Chrome MCP sessions | 內部 |
| `listChromeMcpPages(profileName)` | chrome-mcp.ts | `Promise<ChromeMcpStructuredPage[]>` | 列出 Chrome MCP 頁面 | 內部 |
| `listChromeMcpTabs(profileName)` | chrome-mcp.ts | `Promise<BrowserTab[]>` | 列出 tabs (轉換為 BrowserTab) | 內部 |
| `openChromeMcpTab(profileName, url)` | chrome-mcp.ts | `Promise<BrowserTab>` | 開啟新 tab | 內部 |
| `focusChromeMcpTab(profileName, targetId)` | chrome-mcp.ts | `Promise<void>` | 聚焦指定 tab | 內部 |
| `closeChromeMcpTab(profileName, targetId)` | chrome-mcp.ts | `Promise<void>` | 關閉指定 tab | 內部 |
| `navigateChromeMcpPage(params)` | chrome-mcp.ts | `Promise<void>` | 導航到指定 URL | 內部 |
| `takeChromeMcpSnapshot(params)` | chrome-mcp.ts | `Promise<AriaSnapshotNode[]>` | 取得頁面 accessibility snapshot | 內部 |
| `takeChromeMcpScreenshot(params)` | chrome-mcp.ts | `Promise<Buffer>` | 擷取頁面截圖 | 內部 |
| `clickChromeMcpElement(params)` | chrome-mcp.ts | `Promise<void>` | 點擊元素 | 內部 |
| `fillChromeMcpElement(params)` | chrome-mcp.ts | `Promise<void>` | 填入表單欄位 | 內部 |
| `fillChromeMcpForm(params)` | chrome-mcp.ts | `Promise<void>` | 填入整個表單 | 內部 |
| `hoverChromeMcpElement(params)` | chrome-mcp.ts | `Promise<void>` | 懸停元素 | 內部 |
| `dragChromeMcpElement(params)` | chrome-mcp.ts | `Promise<void>` | 拖曳元素 | 內部 |
| `uploadChromeMcpFile(params)` | chrome-mcp.ts | `Promise<void>` | 上傳檔案 | 內部 |
| `pressChromeMcpKey(params)` | chrome-mcp.ts | `Promise<void>` | 按鍵操作 | 內部 |
| `resizeChromeMcpPage(params)` | chrome-mcp.ts | `Promise<void>` | 調整頁面大小 | 內部 |
| `handleChromeMcpDialog(params)` | chrome-mcp.ts | `Promise<void>` | 處理 dialog | 內部 |
| `evaluateChromeMcpScript(params)` | chrome-mcp.ts | `Promise<string>` | 執行 JavaScript | 內部 |
| `waitForChromeMcpText(params)` | chrome-mcp.ts | `Promise<void>` | 等待文字出現 | 內部 |
| `flattenChromeMcpSnapshotToAriaNodes(nodes)` | chrome-mcp.snapshot.ts | `RawAXNode[]` | 扁平化 MCP snapshot 為 ARIA 節點 | 內部 |
| `buildAiSnapshotFromChromeMcpSnapshot(params)` | chrome-mcp.snapshot.ts | `AriaSnapshotNode[]` | 從 MCP snapshot 建構 AI snapshot | 內部 |

#### 🔧 Playwright Session 管理（Page Pool 核心）

| 函式 | 檔案 | 回傳 | 說明 | 入口 |
|------|------|------|------|------|
| `ensurePageState(page)` | pw-session.ts | `PageState` | 取得/建立 Page 的追蹤狀態 | 內部 |
| `ensureContextState(context)` | pw-session.ts | `ContextState` | 取得/建立 BrowserContext 的追蹤狀態 | 內部 |
| `getPageForTargetId(opts)` | pw-session.ts | `Promise<Page>` | 透過 targetId 取得 Playwright Page | 核心 |
| `refLocator(page, ref)` | pw-session.ts | `Locator` | 將 ARIA ref 轉為 Playwright Locator | 核心 |
| `rememberRoleRefsForTarget(opts)` | pw-session.ts | `void` | 記錄 target 的 role refs (主動) | 內部 |
| `storeRoleRefsForTarget(opts)` | pw-session.ts | `void` | 儲存 role refs 到 registry | 內部 |
| `restoreRoleRefsForTarget(opts)` | pw-session.ts | `void` | 從 registry 恢復 role refs | 內部 |
| `closePlaywrightBrowserConnection(opts?)` | pw-session.ts | `Promise<void>` | 關閉 Playwright browser 連線 | 內部 |
| `forceDisconnectPlaywrightForTarget(opts)` | pw-session.ts | `Promise<void>` | 強制斷開特定 target 的 Playwright | 內部 |
| `listPagesViaPlaywright(opts)` | pw-session.ts | `Promise<Page[]>` | 透過 Playwright 列出所有頁面 | 內部 |
| `createPageViaPlaywright(opts)` | pw-session.ts | `Promise<Page>` | 透過 Playwright 建立新頁面 | 內部 |
| `closePageByTargetIdViaPlaywright(opts)` | pw-session.ts | `Promise<void>` | 關閉指定 targetId 的頁面 | 內部 |
| `focusPageByTargetIdViaPlaywright(opts)` | pw-session.ts | `Promise<void>` | 聚焦指定 targetId 的頁面 | 內部 |
| `isExtensionRelayCdpEndpoint(cdpUrl)` | pw-session.page-cdp.ts | `Promise<boolean>` | 判斷 CDP URL 是否為 extension relay | 內部 |
| `withPageScopedCdpClient<T>(opts)` | pw-session.page-cdp.ts | `Promise<T>` | 在 page scope CDP client 內執行操作 | 內部 |

#### 🔧 Playwright 工具 — 互動操作

| 函式 | 檔案 | 回傳 | 說明 | 入口 |
|------|------|------|------|------|
| `clickViaPlaywright(opts)` | pw-tools-core.interactions.ts | `Promise<void>` | 點擊元素 | 內部 |
| `hoverViaPlaywright(opts)` | pw-tools-core.interactions.ts | `Promise<void>` | 懸停元素 | 內部 |
| `dragViaPlaywright(opts)` | pw-tools-core.interactions.ts | `Promise<void>` | 拖曳元素 | 內部 |
| `selectOptionViaPlaywright(opts)` | pw-tools-core.interactions.ts | `Promise<void>` | 選取下拉選項 | 內部 |
| `pressKeyViaPlaywright(opts)` | pw-tools-core.interactions.ts | `Promise<void>` | 按鍵操作 | 內部 |
| `typeViaPlaywright(opts)` | pw-tools-core.interactions.ts | `Promise<void>` | 輸入文字 | 內部 |
| `fillFormViaPlaywright(opts)` | pw-tools-core.interactions.ts | `Promise<void>` | 填入表單 | 內部 |
| `evaluateViaPlaywright(opts)` | pw-tools-core.interactions.ts | `Promise<unknown>` | 執行 page.evaluate | 內部 |
| `scrollIntoViewViaPlaywright(opts)` | pw-tools-core.interactions.ts | `Promise<void>` | 捲動到元素可視 | 內部 |
| `waitForViaPlaywright(opts)` | pw-tools-core.interactions.ts | `Promise<void>` | 等待元素/條件 | 內部 |
| `takeScreenshotViaPlaywright(opts)` | pw-tools-core.interactions.ts | `Promise<Buffer>` | 截圖 | 內部 |
| `screenshotWithLabelsViaPlaywright(opts)` | pw-tools-core.interactions.ts | `Promise<Buffer>` | 含標籤的截圖 | 內部 |
| `setInputFilesViaPlaywright(opts)` | pw-tools-core.interactions.ts | `Promise<void>` | 設定 file input | 內部 |
| `highlightViaPlaywright(opts)` | pw-tools-core.interactions.ts | `Promise<void>` | 高亮元素 | 內部 |
| `batchViaPlaywright(opts)` | pw-tools-core.interactions.ts | `Promise<unknown[]>` | 批次執行多個操作 | 內部 |

#### 🔧 Playwright 工具 — 快照與導航

| 函式 | 檔案 | 回傳 | 說明 | 入口 |
|------|------|------|------|------|
| `snapshotAriaViaPlaywright(opts)` | pw-tools-core.snapshot.ts | `Promise<string>` | 取得 ARIA tree snapshot | 內部 |
| `snapshotAiViaPlaywright(opts)` | pw-tools-core.snapshot.ts | `Promise<AriaSnapshotNode[]>` | 取得 AI-friendly snapshot | 內部 |
| `snapshotRoleViaPlaywright(opts)` | pw-tools-core.snapshot.ts | `Promise<RoleSnapshotResult>` | 取得 role-based snapshot | 內部 |
| `navigateViaPlaywright(opts)` | pw-tools-core.snapshot.ts | `Promise<void>` | 導航到 URL | 內部 |
| `resizeViewportViaPlaywright(opts)` | pw-tools-core.snapshot.ts | `Promise<void>` | 調整 viewport 大小 | 內部 |
| `closePageViaPlaywright(opts)` | pw-tools-core.snapshot.ts | `Promise<void>` | 關閉頁面 | 內部 |
| `pdfViaPlaywright(opts)` | pw-tools-core.snapshot.ts | `Promise<Buffer>` | 頁面轉 PDF | 內部 |

#### 🔧 Playwright 工具 — 下載/上傳/Dialog

| 函式 | 檔案 | 回傳 | 說明 | 入口 |
|------|------|------|------|------|
| `armFileUploadViaPlaywright(opts)` | pw-tools-core.downloads.ts | `Promise<number>` | 準備檔案上傳 (arm file chooser) | 內部 |
| `armDialogViaPlaywright(opts)` | pw-tools-core.downloads.ts | `Promise<number>` | 準備 dialog 回應 | 內部 |
| `waitForDownloadViaPlaywright(opts)` | pw-tools-core.downloads.ts | `Promise<string>` | 等待下載完成 | 內部 |
| `downloadViaPlaywright(opts)` | pw-tools-core.downloads.ts | `Promise<string>` | 主動觸發下載 | 內部 |

#### 🔧 Playwright 工具 — 狀態/儲存/追蹤

| 函式 | 檔案 | 回傳 | 說明 | 入口 |
|------|------|------|------|------|
| `setOfflineViaPlaywright(opts)` | pw-tools-core.state.ts | `Promise<void>` | 設定離線模式 | 內部 |
| `setExtraHTTPHeadersViaPlaywright(opts)` | pw-tools-core.state.ts | `Promise<void>` | 設定額外 HTTP headers | 內部 |
| `setHttpCredentialsViaPlaywright(opts)` | pw-tools-core.state.ts | `Promise<void>` | 設定 HTTP 認證 | 內部 |
| `setGeolocationViaPlaywright(opts)` | pw-tools-core.state.ts | `Promise<void>` | 設定地理位置 | 內部 |
| `emulateMediaViaPlaywright(opts)` | pw-tools-core.state.ts | `Promise<void>` | 模擬媒體特性 | 內部 |
| `setLocaleViaPlaywright(opts)` | pw-tools-core.state.ts | `Promise<void>` | 設定語言區域 | 內部 |
| `setTimezoneViaPlaywright(opts)` | pw-tools-core.state.ts | `Promise<void>` | 設定時區 | 內部 |
| `setDeviceViaPlaywright(opts)` | pw-tools-core.state.ts | `Promise<void>` | 模擬裝置 | 內部 |
| `cookiesGetViaPlaywright(opts)` | pw-tools-core.storage.ts | `Promise<Cookie[]>` | 取得 cookies | 內部 |
| `cookiesSetViaPlaywright(opts)` | pw-tools-core.storage.ts | `Promise<void>` | 設定 cookies | 內部 |
| `cookiesClearViaPlaywright(opts)` | pw-tools-core.storage.ts | `Promise<void>` | 清除 cookies | 內部 |
| `storageGetViaPlaywright(opts)` | pw-tools-core.storage.ts | `Promise<Record>` | 取得 localStorage/sessionStorage | 內部 |
| `storageSetViaPlaywright(opts)` | pw-tools-core.storage.ts | `Promise<void>` | 設定 storage | 內部 |
| `storageClearViaPlaywright(opts)` | pw-tools-core.storage.ts | `Promise<void>` | 清除 storage | 內部 |
| `traceStartViaPlaywright(opts)` | pw-tools-core.trace.ts | `Promise<void>` | 開始 trace 錄製 | 內部 |
| `traceStopViaPlaywright(opts)` | pw-tools-core.trace.ts | `Promise<string>` | 停止 trace 並儲存 | 內部 |
| `getPageErrorsViaPlaywright(opts)` | pw-tools-core.activity.ts | `Promise<BrowserPageError[]>` | 取得頁面錯誤 | 內部 |
| `getNetworkRequestsViaPlaywright(opts)` | pw-tools-core.activity.ts | `Promise<BrowserNetworkRequest[]>` | 取得網路請求 | 內部 |
| `getConsoleMessagesViaPlaywright(opts)` | pw-tools-core.activity.ts | `Promise<BrowserConsoleMessage[]>` | 取得 console 訊息 | 內部 |
| `responseBodyViaPlaywright(opts)` | pw-tools-core.responses.ts | `Promise<Buffer>` | 讀取 response body | 內部 |

#### 🔧 CDP 協定操作

| 函式 | 檔案 | 回傳 | 說明 | 入口 |
|------|------|------|------|------|
| `captureScreenshotPng(opts)` | cdp.ts | `Promise<Buffer>` | 透過 CDP 截圖 (PNG) | 內部 |
| `captureScreenshot(opts)` | cdp.ts | `Promise<Buffer>` | 透過 CDP 截圖（支援格式選擇） | 內部 |
| `createTargetViaCdp(opts)` | cdp.ts | `Promise<string>` | 透過 CDP 建立新 target | 內部 |
| `evaluateJavaScript(opts)` | cdp.ts | `Promise<CdpRemoteObject>` | 透過 CDP 執行 JavaScript | 內部 |
| `formatAriaSnapshot(nodes, limit)` | cdp.ts | `AriaSnapshotNode[]` | 格式化 ARIA snapshot | 內部 |
| `snapshotAria(opts)` | cdp.ts | `Promise<RawAXNode[]>` | 透過 CDP 取得 ARIA tree | 內部 |
| `snapshotDom(opts)` | cdp.ts | `Promise<DomSnapshotNode[]>` | 透過 CDP 取得 DOM snapshot | 內部 |
| `getDomText(opts)` | cdp.ts | `Promise<string>` | 透過 CDP 取得 DOM 文字 | 內部 |
| `querySelector(opts)` | cdp.ts | `Promise<QueryMatch[]>` | 透過 CDP querySelector | 內部 |
| `normalizeCdpWsUrl(wsUrl, cdpUrl)` | cdp.ts | `string` | 正規化 CDP WebSocket URL | 內部 |
| `isWebSocketUrl(url)` | cdp.helpers.ts | `boolean` | 判斷是否為 WebSocket URL | 內部 |
| `fetchJson<T>(url, opts?)` | cdp.helpers.ts | `Promise<T>` | CDP HTTP JSON 請求 | 內部 |
| `fetchCdpChecked(url, opts?)` | cdp.helpers.ts | `Promise<Response>` | CDP HTTP 請求（含錯誤檢查） | 內部 |
| `openCdpWebSocket(url, opts)` | cdp.helpers.ts | `WebSocket` | 開啟 CDP WebSocket | 內部 |
| `withCdpSocket<T>(url, fn)` | cdp.helpers.ts | `Promise<T>` | 在 CDP WebSocket 內執行操作 | 內部 |
| `getDirectAgentForCdp(url)` | cdp-proxy-bypass.ts | `Agent \| undefined` | 取得 CDP 直連 agent（繞過 proxy） | 內部 |
| `hasProxyEnv()` | cdp-proxy-bypass.ts | `boolean` | 檢查是否有 proxy 環境變數 | 內部 |
| `withNoProxyForLocalhost<T>(fn)` | cdp-proxy-bypass.ts | `Promise<T>` | 在無 proxy localhost 環境執行 | 內部 |
| `withNoProxyForCdpUrl<T>(url, fn)` | cdp-proxy-bypass.ts | `Promise<T>` | 在無 proxy CDP URL 環境執行 | 內部 |
| `resolveCdpReachabilityTimeouts(params)` | cdp-timeouts.ts | `object` | 解析 CDP 可達性超時參數 | 內部 |

#### 🔧 Client API（高階封裝，供 agent/tools 呼叫）

| 函式 | 檔案 | 回傳 | 說明 | 入口 |
|------|------|------|------|------|
| `browserStatus(baseUrl?)` | client.ts | `Promise<BrowserStatus>` | 查詢 browser 狀態 | 對外 API |
| `browserProfiles(baseUrl?)` | client.ts | `Promise<ProfileStatus[]>` | 列出所有 profiles | 對外 API |
| `browserStart(baseUrl?, opts?)` | client.ts | `Promise<void>` | 啟動 browser | 對外 API |
| `browserStop(baseUrl?, opts?)` | client.ts | `Promise<void>` | 停止 browser | 對外 API |
| `browserResetProfile(baseUrl?, opts?)` | client.ts | `Promise<BrowserResetProfileResult>` | 重置 profile | 對外 API |
| `browserCreateProfile(baseUrl?, opts?)` | client.ts | `Promise<BrowserCreateProfileResult>` | 建立新 profile | 對外 API |
| `browserDeleteProfile(baseUrl?, opts?)` | client.ts | `Promise<BrowserDeleteProfileResult>` | 刪除 profile | 對外 API |
| `browserTabs(baseUrl?, opts?)` | client.ts | `Promise<BrowserTab[]>` | 列出 tabs | 對外 API |
| `browserOpenTab(baseUrl?, opts?)` | client.ts | `Promise<BrowserTab>` | 開啟新 tab | 對外 API |
| `browserFocusTab(baseUrl?, opts?)` | client.ts | `Promise<void>` | 聚焦 tab | 對外 API |
| `browserCloseTab(baseUrl?, opts?)` | client.ts | `Promise<void>` | 關閉 tab | 對外 API |
| `browserTabAction(baseUrl?, opts?)` | client.ts | `Promise<unknown>` | Tab 通用操作 | 對外 API |
| `browserSnapshot(baseUrl?, opts?)` | client.ts | `Promise<SnapshotResult>` | 取得頁面 snapshot | 對外 API |

#### 🔧 Client Actions（HTTP client 端操作封裝）

| 函式 | 檔案 | 回傳 | 說明 | 入口 |
|------|------|------|------|------|
| `browserNavigate(opts)` | client-actions-core.ts | `Promise<void>` | 導航 | 對外 API |
| `browserArmDialog(opts)` | client-actions-core.ts | `Promise<number>` | 準備 dialog 回應 | 對外 API |
| `browserArmFileChooser(opts)` | client-actions-core.ts | `Promise<number>` | 準備檔案選擇 | 對外 API |
| `browserWaitForDownload(opts)` | client-actions-core.ts | `Promise<BrowserDownloadPayload>` | 等待下載 | 對外 API |
| `browserDownload(opts)` | client-actions-core.ts | `Promise<BrowserDownloadPayload>` | 主動下載 | 對外 API |
| `browserAct(opts)` | client-actions-core.ts | `Promise<BrowserActResponse>` | 執行瀏覽器動作 | 對外 API |
| `browserScreenshotAction(opts)` | client-actions-core.ts | `Promise<Buffer>` | 截圖 | 對外 API |
| `browserConsoleMessages(opts)` | client-actions-observe.ts | `Promise<BrowserConsoleMessage[]>` | 取得 console 訊息 | 對外 API |
| `browserPdfSave(opts)` | client-actions-observe.ts | `Promise<string>` | 儲存 PDF | 對外 API |
| `browserPageErrors(opts)` | client-actions-observe.ts | `Promise<BrowserPageError[]>` | 取得頁面錯誤 | 對外 API |
| `browserRequests(opts)` | client-actions-observe.ts | `Promise<BrowserNetworkRequest[]>` | 取得網路請求 | 對外 API |
| `browserTraceStart(opts)` | client-actions-observe.ts | `Promise<void>` | 開始 trace | 對外 API |
| `browserTraceStop(opts)` | client-actions-observe.ts | `Promise<string>` | 停止 trace | 對外 API |
| `browserHighlight(opts)` | client-actions-observe.ts | `Promise<void>` | 高亮元素 | 對外 API |
| `browserResponseBody(opts)` | client-actions-observe.ts | `Promise<Buffer>` | 讀取 response body | 對外 API |
| `browserCookies(opts)` | client-actions-state.ts | `Promise<Cookie[]>` | 取得 cookies | 對外 API |
| `browserCookiesSet(opts)` | client-actions-state.ts | `Promise<void>` | 設定 cookies | 對外 API |
| `browserCookiesClear(opts)` | client-actions-state.ts | `Promise<void>` | 清除 cookies | 對外 API |
| `browserStorageGet(opts)` | client-actions-state.ts | `Promise<Record>` | 取得 storage | 對外 API |
| `browserStorageSet(opts)` | client-actions-state.ts | `Promise<void>` | 設定 storage | 對外 API |
| `browserStorageClear(opts)` | client-actions-state.ts | `Promise<void>` | 清除 storage | 對外 API |
| `browserSetOffline(opts)` | client-actions-state.ts | `Promise<void>` | 設定離線 | 對外 API |
| `browserSetHeaders(opts)` | client-actions-state.ts | `Promise<void>` | 設定 headers | 對外 API |
| `browserSetHttpCredentials(opts)` | client-actions-state.ts | `Promise<void>` | 設定 HTTP 認證 | 對外 API |
| `browserSetGeolocation(opts)` | client-actions-state.ts | `Promise<void>` | 設定地理位置 | 對外 API |
| `browserSetMedia(opts)` | client-actions-state.ts | `Promise<void>` | 模擬媒體特性 | 對外 API |
| `browserSetTimezone(opts)` | client-actions-state.ts | `Promise<void>` | 設定時區 | 對外 API |
| `browserSetLocale(opts)` | client-actions-state.ts | `Promise<void>` | 設定語言區域 | 對外 API |
| `browserSetDevice(opts)` | client-actions-state.ts | `Promise<void>` | 模擬裝置 | 對外 API |
| `browserClearPermissions(opts)` | client-actions-state.ts | `Promise<void>` | 清除權限 | 對外 API |

#### 🔧 路由註冊

| 函式 | 檔案 | 回傳 | 說明 | 入口 |
|------|------|------|------|------|
| `registerBrowserRoutes(app, ctx)` | routes/index.ts | `void` | 註冊所有 browser 路由 | 內部 |
| `registerBrowserBasicRoutes(app, ctx)` | routes/basic.ts | `void` | 註冊基礎路由 (status/start/stop) | 內部 |
| `registerBrowserTabRoutes(app, ctx)` | routes/tabs.ts | `void` | 註冊 tab 管理路由 | 內部 |
| `registerBrowserAgentRoutes(app, ctx)` | routes/agent.ts | `void` | 註冊 agent 路由（含 act/snapshot/storage） | 內部 |
| `registerBrowserAgentActRoutes(app, ctx)` | routes/agent.act.ts | `void` | 註冊互動操作路由 | 內部 |
| `registerBrowserAgentActDownloadRoutes(app, ctx)` | routes/agent.act.download.ts | `void` | 註冊下載路由 | 內部 |
| `registerBrowserAgentActHookRoutes(app, ctx)` | routes/agent.act.hooks.ts | `void` | 註冊 hook 路由 | 內部 |
| `registerBrowserAgentDebugRoutes(app, ctx)` | routes/agent.debug.ts | `void` | 註冊 debug 路由 | 內部 |
| `registerBrowserAgentSnapshotRoutes(app, ctx)` | routes/agent.snapshot.ts | `void` | 註冊 snapshot 路由 | 內部 |
| `registerBrowserAgentStorageRoutes(app, ctx)` | routes/agent.storage.ts | `void` | 註冊 storage 路由 | 內部 |
| `createBrowserRouteDispatcher(ctx)` | routes/dispatcher.ts | `Dispatcher` | 建立路由分發器（不依賴 Express） | 內部 |

#### 🔧 Config / Auth / 安全 / 工具

| 函式 | 檔案 | 回傳 | 說明 | 入口 |
|------|------|------|------|------|
| `resolveBrowserConfig(raw, cfg)` | config.ts | `ResolvedBrowserConfig` | 解析 browser 完整 config | 內部 |
| `resolveProfile(raw, cfg)` | config.ts | `ResolvedBrowserProfile` | 解析單一 profile config | 內部 |
| `parseHttpUrl(raw, label)` | config.ts | `URL` | 解析 HTTP URL（含驗證） | 內部 |
| `shouldStartLocalBrowserServer(resolved)` | config.ts | `boolean` | 是否需要啟動本地 server | 內部 |
| `resolveBrowserControlAuth(cfg)` | control-auth.ts | `BrowserControlAuth` | 解析 browser 控制端認證 | 內部 |
| `ensureBrowserControlAuth(params)` | control-auth.ts | `Promise<{auth, generatedToken?}>` | 確保認證可用（auto-generate token） | 內部 |
| `isAuthorizedBrowserRequest(params)` | http-auth.ts | `boolean` | 驗證 HTTP 請求授權 | 內部 |
| `shouldRejectBrowserMutation(params)` | csrf.ts | `boolean` | CSRF mutation 檢查 | 內部 |
| `browserMutationGuardMiddleware()` | csrf.ts | `Middleware` | CSRF middleware | 內部 |
| `installBrowserCommonMiddleware(app)` | server-middleware.ts | `void` | 安裝通用 middleware | 內部 |
| `installBrowserAuthMiddleware(app, auth)` | server-middleware.ts | `void` | 安裝認證 middleware | 內部 |
| `assertBrowserNavigationAllowed(params)` | navigation-guard.ts | `Promise<void>` | SSRF 導航安全檢查 | 內部 |
| `assertBrowserNavigationResultAllowed(params)` | navigation-guard.ts | `Promise<void>` | SSRF 導航結果檢查 | 內部 |
| `assertBrowserNavigationRedirectChainAllowed(params)` | navigation-guard.ts | `Promise<void>` | SSRF redirect chain 檢查 | 內部 |
| `withBrowserNavigationPolicy(params)` | navigation-guard.ts | `SsrFPolicy` | 取得導航 SSRF policy | 內部 |
| `normalizeBrowserScreenshot(params)` | screenshot.ts | `Promise<Buffer>` | 正規化截圖（resize/compress） | 內部 |
| `fetchBrowserJson<T>(url, opts)` | client-fetch.ts | `Promise<T>` | 帶 retry/rate-limit 的 JSON fetch | 內部 |
| `sanitizeUntrustedFileName(fileName, fallback)` | safe-filename.ts | `string` | 清理不信任的檔名 | 內部 |
| `writeViaSiblingTempPath(params)` | output-atomic.ts | `Promise<void>` | 原子寫入（先寫臨時檔再 rename） | 內部 |
| `movePathToTrash(targetPath)` | trash.ts | `Promise<string>` | 移動檔案到垃圾桶 | 內部 |
| `matchBrowserUrlPattern(pattern, url)` | url-pattern.ts | `boolean` | URL pattern matching | 內部 |
| `getFreePort()` | test-port.ts | `Promise<number>` | 取得可用 port | 測試工具 |

#### 🔧 Extension Relay / Bridge

| 函式 | 檔案 | 回傳 | 說明 | 入口 |
|------|------|------|------|------|
| `ensureChromeExtensionRelayServer(opts)` | extension-relay.ts | `Promise<ChromeExtensionRelayServer>` | 確保 extension relay server 運行 | 內部 |
| `stopChromeExtensionRelayServer(opts)` | extension-relay.ts | `Promise<boolean>` | 停止 relay server | 內部 |
| `getChromeExtensionRelayAuthHeaders(url)` | extension-relay.ts | `Record<string, string>` | 取得 relay 認證 headers | 內部 |
| `resolveRelayAcceptedTokensForPort(port)` | extension-relay-auth.ts | `Promise<string[]>` | 解析 relay 接受的 tokens | 內部 |
| `resolveRelayAuthTokenForPort(port)` | extension-relay-auth.ts | `Promise<string>` | 解析 relay auth token | 內部 |
| `probeAuthenticatedOpenClawRelay(params)` | extension-relay-auth.ts | `Promise<boolean>` | 探測 relay 是否可認證連接 | 內部 |
| `startBrowserBridgeServer(params)` | bridge-server.ts | `Promise<BrowserBridge>` | 啟動 bridge server (sandbox 隔離) | 系統入口 |
| `stopBrowserBridgeServer(server)` | bridge-server.ts | `Promise<void>` | 停止 bridge server | 系統入口 |
| `setBridgeAuthForPort(port, auth)` | bridge-auth-registry.ts | `void` | 設定 bridge port 認證 | 內部 |
| `getBridgeAuthForPort(port)` | bridge-auth-registry.ts | `BridgeAuth \| undefined` | 取得 bridge port 認證 | 內部 |
| `deleteBridgeAuthForPort(port)` | bridge-auth-registry.ts | `void` | 刪除 bridge port 認證 | 內部 |

#### 🔧 Profile / Snapshot / 其他工具

| 函式 | 檔案 | 回傳 | 說明 | 入口 |
|------|------|------|------|------|
| `isValidProfileName(name)` | profiles.ts | `boolean` | 驗證 profile 名稱格式 | 內部 |
| `allocateCdpPort(params)` | profiles.ts | `number` | 分配 CDP port | 內部 |
| `getUsedPorts(params)` | profiles.ts | `Set<number>` | 取得已使用 ports | 內部 |
| `allocateColor(usedColors)` | profiles.ts | `string` | 分配 profile 顏色 | 內部 |
| `getUsedColors(params)` | profiles.ts | `Set<string>` | 取得已使用顏色 | 內部 |
| `getBrowserProfileCapabilities(params)` | profile-capabilities.ts | `BrowserProfileCapabilities` | 取得 profile 能力 | 內部 |
| `resolveDefaultSnapshotFormat(params)` | profile-capabilities.ts | `string` | 解析預設 snapshot 格式 | 內部 |
| `shouldUsePlaywrightForScreenshot(params)` | profile-capabilities.ts | `boolean` | 判斷截圖是否需要 Playwright | 內部 |
| `shouldUsePlaywrightForAriaSnapshot(params)` | profile-capabilities.ts | `boolean` | 判斷 ARIA snapshot 是否需要 Playwright | 內部 |
| `getRoleSnapshotStats(snapshot, refs)` | pw-role-snapshot.ts | `RoleSnapshotStats` | 計算 role snapshot 統計 | 內部 |
| `parseRoleRef(raw)` | pw-role-snapshot.ts | `string \| null` | 解析 role ref 字串 | 內部 |
| `buildRoleSnapshotFromAriaSnapshot(params)` | pw-role-snapshot.ts | `string` | 從 ARIA snapshot 建構 role snapshot | 內部 |
| `buildRoleSnapshotFromAiSnapshot(params)` | pw-role-snapshot.ts | `string` | 從 AI snapshot 建構 role snapshot | 內部 |
| `getPwAiModule(opts?)` | pw-ai-module.ts | `Promise<PwAiModule \| null>` | 動態載入 Playwright AI 模組 | 內部 |
| `markPwAiLoaded()` | pw-ai-state.ts | `void` | 標記 PW AI 已載入 | 內部 |
| `isPwAiLoaded()` | pw-ai-state.ts | `boolean` | 檢查 PW AI 是否已載入 | 內部 |
| `resolvePathWithinRoot(params)` | paths.ts | `string` | 解析根目錄內路徑 | 內部 |
| `resolveWritablePathWithinRoot(params)` | paths.ts | `Promise<string>` | 解析可寫入路徑 | 內部 |
| `resolvePathsWithinRoot(params)` | paths.ts | `string[]` | 批次解析路徑 | 內部 |
| `resolveExistingPathsWithinRoot(params)` | paths.ts | `Promise<string[]>` | 解析已存在路徑 | 內部 |
| `resolveStrictExistingPathsWithinRoot(params)` | paths.ts | `Promise<string[]>` | 嚴格解析已存在路徑 | 內部 |
| `trackSessionBrowserTab(params)` | session-tab-registry.ts | `void` | 追蹤 session 的 browser tab | 內部 |
| `untrackSessionBrowserTab(params)` | session-tab-registry.ts | `void` | 取消追蹤 tab | 內部 |
| `closeTrackedBrowserTabsForSessions(params)` | session-tab-registry.ts | `Promise<void>` | 關閉 session 追蹤的所有 tabs | 內部 |
| `persistBrowserProxyFiles(files)` | proxy-files.ts | `Promise<void>` | 儲存 proxy 檔案 | 內部 |
| `applyBrowserProxyPaths(result, mapping)` | proxy-files.ts | `void` | 套用 proxy 路徑映射 | 內部 |
| `refreshResolvedBrowserConfigFromDisk(params)` | resolved-config-refresh.ts | `void` | 從磁碟熱重載 browser config | 內部 |
| `resolveBrowserProfileWithHotReload(params)` | resolved-config-refresh.ts | `ResolvedBrowserProfile` | 解析 profile（含熱重載） | 內部 |
| `ensureExtensionRelayForProfiles(params)` | server-lifecycle.ts | `Promise<void>` | 為所有 profiles 確保 relay 運行 | 內部 |
| `stopKnownBrowserProfiles(params)` | server-lifecycle.ts | `Promise<void>` | 停止所有已知 profiles | 內部 |
| `resolveSnapshotPlan(params)` | routes/agent.snapshot.plan.ts | `BrowserSnapshotPlan` | 計算 snapshot 執行計劃 | 內部 |
| `resolveTargetIdAfterNavigate(opts)` | routes/agent.snapshot.ts | `Promise<string>` | 導航後解析 targetId | 內部 |
| `normalizeBrowserFormFieldRef(value)` | form-fields.ts | `string` | 正規化表單欄位 ref | 內部 |
| `normalizeBrowserFormField(raw)` | form-fields.ts | `BrowserFormField` | 正規化表單欄位 | 內部 |
| `resolveTargetIdFromTabs(params)` | target-id.ts | `TargetIdResolution` | 從 tabs 解析 targetId | 內部 |

---

### src/media-understanding/

#### 🔧 執行引擎

| 函式 | 檔案 | 回傳 | 說明 | 入口 |
|------|------|------|------|------|
| `runCapability(params)` | runner.ts | `Promise<RunCapabilityResult>` | 執行單一媒體理解能力 (image/audio/video) | 核心 |
| `resolveAutoImageModel(params)` | runner.ts | `Promise<ActiveMediaModel \| null>` | 自動解析可用圖片 model | 內部 |
| `buildProviderRegistry(cfg)` | runner.ts | `ProviderRegistry` | 建構 provider registry | 內部 |
| `normalizeMediaAttachments(ctx)` | runner.ts | `MediaAttachment[]` | 正規化訊息附件 | 內部 |
| `resolveMediaAttachmentLocalRoots(params)` | runner.ts | `string[]` | 解析附件本地路徑根 | 內部 |
| `createMediaAttachmentCache(opts)` | runner.ts | `MediaAttachmentCache` | 建立附件 binary cache | 內部 |
| `buildModelDecision(params)` | runner.entries.ts | `MediaUnderstandingDecision` | 建構 model 決策（provider 選擇 + 路由） | 內部 |
| `formatDecisionSummary(decision)` | runner.entries.ts | `string` | 格式化決策摘要（日誌用） | 內部 |
| `runProviderEntry(params)` | runner.entries.ts | `Promise<MediaUnderstandingOutput \| null>` | 執行 provider entry（API call） | 內部 |
| `runCliEntry(params)` | runner.entries.ts | `Promise<MediaUnderstandingOutput \| null>` | 執行 CLI entry（外部指令） | 內部 |

#### 🔧 套用與格式化

| 函式 | 檔案 | 回傳 | 說明 | 入口 |
|------|------|------|------|------|
| `applyMediaUnderstanding(params)` | apply.ts | `Promise<ApplyMediaUnderstandingResult>` | 對訊息套用媒體理解（主入口） | 系統入口 |
| `formatMediaUnderstandingBody(params)` | format.ts | `string` | 格式化媒體理解結果為訊息 body | 內部 |
| `extractMediaUserText(body?)` | format.ts | `string \| undefined` | 從 body 提取使用者文字 | 內部 |
| `formatAudioTranscripts(outputs)` | format.ts | `string` | 格式化音訊轉錄結果 | 內部 |

#### 🔧 附件處理

| 函式 | 檔案 | 回傳 | 說明 | 入口 |
|------|------|------|------|------|
| `normalizeAttachmentPath(raw?)` | attachments.normalize.ts | `string \| undefined` | 正規化附件路徑 | 內部 |
| `normalizeAttachments(ctx)` | attachments.normalize.ts | `MediaAttachment[]` | 正規化訊息附件 | 內部 |
| `resolveAttachmentKind(params)` | attachments.normalize.ts | `MediaUnderstandingKind` | 解析附件類型 (image/audio/video) | 內部 |
| `isVideoAttachment(attachment)` | attachments.normalize.ts | `boolean` | 判斷是否為影片附件 | 內部 |
| `isAudioAttachment(attachment)` | attachments.normalize.ts | `boolean` | 判斷是否為音訊附件 | 內部 |
| `isImageAttachment(attachment)` | attachments.normalize.ts | `boolean` | 判斷是否為圖片附件 | 內部 |
| `selectAttachments(params)` | attachments.select.ts | `MediaAttachment[]` | 篩選適用附件 | 內部 |
| `MediaAttachmentCache` (class) | attachments.cache.ts | — | 附件 binary 快取（避免重複下載） | 內部 |

#### 🔧 Config 解析

| 函式 | 檔案 | 回傳 | 說明 | 入口 |
|------|------|------|------|------|
| `resolveTimeoutMs(seconds, fallback)` | resolve.ts | `number` | 解析超時 ms | 內部 |
| `resolvePrompt(params)` | resolve.ts | `string` | 解析 prompt | 內部 |
| `resolveMaxChars(params)` | resolve.ts | `number` | 解析最大字元數 | 內部 |
| `resolveMaxBytes(params)` | resolve.ts | `number` | 解析最大位元組 | 內部 |
| `resolveCapabilityConfig(params)` | resolve.ts | `MediaUnderstandingConfig` | 解析能力 config | 內部 |
| `resolveScopeDecision(params)` | resolve.ts | `"allow" \| "deny"` | 解析作用域決策 | 內部 |
| `resolveModelEntries(params)` | resolve.ts | `ModelEntry[]` | 解析 model entries | 內部 |
| `resolveConcurrency(cfg)` | resolve.ts | `number` | 解析並行度 | 內部 |
| `resolveEntriesWithActiveFallback(params)` | resolve.ts | `ModelEntry[]` | 解析 entries（含 fallback） | 內部 |

#### 🔧 作用域與音訊

| 函式 | 檔案 | 回傳 | 說明 | 入口 |
|------|------|------|------|------|
| `resolveMediaUnderstandingScope(params)` | scope.ts | `"allow" \| "deny"` | 解析媒體理解作用域 | 內部 |
| `normalizeMediaUnderstandingChatType(raw?)` | scope.ts | `string \| undefined` | 正規化 chat type | 內部 |
| `transcribeAudioFile(params)` | transcribe-audio.ts | `Promise<string>` | 轉錄音訊檔（簡化入口） | 系統入口 |
| `transcribeFirstAudio(params)` | audio-preflight.ts | `Promise<string \| null>` | 前置轉錄首筆音訊 | 內部 |
| `runAudioTranscription(params)` | audio-transcription-runner.ts | `Promise<AudioTranscriptionResult>` | 執行音訊轉錄 | 內部 |
| `sendTranscriptEcho(params)` | echo-transcript.ts | `Promise<void>` | 回顯轉錄結果 | 內部 |
| `runWithConcurrency<T>(items, fn, limit)` | concurrency.ts | `Promise<T[]>` | 並行控制執行 | 工具 |

#### 🔧 Providers

| 函式 | 檔案 | 回傳 | 說明 | 入口 |
|------|------|------|------|------|
| `normalizeMediaProviderId(id)` | providers/index.ts | `string` | 正規化 provider ID | 內部 |
| `buildMediaUnderstandingRegistry(cfg)` | providers/index.ts | `Map` | 建構 provider registry | 內部 |
| `getMediaUnderstandingProvider(registry, id)` | providers/index.ts | `MediaUnderstandingProvider` | 取得 provider | 內部 |
| `describeImageWithModel(params)` | providers/image.ts | `Promise<string>` | 呼叫 LLM 描述圖片 | 內部 |
| `transcribeDeepgramAudio(params)` | providers/deepgram/audio.ts | `Promise<AudioTranscriptionResult>` | Deepgram 語音轉錄 | 內部 |
| `transcribeGeminiAudio(params)` | providers/google/audio.ts | `Promise<AudioTranscriptionResult>` | Gemini 語音轉錄 | 內部 |
| `describeGeminiVideo(params)` | providers/google/video.ts | `Promise<VideoDescriptionResult>` | Gemini 影片描述 | 內部 |
| `generateGeminiInlineDataText(params)` | providers/google/inline-data.ts | `Promise<string>` | Gemini inline data 文字生成 | 內部 |
| `describeMoonshotVideo(params)` | providers/moonshot/video.ts | `Promise<VideoDescriptionResult>` | Moonshot 影片描述 | 內部 |
| `transcribeOpenAiCompatibleAudio(params)` | providers/openai/audio.ts | `Promise<AudioTranscriptionResult>` | OpenAI-compatible 語音轉錄 | 內部 |
| `normalizeBaseUrl(baseUrl, fallback)` | providers/shared.ts | `string` | 正規化 base URL | 工具 |
| `fetchWithTimeoutGuarded(params)` | providers/shared.ts | `Promise<Response>` | 帶超時的 fetch（含錯誤處理） | 工具 |
| `postTranscriptionRequest(params)` | providers/shared.ts | `Promise<Response>` | POST 轉錄請求 | 工具 |
| `postJsonRequest(params)` | providers/shared.ts | `Promise<Response>` | POST JSON 請求 | 工具 |
| `readErrorResponse(res)` | providers/shared.ts | `Promise<string \| undefined>` | 讀取錯誤回應 body | 工具 |
| `assertOkOrThrowHttpError(res, label)` | providers/shared.ts | `Promise<void>` | 斷言 HTTP 成功 | 工具 |
| `requireTranscriptionText(params)` | providers/shared.ts | `string` | 要求轉錄文字存在 | 工具 |

#### 🔧 Provider 物件（靜態 export）

| 常數 | 檔案 | 說明 |
|------|------|------|
| `anthropicProvider` | providers/anthropic/index.ts | Anthropic 圖片 provider |
| `deepgramProvider` | providers/deepgram/index.ts | Deepgram 音訊 provider |
| `googleProvider` | providers/google/index.ts | Google Gemini 多模態 provider |
| `groqProvider` | providers/groq/index.ts | Groq 音訊 provider |
| `minimaxProvider` | providers/minimax/index.ts | Minimax 圖片 provider |
| `minimaxPortalProvider` | providers/minimax/index.ts | Minimax Portal 圖片 provider |
| `mistralProvider` | providers/mistral/index.ts | Mistral 圖片 provider |
| `moonshotProvider` | providers/moonshot/index.ts | Moonshot 影片 provider |
| `openaiProvider` | providers/openai/index.ts | OpenAI 音訊+圖片 provider |
| `zaiProvider` | providers/zai/index.ts | Zai 圖片 provider |

#### 🔧 輸出解析與工具

| 函式 | 檔案 | 回傳 | 說明 | 入口 |
|------|------|------|------|------|
| `extractLastJsonObject(raw)` | output-extract.ts | `unknown` | 提取回應中最後一個 JSON 物件 | 內部 |
| `extractGeminiResponse(raw)` | output-extract.ts | `string \| null` | 提取 Gemini 回應文字 | 內部 |
| `estimateBase64Size(bytes)` | video.ts | `number` | 估算 base64 編碼大小 | 內部 |
| `resolveVideoMaxBase64Bytes(maxBytes)` | video.ts | `number` | 解析影片最大 base64 大小 | 內部 |
| `fileExists(filePath?)` | fs.ts | `Promise<boolean>` | 檢查檔案是否存在 | 工具 |
| `MediaUnderstandingSkipError` (class) | errors.ts | — | 媒體理解跳過錯誤 | 型別 |
| `isMediaUnderstandingSkipError(err)` | errors.ts | `boolean` | 判斷是否為跳過錯誤 | 工具 |

---

### src/media/

#### 🔧 Server

| 函式 | 檔案 | 回傳 | 說明 | 入口 |
|------|------|------|------|------|
| `attachMediaRoutes(app, ttlMs?, runtime?)` | server.ts | `void` | 掛載媒體路由到 Express app | 系統入口 |
| `startMediaServer(params)` | server.ts | `Promise<Server>` | 啟動獨立媒體 HTTP server | 系統入口 |

#### 🔧 儲存與清理

| 函式 | 檔案 | 回傳 | 說明 | 入口 |
|------|------|------|------|------|
| `saveMediaSource(params)` | store.ts | `Promise<SavedMedia>` | 從 URL/path/base64 儲存媒體 | 核心 |
| `saveMediaBuffer(params)` | store.ts | `Promise<SavedMedia>` | 從 Buffer 儲存媒體 | 核心 |
| `getMediaDir()` | store.ts | `string` | 取得媒體儲存目錄 | 內部 |
| `ensureMediaDir()` | store.ts | `Promise<void>` | 確保媒體目錄存在 | 內部 |
| `cleanOldMedia(ttlMs?, opts?)` | store.ts | `Promise<void>` | 清理過期媒體檔案 | 內部 |
| `extractOriginalFilename(filePath)` | store.ts | `string` | 提取原始檔名 | 內部 |

#### 🔧 遠端下載

| 函式 | 檔案 | 回傳 | 說明 | 入口 |
|------|------|------|------|------|
| `fetchRemoteMedia(options)` | fetch.ts | `Promise<FetchMediaResult>` | 下載遠端媒體（含大小限制+重導向） | 核心 |
| `readResponseWithLimit(params)` | read-response-with-limit.ts | `Promise<Buffer>` | 限制大小讀取 Response body | 內部 |

#### 🔧 圖片操作

| 函式 | 檔案 | 回傳 | 說明 | 入口 |
|------|------|------|------|------|
| `getImageMetadata(buffer)` | image-ops.ts | `Promise<ImageMetadata \| null>` | 取得圖片 metadata (sharp) | 核心 |
| `normalizeExifOrientation(buffer)` | image-ops.ts | `Promise<Buffer>` | 正規化 EXIF 方向 | 內部 |
| `resizeToJpeg(params)` | image-ops.ts | `Promise<Buffer>` | 縮圖為 JPEG | 內部 |
| `convertHeicToJpeg(buffer)` | image-ops.ts | `Promise<Buffer>` | HEIC → JPEG 轉換 | 內部 |
| `hasAlphaChannel(buffer)` | image-ops.ts | `Promise<boolean>` | 檢查是否有 alpha channel | 內部 |
| `resizeToPng(params)` | image-ops.ts | `Promise<Buffer>` | 縮圖為 PNG | 內部 |
| `optimizeImageToPng(params)` | image-ops.ts | `Promise<Buffer>` | 最佳化圖片為 PNG | 內部 |
| `buildImageResizeSideGrid(maxSide, sideStart)` | image-ops.ts | `number[]` | 建構 resize 步進 grid | 內部 |

#### 🔧 MIME 偵測

| 函式 | 檔案 | 回傳 | 說明 | 入口 |
|------|------|------|------|------|
| `normalizeMimeType(mime?)` | mime.ts | `string \| undefined` | 正規化 MIME type | 內部 |
| `getFileExtension(filePath?)` | mime.ts | `string \| undefined` | 取得檔案副檔名 | 內部 |
| `isAudioFileName(fileName?)` | mime.ts | `boolean` | 判斷是否為音訊檔名 | 內部 |
| `detectMime(opts)` | mime.ts | `string \| undefined` | 偵測 MIME type (header + ext) | 核心 |
| `extensionForMime(mime?)` | mime.ts | `string \| undefined` | MIME → 副檔名 | 內部 |
| `isGifMedia(opts)` | mime.ts | `boolean` | 判斷是否為 GIF | 內部 |
| `imageMimeFromFormat(format?)` | mime.ts | `string \| undefined` | 圖片格式 → MIME | 內部 |
| `kindFromMime(mime?)` | mime.ts | `MediaKind \| undefined` | MIME → 媒體類型 | 內部 |
| `sniffMimeFromBase64(base64)` | sniff-mime-from-base64.ts | `Promise<string \| undefined>` | 從 base64 偵測 MIME | 內部 |

#### 🔧 輸入檔案處理

| 函式 | 檔案 | 回傳 | 說明 | 入口 |
|------|------|------|------|------|
| `normalizeMimeType(value)` | input-files.ts | `string \| undefined` | 正規化 MIME（input 版本） | 內部 |
| `parseContentType(value?)` | input-files.ts | `{mime, charset}` | 解析 Content-Type header | 內部 |
| `normalizeMimeList(values?, fallback)` | input-files.ts | `Set<string>` | 正規化 MIME 清單 | 內部 |
| `resolveInputFileLimits(config?)` | input-files.ts | `InputFileLimits` | 解析輸入檔案限制 | 內部 |
| `fetchWithGuard(params)` | input-files.ts | `Promise<InputFetchResult>` | 帶安全檢查的 fetch | 內部 |
| `extractImageContentFromSource(params)` | input-files.ts | `Promise<InputImageContent>` | 從來源提取圖片內容 | 內部 |
| `extractFileContentFromSource(params)` | input-files.ts | `Promise<InputFileExtractResult>` | 從來源提取檔案內容 | 內部 |

#### 🔧 PDF / 音訊 / Base64 / 解析

| 函式 | 檔案 | 回傳 | 說明 | 入口 |
|------|------|------|------|------|
| `extractPdfContent(params)` | pdf-extract.ts | `Promise<PdfExtractedContent>` | 萃取 PDF 文字+圖片 | 核心 |
| `parseAudioTag(text?)` | audio-tags.ts | `{format?, duration?}` | 解析音訊 tag 文字 | 內部 |
| `isTelegramVoiceCompatibleAudio(opts)` | audio.ts | `boolean` | 判斷是否為 Telegram 語音相容 | 內部 |
| `isVoiceCompatibleAudio(opts)` | audio.ts | `boolean` | 判斷是否為語音相容格式 | 內部 |
| `estimateBase64DecodedBytes(base64)` | base64.ts | `number` | 估算 base64 解碼後大小 | 內部 |
| `canonicalizeBase64(base64)` | base64.ts | `string \| undefined` | 正規化 base64 字串 | 內部 |
| `splitMediaFromOutput(raw)` | parse.ts | `{text, media[]}` | 從輸出分離 MEDIA: tokens | 內部 |
| `normalizeMediaSource(src)` | parse.ts | `{url?, path?}` | 正規化 media source | 內部 |

#### 🔧 ffmpeg / PNG / 路徑安全 / 工具

| 函式 | 檔案 | 回傳 | 說明 | 入口 |
|------|------|------|------|------|
| `runFfprobe(args, options?)` | ffmpeg-exec.ts | `Promise<string>` | 執行 ffprobe | 內部 |
| `runFfmpeg(args, options?)` | ffmpeg-exec.ts | `Promise<string>` | 執行 ffmpeg | 內部 |
| `parseFfprobeCsvFields(stdout, maxFields)` | ffmpeg-exec.ts | `string[]` | 解析 ffprobe CSV 輸出 | 內部 |
| `parseFfprobeCodecAndSampleRate(stdout)` | ffmpeg-exec.ts | `{codec, sampleRate}` | 解析 codec 與取樣率 | 內部 |
| `encodePngRgba(buffer, width, height)` | png-encode.ts | `Buffer` | 編碼 raw RGBA → PNG | 內部 |
| `crc32(buf)` | png-encode.ts | `number` | CRC32 計算 | 內部 |
| `pngChunk(type, data)` | png-encode.ts | `Buffer` | 建構 PNG chunk | 內部 |
| `fillPixel(buf, offset, r, g, b, a)` | png-encode.ts | `void` | 填入像素 | 內部 |
| `isInboundPathAllowed(params)` | inbound-path-policy.ts | `boolean` | 檢查入站路徑是否允許 | 核心 |
| `normalizeInboundPathRoots(roots?)` | inbound-path-policy.ts | `string[]` | 正規化入站路徑根 | 內部 |
| `mergeInboundPathRoots(params)` | inbound-path-policy.ts | `string[]` | 合併入站路徑根 | 內部 |
| `resolveIMessageAttachmentRoots(params)` | inbound-path-policy.ts | `string[]` | 解析 iMessage 附件路徑根 | 內部 |
| `ensureMediaHosted(params)` | host.ts | `Promise<HostedMedia>` | 確保媒體已託管並取得 URL | 核心 |
| `resolveOutboundMediaLocalRoots(params)` | load-options.ts | `string[]` | 解析 outbound 媒體本地路徑根 | 內部 |
| `buildOutboundMediaLoadOptions(params)` | load-options.ts | `OutboundMediaLoadOptions` | 建構 outbound 媒體載入選項 | 內部 |
| `getDefaultMediaLocalRoots()` | local-roots.ts | `readonly string[]` | 取得預設媒體本地路徑根 | 內部 |
| `getAgentScopedMediaLocalRoots(params)` | local-roots.ts | `string[]` | 取得 agent 範圍媒體路徑根 | 內部 |
| `resolveOutboundAttachmentFromUrl(params)` | outbound-attachment.ts | `Promise<{buffer, mime}>` | 從 URL 解析 outbound 附件 | 內部 |
| `unlinkIfExists(filePath)` | temp-files.ts | `Promise<void>` | 刪除暫存檔（若存在） | 工具 |
| `mediaKindFromMime(mime?)` | constants.ts | `MediaKind \| undefined` | MIME → 媒體種類 | 內部 |
| `maxBytesForKind(kind)` | constants.ts | `number` | 取得媒體種類最大大小 | 內部 |

---

### src/link-understanding/

| 函式 | 檔案 | 回傳 | 說明 | 入口 |
|------|------|------|------|------|
| `applyLinkUnderstanding(params)` | apply.ts | `Promise<ApplyLinkUnderstandingResult>` | 對訊息套用連結理解（主入口） | 系統入口 |
| `runLinkUnderstanding(params)` | runner.ts | `Promise<LinkUnderstandingResult>` | 執行連結理解（偵測+解析+格式化） | 核心 |
| `extractLinksFromMessage(message, opts?)` | detect.ts | `string[]` | 從訊息文字中擷取 URL | 核心 |
| `formatLinkUnderstandingBody(params)` | format.ts | `string` | 格式化連結理解結果 | 內部 |
| `DEFAULT_LINK_TIMEOUT_SECONDS` | defaults.ts | `number` | 連結理解預設超時 (30s) | 常數 |
| `DEFAULT_MAX_LINKS` | defaults.ts | `number` | 最大連結數 (3) | 常數 |

---

### src/markdown/

| 函式 | 檔案 | 回傳 | 說明 | 入口 |
|------|------|------|------|------|
| `markdownToIR(markdown, options?)` | ir.ts | `MarkdownIR` | Markdown 解析為中間表示（核心 parser） | 核心 |
| `markdownToIRWithMeta(markdown, options?)` | ir.ts | `{ir, meta}` | 解析為 IR + metadata | 核心 |
| `chunkMarkdownIR(ir, limit)` | ir.ts | `MarkdownIR[]` | 將 IR 按字數分塊 | 核心 |
| `renderMarkdownWithMarkers(ir, options)` | render.ts | `string` | IR → 目標格式渲染（含樣式映射） | 核心 |
| `convertMarkdownTables(markdown, mode)` | tables.ts | `string` | Markdown 表格格式轉換 | 核心 |
| `markdownToWhatsApp(text)` | whatsapp.ts | `string` | Markdown → WhatsApp 格式 | 核心 |
| `parseFenceSpans(buffer)` | fences.ts | `FenceSpan[]` | 解析 code fence 位置 | 內部 |
| `findFenceSpanAt(spans, index)` | fences.ts | `FenceSpan \| undefined` | 查找指定位置的 fence | 內部 |
| `isSafeFenceBreak(spans, index)` | fences.ts | `boolean` | 判斷是否可安全斷行 | 內部 |
| `createInlineCodeState()` | code-spans.ts | `InlineCodeState` | 建立 inline code 狀態 | 內部 |
| `buildCodeSpanIndex(text, state?)` | code-spans.ts | `CodeSpanIndex` | 建構 code span 索引 | 內部 |
| `parseFrontmatterBlock(content)` | frontmatter.ts | `ParsedFrontmatter` | 解析 YAML frontmatter | 核心 |

---

### src/canvas-host/

| 函式 | 檔案 | 回傳 | 說明 | 入口 |
|------|------|------|------|------|
| `startCanvasHost(opts)` | server.ts | `Promise<CanvasHostServer>` | 啟動 Canvas HTTP/WS server | 系統入口 |
| `createCanvasHostHandler(opts)` | server.ts | `Promise<CanvasHostHandler>` | 建立 Canvas 請求 handler（可嵌入） | 系統入口 |
| `handleA2uiHttpRequest(params)` | a2ui.ts | `Promise<boolean>` | 處理 A2UI HTTP 請求 | 內部 |
| `injectCanvasLiveReload(html)` | a2ui.ts | `string` | 注入 live reload script | 內部 |
| `normalizeUrlPath(rawPath)` | file-resolver.ts | `string` | 正規化 URL 路徑 | 內部 |
| `resolveFileWithinRoot(params)` | file-resolver.ts | `Promise<string \| null>` | 安全解析根目錄內檔案 | 內部 |

---

## 呼叫關聯圖

```
外部呼叫者
┌─────────────────────────────────────────────────────────────────┐
│  agents/tools/browser-tool.ts  ──→  browser/client.ts           │
│  agents/tools/browser-tool.ts  ──→  browser/client-actions.ts   │
│  agents/sandbox/browser.ts     ──→  browser/bridge-server.ts    │
│  auto-reply/reply/dispatch.ts  ──→  media-understanding/apply.ts│
│  auto-reply/reply/get-reply.ts ──→  media-understanding/apply.ts│
│  plugins/runtime/index.ts      ──→  media-understanding/transcribe-audio.ts│
└─────────────────────────────────────────────────────────────────┘

browser/ 內部架構
┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│  server.ts ─→ config.ts ─→ control-auth.ts                      │
│      │                                                           │
│      ├─→ server-middleware.ts (auth + common)                    │
│      ├─→ runtime-lifecycle.ts ─→ server-context.ts               │
│      │         │                    ├─→ server-context.tab-ops.ts│
│      │         │                    ├─→ server-context.selection.ts│
│      │         │                    ├─→ server-context.availability.ts│
│      │         │                    └─→ server-context.reset.ts  │
│      │         └─→ chrome.ts ─→ chrome.executables.ts            │
│      │                   └─→ chrome.profile-decoration.ts        │
│      │                                                           │
│      └─→ routes/index.ts                                         │
│            ├─→ routes/basic.ts (status/start/stop)               │
│            ├─→ routes/tabs.ts                                    │
│            └─→ routes/agent.ts                                   │
│                  ├─→ routes/agent.act.ts ─→ pw-tools-core.*.ts   │
│                  ├─→ routes/agent.snapshot.ts ─→ pw-tools-core.* │
│                  └─→ routes/agent.storage.ts ─→ pw-tools-core.*  │
│                                                                  │
│  [Playwright 層]                                                 │
│  pw-session.ts ←─── (所有 pw-tools-core.*.ts 依賴)              │
│      └─→ chromium.connectOverCDP() ──→ Chrome CDP                │
│                                                                  │
│  [Chrome MCP 層]（替代 Playwright 的操作通道）                   │
│  chrome-mcp.ts ──→ @modelcontextprotocol/sdk                     │
│      └─→ chrome-devtools-mcp (npx 啟動)                         │
│                                                                  │
│  [Extension Relay]                                               │
│  extension-relay.ts ←→ Chrome Extension ←→ CDP                  │
│                                                                  │
│  [Transport 抽象: profile-capabilities.ts]                       │
│  profile mode: "playwright" | "chrome-mcp" | "remote"            │
│  → 決定使用哪個操作通道                                         │
│                                                                  │
│  跨模組依賴:                                                    │
│  browser/proxy-files.ts ──→ media/store.ts                       │
│  browser/screenshot.ts  ──→ media/image-ops.ts                   │
└─────────────────────────────────────────────────────────────────┘

media-understanding/ 架構
┌─────────────────────────────────────────────────────────────────┐
│  apply.ts (系統入口)                                             │
│    ├─→ runner.ts ─→ runCapability()                              │
│    │     ├─→ runner.entries.ts ─→ runProviderEntry() / runCliEntry()│
│    │     │     └─→ providers/*.ts (各 provider 實作)             │
│    │     ├─→ attachments.*.ts (篩選/正規化/cache)                │
│    │     ├─→ resolve.ts (config 解析)                            │
│    │     └─→ scope.ts (作用域決策)                               │
│    ├─→ audio-preflight.ts ─→ audio-transcription-runner.ts       │
│    └─→ format.ts (結果格式化)                                    │
│                                                                  │
│  跨模組依賴:                                                    │
│  media-understanding/runner.ts ──→ media/inbound-path-policy.ts  │
│  media-understanding/runner.ts ──→ media/local-roots.ts          │
└─────────────────────────────────────────────────────────────────┘

media/ 架構
┌─────────────────────────────────────────────────────────────────┐
│  server.ts (HTTP 入口)                                           │
│    └─→ store.ts (儲存) ──→ fetch.ts (下載)                       │
│                                                                  │
│  image-ops.ts (sharp) ─→ 截圖/縮圖/格式轉換                    │
│  input-files.ts ─→ fetch + extract (圖片/文件/PDF)              │
│  pdf-extract.ts ─→ PDF 文字+圖片萃取                            │
│  parse.ts ──→ markdown/fences.ts (MEDIA: token 解析)             │
│  mime.ts ─→ MIME 偵測（被 canvas-host 引用）                    │
└─────────────────────────────────────────────────────────────────┘

link-understanding/ 架構
┌─────────────────────────────────────────────────────────────────┐
│  apply.ts (系統入口)                                             │
│    └─→ runner.ts                                                 │
│          ├─→ detect.ts (URL 擷取)                                │
│          ├─→ media-understanding/scope.ts (作用域決策)           │
│          ├─→ media-understanding/resolve.ts (超時解析)           │
│          └─→ media-understanding/defaults.ts (常數)              │
└─────────────────────────────────────────────────────────────────┘

canvas-host/ 架構
┌─────────────────────────────────────────────────────────────────┐
│  server.ts (HTTP/WS 入口)                                        │
│    ├─→ a2ui.ts (A2UI 路由 + live reload)                        │
│    ├─→ file-resolver.ts (安全檔案解析)                           │
│    └─→ media/mime.ts (MIME 偵測)                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 系統歸屬分類

### 1. 瀏覽器自動化系統 (browser/)

| 子系統 | 核心檔案 | 說明 |
|--------|---------|------|
| **Server 層** | server.ts, control-service.ts, runtime-lifecycle.ts | Express HTTP server 啟動/停止 |
| **Route 層** | routes/*.ts | RESTful API 路由，agent 操作 |
| **Playwright 引擎** | pw-session.ts, pw-tools-core.*.ts | Playwright page pool 管理 + 操作封裝 |
| **Chrome MCP 引擎** | chrome-mcp.ts, chrome-mcp.snapshot.ts | 替代 Playwright 的 MCP 操作通道 |
| **CDP 層** | cdp.ts, cdp.helpers.ts, cdp-proxy-bypass.ts | 低階 Chrome DevTools Protocol |
| **Chrome 管理** | chrome.ts, chrome.executables.ts, chrome.profile-decoration.ts | Chrome 啟動/偵測/profile |
| **Client API** | client.ts, client-actions*.ts, client-fetch.ts | 供 agent/tool 呼叫的高階 API |
| **Extension Relay** | extension-relay.ts, extension-relay-auth.ts | Chrome Extension WebSocket relay |
| **Bridge (sandbox)** | bridge-server.ts, bridge-auth-registry.ts | 沙箱隔離用 bridge |
| **Config/Auth/安全** | config.ts, control-auth.ts, http-auth.ts, csrf.ts, navigation-guard.ts | 設定解析 + 認證 + SSRF 防護 |
| **Profile 管理** | profiles.ts, profiles-service.ts, profile-capabilities.ts | 多 profile 管理 + 能力偵測 |
| **Server Context** | server-context*.ts | 狀態管理 + tab ops + selection |
| **Snapshot** | pw-role-snapshot.ts, snapshot-roles.ts | ARIA/Role snapshot 建構 |
| **路徑/檔案** | paths.ts, safe-filename.ts, output-atomic.ts, proxy-files.ts, trash.ts | 路徑安全 + 原子寫入 |

### 2. 媒體理解系統 (media-understanding/)

| 子系統 | 核心檔案 | 說明 |
|--------|---------|------|
| **執行引擎** | runner.ts, runner.entries.ts | 多 provider 路由 + 執行 |
| **套用層** | apply.ts, format.ts | 對訊息套用理解結果 |
| **附件管理** | attachments.*.ts | 正規化 + 篩選 + binary cache |
| **音訊轉錄** | transcribe-audio.ts, audio-preflight.ts, audio-transcription-runner.ts | 音訊轉錄入口 + 前置處理 |
| **Config 解析** | resolve.ts, scope.ts, defaults.ts | 超時/prompt/model/scope 解析 |
| **Provider 實作** | providers/*.ts | 10 個 provider (Anthropic/Deepgram/Google/Groq/Minimax/Mistral/Moonshot/OpenAI/Zai) |

### 3. 媒體處理系統 (media/)

| 子系統 | 核心檔案 | 說明 |
|--------|---------|------|
| **Server** | server.ts | 媒體 HTTP 伺服 |
| **儲存** | store.ts, host.ts, temp-files.ts | 媒體檔案儲存/託管/清理 |
| **下載** | fetch.ts, read-response-with-limit.ts | 遠端媒體下載 |
| **圖片處理** | image-ops.ts, png-encode.ts | sharp 縮圖/格式轉換/PNG 編碼 |
| **MIME** | mime.ts, sniff-mime-from-base64.ts | MIME 偵測/轉換 |
| **輸入處理** | input-files.ts, pdf-extract.ts | 檔案/PDF 內容萃取 |
| **音訊** | audio.ts, audio-tags.ts, ffmpeg-exec.ts | 音訊格式判斷 + ffmpeg 封裝 |
| **路徑安全** | inbound-path-policy.ts, local-roots.ts | 入站路徑白名單策略 |
| **解析** | parse.ts, base64.ts, outbound-attachment.ts | MEDIA: token + base64 + outbound 附件 |

### 4. 連結理解系統 (link-understanding/)

| 子系統 | 核心檔案 | 說明 |
|--------|---------|------|
| **全流程** | apply.ts → runner.ts → detect.ts → format.ts | 偵測 URL → CLI 執行 → 格式化 |
| 依賴 media-understanding/ 的 scope/resolve/defaults | — | 共用作用域+超時邏輯 |

### 5. Markdown 處理系統 (markdown/)

| 子系統 | 核心檔案 | 說明 |
|--------|---------|------|
| **Parser** | ir.ts (973 行) | Markdown → IR 解析器 |
| **Renderer** | render.ts, whatsapp.ts, tables.ts | IR → 各平台格式渲染 |
| **工具** | fences.ts, code-spans.ts, frontmatter.ts | Code fence/span/frontmatter 解析 |
| 被 media/parse.ts 引用 | — | MEDIA: token 解析需要 fence 感知 |

### 6. Canvas 宿主系統 (canvas-host/)

| 子系統 | 核心檔案 | 說明 |
|--------|---------|------|
| **Server** | server.ts (478 行) | HTTP + WebSocket server，支援 live reload |
| **A2UI** | a2ui.ts | 內建 UI 路由 + live reload 注入 |
| **檔案安全** | file-resolver.ts | 路徑正規化 + 根目錄限制 |
| 依賴 media/mime.ts | — | MIME 偵測 |
