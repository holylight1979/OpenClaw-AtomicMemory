import type { AgentMessage } from "@mariozechner/pi-agent-core";
import type { SessionManager } from "@mariozechner/pi-coding-agent";
import { getGlobalHookRunner } from "../plugins/hook-runner-global.js";
import {
  filterToolResultContent,
  filterLlmOutput,
  isSessionOwner,
} from "../security/sensitive-filter.js";
import {
  applyInputProvenanceToUserMessage,
  type InputProvenance,
} from "../sessions/input-provenance.js";
import { installSessionToolResultGuard } from "./session-tool-result-guard.js";

export type GuardedSessionManager = SessionManager & {
  /** Flush any synthetic tool results for pending tool calls. Idempotent. */
  flushPendingToolResults?: () => void;
  /** Clear pending tool calls without persisting synthetic tool results. Idempotent. */
  clearPendingToolResults?: () => void;
};

/**
 * Apply the tool-result guard to a SessionManager exactly once and expose
 * a flush method on the instance for easy teardown handling.
 */
export function guardSessionManager(
  sessionManager: SessionManager,
  opts?: {
    agentId?: string;
    sessionKey?: string;
    inputProvenance?: InputProvenance;
    allowSyntheticToolResults?: boolean;
    allowedToolNames?: Iterable<string>;
  },
): GuardedSessionManager {
  if (typeof (sessionManager as GuardedSessionManager).flushPendingToolResults === "function") {
    return sessionManager as GuardedSessionManager;
  }

  const hookRunner = getGlobalHookRunner();
  const beforeMessageWrite = hookRunner?.hasHooks("before_message_write")
    ? (event: { message: import("@mariozechner/pi-agent-core").AgentMessage }) => {
        return hookRunner.runBeforeMessageWrite(event, {
          agentId: opts?.agentId,
          sessionKey: opts?.sessionKey,
        });
      }
    : undefined;

  const transform = hookRunner?.hasHooks("tool_result_persist")
    ? // oxlint-disable-next-line typescript/no-explicit-any
      (message: any, meta: { toolCallId?: string; toolName?: string; isSynthetic?: boolean }) => {
        const out = hookRunner.runToolResultPersist(
          {
            toolName: meta.toolName,
            toolCallId: meta.toolCallId,
            message,
            isSynthetic: meta.isSynthetic,
          },
          {
            agentId: opts?.agentId,
            sessionKey: opts?.sessionKey,
            toolName: meta.toolName,
            toolCallId: meta.toolCallId,
          },
        );
        return out?.message ?? message;
      }
    : undefined;

  // Core-level sensitive content filter — applied before all plugin hooks (unbypassable).
  const sessionKey = opts?.sessionKey;
  const sensitiveContentFilter = sessionKey
    ? (message: AgentMessage, meta: { toolName?: string; role: string }) => {
        const senderIsOwner = isSessionOwner(sessionKey);
        if (meta.role === "toolResult") {
          return applySensitiveToolResultFilter(message, meta.toolName, senderIsOwner);
        }
        if (meta.role === "assistant") {
          return applySensitiveLlmOutputFilter(message);
        }
        return message;
      }
    : undefined;

  const guard = installSessionToolResultGuard(sessionManager, {
    sessionKey: opts?.sessionKey,
    transformMessageForPersistence: (message) =>
      applyInputProvenanceToUserMessage(message, opts?.inputProvenance),
    transformToolResultForPersistence: transform,
    allowSyntheticToolResults: opts?.allowSyntheticToolResults,
    allowedToolNames: opts?.allowedToolNames,
    beforeMessageWriteHook: beforeMessageWrite,
    sensitiveContentFilter,
  });
  (sessionManager as GuardedSessionManager).flushPendingToolResults = guard.flushPendingToolResults;
  (sessionManager as GuardedSessionManager).clearPendingToolResults = guard.clearPendingToolResults;
  return sessionManager as GuardedSessionManager;
}

// ---------------------------------------------------------------------------
// Sensitive content filter helpers
// ---------------------------------------------------------------------------

/**
 * Extract text content from an AgentMessage for scanning.
 * Returns the concatenated text of all text blocks.
 */
function extractMessageText(message: AgentMessage): string {
  const content = (message as { content?: unknown }).content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .filter((block: unknown) => {
        const b = block as { type?: string };
        return b.type === "text";
      })
      .map((block: unknown) => (block as { text?: string }).text ?? "")
      .join("\n");
  }
  return "";
}

/**
 * Replace text content in an AgentMessage.
 */
function replaceMessageText(message: AgentMessage, newText: string): AgentMessage {
  const content = (message as { content?: unknown }).content;
  if (typeof content === "string") {
    return { ...message, content: newText } as unknown as AgentMessage;
  }
  if (Array.isArray(content)) {
    const newContent = content.map((block: unknown) => {
      const b = block as { type?: string; text?: string };
      if (b.type === "text") {
        return { ...b, text: newText };
      }
      return block;
    });
    return { ...message, content: newContent } as unknown as AgentMessage;
  }
  return message;
}

/**
 * Apply sensitive content filtering to a tool result message.
 */
function applySensitiveToolResultFilter(
  message: AgentMessage,
  toolName: string | undefined,
  senderIsOwner: boolean,
): AgentMessage {
  const text = extractMessageText(message);
  if (!text) return message;

  const result = filterToolResultContent(text, toolName ?? "unknown", undefined, senderIsOwner);
  if (!result.filtered) return message;

  return replaceMessageText(message, result.text);
}

/**
 * Apply sensitive content filtering to an assistant (LLM) output message.
 * This is the last defense — catches secrets the LLM "remembers" from context.
 */
function applySensitiveLlmOutputFilter(message: AgentMessage): AgentMessage {
  const text = extractMessageText(message);
  if (!text) return message;

  const result = filterLlmOutput(text);
  if (!result.filtered) return message;

  return replaceMessageText(message, result.text);
}
