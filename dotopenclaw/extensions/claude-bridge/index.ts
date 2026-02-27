/**
 * claude-bridge plugin — inject prompts into VS Code Claude Code or run CLI.
 * Zero external dependencies. Uses fetch() to local bridge HTTP service.
 *
 * Tools:
 * - claude_code_inject: UI automation to inject prompt into VS Code Claude
 * - claude_code_observe: Screenshot VS Code to observe Claude's response
 * - claude_code_execute: Headless CLI fallback (when VS Code is not open)
 */

const BRIDGE_URL = "http://127.0.0.1:3847";
const BRIDGE_TOKEN = "openclaw-bridge-default-token";
const TIMEOUT_MS = 15_000;
const CLI_TIMEOUT_MS = 190_000;

async function bridgeCall(
  endpoint: string,
  body: Record<string, unknown> = {},
  timeout = TIMEOUT_MS
): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(`${BRIDGE_URL}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${BRIDGE_TOKEN}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `Bridge HTTP ${res.status}: ${errText}` };
    }
    return await res.json();
  } catch (err: any) {
    clearTimeout(timer);
    if (err?.name === "AbortError") {
      return { success: false, error: "Bridge request timed out" };
    }
    return {
      success: false,
      error: `Bridge unreachable (127.0.0.1:3847). 請確認 bridge service 有在跑。`,
    };
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function errorContent(msg: string) {
  return { content: [{ type: "text", text: `Error: ${msg}` }] };
}

function textContent(text: string) {
  return { content: [{ type: "text", text }] };
}

export default function (api: any) {
  // --- UI Injection into VS Code Claude ---
  api.registerTool({
    name: "claude_code_inject",
    description:
      "Inject a prompt into the Claude Code conversation in VS Code via UI automation. " +
      "This focuses the VS Code window, opens the Claude Code input, pastes the prompt, and submits it. " +
      "Use this when the user requests Claude Code execution via /vscc, /vsccc, /vscodeclaudecode, " +
      "or phrases like '用 claude code', '請用電腦執行', '用本機的 claude 做'. " +
      "After injecting, use claude_code_observe to check the result.",
    parameters: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description:
            "The task prompt to inject into Claude Code. Should be clear and self-contained.",
        },
      },
      required: ["prompt"],
    },
    async execute(_toolCallId: string, params: Record<string, unknown>) {
      const prompt = String(params.prompt || "").trim();
      if (!prompt) return errorContent("Prompt is empty");

      // Step 1: Focus VS Code
      const focus = await bridgeCall("/computer/window-focus", {
        processName: "Code",
      });
      if (!focus.success) {
        return textContent(
          `VS Code 視窗找不到（可能沒開）。建議改用 claude_code_execute (CLI 模式)。\n${focus.error}`
        );
      }
      await sleep(500);

      // Step 2: Open Command Palette
      await bridgeCall("/computer/key", { key: "ctrl+shift+p" });
      await sleep(600);

      // Step 3: Type command to focus Claude input
      await bridgeCall("/computer/clipboard", {
        text: "Claude Code: Focus Input",
      });
      await bridgeCall("/computer/key", { key: "ctrl+v" });
      await sleep(400);

      // Step 4: Execute command
      await bridgeCall("/computer/key", { key: "enter" });
      await sleep(800);

      // Step 5: Clear any existing text in input (select all + delete)
      await bridgeCall("/computer/key", { key: "ctrl+a" });
      await sleep(100);
      await bridgeCall("/computer/key", { key: "delete" });
      await sleep(200);

      // Step 6: Paste the prompt
      await bridgeCall("/computer/clipboard", { text: prompt });
      await bridgeCall("/computer/key", { key: "ctrl+v" });
      await sleep(300);

      // Step 7: Submit
      await bridgeCall("/computer/key", { key: "enter" });

      return textContent(
        `已將 prompt 注入 VS Code Claude Code：\n"${prompt.slice(0, 100)}${prompt.length > 100 ? "..." : ""}"\n\n` +
        `Claude Code 正在執行中。請等待 30-120 秒後使用 claude_code_observe 觀察結果。`
      );
    },
  });

  // --- Observe Claude Code result ---
  api.registerTool({
    name: "claude_code_observe",
    description:
      "Take a screenshot of VS Code to observe Claude Code's execution progress or result. " +
      "Use this after claude_code_inject to check if Claude Code has finished and what the output is. " +
      "The screenshot will be returned as an image for you to interpret.",
    parameters: {
      type: "object",
      properties: {},
    },
    async execute(_toolCallId: string, _params: Record<string, unknown>) {
      // Focus VS Code first
      await bridgeCall("/computer/window-focus", { processName: "Code" });
      await sleep(300);

      // Take screenshot
      const result = await bridgeCall("/computer/screenshot");
      if (!result.success) return errorContent(result.error);

      return {
        content: [
          {
            type: "text",
            text: "VS Code 截圖如下。請觀察 Claude Code 的輸出內容，判斷是否已完成，並摘要結果回傳給使用者。",
          },
          {
            type: "image",
            source: {
              type: "base64",
              media_type: "image/png",
              data: result.image,
            },
          },
        ],
      };
    },
  });

  // --- CLI Headless Execution (Fallback) ---
  api.registerTool({
    name: "claude_code_execute",
    description:
      "Execute a task via Claude Code CLI in headless mode (no VS Code needed). " +
      "Use this as a fallback when VS Code is not open, or when claude_code_inject fails. " +
      "The result is captured and returned directly. " +
      "Timeout: ~3 minutes. Queue: max 3 pending tasks.",
    parameters: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description:
            "The task prompt for Claude Code CLI. Should be clear and self-contained.",
        },
        workingDirectory: {
          type: "string",
          description:
            "Working directory for Claude Code. Default: C:\\OpenClawWorkspace",
        },
      },
      required: ["prompt"],
    },
    async execute(_toolCallId: string, params: Record<string, unknown>) {
      const prompt = String(params.prompt || "").trim();
      if (!prompt) return errorContent("Prompt is empty");

      const result = await bridgeCall(
        "/claude/execute",
        {
          prompt,
          workingDirectory: params.workingDirectory,
        },
        CLI_TIMEOUT_MS
      );

      if (!result.success) {
        return textContent(`Claude Code CLI 執行失敗：${result.error}`);
      }

      // Truncate for LINE message limit
      let output = String(result.result || "(no output)");
      const MAX_LEN = 4000;
      if (output.length > MAX_LEN) {
        output =
          output.slice(0, MAX_LEN) +
          `\n\n[... 截斷，完整輸出 ${result.result.length} 字元]`;
      }

      const duration = result.durationMs
        ? ` (耗時 ${(result.durationMs / 1000).toFixed(1)}s)`
        : "";

      return textContent(`Claude Code 結果${duration}：\n\n${output}`);
    },
  });
}
