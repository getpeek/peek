import { NodeProps } from "@xyflow/react";
import { useAtomValue } from "jotai";
import { configAtom, type AgentProvider } from "../../../state";
import { useCanvas } from "../../hooks/useCanvas";
import { AcpAgentNode } from "./AcpAgentNode";
import { AgentUnconfigured } from "./AgentUnconfigured";
import { OllamaAgentNode } from "./OllamaAgentNode";
import type { AgentData, AgentNode as AgentNodeT } from "../../types";
import "./agent.css";

export interface AgentBackendProps extends NodeProps<AgentNodeT> {
  provider: AgentProvider;
  setProvider: (provider: AgentProvider) => void;
  availableProviders: AgentProvider[];
}

// One node kind, two backends: a backend is available only if its settings block
// (`ai.ollama` / `ai.acp`) is present. The node's own `data.provider` wins, else
// `ai.default_provider`, else the first available. Each backend owns its own
// hooks (the ACP one starts a subprocess on mount), so they're separate
// components rather than a runtime branch inside one hook body.
export function AgentNode(props: NodeProps<AgentNodeT>) {
  const config = useAtomValue(configAtom);
  const canvas = useCanvas();

  const availableProviders: AgentProvider[] = [];
  if (config?.ai.ollama) {
    availableProviders.push("ollama");
  }
  if (config?.ai.acp) {
    availableProviders.push("acp");
  }

  if (availableProviders.length === 0) {
    return (
      <AgentUnconfigured
        id={props.id}
        selected={!!props.selected}
        width={props.width}
        height={props.height}
      />
    );
  }

  const preferred = props.data.provider ?? config?.ai.default_provider;
  const provider =
    preferred && availableProviders.includes(preferred) ? preferred : availableProviders[0];

  const setProvider = (next: AgentProvider) =>
    canvas.updateNodeData<AgentData>(props.id, d => ({ ...d, provider: next }));

  const backendProps: AgentBackendProps = { ...props, provider, setProvider, availableProviders };

  if (provider === "acp") {
    return <AcpAgentNode {...backendProps} />;
  }
  return <OllamaAgentNode {...backendProps} />;
}
