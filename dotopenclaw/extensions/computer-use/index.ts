/**
 * computer-use plugin — desktop automation via bridge service.
 * Zero external dependencies. Uses fetch() to local bridge HTTP service.
 * Tool names match Anthropic computer-use MCP for consistency.
 */

const BRIDGE_URL = "http://127.0.0.1:3847";
const BRIDGE_TOKEN = "openclaw-bridge-default-token";
const TIMEOUT_MS = 15_000;

async function bridgeCall(
  endpoint: string,
  body: Record<string, unknown> = {}
): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
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
      error: `Bridge unreachable: ${err?.message || String(err)}`,
    };
  }
}

function errorContent(msg: string) {
  return { content: [{ type: "text", text: `Error: ${msg}` }] };
}

export default function (api: any) {
  // --- Screenshot ---
  api.registerTool({
    name: "computer_screenshot",
    description:
      "Take a screenshot of the entire screen. Returns a PNG image. " +
      "Use this to observe what is currently displayed on the desktop.",
    parameters: {
      type: "object",
      properties: {},
    },
    async execute(_toolCallId: string, _params: Record<string, unknown>) {
      const result = await bridgeCall("/computer/screenshot");
      if (!result.success) return errorContent(result.error);
      return {
        content: [
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

  // --- Click ---
  api.registerTool({
    name: "computer_click",
    description:
      "Click the mouse at specific screen coordinates. " +
      "Use after taking a screenshot to identify the target position.",
    parameters: {
      type: "object",
      properties: {
        x: { type: "integer", description: "X coordinate (pixels from left)" },
        y: { type: "integer", description: "Y coordinate (pixels from top)" },
        button: {
          type: "string",
          enum: ["left", "right"],
          description: "Mouse button (default: left)",
        },
        doubleClick: {
          type: "boolean",
          description: "Double-click (default: false)",
        },
      },
      required: ["x", "y"],
    },
    async execute(_toolCallId: string, params: Record<string, unknown>) {
      const result = await bridgeCall("/computer/click", params);
      if (!result.success) return errorContent(result.error);
      return {
        content: [{ type: "text", text: `Clicked at (${params.x}, ${params.y})` }],
      };
    },
  });

  // --- Type text ---
  api.registerTool({
    name: "computer_type",
    description:
      "Type text into the currently focused input field. " +
      "Uses clipboard paste for reliability with unicode and special characters.",
    parameters: {
      type: "object",
      properties: {
        text: { type: "string", description: "Text to type" },
      },
      required: ["text"],
    },
    async execute(_toolCallId: string, params: Record<string, unknown>) {
      const result = await bridgeCall("/computer/type", params);
      if (!result.success) return errorContent(result.error);
      return {
        content: [{ type: "text", text: `Typed ${result.length} characters` }],
      };
    },
  });

  // --- Key press ---
  api.registerTool({
    name: "computer_key",
    description:
      "Send a keyboard shortcut or special key press. " +
      'Format: modifier+key, e.g. "ctrl+shift+p", "enter", "ctrl+v", "alt+tab".',
    parameters: {
      type: "object",
      properties: {
        key: {
          type: "string",
          description:
            'Key combo string, e.g. "ctrl+shift+p", "enter", "ctrl+c", "f5"',
        },
      },
      required: ["key"],
    },
    async execute(_toolCallId: string, params: Record<string, unknown>) {
      const result = await bridgeCall("/computer/key", params);
      if (!result.success) return errorContent(result.error);
      return {
        content: [{ type: "text", text: `Sent key: ${params.key}` }],
      };
    },
  });

  // --- Focus window ---
  api.registerTool({
    name: "computer_window_focus",
    description:
      'Bring a window to the foreground by process name. E.g. "Code" for VS Code, "chrome" for Chrome.',
    parameters: {
      type: "object",
      properties: {
        processName: {
          type: "string",
          description: 'Process name without .exe, e.g. "Code", "chrome", "discord"',
        },
      },
      required: ["processName"],
    },
    async execute(_toolCallId: string, params: Record<string, unknown>) {
      const result = await bridgeCall("/computer/window-focus", params);
      if (!result.success) return errorContent(result.error);
      return {
        content: [{ type: "text", text: `Focused: ${result.result}` }],
      };
    },
  });

  // --- List windows ---
  api.registerTool({
    name: "computer_window_list",
    description: "List all visible windows with their process names and titles.",
    parameters: {
      type: "object",
      properties: {},
    },
    async execute(_toolCallId: string, _params: Record<string, unknown>) {
      const result = await bridgeCall("/computer/window-list");
      if (!result.success) return errorContent(result.error);
      const list = (result.windows || [])
        .map(
          (w: any) => `${w.processName} (PID ${w.pid}): ${w.title}`
        )
        .join("\n");
      return {
        content: [
          {
            type: "text",
            text: `Open windows:\n${list || "(none)"}`,
          },
        ],
      };
    },
  });

  // --- Set clipboard ---
  api.registerTool({
    name: "computer_clipboard_set",
    description: "Set the system clipboard content to the specified text.",
    parameters: {
      type: "object",
      properties: {
        text: { type: "string", description: "Text to copy to clipboard" },
      },
      required: ["text"],
    },
    async execute(_toolCallId: string, params: Record<string, unknown>) {
      const result = await bridgeCall("/computer/clipboard", params);
      if (!result.success) return errorContent(result.error);
      return {
        content: [{ type: "text", text: `Clipboard set (${result.length} chars)` }],
      };
    },
  });
}
