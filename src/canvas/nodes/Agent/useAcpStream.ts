import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { AcpPermissionRequest, AcpUpdate } from "./acpUpdates";
import { useAcpMessageSink } from "./useAcpMessageSink";

export interface AcpMode {
  id: string;
  name: string;
}

interface AcpStartResult {
  sessionId: string;
  modes: AcpMode[];
  currentMode: string | null;
  mcpForwarded: boolean;
  warning: string | null;
}

interface AcpUpdateEvent {
  sessionId: string;
  update: AcpUpdate;
}

interface AcpPermissionEvent {
  id: number;
  sessionId: string;
  request: AcpPermissionRequest["request"];
}

/**
 * Drives the Agent node against an external ACP agent (e.g. Claude Code). Unlike
 * the Ollama path, the agent runs its own model + tool loop; Peek only opens a
 * per-node session (`acp_open_session`), sends prompts (`acp_prompt`), and — via
 * `useAcpMessageSink` — translates streamed `session/update` events into the
 * node's `Message` list. Every node listens to the same global event stream, so
 * updates and permission prompts are filtered to this node's `sessionId`;
 * otherwise conversations from other agent nodes (or a previous connection)
 * would bleed in.
 */
export function useAcpStream(opts: { nodeId: string }) {
  const { nodeId } = opts;

  const [isLoading, setIsLoading] = useState(false);
  const [modes, setModes] = useState<AcpMode[]>([]);
  const [currentMode, setCurrentMode] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [pending, setPending] = useState<AcpPermissionRequest | null>(null);

  const { handleUpdate, flushAll, appendMessage, incomingMessage, incomingThought } =
    useAcpMessageSink({ nodeId, setCurrentMode });

  const startedRef = useRef(false);
  // This node's ACP session id, used to filter the global event stream. A ref so
  // the once-registered listeners read the latest value.
  const sessionIdRef = useRef<string | null>(null);
  // In-flight open, so the mount effect and a first prompt (spawning the agent
  // can take seconds) share one call instead of opening duplicate sessions.
  const openRef = useRef<Promise<boolean> | null>(null);

  const ensureSession = (): Promise<boolean> => {
    if (startedRef.current) {
      return Promise.resolve(true);
    }
    openRef.current ??= (async () => {
      try {
        const result = await invoke<AcpStartResult>("acp_open_session", { nodeId });
        sessionIdRef.current = result.sessionId;
        setModes(result.modes);
        setCurrentMode(result.currentMode);
        setWarning(result.warning);
        startedRef.current = true;
        return true;
      } catch (e) {
        appendMessage({
          type: "system",
          message: `Couldn't start the ACP agent: ${e instanceof Error ? e.message : String(e)}`,
          timestamp: Date.now(),
        });
        openRef.current = null;
        return false;
      }
    })();
    return openRef.current;
  };

  // Open this node's session on mount so the mode selector and any MCP warning
  // are ready before the first prompt. Reused host-side across remounts.
  useEffect(() => {
    void ensureSession();
  }, []);

  // Register the update/permission listeners once. Events for every node arrive
  // here, so drop any whose `sessionId` isn't this node's.
  useEffect(() => {
    const isMine = (sessionId: string) => sessionId === sessionIdRef.current;

    const unlistenUpdate = listen<AcpUpdateEvent>("acp:update", event => {
      if (isMine(event.payload.sessionId)) {
        handleUpdate(event.payload.update);
      }
    });
    const unlistenPermission = listen<AcpPermissionEvent>("acp:permission", event => {
      if (isMine(event.payload.sessionId)) {
        setPending({ id: event.payload.id, request: event.payload.request });
      }
    });

    return () => {
      void unlistenUpdate.then(stop => stop());
      void unlistenPermission.then(stop => stop());
    };
  }, [nodeId]);

  const ask = async (question: string) => {
    if (!question.trim() || isLoading) {
      return;
    }
    appendMessage({ type: "user", message: question, timestamp: Date.now() });
    if (!(await ensureSession())) {
      return;
    }
    setIsLoading(true);
    try {
      await invoke("acp_prompt", { nodeId, text: question });
    } catch (e) {
      appendMessage({
        type: "system",
        message: `Agent turn failed: ${e instanceof Error ? e.message : String(e)}`,
        timestamp: Date.now(),
      });
    } finally {
      // Commit whatever streamed in this turn — a plain answer has no trailing
      // tool call to trigger an earlier flush, so this is where it's persisted.
      flushAll();
      setIsLoading(false);
    }
  };

  const stop = () => {
    void invoke("acp_cancel", { nodeId }).catch(() => {});
  };

  const setMode = (modeId: string) => {
    setCurrentMode(modeId);
    void invoke("acp_set_mode", { nodeId, modeId }).catch(() => {});
  };

  // Shift+Tab advances through the agent's modes (planning → auto → manual → …),
  // mirroring Claude Code. Falls to the first mode when none is active yet.
  const cycleMode = () => {
    if (modes.length === 0) {
      return;
    }
    const index = modes.findIndex(mode => mode.id === currentMode);
    const next = modes[(index + 1) % modes.length];
    setMode(next.id);
  };

  const respondPermission = (id: number, optionId: string | null) => {
    setPending(current => (current?.id === id ? null : current));
    void invoke("acp_permission_respond", { id, optionId }).catch(() => {});
  };

  return {
    ask,
    stop,
    isLoading,
    incomingMessage,
    incomingThought,
    modes,
    currentMode,
    setMode,
    cycleMode,
    warning,
    pending,
    respondPermission,
  };
}
