# Infra 函式級索引

> 掃描日期：2026-03-21 | 檔案數：227 檔 | 總行數：~40,751 行

## 目錄結構

```
src/infra/
├── format-time/          # 時間格式化（3 檔，313 行）
│   ├── format-datetime.ts
│   ├── format-duration.ts
│   └── format-relative.ts
├── net/                  # 網路安全與 proxy（6 檔，943 行）
│   ├── fetch-guard.ts
│   ├── hostname.ts
│   ├── proxy-env.ts
│   ├── proxy-fetch.ts
│   ├── ssrf.ts
│   └── undici-global-dispatcher.ts
├── outbound/             # 訊息外發系統（33 檔，~7,480 行）
│   ├── abort.ts
│   ├── agent-delivery.ts
│   ├── bound-delivery-router.ts
│   ├── channel-adapters.ts
│   ├── channel-resolution.ts
│   ├── channel-selection.ts
│   ├── channel-target.ts
│   ├── conversation-id.ts
│   ├── deliver-runtime.ts
│   ├── deliver.ts
│   ├── delivery-queue.ts
│   ├── directory-cache.ts
│   ├── envelope.ts
│   ├── format.ts
│   ├── identity.ts
│   ├── message-action-normalization.ts
│   ├── message-action-params.ts
│   ├── message-action-runner.ts
│   ├── message-action-spec.ts
│   ├── message.ts
│   ├── mirror.ts
│   ├── outbound-policy.ts
│   ├── outbound-send-service.ts
│   ├── outbound-session.ts
│   ├── payloads.ts
│   ├── sanitize-text.ts
│   ├── send-deps.ts
│   ├── session-binding-service.ts
│   ├── session-context.ts
│   ├── target-errors.ts
│   ├── target-normalization.ts
│   ├── target-resolver.ts
│   ├── targets.ts
│   └── tool-payload.ts
├── tls/                  # TLS 憑證（2 檔，155 行）
│   ├── fingerprint.ts
│   └── gateway.ts
└── （根目錄）             # 核心基礎設施（183 檔，~31,860 行）
```

## 函式清單

---

### 根目錄

#### `abort-signal.ts`（12 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `waitForAbortSignal` | `(signal?: AbortSignal) => Promise<void>` | 等待 AbortSignal 被觸發 | function |

#### `agent-events.ts`（88 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `AgentEventStream` | `"lifecycle" \| "tool" \| "assistant" \| "error" \| (string & {})` | Agent 事件流類別 | type |
| `AgentEventPayload` | `{ seq, ts, runId, stream, ... }` | Agent 事件資料結構 | type |
| `AgentRunContext` | `{ agentId, sessionKey, ... }` | Agent 執行上下文 | type |
| `registerAgentRunContext` | `(runId: string, context: AgentRunContext) => void` | 註冊 agent run 上下文 | function |
| `getAgentRunContext` | `(runId: string) => AgentRunContext \| undefined` | 取得 agent run 上下文 | function |
| `clearAgentRunContext` | `(runId: string) => void` | 清除 agent run 上下文 | function |
| `resetAgentRunContextForTest` | `() => void` | 測試用重置 | function |
| `emitAgentEvent` | `(event: Omit<AgentEventPayload, "seq" \| "ts">) => void` | 發送 agent 事件 | function |
| `onAgentEvent` | `(listener: (evt: AgentEventPayload) => void) => () => void` | 監聽 agent 事件 | function |

#### `archive-path.ts`（63 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `isWindowsDrivePath` | `(value: string) => boolean` | 偵測 Windows 磁碟路徑 | function |
| `normalizeArchiveEntryPath` | `(raw: string) => string` | 正規化壓縮檔內路徑 | function |
| `validateArchiveEntryPath` | `(params) => ...` | 驗證壓縮檔路徑安全性 | function |
| `stripArchivePath` | `(entryPath, stripComponents) => string \| null` | 去除壓縮檔路徑前綴層數 | function |
| `resolveArchiveOutputPath` | `(params) => string` | 解析壓縮檔輸出路徑 | function |

#### `archive-staging.ts`（218 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `ArchiveSecurityErrorCode` | `"symlink-escape" \| "hardlink" \| ...` | 壓縮檔安全錯誤碼 | type |
| `ArchiveSecurityError` | `extends Error` | 壓縮檔安全錯誤類別 | class |
| `prepareArchiveDestinationDir` | `(destDir: string) => Promise<string>` | 準備解壓目標目錄 | function |
| `prepareArchiveOutputPath` | `(params) => Promise<...>` | 準備解壓輸出路徑 | function |
| `withStagedArchiveDestination` | `<T>(params) => Promise<T>` | 使用暫存目錄解壓後搬移 | function |
| `mergeExtractedTreeIntoDestination` | `(params) => Promise<void>` | 將解壓樹合併至目的地 | function |
| `createArchiveSymlinkTraversalError` | `(originalPath) => ArchiveSecurityError` | 建立 symlink 穿越錯誤 | function |

#### `archive.ts`（639 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `ArchiveKind` | `"tar" \| "zip"` | 壓縮格式種類 | type |
| `ArchiveLogger` / `ArchiveExtractLimits` | — | 壓縮日誌與限制參數 | type |
| `DEFAULT_MAX_ARCHIVE_BYTES_ZIP` / `DEFAULT_MAX_ENTRIES` / `DEFAULT_MAX_EXTRACTED_BYTES` / `DEFAULT_MAX_ENTRY_BYTES` | — | 壓縮檔預設限制常數 | const |
| `resolveArchiveKind` | `(filePath: string) => ArchiveKind \| null` | 從檔名判斷壓縮格式 | function |
| `resolvePackedRootDir` | `(extractDir: string) => Promise<string>` | 解析壓縮檔根目錄 | function |
| `withTimeout` | `<T>(promise, ms) => Promise<T>` | 帶逾時的 Promise 包裝 | function |
| `TarEntryInfo` | — | tar 條目資訊 | type |
| `createTarEntryPreflightChecker` | `(params) => ...` | 建立 tar 條目預檢器 | function |
| `extractArchive` | `(params) => Promise<...>` | 解壓縮主函式 | function |
| `fileExists` | `(filePath: string) => Promise<boolean>` | 非同步檔案存在檢查 | function |
| `readJsonFile` | `<T>(filePath: string) => Promise<T>` | 讀取 JSON 檔 | function |

#### `backoff.ts`（28 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `BackoffPolicy` | `{ base, max, jitter }` | 退避策略參數 | type |
| `computeBackoff` | `(policy, attempt) => number` | 計算退避等待時間 | function |
| `sleepWithAbort` | `(ms, abortSignal?) => Promise<void>` | 可中斷的 sleep | function |

#### `backup-create.ts`（368 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `BackupCreateOptions` / `BackupCreateResult` | — | 備份建立參數與結果 | type |
| `formatBackupCreateSummary` | `(result) => string[]` | 格式化備份摘要 | function |
| `createBackupArchive` | `(params) => Promise<BackupCreateResult>` | 建立備份壓縮檔 | function |

#### `binaries.ts`（14 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `ensureBinary` | `(params) => Promise<...>` | 確保二進位檔可用 | function |

#### `bonjour-ciao.ts`（11 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `ignoreCiaoCancellationRejection` | `(reason: unknown) => boolean` | 忽略 Ciao 取消 rejection | function |

#### `bonjour-discovery.ts`（590 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `GatewayBonjourBeacon` | — | Gateway Bonjour 廣播資料 | type |
| `GatewayBonjourDiscoverOpts` | — | 發現選項 | type |
| `discoverGatewayBeacons` | `(opts) => Promise<...>` | 探索區網 gateway beacon | function |

#### `bonjour-errors.ts`（11 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `formatBonjourError` | `(err: unknown) => string` | 格式化 Bonjour 錯誤訊息 | function |

#### `bonjour.ts`（281 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `GatewayBonjourAdvertiser` / `GatewayBonjourAdvertiseOpts` | — | Bonjour 廣播介面與選項 | type |
| `startGatewayBonjourAdvertiser` | `(opts) => Promise<GatewayBonjourAdvertiser>` | 啟動 gateway Bonjour 廣播 | function |

#### `boundary-file-read.ts`（202 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `BoundaryFileOpenFailureReason` / `BoundaryFileOpenResult` | — | 邊界檔案開啟結果型別 | type |
| `OpenBoundaryFileSyncParams` / `OpenBoundaryFileParams` | — | 同步/非同步參數 | type |
| `canUseBoundaryFileOpen` | `(ioFs) => boolean` | 檢查是否支援邊界檔案開啟 | function |
| `openBoundaryFileSync` | `(params) => BoundaryFileOpenResult` | 同步開啟邊界檔案 | function |
| `openBoundaryFile` | `(params) => Promise<...>` | 非同步開啟邊界檔案 | function |

#### `boundary-path.ts`（861 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `BoundaryPathIntent` | `"read" \| "write" \| "create" \| "delete" \| "stat"` | 路徑操作意圖 | type |
| `BoundaryPathAliasPolicy` / `BOUNDARY_PATH_ALIAS_POLICIES` | — | 路徑別名策略 | type/const |
| `ResolveBoundaryPathParams` / `ResolvedBoundaryPathKind` / `ResolvedBoundaryPath` | — | 路徑解析參數與結果 | type |
| `resolveBoundaryPath` | `(params) => Promise<ResolvedBoundaryPath>` | 非同步解析邊界內路徑 | function |
| `resolveBoundaryPathSync` | `(params) => ResolvedBoundaryPath` | 同步解析邊界內路徑 | function |
| `resolvePathViaExistingAncestor` | `(targetPath) => Promise<string>` | 透過現存祖先路徑解析 | function |
| `resolvePathViaExistingAncestorSync` | `(targetPath) => string` | 同步版本 | function |

#### `brew.ts`（79 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `resolveBrewPathDirs` | `(opts?) => string[]` | 解析 Homebrew PATH 目錄 | function |
| `resolveBrewExecutable` | `(opts?) => string \| null` | 解析 Homebrew 可執行檔路徑 | function |

#### `canvas-host-url.ts`（93 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `resolveCanvasHostUrl` | `(params) => string` | 解析 Canvas 主機 URL | function |

#### `channel-activity.ts`（58 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `ChannelDirection` | `"inbound" \| "outbound"` | 頻道方向 | type |
| `recordChannelActivity` | `(params) => void` | 記錄頻道活動 | function |
| `getChannelActivity` | `(params) => ...` | 取得頻道活動 | function |
| `resetChannelActivityForTest` | `() => void` | 測試用重置 | function |

#### `channel-summary.ts`（257 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `ChannelSummaryOptions` | — | 頻道摘要選項 | type |
| `buildChannelSummary` | `(params) => Promise<...>` | 建立頻道狀態摘要 | function |

#### `channels-status-issues.ts`（20 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `collectChannelStatusIssues` | `(payload) => ChannelStatusIssue[]` | 收集頻道狀態問題 | function |

#### `cli-root-options.ts`（31 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `FLAG_TERMINATOR` | `"--"` | CLI 參數終止符 | const |
| `isValueToken` | `(arg) => boolean` | 判斷是否為值 token | function |
| `consumeRootOptionToken` | `(args, index) => number` | 消耗根選項 token | function |

#### `clipboard.ts`（25 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `copyToClipboard` | `(value: string) => Promise<boolean>` | 複製文字到剪貼簿 | function |

#### `control-ui-assets.ts`（350 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `resolveControlUiDistIndexPathForRoot` | `(root) => string` | 取得 Control UI dist index 路徑 | function |
| `ControlUiDistIndexHealth` | — | dist 健康檢查結果 | type |
| `resolveControlUiDistIndexHealth` | `(params) => Promise<...>` | 檢查 dist 健康狀態 | function |
| `resolveControlUiRepoRoot` | `(params) => string` | 解析 Control UI repo 根目錄 | function |
| `resolveControlUiDistIndexPath` | `(params) => Promise<string>` | 解析 dist index 路徑 | function |
| `ControlUiRootResolveOptions` | — | 解析選項 | type |
| `resolveControlUiRootOverrideSync` | `(rootOverride) => string \| null` | 同步解析 root override | function |
| `resolveControlUiRootSync` | `(opts?) => string \| null` | 同步解析 Control UI root | function |
| `isPackageProvenControlUiRootSync` | `(params) => boolean` | 檢查是否為 package 來源 | function |
| `EnsureControlUiAssetsResult` | — | 結果型別 | type |
| `ensureControlUiAssetsBuilt` | `(params) => Promise<...>` | 確保 UI assets 已建構 | function |

#### `dedupe.ts`（86 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `DedupeCache` | — | 去重快取介面 | type |
| `createDedupeCache` | `(options) => DedupeCache` | 建立去重快取 | function |

#### `detect-package-manager.ts`（29 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `DetectedPackageManager` | `"pnpm" \| "bun" \| "npm"` | 偵測到的套件管理器 | type |
| `detectPackageManager` | `(root) => Promise<DetectedPackageManager \| null>` | 偵測專案使用的套件管理器 | function |

#### `device-auth-store.ts`（94 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `loadDeviceAuthToken` | `(params) => ...` | 載入裝置認證 token | function |
| `storeDeviceAuthToken` | `(params) => void` | 儲存裝置認證 token | function |
| `clearDeviceAuthToken` | `(params) => void` | 清除裝置認證 token | function |

#### `device-bootstrap.ts`（116 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `DEVICE_BOOTSTRAP_TOKEN_TTL_MS` | `600000` | Bootstrap token 存活時間 | const |
| `DeviceBootstrapTokenRecord` | — | Bootstrap token 記錄 | type |
| `issueDeviceBootstrapToken` | `(params) => Promise<...>` | 發行裝置 bootstrap token | function |
| `verifyDeviceBootstrapToken` | `(params) => Promise<...>` | 驗證 bootstrap token | function |

#### `device-identity.ts`（188 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `DeviceIdentity` | — | 裝置身份資料結構 | type |
| `loadOrCreateDeviceIdentity` | `(params) => DeviceIdentity` | 載入或建立裝置身份 | function |
| `signDevicePayload` | `(privateKeyPem, payload) => string` | 裝置私鑰簽章 | function |
| `normalizeDevicePublicKeyBase64Url` | `(publicKey) => string \| null` | 正規化裝置公鑰 | function |
| `deriveDeviceIdFromPublicKey` | `(publicKey) => string \| null` | 從公鑰推導裝置 ID | function |
| `publicKeyRawBase64UrlFromPem` | `(publicKeyPem) => string` | PEM 轉 base64url | function |
| `verifyDeviceSignature` | `(params) => boolean` | 驗證裝置簽章 | function |

#### `device-pairing.ts`（670 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `DevicePairingPendingRequest` / `DeviceAuthToken` / `DeviceAuthTokenSummary` / `PairedDevice` / `DevicePairingList` | — | 裝置配對相關型別（5 種） | type |
| `listDevicePairing` | `(baseDir?) => Promise<DevicePairingList>` | 列出所有裝置配對 | function |
| `getPairedDevice` | `(params) => Promise<PairedDevice \| null>` | 取得已配對裝置 | function |
| `requestDevicePairing` | `(params) => Promise<...>` | 發起裝置配對請求 | function |
| `approveDevicePairing` | `(params) => Promise<...>` | 核准裝置配對 | function |
| `rejectDevicePairing` | `(params) => Promise<...>` | 拒絕裝置配對 | function |
| `removePairedDevice` | `(params) => Promise<...>` | 移除已配對裝置 | function |
| `updatePairedDeviceMetadata` | `(params) => Promise<...>` | 更新配對裝置中繼資料 | function |
| `summarizeDeviceTokens` | `(params) => DeviceAuthTokenSummary[]` | 摘要裝置 token | function |
| `verifyDeviceToken` | `(params) => Promise<...>` | 驗證裝置 token | function |
| `ensureDeviceToken` | `(params) => Promise<...>` | 確保裝置 token 存在 | function |
| `rotateDeviceToken` | `(params) => Promise<...>` | 輪換裝置 token | function |
| `revokeDeviceToken` | `(params) => Promise<...>` | 撤銷裝置 token | function |
| `clearDevicePairing` | `(deviceId, baseDir?) => Promise<boolean>` | 清除裝置配對 | function |

#### `diagnostic-events.ts`（242 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `DiagnosticSessionState` / 多種 `Diagnostic*Event` 型別 | — | 診斷事件型別家族（~15 型別） | type |
| `DiagnosticEventPayload` / `DiagnosticEventInput` | — | 診斷事件 union / 輸入型別 | type |
| `isDiagnosticsEnabled` | `(config?) => boolean` | 檢查是否啟用診斷 | function |
| `emitDiagnosticEvent` | `(event) => void` | 發送診斷事件 | function |
| `onDiagnosticEvent` | `(listener) => () => void` | 監聽診斷事件 | function |
| `resetDiagnosticEventsForTest` | `() => void` | 測試用重置 | function |

#### `diagnostic-flags.ts`（92 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `resolveDiagnosticFlags` | `(params) => string[]` | 解析啟用的診斷旗標 | function |
| `matchesDiagnosticFlag` | `(flag, enabledFlags) => boolean` | 比對診斷旗標 | function |
| `isDiagnosticFlagEnabled` | `(flag, ...) => boolean` | 檢查旗標是否啟用 | function |

#### `dotenv.ts`（20 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `loadDotEnv` | `(opts?) => void` | 載入 .env 檔案 | function |

#### `env.ts`（52 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `logAcceptedEnvOption` | `(option) => void` | 記錄已接受的環境變數選項 | function |
| `normalizeZaiEnv` | `() => void` | 正規化 ZAI 環境變數 | function |
| `isTruthyEnvValue` | `(value?) => boolean` | 檢查環境變數是否為真值 | function |
| `normalizeEnv` | `() => void` | 正規化環境變數 | function |

#### `errors.ts`（96 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `extractErrorCode` | `(err) => string \| undefined` | 提取錯誤碼 | function |
| `readErrorName` | `(err) => string` | 讀取錯誤名稱 | function |
| `collectErrorGraphCandidates` | `(err) => ...` | 收集錯誤鏈候選項 | function |
| `isErrno` / `hasErrnoCode` | — | Node.js errno 檢查 | function |
| `formatErrorMessage` | `(err) => string` | 格式化錯誤訊息 | function |
| `formatUncaughtError` | `(err) => string` | 格式化未捕獲錯誤 | function |

#### `exec-allowlist-pattern.ts`（84 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `matchesExecAllowlistPattern` | `(pattern, target) => boolean` | 比對執行允許清單模式 | function |

#### `exec-approval-command-display.ts`（40 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `sanitizeExecApprovalDisplayText` | `(commandText) => string` | 清理執行核准顯示文字 | function |
| `resolveExecApprovalCommandDisplay` | `(request) => { ... }` | 解析執行核准指令顯示 | function |

#### `exec-approval-forwarder.ts`（561 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `ExecApprovalForwarder` / `ExecApprovalForwarderDeps` | — | 執行核准轉發器介面 | type |
| `createExecApprovalForwarder` | `(deps) => ExecApprovalForwarder` | 建立執行核准轉發器 | function |
| `shouldForwardExecApproval` | `(params) => boolean` | 判斷是否需轉發執行核准 | function |

#### `exec-approval-reply.ts`（172 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `ExecApprovalReplyDecision` | `"allow-once" \| "allow-always" \| "deny"` | 核准回覆決策 | type |
| `ExecApprovalUnavailableReason` | — | 不可用原因 | type |
| `ExecApprovalReplyMetadata` / `ExecApprovalPendingReplyParams` / `ExecApprovalUnavailableReplyParams` | — | 回覆中繼資料與參數 | type |
| `getExecApprovalApproverDmNoticeText` | `() => string` | 取得核准者 DM 通知文字 | function |
| `getExecApprovalReplyMetadata` | `(params) => ...` | 取得回覆中繼資料 | function |
| `buildExecApprovalPendingReplyPayload` | `(params) => ...` | 建構待決回覆 payload | function |
| `buildExecApprovalUnavailableReplyPayload` | `(params) => ...` | 建構不可用回覆 payload | function |

#### `exec-approval-session-target.ts`（69 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `ExecApprovalSessionTarget` | — | 核准 session 目標 | type |
| `resolveExecApprovalSessionTarget` | `(params) => ...` | 解析核准 session 目標 | function |

#### `exec-approval-surface.ts`（82 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `ExecApprovalInitiatingSurfaceState` | — | 核准發起表面狀態 | type |
| `resolveExecApprovalInitiatingSurfaceState` | `(params) => ...` | 解析發起表面狀態 | function |
| `hasConfiguredExecApprovalDmRoute` | `(cfg) => boolean` | 檢查是否已設定 DM 核准路由 | function |

#### `exec-approvals-allowlist.ts`（609 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `normalizeSafeBins` | `(entries?) => Set<string>` | 正規化安全二進位清單 | function |
| `resolveSafeBins` | `(entries?) => Set<string>` | 解析安全二進位集合 | function |
| `isSafeBinUsage` | `(params) => boolean` | 判斷是否為安全二進位使用 | function |
| `ExecAllowlistEvaluation` / `ExecSegmentSatisfiedBy` / `SkillBinTrustEntry` | — | 允許清單評估型別 | type |
| `evaluateExecAllowlist` | `(params) => ExecAllowlistEvaluation` | 評估執行允許清單 | function |
| `ExecAllowlistAnalysis` | — | 允許清單分析結果 | type |
| `resolveAllowAlwaysPatterns` | `(params) => string[]` | 解析「永遠允許」模式 | function |
| `evaluateShellAllowlist` | `(params) => ...` | 評估 shell 允許清單 | function |

#### `exec-approvals-analysis.ts`（818 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `ExecCommandSegment` / `ExecCommandAnalysis` / `ShellChainOperator` / `ShellChainPart` | — | 指令分析型別 | type |
| `isWindowsPlatform` | `(platform?) => boolean` | 判斷是否為 Windows | function |
| `splitCommandChainWithOperators` | `(command) => ShellChainPart[] \| null` | 拆分指令鏈含運算子 | function |
| `buildSafeShellCommand` | `(params) => { ... }` | 建構安全 shell 指令 | function |
| `resolvePlannedSegmentArgv` | `(segment) => string[] \| null` | 解析計畫段落 argv | function |
| `buildSafeBinsShellCommand` | `(params) => ...` | 用安全二進位建構 shell 指令 | function |
| `buildEnforcedShellCommand` | `(params) => ...` | 建構強制型 shell 指令 | function |
| `splitCommandChain` | `(command) => string[] \| null` | 拆分指令鏈 | function |
| `analyzeShellCommand` | `(params) => ExecCommandAnalysis` | 分析 shell 指令 | function |
| `analyzeArgvCommand` | `(params) => ExecCommandAnalysis` | 分析 argv 指令 | function |

#### `exec-approvals.ts`（589 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `ExecHost` / `ExecSecurity` / `ExecAsk` | — | 執行核准列舉（3 種） | type |
| `normalizeExecHost` / `normalizeExecSecurity` / `normalizeExecAsk` | — | 正規化函式（3 種） | function |
| `SystemRunApprovalBinding` / `SystemRunApprovalPlan` / `ExecApprovalRequestPayload` / `ExecApprovalRequest` / `ExecApprovalResolved` 等 | — | 核准系統核心型別（~12 種） | type |
| `DEFAULT_EXEC_APPROVAL_TIMEOUT_MS` | `120_000` | 預設核准逾時 | const |
| `resolveExecApprovalsPath` / `resolveExecApprovalsSocketPath` | — | 解析核准路徑 | function |
| `normalizeExecApprovals` | `(file) => ExecApprovalsFile` | 正規化核准檔案 | function |
| `mergeExecApprovalsSocketDefaults` | `(params) => ...` | 合併 socket 預設值 | function |
| `readExecApprovalsSnapshot` / `loadExecApprovals` / `saveExecApprovals` / `ensureExecApprovals` | — | 核准檔案 CRUD | function |
| `resolveExecApprovals` / `resolveExecApprovalsFromFile` | — | 解析核准設定 | function |
| `requiresExecApproval` | `(params) => boolean` | 判斷是否需要核准 | function |
| `recordAllowlistUse` / `addAllowlistEntry` | — | 允許清單操作 | function |
| `minSecurity` / `maxAsk` | — | 安全/詢問等級比較 | function |
| `ExecApprovalDecision` | — | 核准決策型別 | type |
| `requestExecApprovalViaSocket` | `(params) => Promise<...>` | 透過 socket 請求執行核准 | function |

#### `exec-command-resolution.ts`（247 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `DEFAULT_SAFE_BINS` | `["jq", "cut", ...]` | 預設安全二進位清單 | const |
| `CommandResolution` | — | 指令解析結果 | type |
| `resolveCommandResolution` | `(params) => CommandResolution` | 解析指令 | function |
| `resolveCommandResolutionFromArgv` | `(params) => CommandResolution` | 從 argv 解析指令 | function |
| `resolveAllowlistCandidatePath` | `(params) => ...` | 解析允許清單候選路徑 | function |
| `matchAllowlist` | `(params) => ...` | 比對允許清單 | function |
| `ExecArgvToken` | — | argv token 型別 | type |
| `parseExecArgvToken` | `(raw) => ExecArgvToken` | 解析 argv token | function |

#### `exec-host.ts`（80 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `ExecHostRequest` / `ExecHostRunResult` / `ExecHostError` / `ExecHostResponse` | — | 執行主機通訊型別 | type |
| `requestExecHostViaSocket` | `(params) => Promise<ExecHostResponse>` | 透過 socket 請求執行主機 | function |

#### `exec-obfuscation-detect.ts`（255 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `ObfuscationDetection` | — | 混淆偵測結果 | type |
| `detectCommandObfuscation` | `(command) => ObfuscationDetection` | 偵測指令混淆 | function |

#### `exec-safe-bin-policy-profiles.ts`（315 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `SafeBinProfile` / `SafeBinProfileFixture` / `SafeBinProfileFixtures` | — | 安全二進位策略設定檔型別 | type |
| `collectKnownLongFlags` | `(params) => ...` | 收集已知長旗標 | function |
| `buildLongFlagPrefixMap` | `(params) => ...` | 建構長旗標前綴映射 | function |
| `SAFE_BIN_PROFILE_FIXTURES` / `SAFE_BIN_PROFILES` | — | 預設設定檔 | const |
| `normalizeSafeBinProfileFixtures` / `resolveSafeBinProfiles` / `resolveSafeBinDeniedFlags` / `renderSafeBinDeniedFlagsDocBullets` | — | 設定檔正規化與解析 | function |

#### `exec-safe-bin-policy-validator.ts`（206 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `validateSafeBinArgv` | `(args, profile) => boolean` | 驗證安全二進位 argv 符合策略 | function |

#### `exec-safe-bin-policy.ts`（15 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| — | re-export from profiles + validator | 安全二進位策略聚合 re-export | re-export |

#### `exec-safe-bin-runtime-policy.ts`（158 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `ExecSafeBinConfigScope` | — | 安全二進位設定範圍 | type |
| `isInterpreterLikeSafeBin` | `(raw) => boolean` | 判斷是否為直譯器類安全二進位 | function |
| `listInterpreterLikeSafeBins` | `(entries) => string[]` | 列出直譯器類安全二進位 | function |
| `resolveMergedSafeBinProfileFixtures` | `(params) => ...` | 合併安全二進位設定檔 | function |
| `resolveExecSafeBinRuntimePolicy` | `(params) => ...` | 解析運行時安全二進位策略 | function |

#### `exec-safe-bin-trust.ts`（126 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `WritableTrustedSafeBinDir` | — | 可寫入信任目錄 | type |
| `normalizeTrustedSafeBinDirs` | `(entries?) => string[]` | 正規化信任目錄 | function |
| `buildTrustedSafeBinDirs` | `(params?) => Set<string>` | 建構信任目錄集合 | function |
| `getTrustedSafeBinDirs` | `(params) => Set<string>` | 取得信任目錄 | function |
| `isTrustedSafeBinPath` | `(params) => boolean` | 判斷路徑是否在信任範圍 | function |
| `listWritableExplicitTrustedSafeBinDirs` | `(params) => ...` | 列出可寫入的明確信任目錄 | function |

#### `exec-safety.ts`（44 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `isSafeExecutableValue` | `(value) => boolean` | 判斷可執行值是否安全 | function |

#### `exec-wrapper-resolution.ts`（668 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `MAX_DISPATCH_WRAPPER_DEPTH` | `4` | 最大 dispatch wrapper 展開深度 | const |
| `POSIX_SHELL_WRAPPERS` / `WINDOWS_CMD_WRAPPERS` / `POWERSHELL_WRAPPERS` / `DISPATCH_WRAPPER_EXECUTABLES` | — | 各平台 wrapper 集合 | const |
| `ShellWrapperCommand` | — | Shell wrapper 指令型別 | type |
| `basenameLower` / `normalizeExecutableToken` | — | token 正規化 | function |
| `isDispatchWrapperExecutable` / `isShellWrapperExecutable` | — | wrapper 判斷 | function |
| `ShellMultiplexerUnwrapResult` | — | 多工器展開結果 | type |
| `unwrapKnownShellMultiplexerInvocation` | `(params) => ...` | 展開已知 shell 多工器 | function |
| `isEnvAssignment` | `(token) => boolean` | 判斷是否為環境變數賦值 | function |
| `unwrapEnvInvocation` | `(argv) => string[] \| null` | 展開 env 調用 | function |
| `DispatchWrapperUnwrapResult` / `DispatchWrapperExecutionPlan` | — | dispatch wrapper 型別 | type |
| `unwrapKnownDispatchWrapperInvocation` | `(argv) => ...` | 展開已知 dispatch wrapper | function |
| `unwrapDispatchWrappersForResolution` | `(params) => ...` | 為解析展開 dispatch wrappers | function |
| `resolveDispatchWrapperExecutionPlan` | `(params) => ...` | 解析 dispatch wrapper 執行計畫 | function |
| `hasEnvManipulationBeforeShellWrapper` | `(argv) => boolean` | 檢查 shell wrapper 前是否有環境操作 | function |
| `extractShellWrapperInlineCommand` / `extractShellWrapperCommand` | — | 提取 shell wrapper 內嵌指令 | function |

#### `executable-path.ts`（100 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `isExecutableFile` | `(filePath) => boolean` | 判斷檔案是否可執行 | function |
| `resolveExecutableFromPathEnv` | `(params) => string \| null` | 從 PATH 解析可執行檔 | function |
| `resolveExecutablePath` | `(params) => string \| null` | 解析可執行檔路徑 | function |

#### `fetch.ts`（109 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `wrapFetchWithAbortSignal` | `(fetchImpl) => typeof fetch` | 包裝 fetch 加入 AbortSignal | function |
| `resolveFetch` | `(fetchImpl?) => typeof fetch \| undefined` | 解析 fetch 實作 | function |

#### `file-identity.ts`（25 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `FileIdentityStat` | — | 檔案身份統計 | type |
| `sameFileIdentity` | `(a, b) => boolean` | 比較兩檔案是否同一檔案 | function |

#### `file-lock.ts`（2 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `FileLockHandle` / `FileLockOptions` / `acquireFileLock` / `withFileLock` | — | 檔案鎖（re-export from plugin-sdk） | re-export |

#### `fixed-window-rate-limit.ts`（48 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `FixedWindowRateLimiter` | — | 固定窗口限流器介面 | type |
| `createFixedWindowRateLimiter` | `(params) => FixedWindowRateLimiter` | 建立固定窗口限流器 | function |

#### `fs-pinned-write-helper.ts`（230 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `PinnedWriteInput` | — | 釘定寫入輸入 | type |
| `runPinnedWriteHelper` | `(params) => Promise<...>` | 執行釘定寫入輔助程式 | function |

#### `fs-safe.ts`（859 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `SafeOpenErrorCode` / `SafeOpenError` / `SafeOpenResult` / `SafeLocalReadResult` | — | 安全檔案開啟錯誤/結果型別 | type/class |
| `openFileWithinRoot` | `(params) => Promise<...>` | 在根目錄範圍內開啟檔案 | function |
| `readFileWithinRoot` | `(params) => Promise<...>` | 在根目錄範圍內讀取檔案 | function |
| `readPathWithinRoot` | `(params) => Promise<...>` | 在根目錄範圍內讀取路徑 | function |
| `createRootScopedReadFile` | `(params) => ...` | 建立範圍限定的讀檔函式 | function |
| `readLocalFileSafely` | `(params) => Promise<SafeLocalReadResult>` | 安全讀取本地檔案 | function |
| `SafeWritableOpenResult` | — | 可寫開啟結果 | type |
| `resolveOpenedFileRealPathForHandle` | `(params) => Promise<string>` | 解析已開啟檔案真實路徑 | function |
| `openWritableFileWithinRoot` | `(params) => Promise<...>` | 在根目錄範圍內開啟可寫檔案 | function |
| `appendFileWithinRoot` / `writeFileWithinRoot` / `copyFileWithinRoot` / `writeFileFromPathWithinRoot` | — | 安全檔案寫入/複製（4 種） | function |

#### `gateway-lock.ts`（262 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `GatewayLockHandle` / `GatewayLockOptions` | — | Gateway 鎖介面 | type |
| `GatewayLockError` | `extends Error` | Gateway 鎖錯誤 | class |
| `acquireGatewayLock` | `(params) => Promise<GatewayLockHandle>` | 取得 gateway 互斥鎖 | function |

#### `gateway-process-argv.ts`（35 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `parseProcCmdline` | `(raw) => string[]` | 解析 /proc cmdline | function |
| `isGatewayArgv` | `(args, opts?) => boolean` | 判斷 argv 是否為 gateway 程序 | function |

#### `gateway-processes.ts`（162 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `readGatewayProcessArgsSync` | `(pid) => string[] \| null` | 同步讀取 gateway 程序參數 | function |
| `signalVerifiedGatewayPidSync` | `(pid, signal) => void` | 同步發送信號給已驗證 gateway PID | function |
| `findVerifiedGatewayListenerPidsOnPortSync` | `(port) => number[]` | 同步找出監聽指定 port 的 gateway PID | function |
| `formatGatewayPidList` | `(pids) => string` | 格式化 gateway PID 列表 | function |

#### `gemini-auth.ts`（40 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `parseGeminiAuth` | `(apiKey) => { headers }` | 解析 Gemini API 認證 | function |

#### `git-commit.ts`（233 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `CommitMetadataReaders` | — | commit 中繼資料讀取器 | type |
| `resolveCommitHash` | `(...) => string \| null` | 解析 commit hash | const/function |

#### `git-root.ts`（72 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `DEFAULT_GIT_DISCOVERY_MAX_DEPTH` | `12` | Git 探索最大深度 | const |
| `findGitRoot` | `(startDir, opts?) => string \| null` | 尋找 git 根目錄 | function |
| `resolveGitHeadPath` | `(params) => string` | 解析 .git/HEAD 路徑 | function |

#### `hardlink-guards.ts`（38 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `assertNoHardlinkedFinalPath` | `(params) => Promise<void>` | 斷言最終路徑無 hardlink | function |

#### `heartbeat-active-hours.ts`（99 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `isWithinActiveHours` | `(params) => boolean` | 判斷是否在活躍時段內 | function |

#### `heartbeat-events-filter.ts`（96 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `buildCronEventPrompt` | `(params) => string` | 建構 cron 事件 prompt | function |
| `buildExecEventPrompt` | `(opts?) => string` | 建構 exec 事件 prompt | function |
| `isExecCompletionEvent` | `(evt) => boolean` | 判斷是否為 exec 完成事件 | function |
| `isCronSystemEvent` | `(evt) => boolean` | 判斷是否為 cron 系統事件 | function |

#### `heartbeat-events.ts`（58 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `HeartbeatIndicatorType` | `"ok" \| "alert" \| "error"` | Heartbeat 指示燈類型 | type |
| `HeartbeatEventPayload` | — | Heartbeat 事件 payload | type |
| `resolveIndicatorType` | `(params) => HeartbeatIndicatorType` | 解析指示燈類型 | function |
| `emitHeartbeatEvent` | `(evt) => void` | 發送 heartbeat 事件 | function |
| `onHeartbeatEvent` | `(listener) => () => void` | 監聽 heartbeat 事件 | function |
| `getLastHeartbeatEvent` | `() => HeartbeatEventPayload \| null` | 取得最後一次 heartbeat 事件 | function |

#### `heartbeat-reason.ts`（57 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `HeartbeatReasonKind` | — | Heartbeat 原因種類 | type |
| `normalizeHeartbeatWakeReason` | `(reason?) => string` | 正規化喚醒原因 | function |
| `resolveHeartbeatReasonKind` | `(reason?) => HeartbeatReasonKind` | 解析原因種類 | function |
| `isHeartbeatEventDrivenReason` / `isHeartbeatActionWakeReason` | — | 原因類型判斷 | function |

#### `heartbeat-runner.ts`（1,272 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `HeartbeatDeps` | — | Heartbeat 依賴介面 | type |
| `HeartbeatSummary` / `HeartbeatRunner` | — | 摘要與執行器介面 | type |
| `isHeartbeatEnabledForAgent` | `(cfg, agentId?) => boolean` | 判斷 agent 是否啟用 heartbeat | function |
| `resolveHeartbeatSummaryForAgent` | `(params) => HeartbeatSummary` | 解析 agent heartbeat 摘要 | function |
| `resolveHeartbeatIntervalMs` | `(params) => number` | 解析 heartbeat 間隔 | function |
| `resolveHeartbeatPrompt` | `(cfg, heartbeat?) => string` | 解析 heartbeat prompt | function |
| `runHeartbeatOnce` | `(opts) => Promise<...>` | 執行一次 heartbeat | function |
| `startHeartbeatRunner` | `(opts) => HeartbeatRunner` | 啟動 heartbeat 執行器 | function |

#### `heartbeat-visibility.ts`（73 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `ResolvedHeartbeatVisibility` | — | Heartbeat 可見性解析結果 | type |
| `resolveHeartbeatVisibility` | `(params) => ResolvedHeartbeatVisibility` | 解析 heartbeat 可見性 | function |

#### `heartbeat-wake.ts`（272 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `HeartbeatRunResult` / `HeartbeatWakeHandler` | — | 喚醒結果與處理器 | type |
| `setHeartbeatsEnabled` / `areHeartbeatsEnabled` | — | 啟停 heartbeat | function |
| `setHeartbeatWakeHandler` | `(next) => () => void` | 設定喚醒處理器 | function |
| `requestHeartbeatNow` | `(opts?) => void` | 立即請求 heartbeat | function |
| `hasHeartbeatWakeHandler` / `hasPendingHeartbeatWake` / `resetHeartbeatWakeStateForTests` | — | 狀態查詢與測試 | function |

#### `home-dir.ts`（99 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `resolveEffectiveHomeDir` | `(params) => string` | 解析有效 home 目錄 | function |
| `resolveRequiredHomeDir` | `(params) => string` | 解析必要 home 目錄（失敗拋錯） | function |
| `expandHomePrefix` | `(path) => string` | 展開 ~ 前綴 | function |
| `resolveHomeRelativePath` | `(path) => string` | 解析 home 相對路徑 | function |

#### `host-env-security.ts`（156 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `HOST_DANGEROUS_ENV_*` / `HOST_SHELL_WRAPPER_ALLOWED_*` | — | 危險/允許環境變數清單（常數集合） | const |
| `normalizeEnvVarKey` | `(key) => string` | 正規化環境變數鍵名 | function |
| `isDangerousHostEnvVarName` | `(rawKey) => boolean` | 判斷是否為危險環境變數 | function |
| `isDangerousHostEnvOverrideVarName` | `(rawKey) => boolean` | 判斷是否為危險環境 override 變數 | function |
| `sanitizeHostExecEnv` | `(params?) => ...` | 清理主機執行環境 | function |
| `sanitizeSystemRunEnvOverrides` | `(params?) => ...` | 清理 system.run 環境 overrides | function |

#### `http-body.ts`（378 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `DEFAULT_WEBHOOK_MAX_BODY_BYTES` / `DEFAULT_WEBHOOK_BODY_TIMEOUT_MS` | — | Webhook body 限制常數 | const |
| `RequestBodyLimitErrorCode` / `RequestBodyLimitError` | — | body 限制錯誤型別 | type/class |
| `isRequestBodyLimitError` | `(err) => boolean` | 型別守衛 | function |
| `requestBodyErrorToText` | `(code) => string` | 錯誤碼轉文字 | function |
| `ReadRequestBodyOptions` | — | 讀取選項 | type |
| `readRequestBodyWithLimit` | `(params) => Promise<...>` | 帶限制的讀取 request body | function |
| `ReadJsonBodyResult` / `ReadJsonBodyOptions` | — | JSON body 型別 | type |
| `readJsonBodyWithLimit` | `(params) => Promise<ReadJsonBodyResult>` | 帶限制的讀取 JSON body | function |
| `RequestBodyLimitGuard` / `RequestBodyLimitGuardOptions` | — | body 限制守衛 | type |
| `installRequestBodyLimitGuard` | `(params) => RequestBodyLimitGuard` | 安裝 body 限制守衛 | function |

#### `install-flow.ts`（61 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `ExistingInstallPathResult` | — | 現有安裝路徑結果 | type |
| `resolveExistingInstallPath` | `(params) => Promise<...>` | 解析現有安裝路徑 | function |
| `withExtractedArchiveRoot` | `<T>(params) => Promise<T>` | 使用解壓根目錄執行 | function |

#### `install-from-npm-spec.ts`（38 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `installFromValidatedNpmSpecArchive` | `<T>(params) => Promise<T>` | 從已驗證 npm spec 壓縮檔安裝 | function |

#### `install-mode-options.ts`（42 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `InstallMode` | `"install" \| "update"` | 安裝模式 | type |
| `InstallModeOptions` / `TimedInstallModeOptions` | — | 安裝模式選項 | type |
| `resolveInstallModeOptions` / `resolveTimedInstallModeOptions` | — | 解析安裝模式選項 | function |

#### `install-package-dir.ts`（273 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `installPackageDir` | `(params) => Promise<...>` | 安裝套件目錄 | function |
| `installPackageDirWithManifestDeps` | `(params) => Promise<...>` | 安裝含 manifest 依賴的套件目錄 | function |

#### `install-safe-path.ts`（104 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `unscopedPackageName` | `(name) => string` | 去除 scope 的套件名 | function |
| `safeDirName` | `(input) => string` | 安全目錄名 | function |
| `safePathSegmentHashed` | `(input) => string` | 雜湊安全路徑段 | function |
| `resolveSafeInstallDir` | `(params) => string` | 解析安全安裝目錄 | function |
| `assertCanonicalPathWithinBase` | `(params) => Promise<void>` | 斷言正規路徑在基礎目錄內 | function |

#### `install-source-utils.ts`（264 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `NpmSpecResolution` / `NpmResolutionFields` | — | npm spec 解析型別 | type |
| `buildNpmResolutionFields` | `(resolution?) => NpmResolutionFields` | 建構 npm 解析欄位 | function |
| `NpmIntegrityDrift` | — | npm integrity 漂移 | type |
| `withTempDir` | `<T>(fn) => Promise<T>` | 使用臨時目錄執行 | function |
| `resolveArchiveSourcePath` | `(archivePath) => Promise<...>` | 解析壓縮檔來源路徑 | function |
| `packNpmSpecToArchive` | `(params) => Promise<...>` | 打包 npm spec 為壓縮檔 | function |

#### `install-target.ts`（41 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `resolveCanonicalInstallTarget` | `(params) => Promise<...>` | 解析正規安裝目標 | function |
| `ensureInstallTargetAvailable` | `(params) => Promise<...>` | 確保安裝目標可用 | function |

#### `is-main.ts`（72 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `isMainModule` | `(params) => boolean` | 判斷是否為主模組 | function |

#### `json-file.ts`（23 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `loadJsonFile` | `(pathname) => unknown` | 同步載入 JSON 檔 | function |
| `saveJsonFile` | `(pathname, data) => void` | 同步儲存 JSON 檔 | function |

#### `json-files.ts`（74 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `readJsonFile` | `<T>(filePath) => Promise<T \| null>` | 非同步讀取 JSON 檔 | function |
| `writeJsonAtomic` | `(filePath, data) => Promise<void>` | 原子寫入 JSON 檔 | function |
| `writeTextAtomic` | `(filePath, text) => Promise<void>` | 原子寫入文字檔 | function |
| `createAsyncLock` | `() => ...` | 建立非同步鎖 | function |

#### `json-utf8-bytes.ts`（7 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `jsonUtf8Bytes` | `(value) => number` | 計算 JSON UTF-8 位元組數 | function |

#### `jsonl-socket.ts`（59 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `requestJsonlSocket` | `<T>(params) => Promise<T>` | 透過 JSONL socket 發送請求 | function |

#### `machine-name.ts`（48 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `getMachineDisplayName` | `() => Promise<string>` | 取得機器顯示名稱 | function |

#### `map-size.ts`（15 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `pruneMapToMaxSize` | `<K, V>(map, maxSize) => void` | 修剪 Map 到最大容量 | function |

#### `node-commands.ts`（13 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `NODE_SYSTEM_RUN_COMMANDS` / `NODE_SYSTEM_NOTIFY_COMMAND` / `NODE_BROWSER_PROXY_COMMAND` / `NODE_EXEC_APPROVALS_COMMANDS` | — | Node 系統指令常數 | const |

#### `node-pairing.ts`（273 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `NodePairingPendingRequest` / `NodePairingPairedNode` / `NodePairingList` | — | Node 配對型別 | type |
| `listNodePairing` | `(baseDir?) => Promise<NodePairingList>` | 列出 node 配對 | function |
| `getPairedNode` / `requestNodePairing` / `approveNodePairing` / `rejectNodePairing` | — | Node 配對 CRUD | function |
| `verifyNodeToken` | `(params) => Promise<...>` | 驗證 node token | function |
| `updatePairedNodeMetadata` / `renamePairedNode` | — | 更新 node 中繼資料 | function |

#### `node-shell.ts`（9 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `buildNodeShellCommand` | `(command, platform?) => ...` | 建構跨平台 shell 指令 | function |

#### `npm-integrity.ts`（93 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `NpmIntegrityDriftPayload` / `ResolveNpmIntegrityDriftResult` | — | npm integrity 漂移型別 | type |
| `resolveNpmIntegrityDrift` | `<T>(params) => Promise<...>` | 解析 npm integrity 漂移 | function |
| `resolveNpmIntegrityDriftWithDefaultMessage` | `(params) => Promise<...>` | 帶預設訊息版本 | function |

#### `npm-pack-install.ts`（163 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `NpmSpecArchiveInstallFlowResult` / `NpmSpecArchiveFinalInstallResult` | — | npm 壓縮檔安裝結果型別 | type |
| `installFromNpmSpecArchiveWithInstaller` | `<T>(params) => Promise<...>` | 帶自訂安裝器的 npm 壓縮檔安裝 | function |
| `finalizeNpmSpecArchiveInstall` | `<T>(params) => ...` | 完成 npm 壓縮檔安裝 | function |
| `installFromNpmSpecArchive` | `<T>(params) => Promise<...>` | npm 壓縮檔安裝主函式 | function |

#### `npm-registry-spec.ts`（141 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `ParsedRegistryNpmSpec` | — | 解析後的 npm registry spec | type |
| `parseRegistryNpmSpec` | `(rawSpec) => ParsedRegistryNpmSpec \| null` | 解析 npm registry spec | function |
| `validateRegistryNpmSpec` | `(rawSpec) => string \| null` | 驗證 spec（回傳錯誤訊息） | function |
| `isExactSemverVersion` / `isPrereleaseSemverVersion` / `isPrereleaseResolutionAllowed` / `formatPrereleaseResolutionError` | — | semver 輔助函式 | function |

#### `openclaw-exec-env.ts`（16 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `OPENCLAW_CLI_ENV_VAR` / `OPENCLAW_CLI_ENV_VALUE` | — | OpenClaw CLI 環境變數常數 | const |
| `markOpenClawExecEnv` | `<T>(env) => T` | 標記 OpenClaw 執行環境 | function |
| `ensureOpenClawExecMarkerOnProcess` | `() => void` | 確保 process 上有 OpenClaw 標記 | function |

#### `openclaw-root.ts`（134 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `resolveOpenClawPackageRoot` | `(opts) => Promise<string>` | 非同步解析 OpenClaw 套件根目錄 | function |
| `resolveOpenClawPackageRootSync` | `(opts) => string` | 同步解析 OpenClaw 套件根目錄 | function |

#### `os-summary.ts`（35 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `OsSummary` | — | 作業系統摘要 | type |
| `resolveOsSummary` | `() => OsSummary` | 取得作業系統摘要 | function |

#### `package-json.ts`（24 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `readPackageVersion` | `(root) => Promise<string \| null>` | 讀取套件版本 | function |
| `readPackageName` | `(root) => Promise<string \| null>` | 讀取套件名稱 | function |

#### `package-tag.ts`（22 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `normalizePackageTagInput` | `(params) => ...` | 正規化套件標籤輸入 | function |

#### `pairing-files.ts`（50 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `resolvePairingPaths` | `(baseDir, subdir) => ...` | 解析配對檔案路徑 | function |
| `pruneExpiredPending` | `<T>(items) => T[]` | 清除過期的待決請求 | function |
| `PendingPairingRequestResult` | — | 待決配對請求結果 | type |
| `upsertPendingPairingRequest` | `<T>(params) => Promise<...>` | 新增/更新待決配對請求 | function |

#### `pairing-pending.ts`（27 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `rejectPendingPairingRequest` | `<T>(params) => Promise<...>` | 拒絕待決配對請求 | function |

#### `pairing-token.ts`（15 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `PAIRING_TOKEN_BYTES` | `32` | 配對 token 位元組數 | const |
| `generatePairingToken` | `() => string` | 產生配對 token | function |
| `verifyPairingToken` | `(provided, expected) => boolean` | 驗證配對 token | function |

#### `parse-finite-number.ts`（42 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `parseFiniteNumber` / `parseStrictInteger` / `parseStrictPositiveInteger` / `parseStrictNonNegativeInteger` | `(value) => number \| undefined` | 安全數字解析（4 種嚴謹度） | function |

#### `path-alias-guards.ts`（34 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `PathAliasPolicy` / `PATH_ALIAS_POLICIES` | — | 路徑別名策略（re-export） | type/const |
| `assertNoPathAliasEscape` | `(params) => Promise<void>` | 斷言無路徑別名逃逸 | function |

#### `path-env.ts`（128 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `ensureOpenClawCliOnPath` | `(opts?) => void` | 確保 OpenClaw CLI 在 PATH 上 | function |

#### `path-guards.ts`（47 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `normalizeWindowsPathForComparison` | `(input) => string` | 正規化 Windows 路徑供比較 | function |
| `isNodeError` / `hasNodeErrorCode` | — | Node 錯誤型別守衛 | function |
| `isNotFoundPathError` / `isSymlinkOpenError` | — | 特定路徑錯誤判斷 | function |
| `isPathInside` | `(root, target) => boolean` | 判斷目標路徑是否在根目錄內 | function |

#### `path-prepend.ts`（79 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `findPathKey` | `(env) => string` | 尋找 PATH 環境變數鍵名 | function |
| `normalizePathPrepend` | `(entries?) => string[]` | 正規化 PATH 前置項 | function |
| `mergePathPrepend` | `(existing, prepend) => string` | 合併 PATH 前置項 | function |
| `applyPathPrepend` | `(params) => void` | 套用 PATH 前置項 | function |

#### `path-safety.ts`（11 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `resolveSafeBaseDir` | `(rootDir) => string` | 解析安全基礎目錄 | function |
| `isWithinDir` | `(rootDir, targetPath) => boolean` | 判斷路徑是否在目錄內 | function |

#### `plain-object.ts`（11 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `isPlainObject` | `(value) => value is Record<string, unknown>` | 型別守衛：plain object | function |

#### `plugin-install-path-warnings.ts`（73 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `PluginInstallPathIssue` | — | 插件安裝路徑問題 | type |
| `detectPluginInstallPathIssue` | `(params) => Promise<...>` | 偵測插件安裝路徑問題 | function |
| `formatPluginInstallPathIssue` | `(params) => string` | 格式化問題訊息 | function |

#### `ports-format.ts`（69 行）· `ports-inspect.ts`（368 行）· `ports-lsof.ts`（37 行）· `ports-probe.ts`（24 行）· `ports-types.ts`（21 行）· `ports.ts`（90 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `PortListener` / `PortUsageStatus` / `PortUsage` / `PortListenerKind` | — | Port 使用型別 | type |
| `classifyPortListener` | `(listener, port) => PortListenerKind` | 分類 port 監聽器 | function |
| `buildPortHints` | `(listeners, port) => string[]` | 建構 port 提示 | function |
| `formatPortListener` / `formatPortDiagnostics` | — | Port 格式化 | function |
| `inspectPortUsage` | `(port) => Promise<PortUsage>` | 檢查 port 使用狀況 | function |
| `resolveLsofCommand` / `resolveLsofCommandSync` | — | 解析 lsof 指令路徑 | function |
| `tryListenOnPort` | `(params) => Promise<...>` | 嘗試監聽 port | function |
| `describePortOwner` | `(port) => Promise<string \| undefined>` | 描述 port 擁有者 | function |
| `ensurePortAvailable` | `(port) => Promise<void>` | 確保 port 可用 | function |
| `handlePortError` | `(params) => Promise<...>` | 處理 port 錯誤 | function |

#### `process-respawn.ts`（86 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `GatewayRespawnResult` | — | Gateway 重生結果 | type |
| `restartGatewayProcessWithFreshPid` | `() => GatewayRespawnResult` | 以新 PID 重啟 gateway 程序 | function |

#### `prototype-keys.ts`（5 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `isBlockedObjectKey` | `(key) => boolean` | 判斷是否為被封鎖的 prototype key | function |

#### `provider-usage.*.ts`（provider-usage 系列，共 13 檔，~2,413 行）

**型別檔** (`provider-usage.types.ts`, 158 行)：
`UsageWindow` / `ProviderUsageSnapshot` / `UsageSummary` / `UsageProviderId` 等 ~16 型別。

**認證** (`provider-usage.auth.ts`, 273 行)：
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `ProviderAuth` | — | Provider 認證資料 | type |
| `resolveProviderAuths` | `(params) => Promise<ProviderAuth[]>` | 解析所有 provider 認證 | function |

**Fetch 系列** (`provider-usage.fetch.*.ts`)：各 provider 用量抓取，模式相同。
| Export | Provider | 說明 |
|--------|----------|------|
| `fetchClaudeUsage` | Claude | 抓取 Claude 用量 |
| `fetchCodexUsage` | Codex | 抓取 Codex 用量 |
| `fetchCopilotUsage` | Copilot | 抓取 Copilot 用量 |
| `fetchGeminiUsage` | Gemini | 抓取 Gemini 用量 |
| `fetchMinimaxUsage` | MiniMax | 抓取 MiniMax 用量 |
| `fetchZaiUsage` | ZAI | 抓取 ZAI 用量 |

**共用** (`provider-usage.fetch.shared.ts`, 52 行)：`fetchJson` / `parseFiniteNumber` / `buildUsageErrorSnapshot` / `buildUsageHttpErrorSnapshot`

**格式化** (`provider-usage.format.ts`, 114 行)：`formatUsageWindowSummary` / `formatUsageSummaryLine` / `formatUsageReportLines`

**載入** (`provider-usage.load.ts`, 105 行)：`loadProviderUsageSummary`

**共用常數** (`provider-usage.shared.ts`, 61 行)：`DEFAULT_TIMEOUT_MS` / `PROVIDER_LABELS` / `usageProviders` / `resolveUsageProviderId` / `clampPercent` / `withTimeout`

**聚合** (`provider-usage.ts`, 13 行)：re-export 所有 fetch + load + shared

#### `push-apns.relay.ts`（254 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `ApnsRelayPushType` / `ApnsRelayConfig` / `ApnsRelayConfigResolution` / `ApnsRelayPushResponse` / `ApnsRelayRequestSender` | — | APNS Relay 型別 | type |
| `resolveApnsRelayConfigFromEnv` | `(params) => ApnsRelayConfigResolution` | 從環境解析 APNS relay 設定 | function |
| `sendApnsRelayPush` | `(params) => Promise<...>` | 透過 relay 發送 APNS 推播 | function |

#### `push-apns.ts`（1,009 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `ApnsEnvironment` / `ApnsTransport` / `ApnsRegistration` / `ApnsAuthConfig` 等 | — | APNS 核心型別（~10 種） | type |
| `normalizeApnsEnvironment` | `(value) => ApnsEnvironment \| null` | 正規化 APNS 環境 | function |
| `registerApnsRegistration` / `registerApnsToken` | — | 註冊 APNS token | function |
| `loadApnsRegistration` / `clearApnsRegistration` / `clearApnsRegistrationIfCurrent` | — | APNS 註冊 CRUD | function |
| `shouldInvalidateApnsRegistration` / `shouldClearStoredApnsRegistration` | — | 判斷是否需清除/失效 | function |
| `resolveApnsAuthConfigFromEnv` | `(params) => Promise<...>` | 從環境解析 APNS 認證 | function |
| `sendApnsAlert` | `(params) => Promise<ApnsPushAlertResult>` | 發送 APNS alert 推播 | function |
| `sendApnsBackgroundWake` | `(params) => Promise<ApnsPushWakeResult>` | 發送 APNS 背景喚醒 | function |

#### `restart-sentinel.ts`（146 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `RestartSentinelLog` / `RestartSentinelStep` / `RestartSentinelStats` / `RestartSentinelPayload` / `RestartSentinel` | — | 重啟哨兵型別 | type |
| `formatDoctorNonInteractiveHint` | `(params) => string` | 格式化 doctor 非互動提示 | function |
| `resolveRestartSentinelPath` | `(env?) => string` | 解析哨兵路徑 | function |
| `writeRestartSentinel` / `readRestartSentinel` / `consumeRestartSentinel` | — | 哨兵讀寫消費 | function |
| `formatRestartSentinelMessage` / `summarizeRestartSentinel` | — | 格式化哨兵訊息 | function |
| `trimLogTail` | `(input?, maxChars?) => string` | 修剪 log 尾部 | function |

#### `restart-stale-pids.ts`（291 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `findGatewayPidsOnPortSync` | `(params) => number[]` | 同步找出 port 上的 gateway PID | function |
| `cleanStaleGatewayProcessesSync` | `(portOverride?) => number[]` | 同步清理過時 gateway 程序 | function |

#### `restart.ts`（506 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `RestartAttempt` / `RestartAuditInfo` | — | 重啟嘗試與審計型別 | type |
| `setPreRestartDeferralCheck` | `(fn) => void` | 設定重啟前延遲檢查 | function |
| `emitGatewayRestart` | `() => boolean` | 發出 gateway 重啟信號 | function |
| `setGatewaySigusr1RestartPolicy` / `isGatewaySigusr1RestartExternallyAllowed` / `consumeGatewaySigusr1RestartAuthorization` / `markGatewaySigusr1RestartHandled` | — | SIGUSR1 重啟策略管理 | function |
| `RestartDeferralHooks` | — | 重啟延遲 hooks | type |
| `deferGatewayRestartUntilIdle` | `(opts) => ...` | 延遲 gateway 重啟至閒置 | function |
| `triggerOpenClawRestart` | `() => RestartAttempt` | 觸發 OpenClaw 重啟 | function |
| `ScheduledRestart` | — | 排程重啟型別 | type |
| `scheduleGatewaySigusr1Restart` | `(opts?) => ScheduledRestart` | 排程 SIGUSR1 重啟 | function |

#### `retry-policy.ts`（122 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `RetryRunner` | `<T>(fn, label?) => Promise<T>` | 重試執行器型別 | type |
| `DISCORD_RETRY_DEFAULTS` / `TELEGRAM_RETRY_DEFAULTS` | — | Discord / Telegram 重試預設值 | const |
| `createDiscordRetryRunner` / `createTelegramRetryRunner` | — | 建立 channel 專用重試執行器 | function |

#### `retry.ts`（136 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `RetryConfig` / `RetryInfo` / `RetryOptions` | — | 重試設定型別 | type |
| `resolveRetryConfig` | `(params) => RetryConfig` | 解析重試設定 | function |
| `retryAsync` | `<T>(params) => Promise<T>` | 通用非同步重試 | function |

#### `runtime-guard.ts`（99 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `RuntimeKind` / `RuntimeDetails` | — | 執行時環境型別 | type |
| `parseSemver` | `(version) => Semver \| null` | 解析 semver 版本 | function |
| `isAtLeast` | `(version, minimum) => boolean` | 版本比較 | function |
| `detectRuntime` | `() => RuntimeDetails` | 偵測執行時環境 | function |
| `runtimeSatisfies` / `isSupportedNodeVersion` | — | 執行時版本檢查 | function |
| `assertSupportedRuntime` | `(params) => void` | 斷言支援的執行時 | function |

#### `runtime-status.ts`（30 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `formatRuntimeStatusWithDetails` | `(params) => string` | 格式化執行時狀態（含細節） | function |

#### `safe-open-sync.ts`（101 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `SafeOpenSyncFailureReason` / `SafeOpenSyncResult` / `SafeOpenSyncAllowedType` | — | 同步安全開啟型別 | type |
| `sameFileIdentity` | `(left, right) => boolean` | 比較檔案身份 | function |
| `openVerifiedFileSync` | `(params) => SafeOpenSyncResult` | 同步開啟已驗證檔案 | function |

#### `scp-host.ts`（86 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `normalizeScpRemoteHost` / `isSafeScpRemoteHost` | — | SCP 遠端主機正規化與安全檢查 | function |
| `normalizeScpRemotePath` / `isSafeScpRemotePath` | — | SCP 遠端路徑正規化與安全檢查 | function |

#### `secret-file.ts`（133 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `DEFAULT_SECRET_FILE_MAX_BYTES` | `16384` | 秘密檔案最大位元組 | const |
| `SecretFileReadOptions` / `SecretFileReadResult` | — | 秘密檔案讀取型別 | type |
| `loadSecretFileSync` | `(params) => SecretFileReadResult` | 同步載入秘密檔案 | function |
| `readSecretFileSync` | `(params) => string` | 同步讀取秘密檔案（拋錯版） | function |
| `tryReadSecretFileSync` | `(params) => string \| null` | 同步嘗試讀取秘密檔案 | function |

#### `secure-random.ts`（9 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `generateSecureUuid` | `() => string` | 產生安全 UUID | function |
| `generateSecureToken` | `(bytes?) => string` | 產生安全 token | function |

#### `session-cost-usage.ts`（1,016 行）+ `session-cost-usage.types.ts`（158 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `CostBreakdown` / `ParsedUsageEntry` / `ParsedTranscriptEntry` / `CostUsageTotals` / `CostUsageSummary` 等 | — | 費用/用量型別家族（~20 型別） | type |
| `loadCostUsageSummary` | `(params?) => Promise<CostUsageSummary>` | 載入費用用量摘要 | function |
| `discoverAllSessions` | `(params?) => Promise<DiscoveredSession[]>` | 探索所有 session | function |
| `loadSessionCostSummary` | `(params) => Promise<SessionCostSummary>` | 載入 session 費用摘要 | function |
| `loadSessionUsageTimeSeries` | `(params) => Promise<...>` | 載入 session 用量時間序列 | function |
| `loadSessionLogs` | `(params) => Promise<...>` | 載入 session 日誌 | function |

#### `session-maintenance-warning.ts`（122 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `deliverSessionMaintenanceWarning` | `(params) => Promise<void>` | 發送 session 維護警告 | function |

#### `shell-env.ts`（248 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `ShellEnvFallbackResult` / `ShellEnvFallbackOptions` | — | Shell 環境 fallback 型別 | type |
| `loadShellEnvFallback` | `(opts) => ShellEnvFallbackResult` | 載入 shell 環境 fallback | function |
| `shouldEnableShellEnvFallback` / `shouldDeferShellEnvFallback` | — | 判斷是否啟用/延遲 fallback | function |
| `resolveShellEnvFallbackTimeoutMs` | `(env) => number` | 解析 fallback 逾時 | function |
| `getShellPathFromLoginShell` | `(opts) => string \| null` | 從 login shell 取得 PATH | function |
| `resetShellPathCacheForTests` / `getShellEnvAppliedKeys` | — | 測試/除錯輔助 | function |

#### `shell-inline-command.ts`（44 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `POSIX_INLINE_COMMAND_FLAGS` / `POWERSHELL_INLINE_COMMAND_FLAGS` | — | 內嵌指令旗標集合 | const |
| `resolveInlineCommandMatch` | `(params) => ...` | 解析內嵌指令比對 | function |

#### `skills-remote.ts`（351 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `setSkillsRemoteRegistry` | `(registry) => void` | 設定遠端技能 registry | function |
| `primeRemoteSkillsCache` | `() => Promise<void>` | 預載遠端技能快取 | function |
| `recordRemoteNodeInfo` / `recordRemoteNodeBins` / `removeRemoteNodeInfo` | — | 記錄/移除遠端 node 資訊 | function |
| `refreshRemoteNodeBins` | `(params) => Promise<...>` | 刷新遠端 node 二進位 | function |
| `getRemoteSkillEligibility` | `() => ... \| undefined` | 取得遠端技能資格 | function |
| `refreshRemoteBinsForConnectedNodes` | `(cfg) => Promise<void>` | 刷新所有已連線 node 的二進位 | function |

#### `ssh-config.ts`（105 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `SshResolvedConfig` | — | SSH 解析設定 | type |
| `parseSshConfigOutput` | `(output) => SshResolvedConfig` | 解析 ssh 設定輸出 | function |
| `resolveSshConfig` | `(params) => Promise<SshResolvedConfig>` | 解析 SSH 設定 | function |

#### `ssh-tunnel.ts`（210 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `SshParsedTarget` / `SshTunnel` | — | SSH 目標/隧道型別 | type |
| `parseSshTarget` | `(raw) => SshParsedTarget \| null` | 解析 SSH 目標 | function |
| `startSshPortForward` | `(opts) => Promise<SshTunnel>` | 啟動 SSH port forwarding | function |

#### `stable-node-path.ts`（43 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `resolveStableNodePath` | `(nodePath) => Promise<string>` | 解析穩定的 Node 路徑 | function |

#### `state-migrations.fs.ts`（61 行）+ `state-migrations.ts`（1,052 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `SessionEntryLike` | — | session 條目型別 | type |
| `safeReadDir` / `existsDir` / `ensureDir` / `fileExists` | — | 安全檔案系統輔助（4 種） | function |
| `isLegacyWhatsAppAuthFile` | `(name) => boolean` | 判斷舊版 WhatsApp auth 檔 | function |
| `readSessionStoreJson5` | `(storePath) => ...` | 讀取 session store JSON5 | function |
| `LegacyStateDetection` | — | 舊版狀態偵測結果 | type |
| `autoMigrateLegacyStateDir` | `(params) => Promise<...>` | 自動遷移舊版狀態目錄 | function |
| `detectLegacyStateMigrations` | `(params) => Promise<...>` | 偵測需要的舊版遷移 | function |
| `migrateLegacyAgentDir` | `(params) => Promise<...>` | 遷移舊版 agent 目錄 | function |
| `runLegacyStateMigrations` | `(params) => Promise<...>` | 執行舊版狀態遷移 | function |
| `autoMigrateLegacyAgentDir` / `autoMigrateLegacyState` | — | 自動遷移入口 | function |

#### `supervisor-markers.ts`（43 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `SUPERVISOR_HINT_ENV_VARS` | — | 管理程式提示環境變數 | const |
| `RespawnSupervisor` | `"launchd" \| "systemd" \| "schtasks"` | 重生管理程式型別 | type |
| `detectRespawnSupervisor` | `(params) => RespawnSupervisor \| null` | 偵測重生管理程式 | function |

#### `system-events.ts`（119 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `SystemEvent` | `{ text, ts, contextKey? }` | 系統事件 | type |
| `isSystemEventContextChanged` | `(params) => boolean` | 判斷系統事件上下文是否變更 | function |
| `enqueueSystemEvent` | `(text, options) => void` | 排入系統事件 | function |
| `drainSystemEventEntries` / `drainSystemEvents` | — | 排空系統事件 | function |
| `peekSystemEventEntries` / `peekSystemEvents` | — | 窺視系統事件 | function |
| `hasSystemEvents` | `(sessionKey) => boolean` | 檢查是否有系統事件 | function |
| `resetSystemEventsForTest` | `() => void` | 測試用重置 | function |

#### `system-message.ts`（20 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `SYSTEM_MARK` | — | 系統訊息標記 | const |
| `hasSystemMark` | `(text) => boolean` | 檢查是否有系統標記 | function |
| `prefixSystemMessage` | `(text) => string` | 加上系統訊息前綴 | function |

#### `system-presence.ts`（289 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `SystemPresence` / `SystemPresenceUpdate` | — | 系統在線狀態型別 | type |
| `updateSystemPresence` | `(payload) => SystemPresenceUpdate` | 更新系統在線狀態 | function |
| `upsertPresence` | `(key, presence) => void` | 新增/更新在線狀態 | function |
| `listSystemPresence` | `() => SystemPresence[]` | 列出所有系統在線狀態 | function |

#### `system-run-approval-binding.ts`（239 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `normalizeSystemRunApprovalPlan` | `(value) => SystemRunApprovalPlan \| null` | 正規化 system.run 核准計畫 | function |
| `buildSystemRunApprovalEnvBinding` / `buildSystemRunApprovalBinding` | — | 建構核准環境/綁定 | function |
| `SystemRunApprovalMatchResult` | — | 核准比對結果 | type |
| `matchSystemRunApprovalEnvHash` / `matchSystemRunApprovalBinding` | — | 核准比對 | function |
| `missingSystemRunApprovalBinding` / `toSystemRunApprovalMismatchError` | — | 錯誤建構 | function |

#### `system-run-approval-context.ts`（152 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `parsePreparedSystemRunPayload` | `(payload) => PreparedRunPayload \| null` | 解析準備好的 system.run payload | function |
| `resolveSystemRunApprovalRequestContext` | `(params) => ...` | 解析核准請求上下文 | function |
| `resolveSystemRunApprovalRuntimeContext` | `(params) => ...` | 解析核准執行時上下文 | function |

#### `system-run-command.ts`（227 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `SystemRunCommandValidation` / `ResolvedSystemRunCommand` | — | 系統執行指令型別 | type |
| `formatExecCommand` | `(argv) => string` | 格式化 exec 指令 | function |
| `extractShellCommandFromArgv` | `(argv) => string \| null` | 從 argv 提取 shell 指令 | function |
| `validateSystemRunCommandConsistency` | `(params) => SystemRunCommandValidation` | 驗證指令一致性 | function |
| `resolveSystemRunCommand` / `resolveSystemRunCommandRequest` | — | 解析 system.run 指令 | function |

#### `system-run-normalize.ts`（13 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `normalizeNonEmptyString` | `(value) => string \| null` | 正規化非空字串 | function |
| `normalizeStringArray` | `(value) => string[]` | 正規化字串陣列 | function |

#### `tailnet.ts`（59 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `TailnetAddresses` | — | Tailnet 地址型別 | type |
| `isTailnetIPv4` | `(address) => boolean` | 判斷 Tailnet IPv4 | function |
| `listTailnetAddresses` | `() => TailnetAddresses` | 列出 Tailnet 地址 | function |
| `pickPrimaryTailnetIPv4` / `pickPrimaryTailnetIPv6` | — | 選取主要 Tailnet IP | function |

#### `tailscale.ts`（500 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `findTailscaleBinary` | `() => Promise<string \| null>` | 尋找 Tailscale 二進位 | function |
| `getTailnetHostname` | `(exec?, detectedBinary?) => Promise<string>` | 取得 Tailnet 主機名 | function |
| `getTailscaleBinary` | `() => Promise<string>` | 取得 Tailscale 二進位（必要版） | function |
| `readTailscaleStatusJson` | `(params) => Promise<...>` | 讀取 Tailscale 狀態 JSON | function |
| `ensureGoInstalled` / `ensureTailscaledInstalled` | — | 確保依賴已安裝 | function |
| `TailscaleWhoisIdentity` | — | Tailscale whois 身份 | type |
| `ensureFunnel` | `(params) => Promise<...>` | 確保 Tailscale Funnel | function |
| `enableTailscaleServe` / `disableTailscaleServe` / `enableTailscaleFunnel` / `disableTailscaleFunnel` | — | Tailscale serve/funnel 管理 | function |
| `readTailscaleWhoisIdentity` | `(params) => Promise<...>` | 讀取 Tailscale whois 身份 | function |

#### `tmp-openclaw-dir.ts`（169 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `POSIX_OPENCLAW_TMP_DIR` | `"/tmp/openclaw"` | POSIX 臨時目錄 | const |
| `resolvePreferredOpenClawTmpDir` | `(params) => string` | 解析偏好的 OpenClaw 臨時目錄 | function |

#### `transport-ready.ts`（67 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `TransportReadyResult` / `WaitForTransportReadyParams` | — | 傳輸就緒型別 | type |
| `waitForTransportReady` | `(params) => Promise<void>` | 等待傳輸層就緒 | function |

#### `unhandled-rejections.ts`（257 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `isAbortError` | `(err) => boolean` | 判斷是否為 abort 錯誤 | function |
| `isTransientNetworkError` | `(err) => boolean` | 判斷是否為暫態網路錯誤 | function |
| `registerUnhandledRejectionHandler` | `(handler) => () => void` | 註冊未處理 rejection handler | function |
| `isUnhandledRejectionHandled` | `(reason) => boolean` | 判斷 rejection 是否已處理 | function |
| `installUnhandledRejectionHandler` | `() => void` | 安裝全域 rejection handler | function |

#### `update-channels.ts`（109 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `UpdateChannel` / `UpdateChannelSource` | — | 更新頻道型別 | type |
| `DEFAULT_PACKAGE_CHANNEL` / `DEFAULT_GIT_CHANNEL` / `DEV_BRANCH` | — | 預設頻道常數 | const |
| `normalizeUpdateChannel` | `(value?) => UpdateChannel \| null` | 正規化更新頻道 | function |
| `channelToNpmTag` | `(channel) => string` | 頻道轉 npm tag | function |
| `isBetaTag` / `isStableTag` | — | tag 判斷 | function |
| `resolveEffectiveUpdateChannel` / `formatUpdateChannelLabel` / `resolveUpdateChannelDisplay` | — | 解析/格式化更新頻道 | function |

#### `update-check.ts`（489 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `PackageManager` / `GitUpdateStatus` / `DepsStatus` / `RegistryStatus` / `NpmTagStatus` / `UpdateCheckResult` | — | 更新檢查型別（6 種） | type |
| `formatGitInstallLabel` | `(update) => string \| null` | 格式化 git 安裝標籤 | function |
| `checkGitUpdateStatus` | `(params) => Promise<GitUpdateStatus>` | 檢查 git 更新狀態 | function |
| `checkDepsStatus` | `(params) => Promise<DepsStatus>` | 檢查依賴狀態 | function |
| `fetchNpmLatestVersion` / `fetchNpmTagVersion` / `resolveNpmChannelTag` | — | npm 版本查詢 | function |
| `compareSemverStrings` | `(a, b) => number \| null` | semver 字串比較 | function |
| `checkUpdateStatus` | `(params) => Promise<UpdateCheckResult>` | 綜合更新狀態檢查 | function |

#### `update-global.ts`（259 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `GlobalInstallManager` | `"npm" \| "pnpm" \| "bun"` | 全域安裝管理器 | type |
| `CommandRunner` | — | 指令執行器型別 | type |
| `resolveGlobalInstallSpec` | `(params) => string` | 解析全域安裝 spec | function |
| `createGlobalInstallEnv` | `(params) => Promise<...>` | 建立全域安裝環境 | function |
| `resolveGlobalRoot` / `resolveGlobalPackageRoot` | — | 解析全域根目錄 | function |
| `detectGlobalInstallManagerForRoot` / `detectGlobalInstallManagerByPresence` | — | 偵測全域安裝管理器 | function |
| `globalInstallArgs` / `globalInstallFallbackArgs` | — | 全域安裝參數 | function |
| `cleanupGlobalRenameDirs` | `(params) => Promise<...>` | 清理全域重命名目錄 | function |

#### `update-runner.ts`（938 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `UpdateStepResult` / `UpdateRunResult` / `UpdateStepInfo` / `UpdateStepCompletion` / `UpdateStepProgress` | — | 更新步驟型別（5 種） | type |
| `runGatewayUpdate` | `(opts?) => Promise<UpdateRunResult>` | 執行 gateway 更新 | function |

#### `update-startup.ts`（526 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `UpdateAvailable` | — | 可用更新資訊 | type |
| `getUpdateAvailable` | `() => UpdateAvailable \| null` | 取得可用更新 | function |
| `resetUpdateAvailableStateForTest` | `() => void` | 測試用重置 | function |
| `runGatewayUpdateCheck` | `(params) => Promise<...>` | 執行 gateway 更新檢查 | function |
| `scheduleGatewayUpdateCheck` | `(params) => ...` | 排程 gateway 更新檢查 | function |

#### `voicewake.ts`（59 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `VoiceWakeConfig` | — | 語音喚醒設定 | type |
| `defaultVoiceWakeTriggers` | `() => string[]` | 預設語音喚醒觸發詞 | function |
| `loadVoiceWakeConfig` | `(baseDir?) => Promise<VoiceWakeConfig>` | 載入語音喚醒設定 | function |
| `setVoiceWakeTriggers` | `(params) => Promise<...>` | 設定語音喚醒觸發詞 | function |

#### `warning-filter.ts`（85 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `ProcessWarning` | — | 程序警告型別 | type |
| `shouldIgnoreWarning` | `(warning) => boolean` | 判斷是否忽略警告 | function |
| `installProcessWarningFilter` | `() => void` | 安裝程序警告過濾器 | function |

#### `widearea-dns.ts`（199 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `normalizeWideAreaDomain` | `(raw?) => string \| null` | 正規化廣域 DNS 域名 | function |
| `resolveWideAreaDiscoveryDomain` | `(params?) => string` | 解析廣域探索域名 | function |
| `getWideAreaZonePath` | `(domain) => string` | 取得廣域 zone 路徑 | function |
| `WideAreaGatewayZoneOpts` | — | 廣域 gateway zone 選項 | type |
| `renderWideAreaGatewayZoneText` | `(params) => string` | 渲染 zone 文字 | function |
| `writeWideAreaGatewayZone` | `(params) => Promise<void>` | 寫入廣域 gateway zone | function |

#### `windows-task-restart.ts`（72 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `relaunchGatewayScheduledTask` | `(env?) => RestartAttempt` | 透過排程工作重啟 gateway（Windows） | function |

#### `ws.ts`（21 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `rawDataToString` | `(data) => string` | WebSocket raw data 轉字串 | function |

#### `wsl.ts`（71 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `resetWSLStateForTests` | `() => void` | 測試用重置 WSL 狀態 | function |
| `isWSLEnv` | `() => boolean` | 從環境變數判斷 WSL | function |
| `isWSLSync` / `isWSL2Sync` | `() => boolean` | 同步判斷 WSL / WSL2 | function |
| `isWSL` | `() => Promise<boolean>` | 非同步判斷 WSL | function |

---

### format-time/

#### `format-datetime.ts`（98 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `resolveTimezone` | `(value) => string \| undefined` | 解析時區字串 | function |
| `FormatTimestampOptions` / `FormatZonedTimestampOptions` | — | 格式化選項 | type |
| `formatUtcTimestamp` | `(date, options?) => string` | 格式化 UTC 時間戳 | function |
| `formatZonedTimestamp` | `(params) => string` | 格式化帶時區時間戳 | function |

#### `format-duration.ts`（103 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `FormatDurationSecondsOptions` / `FormatDurationCompactOptions` | — | 格式化選項 | type |
| `formatDurationSeconds` | `(params) => string` | 格式化秒數 | function |
| `formatDurationPrecise` | `(params) => string` | 精確格式化時長 | function |
| `formatDurationCompact` | `(params) => string` | 緊湊格式化時長 | function |
| `formatDurationHuman` | `(ms?, fallback?) => string` | 人類可讀時長 | function |

#### `format-relative.ts`（112 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `FormatTimeAgoOptions` | — | 格式化選項 | type |
| `formatTimeAgo` | `(params) => string` | 格式化「多久前」 | function |
| `FormatRelativeTimestampOptions` | — | 相對時間戳選項 | type |
| `formatRelativeTimestamp` | `(params) => string` | 格式化相對時間戳 | function |

---

### net/

#### `fetch-guard.ts`（256 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `GUARDED_FETCH_MODE` | — | 受保護 fetch 模式常數 | const |
| `GuardedFetchMode` / `GuardedFetchOptions` / `GuardedFetchResult` | — | 受保護 fetch 型別 | type |
| `withStrictGuardedFetchMode` | `(params) => GuardedFetchOptions` | 嚴格模式 | function |
| `withTrustedEnvProxyGuardedFetchMode` | `(params) => GuardedFetchOptions` | 信任環境 proxy 模式 | function |
| `fetchWithSsrFGuard` | `(params) => Promise<GuardedFetchResult>` | 帶 SSRF 防護的 fetch | function |

#### `hostname.ts`（7 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `normalizeHostname` | `(hostname) => string` | 正規化 hostname | function |

#### `proxy-env.ts`（55 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `PROXY_ENV_KEYS` | — | Proxy 環境變數鍵名 | const |
| `hasProxyEnvConfigured` | `(env?) => boolean` | 檢查是否設定 proxy 環境 | function |
| `resolveEnvHttpProxyUrl` | `(params) => string \| null` | 解析環境 HTTP proxy URL | function |
| `hasEnvHttpProxyConfigured` | `(params) => boolean` | 檢查是否設定 HTTP proxy | function |

#### `proxy-fetch.ts`（73 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `PROXY_FETCH_PROXY_URL` | — | Proxy fetch URL symbol | const |
| `makeProxyFetch` | `(proxyUrl) => typeof fetch` | 建立 proxy fetch | function |
| `getProxyUrlFromFetch` | `(fetchImpl?) => string \| undefined` | 從 fetch 取得 proxy URL | function |
| `resolveProxyFetchFromEnv` | `(params) => typeof fetch \| undefined` | 從環境解析 proxy fetch | function |

#### `ssrf.ts`（405 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `SsrFBlockedError` | `extends Error` | SSRF 阻擋錯誤 | class |
| `LookupFn` / `SsrFPolicy` | — | DNS 查詢與 SSRF 策略 | type |
| `isPrivateNetworkAllowedByPolicy` | `(policy?) => boolean` | 判斷私網是否被策略允許 | function |
| `isPrivateIpAddress` | `(address, policy?) => boolean` | 判斷是否為私有 IP | function |
| `isBlockedHostname` / `isBlockedHostnameOrIp` | — | 判斷是否為被封鎖的主機 | function |
| `createPinnedLookup` | `(params) => LookupFn` | 建立釘定 DNS 查詢 | function |
| `PinnedHostname` / `PinnedDispatcherPolicy` | — | 釘定主機型別 | type |
| `resolvePinnedHostnameWithPolicy` / `resolvePinnedHostname` | — | 解析釘定 hostname | function |
| `createPinnedDispatcher` | `(params) => Dispatcher` | 建立釘定 Dispatcher | function |
| `closeDispatcher` | `(dispatcher?) => Promise<void>` | 關閉 Dispatcher | function |
| `assertPublicHostname` | `(params) => Promise<void>` | 斷言為公開 hostname | function |

#### `undici-global-dispatcher.ts`（147 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `DEFAULT_UNDICI_STREAM_TIMEOUT_MS` | `1,800,000` | 預設 undici stream 逾時 | const |
| `ensureGlobalUndiciEnvProxyDispatcher` | `() => void` | 確保全域 undici 環境 proxy dispatcher | function |
| `ensureGlobalUndiciStreamTimeouts` | `(opts?) => void` | 確保全域 undici stream 逾時 | function |
| `resetGlobalUndiciStreamTimeoutsForTests` | `() => void` | 測試用重置 | function |

---

### outbound/

#### `abort.ts`（15 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `throwIfAborted` | `(abortSignal?) => void` | 若已中止則拋錯 | function |

#### `agent-delivery.ts`（179 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `AgentDeliveryPlan` | — | Agent 遞送計畫 | type |
| `resolveAgentDeliveryPlan` | `(params) => AgentDeliveryPlan` | 解析 agent 遞送計畫 | function |
| `resolveAgentOutboundTarget` | `(params) => ...` | 解析 agent 外發目標 | function |

#### `bound-delivery-router.ts`（131 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `BoundDeliveryRouterInput` / `BoundDeliveryRouterResult` / `BoundDeliveryRouter` | — | 綁定遞送路由器型別 | type |
| `createBoundDeliveryRouter` | `(params) => BoundDeliveryRouter` | 建立綁定遞送路由器 | function |

#### `channel-adapters.ts`（56 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `CrossContextComponentsBuilder` / `CrossContextComponentsFactory` / `ChannelMessageAdapter` | — | 頻道訊息適配器型別 | type |
| `getChannelMessageAdapter` | `(channel) => ChannelMessageAdapter` | 取得頻道訊息適配器 | function |

#### `channel-resolution.ts`（98 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `normalizeDeliverableOutboundChannel` | `(params) => ...` | 正規化可遞送的外發頻道 | function |
| `resolveOutboundChannelPlugin` | `(params) => ...` | 解析外發頻道插件 | function |

#### `channel-selection.ts`（134 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `MessageChannelId` / `MessageChannelSelectionSource` | — | 訊息頻道選擇型別 | type |
| `listConfiguredMessageChannels` | `(params) => Promise<...>` | 列出已設定的訊息頻道 | function |
| `resolveMessageChannelSelection` | `(params) => Promise<...>` | 解析訊息頻道選擇 | function |

#### `channel-target.ts`（43 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `CHANNEL_TARGET_DESCRIPTION` / `CHANNEL_TARGETS_DESCRIPTION` | — | 頻道目標描述常數 | const |
| `applyTargetToParams` | `(params) => void` | 將目標套用到參數 | function |

#### `conversation-id.ts`（41 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `resolveConversationIdFromTargets` | `(params) => string` | 從目標解析對話 ID | function |

#### `deliver-runtime.ts`（1 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `deliverOutboundPayloads` | — | 遞送外發 payloads（re-export） | re-export |

#### `deliver.ts`（801 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `OutboundDeliveryResult` | — | 遞送結果 | type |
| `DeliverOutboundPayloadsParams` | — | 遞送參數 | type |
| `deliverOutboundPayloads` | `(params) => Promise<OutboundDeliveryResult>` | 遞送外發 payloads 主函式 | function |

#### `delivery-queue.ts`（436 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `QueuedDelivery` / `RecoverySummary` | — | 佇列遞送型別 | type/interface |
| `ensureQueueDir` | `(stateDir?) => Promise<string>` | 確保佇列目錄存在 | function |
| `enqueueDelivery` | `(params) => Promise<...>` | 排入遞送佇列 | function |
| `ackDelivery` / `failDelivery` / `moveToFailed` | — | 遞送確認/失敗/移入失敗 | function |
| `loadPendingDeliveries` | `(stateDir?) => Promise<QueuedDelivery[]>` | 載入待處理遞送 | function |
| `computeBackoffMs` | `(retryCount) => number` | 計算退避毫秒 | function |
| `isEntryEligibleForRecoveryRetry` | `(params) => boolean` | 判斷是否可重試恢復 | function |
| `DeliverFn` / `RecoveryLogger` | — | 遞送函式/恢復日誌介面 | type/interface |
| `recoverPendingDeliveries` | `(opts) => Promise<RecoverySummary>` | 恢復待處理遞送 | function |
| `isPermanentDeliveryError` | `(error) => boolean` | 判斷是否為永久遞送錯誤 | function |

#### `directory-cache.ts`（98 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `DirectoryCacheKey` | — | 目錄快取鍵 | type |
| `buildDirectoryCacheKey` | `(key) => string` | 建構目錄快取鍵 | function |
| `DirectoryCache` | `class DirectoryCache<T>` | 泛型目錄快取 | class |

#### `envelope.ts`（44 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `OutboundResultEnvelope` | — | 外發結果信封 | type |
| `buildOutboundResultEnvelope` | `(params) => OutboundResultEnvelope` | 建構外發結果信封 | function |

#### `format.ts`（121 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `OutboundDeliveryJson` | — | 遞送 JSON 型別 | type |
| `formatOutboundDeliverySummary` | `(params) => string` | 格式化遞送摘要 | function |
| `buildOutboundDeliveryJson` | `(params) => OutboundDeliveryJson` | 建構遞送 JSON | function |
| `formatGatewaySummary` | `(params) => string` | 格式化 gateway 摘要 | function |

#### `identity.ts`（40 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `OutboundIdentity` | — | 外發身份 | type |
| `normalizeOutboundIdentity` | `(params) => OutboundIdentity` | 正規化外發身份 | function |
| `resolveAgentOutboundIdentity` | `(params) => OutboundIdentity` | 解析 agent 外發身份 | function |

#### `message-action-normalization.ts`（72 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `normalizeMessageActionInput` | `(params) => ...` | 正規化訊息動作輸入 | function |

#### `message-action-params.ts`（424 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `readBooleanParam` | — | 讀取布林參數 | const |
| `resolveSlackAutoThreadId` / `resolveTelegramAutoThreadId` | — | 解析自動 thread ID | function |
| `AttachmentMediaPolicy` | — | 附件媒體策略 | type |
| `resolveAttachmentMediaPolicy` | `(params) => AttachmentMediaPolicy` | 解析附件媒體策略 | function |
| `normalizeSandboxMediaParams` / `normalizeSandboxMediaList` / `hydrateAttachmentParamsForAction` | — | 沙箱媒體參數處理 | function |
| `parseButtonsParam` / `parseCardParam` / `parseComponentsParam` | — | 解析 UI 元件參數 | function |

#### `message-action-runner.ts`（816 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `MessageActionRunnerGateway` / `RunMessageActionParams` / `MessageActionRunResult` | — | 訊息動作執行器型別 | type |
| `getToolResult` | `(params) => ...` | 取得工具結果 | function |
| `runMessageAction` | `(params) => Promise<MessageActionRunResult>` | 執行訊息動作 | function |

#### `message-action-spec.ts`（103 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `MessageActionTargetMode` | `"to" \| "channelId" \| "none"` | 訊息動作目標模式 | type |
| `MESSAGE_ACTION_TARGET_MODE` | — | 各動作的目標模式映射 | const |
| `actionRequiresTarget` / `actionHasTarget` | — | 動作目標判斷 | function |

#### `message.ts`（361 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `MessageGatewayOptions` / `MessageSendResult` / `MessagePollResult` | — | 訊息發送型別 | type |
| `sendMessage` | `(params) => Promise<MessageSendResult>` | 發送訊息 | function |
| `sendPoll` | `(params) => Promise<MessagePollResult>` | 發送投票 | function |

#### `mirror.ts`（14 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `OutboundMirror` / `DeliveryMirror` | — | 外發鏡像型別 | type |

#### `outbound-policy.ts`（221 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `CrossContextDecoration` | — | 跨上下文裝飾 | type |
| `enforceCrossContextPolicy` | `(params) => ...` | 強制跨上下文策略 | function |
| `buildCrossContextDecoration` | `(params) => Promise<CrossContextDecoration>` | 建構跨上下文裝飾 | function |
| `shouldApplyCrossContextMarker` | `(action) => boolean` | 判斷是否套用跨上下文標記 | function |
| `applyCrossContextDecoration` | `(params) => void` | 套用跨上下文裝飾 | function |

#### `outbound-send-service.ts`（199 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `OutboundGatewayContext` / `OutboundSendContext` | — | 外發 gateway/send 上下文 | type |
| `executeSendAction` | `(params) => Promise<...>` | 執行發送動作 | function |
| `executePollAction` | `(params) => Promise<...>` | 執行投票動作 | function |

#### `outbound-session.ts`（1,011 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `OutboundSessionRoute` / `ResolveOutboundSessionRouteParams` | — | 外發 session 路由型別 | type |
| `resolveOutboundSessionRoute` | `(params) => Promise<OutboundSessionRoute>` | 解析外發 session 路由 | function |
| `ensureOutboundSessionEntry` | `(params) => Promise<...>` | 確保外發 session 條目 | function |

#### `payloads.ts`（135 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `NormalizedOutboundPayload` / `OutboundPayloadJson` | — | 正規化 payload 型別 | type |
| `normalizeReplyPayloadsForDelivery` | `(params) => ...` | 為遞送正規化回覆 payloads | function |
| `normalizeOutboundPayloads` / `normalizeOutboundPayloadsForJson` | — | 正規化外發 payloads | function |
| `formatOutboundPayloadLog` | `(params) => string` | 格式化 payload 日誌 | function |

#### `sanitize-text.ts`（64 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `isPlainTextSurface` | `(channelId) => boolean` | 判斷是否為純文字介面 | function |
| `sanitizeForPlainText` | `(text) => string` | 為純文字介面清理文字 | function |

#### `send-deps.ts`（41 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `OutboundSendDeps` | — | 外發發送依賴 | type |
| `resolveOutboundSendDep` | `<T>(params) => T` | 解析外發發送依賴 | function |

#### `session-binding-service.ts`（332 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `BindingTargetKind` / `BindingStatus` / `SessionBindingPlacement` / `SessionBindingErrorCode` | — | Session 綁定列舉 | type |
| `ConversationRef` / `SessionBindingRecord` / `SessionBindingBindInput` / `SessionBindingUnbindInput` / `SessionBindingCapabilities` | — | Session 綁定資料型別 | type |
| `SessionBindingError` | `extends Error` | Session 綁定錯誤 | class |
| `isSessionBindingError` | `(error) => boolean` | 型別守衛 | function |
| `SessionBindingService` / `SessionBindingAdapterCapabilities` / `SessionBindingAdapter` | — | 服務/適配器介面 | type |
| `registerSessionBindingAdapter` / `unregisterSessionBindingAdapter` | — | 註冊/移除適配器 | function |
| `getSessionBindingService` | `() => SessionBindingService` | 取得 session 綁定服務 | function |

#### `session-context.ts`（37 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `OutboundSessionContext` | — | 外發 session 上下文 | type |
| `buildOutboundSessionContext` | `(params) => OutboundSessionContext` | 建構外發 session 上下文 | function |

#### `target-errors.ts`（31 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `missingTargetMessage` / `missingTargetError` | — | 缺少目標錯誤 | function |
| `ambiguousTargetMessage` / `ambiguousTargetError` | — | 模糊目標錯誤 | function |
| `unknownTargetMessage` / `unknownTargetError` | — | 未知目標錯誤 | function |

#### `target-normalization.ts`（61 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `normalizeChannelTargetInput` | `(raw) => string` | 正規化頻道目標輸入 | function |
| `normalizeTargetForProvider` | `(provider, raw?) => string \| undefined` | 正規化 provider 目標 | function |
| `buildTargetResolverSignature` | `(channel) => string` | 建構目標解析器簽名 | function |

#### `target-resolver.ts`（550 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `TargetResolveKind` / `ResolveAmbiguousMode` / `ResolvedMessagingTarget` / `ResolveMessagingTargetResult` | — | 目標解析型別 | type |
| `resolveChannelTarget` | `(params) => Promise<...>` | 解析頻道目標 | function |
| `maybeResolveIdLikeTarget` | `(params) => Promise<...>` | 嘗試解析 ID-like 目標 | function |
| `resetDirectoryCache` | `(params?) => void` | 重置目錄快取 | function |
| `formatTargetDisplay` | `(params) => string` | 格式化目標顯示 | function |
| `resolveMessagingTarget` | `(params) => Promise<ResolveMessagingTargetResult>` | 解析訊息目標（主函式） | function |
| `lookupDirectoryDisplay` | `(params) => Promise<string>` | 查詢目錄顯示名稱 | function |

#### `targets.ts`（551 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `OutboundChannel` / `HeartbeatTarget` / `OutboundTarget` / `HeartbeatSenderContext` / `OutboundTargetResolution` / `SessionDeliveryTarget` | — | 外發目標型別家族 | type |
| `resolveSessionDeliveryTarget` | `(params) => SessionDeliveryTarget` | 解析 session 遞送目標 | function |
| `resolveOutboundTarget` | `(params) => OutboundTargetResolution` | 解析外發目標 | function |
| `resolveHeartbeatDeliveryTarget` | `(params) => ...` | 解析 heartbeat 遞送目標 | function |
| `resolveHeartbeatSenderContext` | `(params) => HeartbeatSenderContext` | 解析 heartbeat 發送者上下文 | function |

#### `tool-payload.ts`（25 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `extractToolPayload` | `(result) => unknown` | 從 tool result 提取 payload | function |

---

### tls/

#### `fingerprint.ts`（5 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `normalizeFingerprint` | `(input) => string` | 正規化 TLS 指紋 | function |

#### `gateway.ts`（150 行）
| Export | 簽名 | 說明 | 入口類型 |
|--------|------|------|----------|
| `GatewayTlsRuntime` | — | Gateway TLS 執行時設定 | type |
| `loadGatewayTlsRuntime` | `(params) => Promise<GatewayTlsRuntime>` | 載入 Gateway TLS 執行時 | function |

---

## 呼叫關聯圖

```
┌─────────────────────────────────────────────────────────────┐
│                    Gateway 啟動鏈                            │
│  env.ts → dotenv.ts → openclaw-root.ts → runtime-guard.ts  │
│  → gateway-lock.ts → ports.ts → bonjour.ts                 │
│  → tls/gateway.ts → update-startup.ts                      │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Exec Approval 子系統                      │
│  exec-approvals.ts (聚合入口)                               │
│    ├── exec-approvals-analysis.ts (指令分析)                 │
│    ├── exec-approvals-allowlist.ts (允許清單評估)             │
│    ├── exec-command-resolution.ts (指令解析)                 │
│    ├── exec-wrapper-resolution.ts (wrapper 展開)             │
│    ├── exec-safe-bin-policy.ts → profiles + validator        │
│    ├── exec-safe-bin-trust.ts (信任目錄)                     │
│    ├── exec-safe-bin-runtime-policy.ts (運行時策略)           │
│    ├── exec-obfuscation-detect.ts (混淆偵測)                │
│    ├── exec-safety.ts (安全值檢查)                           │
│    ├── exec-host.ts (socket 通訊)                           │
│    └── exec-approval-forwarder.ts → reply + surface + session│
│         → system-run-approval-binding/context/command        │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Outbound 遞送子系統                       │
│  outbound/deliver.ts (遞送入口)                             │
│    ├── outbound/targets.ts → target-resolver.ts             │
│    │   → target-normalization.ts → channel-resolution.ts    │
│    ├── outbound/channel-selection.ts                        │
│    ├── outbound/outbound-session.ts                         │
│    │   → session-binding-service.ts                         │
│    ├── outbound/message-action-runner.ts                    │
│    │   → message-action-params.ts → message-action-spec.ts │
│    ├── outbound/delivery-queue.ts (持久化佇列)              │
│    ├── outbound/outbound-policy.ts (跨上下文策略)            │
│    ├── outbound/message.ts (訊息發送)                       │
│    └── outbound/agent-delivery.ts (agent 遞送)              │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Heartbeat 子系統                          │
│  heartbeat-runner.ts (核心執行器)                            │
│    ├── heartbeat-wake.ts (喚醒管理)                         │
│    ├── heartbeat-events.ts (事件發送)                        │
│    ├── heartbeat-events-filter.ts (事件過濾)                 │
│    ├── heartbeat-active-hours.ts (活躍時段)                  │
│    ├── heartbeat-visibility.ts (可見性)                      │
│    └── heartbeat-reason.ts (原因分類)                        │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│               Device / Node 配對子系統                       │
│  device-pairing.ts (裝置配對 CRUD)                          │
│    ├── device-identity.ts (裝置身份/簽章)                    │
│    ├── device-auth-store.ts (token 存取)                    │
│    ├── device-bootstrap.ts (bootstrap token)                │
│    └── pairing-files.ts → pairing-token.ts                  │
│  node-pairing.ts (Node 配對 CRUD)                           │
│    └── pairing-files.ts → pairing-pending.ts                │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│               安全 / 檔案系統子系統                           │
│  fs-safe.ts (範圍限定檔案操作)                               │
│    ├── boundary-path.ts (邊界路徑解析)                       │
│    ├── boundary-file-read.ts (邊界檔案讀取)                  │
│    ├── safe-open-sync.ts (同步安全開啟)                      │
│    ├── path-guards.ts / path-safety.ts / path-alias-guards.ts│
│    └── hardlink-guards.ts                                   │
│  host-env-security.ts (主機環境安全)                         │
│  secret-file.ts (秘密檔案讀取)                               │
│  net/ssrf.ts → fetch-guard.ts (SSRF 防護)                   │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│               更新 / 安裝子系統                              │
│  update-startup.ts (啟動檢查)                               │
│    ├── update-check.ts (狀態檢查)                           │
│    ├── update-runner.ts (執行更新)                           │
│    ├── update-channels.ts (頻道管理)                         │
│    └── update-global.ts (全域安裝)                           │
│  install-*.ts 系列 (套件安裝流程)                            │
│    ├── npm-registry-spec.ts / npm-pack-install.ts           │
│    └── archive.ts → archive-staging.ts → archive-path.ts   │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│               共用基礎工具                                   │
│  errors.ts / retry.ts / backoff.ts / json-files.ts          │
│  format-time/*.ts / parse-finite-number.ts                  │
│  secure-random.ts / prototype-keys.ts / plain-object.ts     │
│  map-size.ts / dedupe.ts / ws.ts / clipboard.ts            │
└─────────────────────────────────────────────────────────────┘
```

## 系統歸屬分類

| 系統 | 檔案群 | 說明 |
|------|--------|------|
| **Gateway 核心** | `gateway-lock.ts`, `gateway-process-argv.ts`, `gateway-processes.ts`, `restart.ts`, `restart-sentinel.ts`, `restart-stale-pids.ts`, `process-respawn.ts`, `windows-task-restart.ts`, `supervisor-markers.ts` | Gateway 生命週期管理：鎖、程序偵測、重啟策略 |
| **Exec Approval** | `exec-approvals.ts`, `exec-approvals-analysis.ts`, `exec-approvals-allowlist.ts`, `exec-command-resolution.ts`, `exec-wrapper-resolution.ts`, `exec-safe-bin-policy*.ts`, `exec-safe-bin-trust.ts`, `exec-safe-bin-runtime-policy.ts`, `exec-obfuscation-detect.ts`, `exec-safety.ts`, `exec-host.ts`, `exec-allowlist-pattern.ts`, `exec-approval-*.ts` | 執行核准全鏈：指令分析 → 安全策略 → 允許清單 → 核准轉發 |
| **System.Run** | `system-run-approval-binding.ts`, `system-run-approval-context.ts`, `system-run-command.ts`, `system-run-normalize.ts` | system.run 指令核准綁定與驗證 |
| **Outbound 遞送** | `outbound/*.ts`（33 檔） | 外發訊息遞送完整鏈：目標解析 → 頻道選擇 → session 綁定 → 動作執行 → 佇列持久化 → 遞送 |
| **Heartbeat** | `heartbeat-*.ts`（7 檔） | 定時心跳系統：排程、喚醒、事件、可見性、活躍時段 |
| **Device/Node 配對** | `device-*.ts`, `node-pairing.ts`, `pairing-*.ts` | 裝置與 node 配對管理：身份、token、CRUD |
| **APNS 推播** | `push-apns.ts`, `push-apns.relay.ts` | Apple Push Notification 直接/relay 推播 |
| **檔案系統安全** | `fs-safe.ts`, `boundary-path.ts`, `boundary-file-read.ts`, `safe-open-sync.ts`, `path-*.ts`, `hardlink-guards.ts`, `fs-pinned-write-helper.ts` | 範圍限定檔案操作、路徑安全驗證 |
| **網路安全** | `net/*.ts` | SSRF 防護、proxy 管理、fetch guard、hostname 正規化 |
| **主機環境安全** | `host-env-security.ts`, `secret-file.ts`, `secure-random.ts` | 環境變數清理、秘密檔案讀取、安全亂數 |
| **SSH/Tailscale** | `ssh-config.ts`, `ssh-tunnel.ts`, `tailscale.ts`, `tailnet.ts`, `scp-host.ts` | SSH 隧道、Tailscale 整合、SCP 安全驗證 |
| **Bonjour 發現** | `bonjour.ts`, `bonjour-discovery.ts`, `bonjour-ciao.ts`, `bonjour-errors.ts` | 區網 gateway 探索與廣播 |
| **更新系統** | `update-*.ts`（5 檔） | 版本檢查、頻道管理、全域安裝更新 |
| **安裝系統** | `install-*.ts`（7 檔）, `npm-*.ts`（3 檔）, `archive*.ts`（4 檔）, `detect-package-manager.ts` | 套件安裝流程：npm spec 解析、壓縮檔解壓、安全路徑 |
| **Provider 用量** | `provider-usage.*.ts`（13 檔）, `session-cost-usage*.ts`（2 檔） | 多 provider 用量查詢、費用統計、session 日誌 |
| **控制面板** | `control-ui-assets.ts` | Control UI 靜態資源管理 |
| **診斷系統** | `diagnostic-events.ts`, `diagnostic-flags.ts` | 診斷事件發送與旗標 |
| **系統事件** | `system-events.ts`, `system-message.ts`, `system-presence.ts`, `agent-events.ts` | 系統/agent 事件佇列、在線狀態 |
| **狀態遷移** | `state-migrations.ts`, `state-migrations.fs.ts` | 舊版狀態自動遷移 |
| **Remote Skills** | `skills-remote.ts` | 遠端技能 registry 與快取 |
| **時間格式化** | `format-time/*.ts`（3 檔） | 日期時間、時長、相對時間格式化 |
| **TLS** | `tls/*.ts`（2 檔） | TLS 指紋與 gateway TLS runtime |
| **DNS/WAN** | `widearea-dns.ts` | 廣域 DNS zone 管理 |
| **環境偵測** | `env.ts`, `dotenv.ts`, `wsl.ts`, `os-summary.ts`, `runtime-guard.ts`, `shell-env.ts`, `openclaw-exec-env.ts` | 環境變數、WSL 偵測、OS 摘要、runtime 版本 |
| **共用工具** | `errors.ts`, `retry.ts`, `retry-policy.ts`, `backoff.ts`, `json-file.ts`, `json-files.ts`, `json-utf8-bytes.ts`, `parse-finite-number.ts`, `plain-object.ts`, `prototype-keys.ts`, `map-size.ts`, `dedupe.ts`, `ws.ts`, `clipboard.ts`, `fetch.ts`, `http-body.ts`, `jsonl-socket.ts`, `file-identity.ts`, `file-lock.ts`, `fixed-window-rate-limit.ts`, `is-main.ts`, `machine-name.ts`, `package-json.ts`, `package-tag.ts`, `warning-filter.ts`, `unhandled-rejections.ts`, `transport-ready.ts`, `voicewake.ts` | 通用基礎工具函式庫 |
| **路徑工具** | `home-dir.ts`, `git-root.ts`, `openclaw-root.ts`, `tmp-openclaw-dir.ts`, `path-env.ts`, `path-prepend.ts`, `brew.ts`, `executable-path.ts`, `stable-node-path.ts` | 路徑解析與管理 |
