/**
 * OpenClaw Notify MCP Server
 * 讓 Claude Code 可以透過 bridge service 發 Discord/LINE 通知
 * MCP stdio server (JSON-RPC over stdin/stdout)
 * 零 npm 依賴
 */

const BRIDGE_URL = "http://127.0.0.1:3847";
const BRIDGE_TOKEN = process.env.BRIDGE_TOKEN || "openclaw-bridge-default-token";

// Known channel IDs (from openclaw config)
const DEFAULTS = {
  discordChannelId: process.env.DISCORD_CHANNEL_ID || "{{DISCORD_CHANNEL_ID}}", // #一般
  lineUserId: process.env.LINE_USER_ID || "{{LINE_USER_ID}}", // holylight
};

// --- MCP Protocol Helpers ---

let buffer = "";

process.stdin.setEncoding("utf-8");
process.stdin.on("data", (chunk) => {
  buffer += chunk;
  processBuffer();
});

function processBuffer() {
  while (true) {
    const headerEnd = buffer.indexOf("\r\n\r\n");
    if (headerEnd === -1) break;

    const header = buffer.slice(0, headerEnd);
    const contentLengthMatch = header.match(/Content-Length:\s*(\d+)/i);
    if (!contentLengthMatch) {
      buffer = buffer.slice(headerEnd + 4);
      continue;
    }

    const contentLength = parseInt(contentLengthMatch[1], 10);
    const bodyStart = headerEnd + 4;
    const bodyEnd = bodyStart + contentLength;

    if (buffer.length < bodyEnd) break; // wait for more data

    const body = buffer.slice(bodyStart, bodyEnd);
    buffer = buffer.slice(bodyEnd);

    try {
      const message = JSON.parse(body);
      handleMessage(message);
    } catch (e) {
      sendError(null, -32700, "Parse error");
    }
  }
}

function sendResponse(id, result) {
  const msg = JSON.stringify({ jsonrpc: "2.0", id, result });
  const header = `Content-Length: ${Buffer.byteLength(msg)}\r\n\r\n`;
  process.stdout.write(header + msg);
}

function sendError(id, code, message) {
  const msg = JSON.stringify({
    jsonrpc: "2.0",
    id,
    error: { code, message },
  });
  const header = `Content-Length: ${Buffer.byteLength(msg)}\r\n\r\n`;
  process.stdout.write(header + msg);
}

// --- Bridge Call ---

async function bridgeCall(endpoint, body) {
  const res = await fetch(`${BRIDGE_URL}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${BRIDGE_TOKEN}`,
    },
    body: JSON.stringify(body),
  });
  return await res.json();
}

// --- MCP Message Handler ---

async function handleMessage(msg) {
  const { id, method, params } = msg;

  switch (method) {
    case "initialize":
      sendResponse(id, {
        protocolVersion: "2024-11-05",
        capabilities: { tools: { listChanged: false } },
        serverInfo: {
          name: "openclaw-notify",
          version: "1.0.0",
        },
      });
      break;

    case "notifications/initialized":
      // No response needed for notifications
      break;

    case "tools/list":
      sendResponse(id, {
        tools: [
          {
            name: "notify_user",
            description:
              "Send a notification message to the user via Discord or LINE through OpenClaw. " +
              "Use this to proactively notify the user when a task is complete, " +
              "report progress, or send any message to their messaging platforms. " +
              "The bridge service must be running on port 3847.",
            inputSchema: {
              type: "object",
              properties: {
                channel: {
                  type: "string",
                  enum: ["discord", "line"],
                  description: "Target platform: discord or line",
                },
                message: {
                  type: "string",
                  description: "The notification message to send",
                },
                channelId: {
                  type: "string",
                  description:
                    "Discord channel ID (optional, defaults to #一般). Only used for discord.",
                },
                userId: {
                  type: "string",
                  description:
                    "LINE user ID (optional, defaults to holylight). Only used for line.",
                },
              },
              required: ["channel", "message"],
            },
          },
        ],
      });
      break;

    case "tools/call": {
      const toolName = params?.name;
      const args = params?.arguments || {};

      if (toolName !== "notify_user") {
        sendError(id, -32601, `Unknown tool: ${toolName}`);
        return;
      }

      const channel = args.channel;
      const message = args.message;

      if (!channel || !message) {
        sendResponse(id, {
          content: [{ type: "text", text: "Error: channel and message are required" }],
          isError: true,
        });
        return;
      }

      try {
        let result;
        if (channel === "discord") {
          result = await bridgeCall("/notify/discord", {
            channelId: args.channelId || DEFAULTS.discordChannelId,
            message,
          });
        } else if (channel === "line") {
          result = await bridgeCall("/notify/line", {
            userId: args.userId || DEFAULTS.lineUserId,
            message,
          });
        } else {
          sendResponse(id, {
            content: [{ type: "text", text: `Error: unknown channel "${channel}"` }],
            isError: true,
          });
          return;
        }

        if (result.success) {
          sendResponse(id, {
            content: [
              {
                type: "text",
                text: `通知已發送到 ${channel}：${message.slice(0, 100)}`,
              },
            ],
          });
        } else {
          sendResponse(id, {
            content: [{ type: "text", text: `發送失敗：${result.error}` }],
            isError: true,
          });
        }
      } catch (err) {
        sendResponse(id, {
          content: [
            {
              type: "text",
              text: `Bridge 連線失敗：${err.message}. 請確認 bridge service 有在跑。`,
            },
          ],
          isError: true,
        });
      }
      break;
    }

    default:
      if (id !== undefined) {
        sendError(id, -32601, `Method not found: ${method}`);
      }
  }
}

// Keep process alive
process.stdin.resume();
