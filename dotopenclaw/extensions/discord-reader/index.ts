/**
 * discord-reader plugin — cross-channel Discord message reading.
 * Zero external dependencies. Uses Discord REST API directly.
 */

const DISCORD_API = "https://discord.com/api/v10";

export default function (api: any) {
  // Get Discord bot token from config
  const discordToken: string | undefined =
    api.config?.channels?.discord?.token;

  api.registerTool({
    name: "read_discord_messages",
    description:
      "Read recent messages from a Discord channel. " +
      "Use this when a user asks to read, check, or fetch Discord messages — " +
      "regardless of which platform (LINE, Discord, etc.) the request comes from. " +
      "Returns messages sorted oldest-first.",
    parameters: {
      type: "object",
      properties: {
        channelId: {
          type: "string",
          description:
            "Discord channel ID (numeric string). " +
            "Known channels: #一般 = 1065188929529200723",
        },
        limit: {
          type: "integer",
          description: "Number of messages to fetch (1-50, default 10)",
          minimum: 1,
          maximum: 50,
        },
      },
      required: ["channelId"],
    },
    async execute(_toolCallId: string, params: Record<string, unknown>) {
      if (!discordToken) {
        return {
          content: [
            {
              type: "text",
              text: "Error: Discord bot token not found in config (channels.discord.token).",
            },
          ],
        };
      }

      const channelId = String(params.channelId);
      const limit =
        typeof params.limit === "number"
          ? Math.min(Math.max(params.limit, 1), 50)
          : 10;

      try {
        const res = await fetch(
          `${DISCORD_API}/channels/${channelId}/messages?limit=${limit}`,
          {
            headers: {
              Authorization: `Bot ${discordToken}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!res.ok) {
          const body = await res.text();
          return {
            content: [
              {
                type: "text",
                text: `Discord API error ${res.status}: ${body}`,
              },
            ],
          };
        }

        const messages: any[] = await res.json();

        if (!messages || messages.length === 0) {
          return {
            content: [
              { type: "text", text: "No messages found in this channel." },
            ],
          };
        }

        const formatted = messages
          .reverse() // API returns newest-first, flip to oldest-first
          .map((msg: any) => {
            const time = msg.timestamp
              ? new Date(msg.timestamp).toLocaleString("zh-TW", {
                  timeZone: "Asia/Taipei",
                  hour12: false,
                })
              : "";
            const author =
              msg.author?.global_name || msg.author?.username || "unknown";
            const content = msg.content || "(no text content)";
            return `[${time}] ${author}: ${content}`;
          })
          .join("\n");

        return {
          content: [
            {
              type: "text",
              text: `Discord channel ${channelId} — last ${messages.length} messages:\n\n${formatted}`,
            },
          ],
        };
      } catch (err: any) {
        return {
          content: [
            {
              type: "text",
              text: `Error: ${err?.message || String(err)}`,
            },
          ],
        };
      }
    },
  });
}
