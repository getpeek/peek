import { useRef, useState } from "react";
import { useCanvas } from "../../hooks/useCanvas";
import type { AgentData } from "../../types";
import type { Message } from "../../hooks/useExecutePrompt";
import { type AcpUpdate, chunkText, planEntries, toolContentText } from "./acpUpdates";

/**
 * Owns the streamed-message side of the ACP agent node: it turns `session/update`
 * payloads into the node's persisted `Message` list and exposes the live
 * assistant/thought previews. Split out of `useAcpStream` so that hook stays
 * focused on session lifecycle, prompts, and permissions.
 */
export function useAcpMessageSink(opts: {
  nodeId: string;
  setCurrentMode: (mode: string) => void;
}) {
  const { nodeId, setCurrentMode } = opts;
  const canvas = useCanvas();
  const canvasRef = useRef(canvas);
  canvasRef.current = canvas;

  const [incomingMessage, setIncomingMessage] = useState("");
  const [incomingThought, setIncomingThought] = useState("");

  // Streamed text accumulates here until a boundary (a tool call, a switch
  // between message and thought, or turn end), then flushes into a persisted
  // message. Refs so `useAcpStream`'s turn-end path flushes the same buffers a
  // plain answer with no trailing tool call would otherwise leave uncommitted.
  const assistantBuf = useRef("");
  const thoughtBuf = useRef("");

  const appendMessage = (message: Message) => {
    canvasRef.current.updateNodeData<AgentData>(nodeId, d => ({
      ...d,
      messages: [...d.messages, message],
    }));
  };

  const flushAssistant = () => {
    if (assistantBuf.current.trim()) {
      appendMessage({ type: "assistant", message: assistantBuf.current, timestamp: Date.now() });
    }
    assistantBuf.current = "";
    setIncomingMessage("");
  };

  const flushThought = () => {
    if (thoughtBuf.current.trim()) {
      appendMessage({ type: "thought", message: thoughtBuf.current, timestamp: Date.now() });
    }
    thoughtBuf.current = "";
    setIncomingThought("");
  };

  const flushAll = () => {
    flushThought();
    flushAssistant();
  };

  const updateAcpTool = (toolCallId: string, patch: (m: Message) => Message) => {
    canvasRef.current.updateNodeData<AgentData>(nodeId, d => ({
      ...d,
      messages: d.messages.map(m =>
        m.type === "acp_tool" && m.toolCallId === toolCallId ? patch(m) : m,
      ),
    }));
  };

  const upsertPlan = (entries: ReturnType<typeof planEntries>) => {
    canvasRef.current.updateNodeData<AgentData>(nodeId, d => {
      const lastPlan = d.messages.findLast(m => m.type === "plan");
      if (lastPlan) {
        return {
          ...d,
          messages: d.messages.map(m => (m === lastPlan ? { ...m, planEntries: entries } : m)),
        };
      }
      return {
        ...d,
        messages: [
          ...d.messages,
          { type: "plan", message: "", planEntries: entries, timestamp: Date.now() },
        ],
      };
    });
  };

  const handleUpdate = (update: AcpUpdate) => {
    switch (update.sessionUpdate) {
      case "agent_message_chunk": {
        flushThought();
        assistantBuf.current += chunkText(update);
        setIncomingMessage(assistantBuf.current);
        break;
      }
      case "agent_thought_chunk": {
        flushAssistant();
        thoughtBuf.current += chunkText(update);
        setIncomingThought(thoughtBuf.current);
        break;
      }
      case "tool_call": {
        flushAll();
        appendMessage({
          type: "acp_tool",
          message: toolContentText(update.content),
          toolCallId: String(update.toolCallId ?? ""),
          toolName: typeof update.title === "string" ? update.title : "tool",
          toolKind: typeof update.kind === "string" ? update.kind : "other",
          toolStatus: (update.status as Message["toolStatus"]) ?? "pending",
          timestamp: Date.now(),
        });
        break;
      }
      case "tool_call_update": {
        const id = String(update.toolCallId ?? "");
        const extra = toolContentText(update.content);
        updateAcpTool(id, m => ({
          ...m,
          toolStatus: (update.status as Message["toolStatus"]) ?? m.toolStatus,
          toolName: typeof update.title === "string" ? update.title : m.toolName,
          isError: update.status === "failed" ? true : m.isError,
          message: extra ? [m.message, extra].filter(Boolean).join("\n") : m.message,
        }));
        break;
      }
      case "plan": {
        upsertPlan(planEntries(update));
        break;
      }
      case "current_mode_update": {
        if (typeof update.currentModeId === "string") {
          setCurrentMode(update.currentModeId);
        }
        break;
      }
      default:
        break;
    }
  };

  return { handleUpdate, flushAll, appendMessage, incomingMessage, incomingThought };
}
