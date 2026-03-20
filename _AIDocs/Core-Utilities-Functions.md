# Shared + Utils + Daemon + Process + Logging + TUI + Misc 函式級索引
> 掃描日期：2026-03-21 | 檔案數：227 檔 | 總行數：~27,323 行

## 目錄結構

```
src/shared/          39 檔 2,406 行  共用型別與純函式（全專案基礎）
src/utils/           18 檔 1,277 行  通用工具函式
src/logging/         16 檔 2,086 行  日誌系統（file + console + subsystem）
src/process/         16 檔 1,957 行  進程管理（exec, spawn, supervisor, kill）
src/daemon/          32 檔 5,109 行  背景服務（launchd/systemd/schtasks）
src/terminal/        13 檔 1,058 行  終端控制（ANSI, table, theme, prompt）
src/tui/             29 檔 5,841 行  TUI 介面（commands, chat, stream, overlays）
src/wizard/           9 檔 2,118 行  設定精靈（onboarding flow）
src/node-host/       10 檔 3,319 行  Node 遠端宿主（invoke, exec policy, browser）
src/providers/        6 檔   545 行  Provider 共用（Copilot, Kilocode, Qwen, Google）
src/compat/           1 檔    15 行  相容層常數
src/test-helpers/     6 檔   141 行  測試輔助
src/test-utils/      32 檔 1,451 行  測試工具
```

---

## 函式清單

### src/shared/

#### assistant-identity-values.ts
| export | 簽名 | 回傳 | 說明 | 入口 |
|--------|------|------|------|------|
| `coerceIdentityValue` | `(value: string \| undefined, maxLength: number)` | `string \| undefined` | 裁切 identity 字串至最大長度 | fn |

#### avatar-policy.ts
| export | 簽名 | 回傳 | 說明 | 入口 |
|--------|------|------|------|------|
| `AVATAR_MAX_BYTES` | — | `number` | Avatar 最大位元組（2 MB） | const |
| `AVATAR_DATA_RE` | — | `RegExp` | data: URL 偵測 | const |
| `AVATAR_IMAGE_DATA_RE` | — | `RegExp` | data:image/ URL 偵測 | const |
| `AVATAR_HTTP_RE` | — | `RegExp` | http(s) URL 偵測 | const |
| `AVATAR_SCHEME_RE` | — | `RegExp` | 任意 scheme URL 偵測 | const |
| `WINDOWS_ABS_RE` | — | `RegExp` | Windows 絕對路徑偵測 | const |
| `resolveAvatarMime` | `(filePath: string)` | `string` | 從副檔名解析 avatar MIME type | fn |
| `isAvatarDataUrl` | `(value: string)` | `boolean` | 是否為 data: URL | fn |
| `isAvatarImageDataUrl` | `(value: string)` | `boolean` | 是否為 data:image/ URL | fn |
| `isAvatarHttpUrl` | `(value: string)` | `boolean` | 是否為 HTTP URL | fn |
| `hasAvatarUriScheme` | `(value: string)` | `boolean` | 是否含 URI scheme | fn |
| `isWindowsAbsolutePath` | `(value: string)` | `boolean` | 是否為 Windows 絕對路徑 | fn |
| `isWorkspaceRelativeAvatarPath` | `(value: string)` | `boolean` | 是否為 workspace 相對路徑 | fn |
| `isPathWithinRoot` | `(rootDir: string, targetPath: string)` | `boolean` | 路徑是否在 root 之下 | fn |
| `looksLikeAvatarPath` | `(value: string)` | `boolean` | 是否看起來像圖片路徑 | fn |
| `isSupportedLocalAvatarExtension` | `(filePath: string)` | `boolean` | 副檔名是否為支援的 avatar 格式 | fn |

#### chat-content.ts
| export | 簽名 | 回傳 | 說明 | 入口 |
|--------|------|------|------|------|
| `extractTextFromChatContent` | `(content: unknown, opts?)` | `string \| null` | 從 chat content（string 或 block[]）提取純文字 | fn |

#### chat-message-content.ts
| export | 簽名 | 回傳 | 說明 | 入口 |
|--------|------|------|------|------|
| `extractFirstTextBlock` | `(message: unknown)` | `string \| undefined` | 取出 message.content 第一個 text block | fn |

#### chat-envelope.ts
| export | 簽名 | 回傳 | 說明 | 入口 |
|--------|------|------|------|------|
| `stripEnvelope` | `(text: string)` | `string` | 移除 chat envelope prefix（如 `[Discord 2024...]`） | fn |
| `stripMessageIdHints` | `(text: string)` | `string` | 移除 `[message_id: ...]` 行 | fn |

#### config-eval.ts
| export | 簽名 | 回傳 | 說明 | 入口 |
|--------|------|------|------|------|
| `isTruthy` | `(value: unknown)` | `boolean` | 通用 truthy 判斷 | fn |
| `resolveConfigPath` | `(config: unknown, pathStr: string)` | `unknown` | 以 dot-path 解析 config 值 | fn |
| `isConfigPathTruthyWithDefaults` | `(config, pathStr, defaults)` | `boolean` | config path truthy 判斷（含 defaults） | fn |
| `evaluateRuntimeRequires` | `(params: RuntimeRequirementEvalParams)` | `boolean` | 評估 runtime requires（bins/env/config） | fn |
| `evaluateRuntimeEligibility` | `(params)` | `boolean` | 評估 runtime eligibility（含 OS 平台篩選） | fn |
| `resolveRuntimePlatform` | `()` | `string` | 回傳 process.platform | fn |
| `hasBinary` | `(bin: string)` | `boolean` | 檢查 PATH 中是否有指定 binary | fn |
| `RuntimeRequires` | — | — | requires 結構型別 | type |

#### config-ui-hints-types.ts
| export | 簽名 | 回傳 | 說明 | 入口 |
|--------|------|------|------|------|
| `ConfigUiHint` | — | — | 單一 config hint 型別 | type |
| `ConfigUiHints` | — | — | config hints record 型別 | type |

#### device-auth.ts
| export | 簽名 | 回傳 | 說明 | 入口 |
|--------|------|------|------|------|
| `DeviceAuthEntry` | — | — | 裝置認證 entry 型別 | type |
| `DeviceAuthStore` | — | — | 裝置認證 store 型別 | type |
| `normalizeDeviceAuthRole` | `(role: string)` | `string` | 正規化 role 字串 | fn |
| `normalizeDeviceAuthScopes` | `(scopes: string[] \| undefined)` | `string[]` | 正規化與去重 scopes | fn |

#### device-auth-store.ts
| export | 簽名 | 回傳 | 說明 | 入口 |
|--------|------|------|------|------|
| `DeviceAuthStoreAdapter` | — | — | store I/O adapter 型別 | type |
| `loadDeviceAuthTokenFromStore` | `(params)` | `DeviceAuthEntry \| null` | 從 store 讀取 token | fn |
| `storeDeviceAuthTokenInStore` | `(params)` | `DeviceAuthEntry` | 寫入 token 至 store | fn |
| `clearDeviceAuthTokenFromStore` | `(params)` | `void` | 從 store 刪除 token | fn |

#### entry-metadata.ts
| export | 簽名 | 回傳 | 說明 | 入口 |
|--------|------|------|------|------|
| `resolveEmojiAndHomepage` | `(params)` | `{ emoji?, homepage? }` | 從 metadata/frontmatter 解析 emoji 和 homepage | fn |

#### entry-status.ts
| export | 簽名 | 回傳 | 說明 | 入口 |
|--------|------|------|------|------|
| `evaluateEntryMetadataRequirements` | `(params)` | `{ emoji?, homepage?, required, missing, requirementsSatisfied, configChecks }` | 綜合評估 entry metadata 的 requirements | fn |
| `evaluateEntryMetadataRequirementsForCurrentPlatform` | `(params)` | 同上 | 同上（自動帶入 process.platform） | fn |
| `evaluateEntryRequirementsForCurrentPlatform` | `(params)` | 同上 | 從 entry 物件評估 requirements | fn |

#### frontmatter.ts
| export | 簽名 | 回傳 | 說明 | 入口 |
|--------|------|------|------|------|
| `normalizeStringList` | `(input: unknown)` | `string[]` | 正規化字串陣列或逗號分隔字串 | fn |
| `getFrontmatterString` | `(frontmatter, key)` | `string \| undefined` | 取 frontmatter 字串值 | fn |
| `parseFrontmatterBool` | `(value, fallback)` | `boolean` | 解析 frontmatter 布林值 | fn |
| `resolveOpenClawManifestBlock` | `(params)` | `Record \| undefined` | 解析 frontmatter 中的 OpenClaw manifest block | fn |
| `resolveOpenClawManifestRequires` | `(metadataObj)` | `OpenClawManifestRequires \| undefined` | 解析 manifest requires 區段 | fn |
| `resolveOpenClawManifestInstall` | `(metadataObj, parseInstallSpec)` | `T[]` | 解析 manifest install 項目 | fn |
| `resolveOpenClawManifestOs` | `(metadataObj)` | `string[]` | 解析 manifest OS 限制 | fn |
| `parseOpenClawManifestInstallBase` | `(input, allowedKinds)` | `ParsedOpenClawManifestInstallBase \| undefined` | 解析 install spec base | fn |
| `applyOpenClawManifestInstallCommonFields` | `(spec, parsed)` | `T` | 套用 install 共用欄位 | fn |

#### gateway-bind-url.ts
| export | 簽名 | 回傳 | 說明 | 入口 |
|--------|------|------|------|------|
| `resolveGatewayBindUrl` | `(params)` | `GatewayBindUrlResult` | 依 bind mode 解析 gateway URL（custom/tailnet/lan） | fn |
| `GatewayBindUrlResult` | — | — | bind URL 結果型別 | type |

#### global-singleton.ts
| export | 簽名 | 回傳 | 說明 | 入口 |
|--------|------|------|------|------|
| `resolveGlobalSingleton` | `<T>(key: symbol, create: () => T)` | `T` | 在 globalThis 上建立 singleton | fn |
| `resolveGlobalMap` | `<TKey, TValue>(key: symbol)` | `Map` | 在 globalThis 上建立 singleton Map | fn |

#### model-param-b.ts
| export | 簽名 | 回傳 | 說明 | 入口 |
|--------|------|------|------|------|
| `inferParamBFromIdOrName` | `(text: string)` | `number \| null` | 從 model ID 推斷參數量（如 "70b"→70） | fn |

#### net/ip.ts
| export | 簽名 | 回傳 | 說明 | 入口 |
|--------|------|------|------|------|
| `parseCanonicalIpAddress` | `(raw)` | `ParsedIpAddress \| undefined` | 嚴格解析 IP（canonical dotted decimal only） | fn |
| `parseLooseIpAddress` | `(raw)` | `ParsedIpAddress \| undefined` | 寬鬆解析 IP | fn |
| `normalizeIpAddress` | `(raw)` | `string \| undefined` | 正規化 IP 為字串 | fn |
| `isCanonicalDottedDecimalIPv4` | `(raw)` | `boolean` | 是否為標準 IPv4 | fn |
| `isLegacyIpv4Literal` | `(raw)` | `boolean` | 是否為舊式 IPv4 literal | fn |
| `isLoopbackIpAddress` | `(raw)` | `boolean` | 是否為 loopback IP | fn |
| `isPrivateOrLoopbackIpAddress` | `(raw)` | `boolean` | 是否為 private/loopback IP | fn |
| `isRfc1918Ipv4Address` | `(raw)` | `boolean` | 是否為 RFC1918 private IP | fn |
| `isCarrierGradeNatIpv4Address` | `(raw)` | `boolean` | 是否為 CGNAT IP | fn |
| `isBlockedSpecialUseIpv4Address` | `(address, options?)` | `boolean` | IPv4 是否在 blocked special-use 範圍 | fn |
| `isBlockedSpecialUseIpv6Address` | `(address)` | `boolean` | IPv6 是否在 blocked special-use 範圍 | fn |
| `extractEmbeddedIpv4FromIpv6` | `(address)` | `ipaddr.IPv4 \| undefined` | 從 IPv6 提取 embedded IPv4 | fn |
| `isIpInCidr` | `(ip, cidr)` | `boolean` | IP 是否在 CIDR 範圍內 | fn |
| `isIpv4Address` / `isIpv6Address` | `(address)` | `boolean` | type guard | fn |

#### net/ipv4.ts
| export | 簽名 | 回傳 | 說明 | 入口 |
|--------|------|------|------|------|
| `validateDottedDecimalIPv4Input` | `(value)` | `string \| undefined` | 驗證 IPv4 input（回傳 error message 或 undefined） | fn |
| `validateIPv4AddressInput` | `(value)` | `string \| undefined` | 同上（backward-compatible alias） | fn |

#### node-list-parse.ts
| export | 簽名 | 回傳 | 說明 | 入口 |
|--------|------|------|------|------|
| `parsePairingList` | `(value: unknown)` | `PairingList` | 解析 pairing list JSON | fn |
| `parseNodeList` | `(value: unknown)` | `NodeListNode[]` | 解析 node list JSON | fn |

#### node-list-types.ts
| export | 簽名 | 回傳 | 說明 | 入口 |
|--------|------|------|------|------|
| `NodeListNode` / `PendingRequest` / `PairedNode` / `PairingList` | — | — | Node pairing 相關型別 | type |

#### node-match.ts
| export | 簽名 | 回傳 | 說明 | 入口 |
|--------|------|------|------|------|
| `normalizeNodeKey` | `(value: string)` | `string` | 正規化 node key（小寫+連字號） | fn |
| `resolveNodeMatches` | `(nodes, query)` | `NodeMatchCandidate[]` | 依 query 比對 node 候選清單 | fn |
| `resolveNodeIdFromCandidates` | `(nodes, query)` | `string` | 解析唯一 node ID（ambiguous 則拋錯） | fn |

#### node-resolve.ts
| export | 簽名 | 回傳 | 說明 | 入口 |
|--------|------|------|------|------|
| `resolveNodeIdFromNodeList` | `(nodes, query?, options?)` | `string` | 從 node list 解析 node ID（支援 default） | fn |
| `resolveNodeFromNodeList` | `(nodes, query?, options?)` | `TNode` | 從 node list 解析完整 node 物件 | fn |

#### operator-scope-compat.ts
| export | 簽名 | 回傳 | 說明 | 入口 |
|--------|------|------|------|------|
| `roleScopesAllow` | `(params)` | `boolean` | 檢查 role scopes 是否滿足請求 scopes（含 operator 特殊邏輯） | fn |

#### pid-alive.ts
| export | 簽名 | 回傳 | 說明 | 入口 |
|--------|------|------|------|------|
| `isPidAlive` | `(pid: number)` | `boolean` | 檢查 PID 是否存活（排除 zombie） | fn |
| `getProcessStartTime` | `(pid: number)` | `number \| null` | 讀取 Linux /proc starttime（偵測 PID 回收） | fn |

#### process-scoped-map.ts
| export | 簽名 | 回傳 | 說明 | 入口 |
|--------|------|------|------|------|
| `resolveProcessScopedMap` | `<T>(key: symbol)` | `Map<string, T>` | 在 process 物件上建立 scoped Map | fn |

#### requirements.ts
| export | 簽名 | 回傳 | 說明 | 入口 |
|--------|------|------|------|------|
| `Requirements` / `RequirementsMetadata` / `RequirementRemote` / `RequirementConfigCheck` | — | — | 需求評估型別 | type |
| `resolveMissingBins` | `(params)` | `string[]` | 找出缺失的 bins | fn |
| `resolveMissingAnyBins` | `(params)` | `string[]` | 找出 anyBins 全缺失的情況 | fn |
| `resolveMissingOs` | `(params)` | `string[]` | 找出不匹配的 OS | fn |
| `resolveMissingEnv` | `(params)` | `string[]` | 找出缺失的 env vars | fn |
| `buildConfigChecks` | `(params)` | `RequirementConfigCheck[]` | 建立 config 檢查結果陣列 | fn |
| `evaluateRequirements` | `(params)` | `{ missing, eligible, configChecks }` | 完整評估 requirements | fn |
| `evaluateRequirementsFromMetadata` | `(params)` | `{ required, missing, eligible, configChecks }` | 從 metadata 評估 requirements | fn |
| `evaluateRequirementsFromMetadataWithRemote` | `(params)` | 同上 | 同上（含 remote context） | fn |

#### session-types.ts / session-usage-timeseries-types.ts / usage-types.ts
| export | 說明 | 入口 |
|--------|------|------|
| `GatewayAgentIdentity`, `GatewayAgentRow`, `SessionsListResultBase`, `SessionsPatchResultBase` | Session 列表與 patch 基礎型別 | type |
| `SessionUsageTimePoint`, `SessionUsageTimeSeries` | Session usage 時序型別 | type |
| `SessionUsageEntry`, `SessionsUsageAggregates`, `SessionsUsageResult` | Session usage 彙整型別 | type |

#### string-normalization.ts
| export | 簽名 | 回傳 | 說明 | 入口 |
|--------|------|------|------|------|
| `normalizeStringEntries` | `(list?)` | `string[]` | 正規化字串陣列 | fn |
| `normalizeStringEntriesLower` | `(list?)` | `string[]` | 同上（小寫化） | fn |
| `normalizeHyphenSlug` | `(raw?)` | `string` | 正規化為 hyphen slug | fn |
| `normalizeAtHashSlug` | `(raw?)` | `string` | 正規化 @/# slug | fn |

#### string-sample.ts
| export | 簽名 | 回傳 | 說明 | 入口 |
|--------|------|------|------|------|
| `summarizeStringEntries` | `(params)` | `string` | 摘要顯示字串陣列（超過 limit 顯示 +N） | fn |

#### subagents-format.ts
| export | 簽名 | 回傳 | 說明 | 入口 |
|--------|------|------|------|------|
| `formatDurationCompact` | `(valueMs?)` | `string` | 格式化時間長度（如 "5m", "2h30m"） | fn |
| `formatTokenShort` | `(value?)` | `string \| undefined` | 格式化 token 數（如 "1.5k", "2.3m"） | fn |
| `truncateLine` | `(value, maxLength)` | `string` | 截斷行文字 | fn |
| `resolveTotalTokens` | `(entry?)` | `number \| undefined` | 從 usage 物件解析 total tokens | fn |
| `resolveIoTokens` | `(entry?)` | `{ input, output, total } \| undefined` | 解析 I/O token 數 | fn |
| `formatTokenUsageDisplay` | `(entry?)` | `string` | 格式化 token usage 為顯示字串 | fn |

#### tailscale-status.ts
| export | 簽名 | 回傳 | 說明 | 入口 |
|--------|------|------|------|------|
| `resolveTailnetHostWithRunner` | `(runCommandWithTimeout?)` | `Promise<string \| null>` | 透過 tailscale CLI 解析 tailnet hostname | fn |

#### text-chunking.ts
| export | 簽名 | 回傳 | 說明 | 入口 |
|--------|------|------|------|------|
| `chunkTextByBreakResolver` | `(text, limit, resolveBreakIndex)` | `string[]` | 依自訂斷點函式切割文字 | fn |

#### text/assistant-visible-text.ts
| export | 簽名 | 回傳 | 說明 | 入口 |
|--------|------|------|------|------|
| `stripAssistantInternalScaffolding` | `(text: string)` | `string` | 移除 assistant 回應中的 reasoning tags 和 memory tags | fn |

#### text/code-regions.ts
| export | 簽名 | 回傳 | 說明 | 入口 |
|--------|------|------|------|------|
| `findCodeRegions` | `(text: string)` | `CodeRegion[]` | 找出 markdown 中的 code fence/inline 區域 | fn |
| `isInsideCode` | `(pos, regions)` | `boolean` | 判斷位置是否在 code 區域內 | fn |

#### text/join-segments.ts
| export | 簽名 | 回傳 | 說明 | 入口 |
|--------|------|------|------|------|
| `concatOptionalTextSegments` | `(params)` | `string \| undefined` | 合併兩個 optional 文字段 | fn |
| `joinPresentTextSegments` | `(segments, options?)` | `string \| undefined` | 合併多個 non-null 文字段 | fn |

#### text/reasoning-tags.ts
| export | 簽名 | 回傳 | 說明 | 入口 |
|--------|------|------|------|------|
| `stripReasoningTagsFromText` | `(text, options?)` | `string` | 移除 `<thinking>` / `<thought>` / `<final>` 標籤及其內容 | fn |

#### usage-aggregates.ts
| export | 簽名 | 回傳 | 說明 | 入口 |
|--------|------|------|------|------|
| `mergeUsageLatency` | `(totals, latency)` | `void` | 合併 latency 統計至 totals | fn |
| `mergeUsageDailyLatency` | `(dailyLatencyMap, dailyLatency?)` | `void` | 合併每日 latency 至 map | fn |
| `buildUsageAggregateTail` | `(params)` | `{ byChannel, latency?, dailyLatency, modelDaily, daily }` | 建構 usage 彙整尾段資料 | fn |

---

### src/utils/

#### account-id.ts
| export | 簽名 | 回傳 | 說明 | 入口 |
|--------|------|------|------|------|
| `normalizeAccountId` | `(value?)` | `string \| undefined` | 正規化 account ID（委託 routing 層） | fn |

#### boolean.ts
| export | 簽名 | 回傳 | 說明 | 入口 |
|--------|------|------|------|------|
| `parseBooleanValue` | `(value, options?)` | `boolean \| undefined` | 解析 truthy/falsy 字串（true/1/yes/on） | fn |

#### chunk-items.ts
| export | 簽名 | 回傳 | 說明 | 入口 |
|--------|------|------|------|------|
| `chunkItems` | `<T>(items, size)` | `T[][]` | 將陣列切成固定大小的 chunks | fn |

#### delivery-context.ts
| export | 簽名 | 回傳 | 說明 | 入口 |
|--------|------|------|------|------|
| `DeliveryContext` / `DeliveryContextSessionSource` | — | — | 投遞 context 型別 | type |
| `normalizeDeliveryContext` | `(context?)` | `DeliveryContext \| undefined` | 正規化投遞 context | fn |
| `normalizeSessionDeliveryFields` | `(source?)` | `{ deliveryContext?, ... }` | 從 session source 正規化投遞欄位 | fn |
| `deliveryContextFromSession` | `(entry?)` | `DeliveryContext \| undefined` | 從 session entry 提取投遞 context | fn |
| `mergeDeliveryContext` | `(primary?, fallback?)` | `DeliveryContext \| undefined` | 合併兩個投遞 context（channel 衝突時保留 primary） | fn |
| `deliveryContextKey` | `(context?)` | `string \| undefined` | 產生投遞 context 的 unique key | fn |

#### directive-tags.ts
| export | 簽名 | 回傳 | 說明 | 入口 |
|--------|------|------|------|------|
| `parseInlineDirectives` | `(text?, options?)` | `InlineDirectiveParseResult` | 解析 `[[audio_as_voice]]` / `[[reply_to_current]]` 等 inline directives | fn |
| `stripInlineDirectiveTagsForDisplay` | `(text)` | `{ text, changed }` | 移除 directive tags 用於顯示 | fn |
| `stripInlineDirectiveTagsFromMessageForDisplay` | `(message?)` | `DisplayMessageWithContent \| undefined` | 從 message 物件移除 directive tags | fn |

#### fetch-timeout.ts
| export | 簽名 | 回傳 | 說明 | 入口 |
|--------|------|------|------|------|
| `fetchWithTimeout` | `(url, init, timeoutMs, fetchFn?)` | `Promise<Response>` | 帶 timeout 的 fetch wrapper | fn |
| `bindAbortRelay` | `(controller)` | `() => void` | 綁定 abort relay listener | fn |

#### mask-api-key.ts
| export | 簽名 | 回傳 | 說明 | 入口 |
|--------|------|------|------|------|
| `maskApiKey` | `(value: string)` | `string` | 遮罩 API key（保留頭尾可辨識字元） | fn |

#### message-channel.ts
| export | 簽名 | 回傳 | 說明 | 入口 |
|--------|------|------|------|------|
| `normalizeMessageChannel` | `(raw?)` | `string \| undefined` | 正規化 channel 名稱（內建 + plugin） | fn |
| `isInternalMessageChannel` | `(raw?)` | `boolean` | 是否為 webchat（內部 channel） | fn |
| `isGatewayCliClient` | `(client?)` | `boolean` | 是否為 CLI client | fn |
| `isWebchatClient` | `(client?)` | `boolean` | 是否為 webchat client | fn |
| `listDeliverableMessageChannels` | `()` | `ChannelId[]` | 列出所有可投遞 channel | fn |
| `listGatewayMessageChannels` | `()` | `GatewayMessageChannel[]` | 列出所有 gateway channel（含 webchat） | fn |
| `isMarkdownCapableMessageChannel` | `(raw?)` | `boolean` | channel 是否支援 markdown | fn |
| `resolveMessageChannel` | `(primary?, fallback?)` | `string \| undefined` | 解析 channel（primary fallback） | fn |

#### normalize-secret-input.ts
| export | 簽名 | 回傳 | 說明 | 入口 |
|--------|------|------|------|------|
| `normalizeSecretInput` | `(value)` | `string` | 清理 secret 輸入（移除換行、非 Latin1 字元） | fn |
| `normalizeOptionalSecretInput` | `(value)` | `string \| undefined` | 同上（空值回傳 undefined） | fn |

#### provider-utils.ts
| export | 簽名 | 回傳 | 說明 | 入口 |
|--------|------|------|------|------|
| `isReasoningTagProvider` | `(provider)` | `boolean` | 是否為需要 `<think>` tag 的 provider（Google, Minimax） | fn |

#### queue-helpers.ts
| export | 簽名 | 回傳 | 說明 | 入口 |
|--------|------|------|------|------|
| `clearQueueSummaryState` | `(state)` | `void` | 清除 queue summary 狀態 | fn |
| `previewQueueSummaryPrompt` | `(params)` | `string \| undefined` | 預覽 queue overflow summary prompt | fn |
| `applyQueueRuntimeSettings` | `(params)` | `void` | 套用 queue runtime 設定 | fn |
| `elideQueueText` | `(text, limit?)` | `string` | 截斷 queue 文字 | fn |
| `buildQueueSummaryLine` | `(text, limit?)` | `string` | 建構 queue summary 摘要行 | fn |
| `shouldSkipQueueItem` | `(params)` | `boolean` | 檢查 queue item 是否應跳過（dedupe） | fn |
| `applyQueueDropPolicy` | `(params)` | `boolean` | 套用 queue drop policy（summarize/old/new） | fn |
| `waitForQueueDebounce` | `(queue)` | `Promise<void>` | 等待 queue debounce 時間 | fn |
| `beginQueueDrain` | `(map, key)` | `T \| undefined` | 開始 drain queue | fn |
| `drainNextQueueItem` | `(items, run)` | `Promise<boolean>` | drain 下一個 queue item | fn |
| `drainCollectItemIfNeeded` / `drainCollectQueueStep` | `(params)` | `Promise<"skipped" \| "drained" \| "empty">` | cross-channel collect drain | fn |
| `buildQueueSummaryPrompt` | `(params)` | `string \| undefined` | 建構 queue overflow summary prompt | fn |
| `buildCollectPrompt` | `(params)` | `string` | 建構 collect prompt | fn |
| `hasCrossChannelItems` | `(items, resolveKey)` | `boolean` | 檢查 queue 是否有跨 channel 項目 | fn |

#### reaction-level.ts
| export | 簽名 | 回傳 | 說明 | 入口 |
|--------|------|------|------|------|
| `resolveReactionLevel` | `(params)` | `ResolvedReactionLevel` | 解析 reaction 層級（off/ack/minimal/extensive） | fn |

#### run-with-concurrency.ts
| export | 簽名 | 回傳 | 說明 | 入口 |
|--------|------|------|------|------|
| `runTasksWithConcurrency` | `<T>(params)` | `Promise<{ results, firstError, hasError }>` | 並行執行 tasks（限制 concurrency + 錯誤策略） | fn |

#### safe-json.ts
| export | 簽名 | 回傳 | 說明 | 入口 |
|--------|------|------|------|------|
| `safeJsonStringify` | `(value)` | `string \| null` | 安全 JSON stringify（處理 bigint/function/Error/Buffer） | fn |

#### shell-argv.ts
| export | 簽名 | 回傳 | 說明 | 入口 |
|--------|------|------|------|------|
| `splitShellArgs` | `(raw: string)` | `string[] \| null` | POSIX shell 引號感知的 argv 切割 | fn |

#### transcript-tools.ts
| export | 簽名 | 回傳 | 說明 | 入口 |
|--------|------|------|------|------|
| `extractToolCallNames` | `(message)` | `string[]` | 從 message 提取 tool call 名稱 | fn |
| `hasToolCall` | `(message)` | `boolean` | 是否包含 tool call | fn |
| `countToolResults` | `(message)` | `{ total, errors }` | 計算 tool result 數量與錯誤數 | fn |

#### usage-format.ts
| export | 簽名 | 回傳 | 說明 | 入口 |
|--------|------|------|------|------|
| `formatTokenCount` | `(value?)` | `string` | 格式化 token 數（"1.5k", "2.3m"） | fn |
| `formatUsd` | `(value?)` | `string \| undefined` | 格式化 USD 金額 | fn |
| `resolveModelCostConfig` | `(params)` | `ModelCostConfig \| undefined` | 解析 model cost 設定 | fn |
| `estimateUsageCost` | `(params)` | `number \| undefined` | 估算 token usage 成本 | fn |

#### with-timeout.ts
| export | 簽名 | 回傳 | 說明 | 入口 |
|--------|------|------|------|------|
| `withTimeout` | `<T>(promise, timeoutMs)` | `Promise<T>` | Promise 加 timeout 包裝 | fn |

---

### src/logging/

#### levels.ts
| export | 說明 | 入口 |
|--------|------|------|
| `ALLOWED_LOG_LEVELS` | `["silent","fatal","error","warn","info","debug","trace"]` | const |
| `LogLevel` | log level union type | type |
| `tryParseLogLevel(level?)` → `LogLevel \| undefined` | 嘗試解析 log level 字串 | fn |
| `normalizeLogLevel(level?, fallback?)` → `LogLevel` | 正規化 log level（有 fallback） | fn |
| `levelToMinLevel(level)` → `number` | 轉換為 tslog minLevel 數字 | fn |

#### logger.ts — 核心檔案日誌
| export | 說明 | 入口 |
|--------|------|------|
| `getLogger()` → `TsLogger` | 取得/建立 file logger singleton | fn |
| `getChildLogger(bindings?, opts?)` → `TsLogger` | 建立 child logger | fn |
| `toPinoLikeLogger(logger, level)` → `PinoLikeLogger` | 轉換為 pino-like adapter（for Baileys） | fn |
| `isFileLogLevelEnabled(level)` → `boolean` | 檔案日誌是否啟用某 level | fn |
| `setLoggerOverride(settings)` | 測試用：覆蓋 logger 設定 | fn |
| `resetLogger()` | 重設 logger 快取 | fn |
| `registerLogTransport(transport)` → `() => void` | 註冊外部 log transport | fn |
| `DEFAULT_LOG_DIR` / `DEFAULT_LOG_FILE` | 預設日誌目錄/檔案 | const |

#### console.ts — Console 日誌捕獲
| export | 說明 | 入口 |
|--------|------|------|
| `enableConsoleCapture()` | 攔截 console.* 輸出並轉發至 file logger | fn |
| `routeLogsToStderr()` | 將 console 輸出導向 stderr（RPC 模式） | fn |
| `getConsoleSettings()` → `ConsoleLoggerSettings` | 取得 console log 設定 | fn |
| `setConsoleSubsystemFilter(filters?)` | 設定 console subsystem 過濾器 | fn |
| `setConsoleTimestampPrefix(enabled)` | 啟用/停用 console timestamp prefix | fn |
| `shouldLogSubsystemToConsole(subsystem)` → `boolean` | 是否應將 subsystem 日誌輸出至 console | fn |

#### subsystem.ts — Subsystem Logger 工廠
| export | 說明 | 入口 |
|--------|------|------|
| `createSubsystemLogger(subsystem)` → `SubsystemLogger` | 建立 subsystem logger（同時輸出 file + console） | fn |
| `runtimeForLogger(logger, exit?)` → `RuntimeEnv` | 從 logger 建立 RuntimeEnv | fn |
| `createSubsystemRuntime(subsystem, exit?)` → `RuntimeEnv` | 一步建立 subsystem RuntimeEnv | fn |
| `stripRedundantSubsystemPrefixForConsole(message, displaySubsystem)` → `string` | 移除 console 中重複的 subsystem prefix | fn |

#### diagnostic.ts — 診斷事件記錄
| export | 說明 | 入口 |
|--------|------|------|
| `logWebhookReceived/Processed/Error(params)` | 記錄 webhook 事件 | fn |
| `logMessageQueued/Processed(params)` | 記錄訊息佇列/處理事件 | fn |
| `logSessionStateChange/Stuck(params)` | 記錄 session 狀態變更/卡住 | fn |
| `logLaneEnqueue/Dequeue(lane, ...)` | 記錄 command lane 事件 | fn |
| `logRunAttempt(params)` | 記錄 run attempt | fn |
| `logToolLoopAction(params)` | 記錄 tool loop 偵測事件 | fn |
| `startDiagnosticHeartbeat(config?)` / `stopDiagnosticHeartbeat()` | 啟動/停止 30s 心跳診斷 | fn |
| `resolveStuckSessionWarnMs(config?)` → `number` | 解析 stuck session 警告閾值 | fn |

#### diagnostic-session-state.ts
| export | 說明 | 入口 |
|--------|------|------|
| `diagnosticSessionStates` | session 狀態 Map | const |
| `getDiagnosticSessionState(ref)` → `SessionState` | 取得/建立 session 診斷狀態 | fn |
| `pruneDiagnosticSessionStates(now?, force?)` | 清除過期 session 狀態 | fn |

#### 其他
| 檔案 | 主要 export | 說明 |
|------|------------|------|
| `config.ts` | `readLoggingConfig()` | 從設定檔讀取 logging 區段 |
| `env-log-level.ts` | `resolveEnvLogLevelOverride()` | 讀取 `OPENCLAW_LOG_LEVEL` env |
| `node-require.ts` | `resolveNodeRequireFromMeta(metaUrl)` | 安全取得 createRequire |
| `parse-log-line.ts` | `parseLogLine(raw)` → `ParsedLogLine \| null` | 解析 JSON log 行 |
| `redact.ts` | `redactSensitiveText(text, options?)`, `redactToolDetail(detail)`, `getDefaultRedactPatterns()` | 敏感資訊遮蔽（API keys, tokens, PEM） |
| `redact-bounded.ts` | `replacePatternBounded(text, pattern, replacer, options?)` | 分段 regex replace（避免大文字 ReDoS） |
| `redact-identifier.ts` | `sha256HexPrefix(value, len?)`, `redactIdentifier(value, opts?)` | SHA256 prefix 遮蔽識別碼 |
| `state.ts` | `loggingState` | 日誌系統全域可變狀態 |
| `timestamps.ts` | `isValidTimeZone(tz)`, `formatLocalIsoWithOffset(now, tz?)` | 時區感知 ISO 格式化 |
| `test-helpers/console-snapshot.ts` | `captureConsoleSnapshot()`, `restoreConsoleSnapshot(snapshot)` | 測試用：快照/還原 console |

---

### src/process/

| 檔案 | 主要 export | 說明 |
|------|------------|------|
| `exec.ts` | `runExec(command, args, opts?)`, `runCommandWithTimeout(argv, opts)`, `resolveCommandEnv(params)`, `shouldSpawnWithShell(params)` | 進程執行核心（支援 Windows .cmd/.bat 解析、timeout、no-output-timeout） |
| `command-queue.ts` | `enqueueCommand(task, opts?)`, `enqueueCommandInLane(lane, task, opts?)`, `setCommandLaneConcurrency(lane, max)`, `getQueueSize(lane?)`, `clearCommandLane(lane?)`, `resetAllLanes()`, `markGatewayDraining()`, `waitForActiveTasks(timeoutMs)`, `getActiveTaskCount()` | 指令佇列系統（多 lane 並行控制 + restart recovery） |
| `kill-tree.ts` | `killProcessTree(pid, opts?)` | 進程樹終止（Unix: SIGTERM→SIGKILL, Windows: taskkill /T） |
| `child-process-bridge.ts` | `attachChildProcessBridge(child, opts?)` | 轉發 parent signals 至 child process |
| `lanes.ts` | `CommandLane` enum | 指令 lane 定義（Main/Cron/Subagent/Nested） |
| `restart-recovery.ts` | `createRestartIterationHook(onRestart)` | In-process restart iteration hook |
| `spawn-utils.ts` | `spawnWithFallback(params)`, `resolveCommandStdio(params)`, `formatSpawnError(err)` | Spawn 工具（含 fallback 重試機制） |
| `windows-command.ts` | `resolveWindowsCommandShim(params)` | Windows 指令 .cmd shim 解析 |
| `test-timeouts.ts` | `PROCESS_TEST_TIMEOUT_MS`, `PROCESS_TEST_SCRIPT_DELAY_MS`, `PROCESS_TEST_NO_OUTPUT_TIMEOUT_MS` | 測試 timeout 常數 |

#### process/supervisor/
| 檔案 | 主要 export | 說明 |
|------|------------|------|
| `index.ts` | `getProcessSupervisor()`, `createProcessSupervisor()` | Process supervisor singleton 入口 |
| `supervisor.ts` | `createProcessSupervisor()` → `ProcessSupervisor` | 建立 supervisor（spawn/cancel/cancelScope） |
| `registry.ts` | `createRunRegistry(options?)` → `RunRegistry` | Run record 註冊表（add/get/list/finalize/prune） |
| `types.ts` | `ProcessSupervisor`, `ManagedRun`, `RunExit`, `RunRecord`, `SpawnInput`, `SpawnMode`, `TerminationReason` | Supervisor 型別定義 |
| `adapters/child.ts` | `createChildAdapter(params)` → `Promise<ChildAdapter>` | Child process spawn adapter |
| `adapters/pty.ts` | `createPtyAdapter(params)` → `Promise<PtyAdapter>` | PTY spawn adapter（node-pty） |
| `adapters/env.ts` | `toStringEnv(env?)` | env 轉字串 Record |

---

### src/daemon/

背景服務安裝/管理層，支援三大平台：

| 子系統 | 主要檔案 | 關鍵 export |
|--------|---------|------------|
| **macOS (launchd)** | `launchd.ts`, `launchd-plist.ts`, `launchd-restart-handoff.ts` | `installLaunchAgent`, `uninstallLaunchAgent`, `stopLaunchAgent`, `restartLaunchAgent`, `buildLaunchAgentPlist`, `scheduleDetachedLaunchdRestartHandoff` |
| **Linux (systemd)** | `systemd.ts`, `systemd-unit.ts`, `systemd-linger.ts`, `systemd-hints.ts` | `installSystemdService`, `uninstallSystemdService`, `stopSystemdService`, `restartSystemdService`, `buildSystemdUnit`, `enableSystemdUserLinger` |
| **Windows (schtasks)** | `schtasks.ts`, `schtasks-exec.ts` | `installScheduledTask`, `uninstallScheduledTask`, `stopScheduledTask`, `restartScheduledTask`, `execSchtasks` |
| **統一入口** | `service.ts` | `resolveGatewayService()` → `GatewayService`（依平台自動選擇 launchd/systemd/schtasks） |
| **Node 服務** | `node-service.ts` | `resolveNodeService()` |
| **設定常數** | `constants.ts` | `GATEWAY_LAUNCH_AGENT_LABEL`, `GATEWAY_SYSTEMD_SERVICE_NAME`, `GATEWAY_WINDOWS_TASK_NAME`, profile 解析函式 |
| **Runtime** | `runtime-binary.ts`, `runtime-format.ts`, `runtime-hints.ts`, `runtime-parse.ts`, `runtime-paths.ts` | `isNodeRuntime`, `isBunRuntime`, `resolveSystemNodePath`, `resolvePreferredNodePath`, `formatRuntimeStatus` |
| **服務環境** | `service-env.ts`, `service-runtime.ts`, `service-types.ts` | `buildServiceEnvironment`, `buildMinimalServicePath`, service 型別 |
| **稽核** | `service-audit.ts` | `auditGatewayServiceConfig`, `checkTokenDrift`, `needsNodeRuntimeMigration` |
| **工具** | `arg-split.ts`, `cmd-argv.ts`, `cmd-set.ts`, `exec-file.ts`, `output.ts`, `paths.ts`, `diagnostics.ts`, `inspect.ts`, `program-args.ts` | 引數解析、cmd.exe argv 處理、路徑解析、服務診斷 |

---

### src/terminal/

| 檔案 | 主要 export | 說明 |
|------|------------|------|
| `ansi.ts` | `stripAnsi(input)`, `splitGraphemes(input)`, `sanitizeForLog(v)`, `visibleWidth(input)` | ANSI 處理（移除色碼、計算可見寬度、grapheme 切割） |
| `table.ts` | `renderTable(opts)`, `getTerminalTableWidth(min?, fallback?)` | 終端 table 渲染（對齊、截斷、border） |
| `theme.ts` | `theme`, `isRich()`, `colorize(rich, color, value)` | 終端主題（chalk 色彩定義） |
| `palette.ts` | `LOBSTER_PALETTE` | 品牌色票 |
| `progress-line.ts` | `registerActiveProgressLine(stream)`, `clearActiveProgressLine()`, `unregisterActiveProgressLine(stream?)` | 進度列控制 |
| `stream-writer.ts` | `createSafeStreamWriter(options?)` → `SafeStreamWriter` | 安全 stream writer（處理 EPIPE） |
| `safe-text.ts` | `sanitizeTerminalText(input)` | 清除終端不安全字元 |
| `restore.ts` | `restoreTerminalState(...)` | 還原終端狀態（cursor、raw mode） |
| `prompt-style.ts` | `stylePromptMessage`, `stylePromptTitle`, `stylePromptHint` | Prompt 樣式函式 |
| `prompt-select-styled.ts` | `selectStyled(params)` | 帶樣式的 select prompt |
| `links.ts` | `formatDocsLink(path, label?)`, `formatDocsRootLink(label?)` | 文件連結格式化 |
| `health-style.ts` | `styleHealthChannelLine(line, rich)` | Health check 輸出樣式 |
| `note.ts` | `note(message, title?)`, `wrapNoteMessage(message, title?)` | 框線 note 元件 |

---

### src/tui/

| 檔案 | 主要 export | 說明 |
|------|------------|------|
| `tui.ts` | `runTui(opts)`, `createEditorSubmitHandler(params)`, `createSubmitBurstCoalescer(params)`, `resolveTuiSessionKey(params)`, `resolveInitialTuiAgentId(params)`, `resolveGatewayDisconnectState(reason?)`, `resolveCtrlCAction(params)` | TUI 主入口與核心邏輯 |
| `commands.ts` | `parseCommand(input)`, `getSlashCommands(options?)`, `helpText(options?)` | Slash command 解析與列表 |
| `gateway-chat.ts` | `GatewayChatClient` class, `resolveGatewayConnection(params)` | Gateway WebSocket 聊天客戶端 |
| `tui-formatters.ts` | `resolveFinalAssistantText(params)`, `composeThinkingAndContent(params)`, `extractThinkingFromMessage(msg)`, `extractContentFromMessage(msg)`, `extractTextFromMessage(msg, opts?)`, `formatTokens(total?, context?)`, `formatContextUsageLine(params)`, `isCommandMessage(msg)` | TUI 格式化工具 |
| `tui-stream-assembler.ts` | `TuiStreamAssembler` class | 串流訊息組裝器 |
| `tui-event-handlers.ts` | `createEventHandlers(context)` | TUI event handler 工廠 |
| `tui-command-handlers.ts` | `createCommandHandlers(context)` | TUI command handler 工廠 |
| `tui-session-actions.ts` | `createSessionActions(context)` | Session 操作（new/switch/rename/delete） |
| `tui-overlays.ts` | `createOverlayHandlers(host, fallbackFocus)` | Overlay UI handler |
| `tui-local-shell.ts` | `createLocalShellRunner(deps)` | 本地 shell 執行器 |
| `tui-waiting.ts` | `pickWaitingPhrase(tick, phrases?)`, `shimmerText(theme, text, tick)`, `buildWaitingStatusMessage(params)` | 等待動畫 |
| `tui-status-summary.ts` | `formatStatusSummary(summary)` | Gateway 狀態摘要格式化 |
| `tui-types.ts` | `TuiOptions`, `ChatEvent`, `BtwEvent`, `AgentEvent`, `SessionInfo`, `GatewayStatusSummary` 等 | TUI 型別定義 |
| `osc8-hyperlinks.ts` | `wrapOsc8(url, text)`, `extractUrls(markdown)`, `addOsc8Hyperlinks(lines, urls)` | OSC8 超連結支援 |
| `theme/theme.ts` | `theme`, `palette`, `markdownTheme`, `selectListTheme` 等 | TUI 主題配色 |
| `theme/syntax-theme.ts` | `createSyntaxTheme(...)` | 語法高亮主題 |
| `components/*.ts` | `AssistantMessageComponent`, `UserMessageComponent`, `ChatLog`, `ToolExecutionComponent`, `FilterableSelectList`, `SearchableSelectList`, `HyperlinkMarkdown`, `CustomEditor`, `BtwInlineMessage`, `MarkdownMessageComponent` | TUI UI 元件 |
| `components/fuzzy-filter.ts` | `fuzzyMatchLower(query, text)`, `fuzzyFilterLower(items, queryLower)`, `prepareSearchItems(...)` | 模糊搜尋篩選 |
| `components/selectors.ts` | `createSelectList(items, max?)`, `createSearchableSelectList(...)`, `createFilterableSelectList(...)`, `createSettingsList(...)` | 選單元件工廠 |

---

### src/wizard/

| 檔案 | 主要 export | 說明 |
|------|------------|------|
| `onboarding.ts` | `runOnboardingWizard(...)` | Onboarding 精靈主流程 |
| `onboarding.gateway-config.ts` | `configureGatewayForOnboarding(...)` | Onboarding gateway 設定 |
| `onboarding.secret-input.ts` | `resolveOnboardingSecretInputString(params)` | Onboarding secret 輸入解析 |
| `onboarding.completion.ts` | `setupOnboardingShellCompletion(params)` | Shell 自動補全設定 |
| `onboarding.finalize.ts` | `finalizeOnboardingWizard(...)` | Onboarding 最終化 |
| `onboarding.types.ts` | `WizardFlow`, `QuickstartGatewayDefaults`, `GatewayWizardSettings` | Wizard 型別 |
| `session.ts` | `WizardSession` class | 精靈 session 控制（step 狀態機） |
| `prompts.ts` | `WizardPrompter` type, `WizardCancelledError` | 精靈 prompt 抽象介面 |
| `clack-prompter.ts` | `createClackPrompter()`, `tokenizedOptionFilter(search, option)` | Clack UI prompt 實作 |

---

### src/node-host/

| 檔案 | 主要 export | 說明 |
|------|------------|------|
| `runner.ts` | `runNodeHost(opts)`, `resolveNodeHostGatewayCredentials(params)` | Node 宿主主迴圈 |
| `invoke.ts` | `handleInvoke(...)`, `sanitizeEnv(overrides?)`, `parseWindowsCodePage(raw)`, `decodeCapturedOutputBuffer(params)`, `coerceNodeInvokePayload(payload)`, `buildNodeInvokeResultParams(...)` | Invoke 核心處理 |
| `invoke-system-run.ts` | `handleSystemRunInvoke(opts)` | System run invoke 處理（exec 指令） |
| `invoke-system-run-plan.ts` | `buildSystemRunApprovalPlan(params)`, `hardenApprovedExecutionPaths(params)`, `revalidateApprovedCwdSnapshot(params)`, `resolveMutableFileOperandSnapshotSync(params)` | System run 審核計畫 |
| `invoke-system-run-allowlist.ts` | `evaluateSystemRunAllowlist(params)`, `resolveSystemRunExecArgv(params)`, `applyOutputTruncation(result)` | Allowlist 評估與 exec argv 解析 |
| `invoke-browser.ts` | `runBrowserProxyCommand(paramsJSON?)` | 瀏覽器代理指令 |
| `exec-policy.ts` | `evaluateSystemRunPolicy(params)`, `resolveExecApprovalDecision(value)`, `formatSystemRunAllowlistMissMessage(params?)` | Exec 策略決策 |
| `invoke-types.ts` | `SystemRunParams`, `RunResult`, `ExecEventPayload`, `SkillBinsProvider` | Invoke 型別 |
| `config.ts` | `resolveNodeHostConfigPath()`, `loadNodeHostConfig()`, `saveNodeHostConfig(config)`, `ensureNodeHostConfig()` | Node host 設定檔管理 |
| `with-timeout.ts` | `withTimeout<T>(promise, timeoutMs, abortController?)` | Promise timeout（含 AbortController） |

---

### src/providers/

| 檔案 | 主要 export | 說明 |
|------|------------|------|
| `github-copilot-auth.ts` | `githubCopilotLoginCommand(...)` | GitHub Copilot 登入指令 |
| `github-copilot-token.ts` | `resolveCopilotApiToken(params)`, `deriveCopilotApiBaseUrlFromToken(token)`, `DEFAULT_COPILOT_API_BASE_URL` | Copilot API token 解析 |
| `github-copilot-models.ts` | `getDefaultCopilotModelIds()`, `buildCopilotModelDefinition(modelId)` | Copilot model 定義 |
| `kilocode-shared.ts` | `KILOCODE_BASE_URL`, `KILOCODE_MODEL_CATALOG`, `KILOCODE_DEFAULT_*` 常數 | Kilocode provider 共用常數 |
| `qwen-portal-oauth.ts` | `refreshQwenPortalCredentials(...)` | Qwen Portal OAuth refresh |

---

### src/compat/

#### legacy-names.ts
| export | 說明 | 入口 |
|--------|------|------|
| `PROJECT_NAME` | `"openclaw"` | const |
| `MANIFEST_KEY` | manifest key（= PROJECT_NAME） | const |
| `LEGACY_PROJECT_NAMES` / `LEGACY_MANIFEST_KEYS` / `LEGACY_PLUGIN_MANIFEST_FILENAMES` / `LEGACY_CANVAS_HANDLER_NAMES` | 舊名稱相容清單（目前皆為空陣列） | const |
| `MACOS_APP_SOURCES_DIR` / `LEGACY_MACOS_APP_SOURCES_DIRS` | macOS app 來源路徑 | const |

---

### src/test-helpers/

| 檔案 | 主要 export | 說明 |
|------|------------|------|
| `http.ts` | `jsonResponse(body, status?)`, `requestUrl(input)`, `requestBodyText(body)` | HTTP mock 工具 |
| `ssrf.ts` | `mockPinnedHostnameResolution(addresses?)` | SSRF hostname 解析 mock |
| `state-dir-env.ts` | `snapshotStateDirEnv()`, `restoreStateDirEnv(snapshot)`, `setStateDirEnv(stateDir)`, `withStateDirEnv(stateDir, fn)` | State dir env 快照/還原 |
| `temp-dir.ts` | `withTempDir(prefix, run)` | 臨時目錄包裝 |
| `workspace.ts` | `makeTempWorkspace(prefix?)`, `writeWorkspaceFile(params)` | 臨時 workspace 建立 |
| `whatsapp-outbound.ts` | `createWhatsAppPollFixture()`, `expectWhatsAppPollSent(...)` | WhatsApp poll fixture |

---

### src/test-utils/

| 檔案 | 主要 export | 說明 |
|------|------------|------|
| `env.ts` | `captureEnv(keys)`, `captureFullEnv()`, `withEnv(env, fn)`, `withEnvAsync(env, fn)` | 環境變數快照/隔離 |
| `temp-dir.ts` | `withTempDir(prefix, run)` | 臨時目錄 |
| `temp-home.ts` | `createTempHomeEnv(prefix)` → `TempHomeEnv` | 臨時 HOME 環境 |
| `frozen-time.ts` | `useFrozenTime(at)`, `useRealTime()` | 凍結時間 |
| `ports.ts` | `getDeterministicFreePortBlock(params?)`, `getFreePortBlockWithPermissionFallback(params)` | 取得可用 port |
| `fetch-mock.ts` | `withFetchPreconnect(fn)` | Fetch mock with preconnect |
| `mock-http-response.ts` | `createMockServerResponse()` | Mock HTTP ServerResponse |
| `model-auth-mock.ts` | `createModelAuthMockModule()` | Model auth mock |
| `model-fallback.mock.ts` | `runWithModelFallback(params)` | Model fallback mock |
| `fixture-suite.ts` | `createFixtureSuite(rootPrefix)` | Test fixture 組織工具 |
| `typed-cases.ts` | `typedCases<T>(cases)` | 型別安全 test cases |
| `vitest-mock-fn.ts` | `MockFn<T>` type | Vitest mock 型別 |
| `command-runner.ts` | `runRegisteredCli(params)` | CLI command 測試 runner |
| `repo-scan.ts` | `listRepoFiles(...)`, `listRuntimeSourceFiles(...)`, `shouldSkipRuntimeSourcePath(path)` | Repo 檔案掃描 |
| `runtime-source-guardrail-scan.ts` | `loadRuntimeSourceFilesForGuardrails(...)`, `shouldSkipGuardrailRuntimeSource(path)` | Runtime source 掃描 |
| `channel-plugins.ts` | `createTestRegistry(channels?)`, `createChannelTestPluginBase(params)`, `createMSTeamsTestPlugin(params?)`, `createOutboundTestPlugin(params)` | Channel plugin 測試工具 |
| `exec-assertions.ts` | `expectSingleNpmInstallIgnoreScriptsCall(params)`, `expectSingleNpmPackIgnoreScriptsCall(params)` | Exec 斷言 |
| `npm-spec-install-test-helpers.ts` | `createSuccessfulSpawnResult(stdout?)`, `expectUnsupportedNpmSpec(...)`, `mockNpmPackMetadataResult(...)`, `expectIntegrityDriftRejected(params)` | NPM install 測試工具 |
| `send-payload-contract.ts` | `installSendPayloadContractSuite(params)`, `primeSendMock(...)` | Send payload 契約測試 |
| `tracked-temp-dirs.ts` | `createTrackedTempDirs()` | 追蹤臨時目錄（自動清理） |
| `symlink-rebind-race.ts` | `createRebindableDirectoryAlias(params)`, `withRealpathSymlinkRebindRace(params)` | Symlink race condition 測試 |
| 其他 | `createInternalHookEventPayload(...)`, `buildSystemRunPreparePayload(params)`, `createIMessageTestPlugin(params?)`, `withTempSecretFiles(run)`, `countLines(text)`, `hasBalancedFences(chunk)` | 各種測試 fixture |

---

## 呼叫關聯圖

```
shared/config-eval ──→ shared/requirements ──→ entry-status
shared/frontmatter ──→ utils/boolean, compat/legacy-names
shared/entry-metadata ←── shared/entry-status
shared/net/ipv4 ──→ shared/net/ip
shared/node-match ←── shared/node-resolve
shared/text/assistant-visible-text ──→ text/code-regions, text/reasoning-tags
shared/text/reasoning-tags ──→ text/code-regions

utils/delivery-context ──→ utils/account-id, utils/message-channel
utils/account-id ──→ routing/account-id
utils/message-channel ──→ channels/registry, gateway/protocol/client-info, plugins/runtime
utils/usage-format ──→ agents/usage, config/config

logging/console ──→ logging/config, logging/env-log-level, logging/levels, logging/logger, logging/state, logging/timestamps
logging/logger ──→ logging/config, logging/env-log-level, logging/levels, logging/state, logging/timestamps, infra/tmp-openclaw-dir
logging/subsystem ──→ logging/console, logging/levels, logging/logger, logging/state
logging/diagnostic ──→ logging/diagnostic-session-state, logging/subsystem, config/config, infra/diagnostic-events
logging/redact ──→ logging/redact-bounded, security/safe-regex

process/exec ──→ process/spawn-utils, process/windows-command, infra/openclaw-exec-env
process/command-queue ──→ logging/diagnostic, shared/global-singleton, process/lanes
process/kill-tree （獨立）
process/supervisor/supervisor ──→ supervisor/adapters/child, supervisor/adapters/pty, supervisor/registry
process/supervisor/adapters/child ──→ process/kill-tree, process/spawn-utils, process/windows-command
process/supervisor/adapters/pty ──→ process/kill-tree

daemon/service ──→ daemon/launchd, daemon/systemd, daemon/schtasks（依平台分發）
daemon/launchd ──→ daemon/constants, daemon/launchd-plist, daemon/service-types
daemon/systemd ──→ daemon/constants, daemon/systemd-unit, daemon/systemd-linger, daemon/service-types
daemon/schtasks ──→ daemon/constants, daemon/cmd-argv, daemon/schtasks-exec, daemon/service-types

tui/tui ──→ tui/commands, tui/gateway-chat, tui/tui-formatters, tui/tui-types
tui/gateway-chat ──→ gateway WebSocket
tui/tui-formatters ──→ shared/text/reasoning-tags

wizard/onboarding ──→ wizard/session, wizard/prompts, wizard/clack-prompter

node-host/invoke ──→ node-host/invoke-system-run, node-host/invoke-browser, node-host/exec-policy
node-host/invoke-system-run ──→ node-host/invoke-system-run-plan, node-host/invoke-system-run-allowlist
```

---

## 系統歸屬分類

| 系統 | 目錄 | 角色 |
|------|------|------|
| **核心共用層** | `shared/`, `utils/`, `compat/` | 零外部依賴的純函式與型別，全專案可引用 |
| **日誌系統** | `logging/` | File logger + console capture + subsystem logger + 診斷 heartbeat |
| **進程管理** | `process/` | 指令佇列、spawn/exec、supervisor（child + PTY）、kill tree |
| **背景服務** | `daemon/` | 三平台 service 安裝/管理（launchd/systemd/schtasks） + runtime path 解析 + 稽核 |
| **終端控制** | `terminal/` | ANSI 處理、table 渲染、theme、進度列、prompt 樣式 |
| **TUI 介面** | `tui/` | 完整 TUI 應用（chat client、slash commands、stream assembler、UI 元件） |
| **設定精靈** | `wizard/` | Onboarding wizard（step 狀態機 + clack UI） |
| **遠端宿主** | `node-host/` | Node 遠端 invoke（exec policy、allowlist、browser proxy、approval plan） |
| **Provider 抽象** | `providers/` | GitHub Copilot / Kilocode / Qwen / Google 共用邏輯 |
| **測試基礎** | `test-helpers/`, `test-utils/` | 測試輔助（env 隔離、temp dir、mock、fixture、contract suite） |
