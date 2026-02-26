# Long-Term Memory

> Agent 的長期記憶。僅在 main session（1:1 DM）中載入。
> 不要在群組/共用 session 中載入（安全考量）。

---

## 關於 holylight

- 跨平台使用者：Discord + LINE（已配對，共用 session via identityLinks）
- 偏好：輕量極簡、高可讀性、反對過度綁定
- 有 Claude Max + ChatGPT 訂閱
- 原子記憶系統設計者（ai-kb-framework 作者）

## 工程決策

- LLM：OpenAI Codex OAuth (gpt-5.3-codex)，走 ChatGPT 訂閱
- 安全：config 級 deny list 優先於 prompt 級指令（compaction 會丟 prompt）
- 環境：Windows 11，無 Docker，sandbox off，用 tools.deny 補償
- LINE webhook：ngrok 免費方案，URL 不固定，重啟需手動更新 LINE Console
- 跨頻道讀取：discord-reader 自訂 plugin（LINE 原生不支援 message read）

## 重要事件

- 2026-02-26：初始安裝、Discord/LINE 整合、原子記憶系統整合
- 2026-02-26：發現 LINE plugin 不支援 message read → 建 discord-reader plugin 解決
- 2026-02-26：所有設定打包至 GitHub repo (OpenClaw-AtomicMemory)
- 2026-02-26：升級 v2026.2.24 → v2026.2.25
