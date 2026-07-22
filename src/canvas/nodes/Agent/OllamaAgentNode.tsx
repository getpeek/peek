import { useAtomValue } from "jotai";
import { useState } from "react";
import { useExecutePrompt } from "../../hooks/useExecutePrompt";
import { configAtom } from "../../../state";
import { AGENT_SYSTEM_PROMPT, AGENT_TOOLS } from "./agentTools";
import { AgentProviderSelector } from "./AgentProviderSelector";
import { AgentView } from "./AgentView";
import { useAgentContextSync } from "./useAgentContextSync";
import { useAgentStream } from "./useAgentStream";
import { useAgentTools } from "./useAgentTools";
import type { AgentBackendProps } from "./AgentNode";

/** The built-in agent backed by the OpenAI/Ollama-compatible endpoint
 *  (`ai.ollama`); Peek runs the tool loop via the Ollama LangChain client. */
export function OllamaAgentNode({
  id,
  data,
  selected,
  width,
  height,
  provider,
  setProvider,
  availableProviders,
}: AgentBackendProps) {
  const [question, setQuestion] = useState("");
  const config = useAtomValue(configAtom);
  const modelName = config?.ai.ollama?.model ?? "model";

  const runPrompt = useExecutePrompt({ tools: AGENT_TOOLS, systemPrompt: AGENT_SYSTEM_PROMPT });
  const handlers = useAgentTools({ nodeId: id });
  const { ask, stop, isLoading, incomingMessage } = useAgentStream({
    nodeId: id,
    runPrompt,
    handlers,
  });

  useAgentContextSync({ nodeId: id });

  const submit = () => {
    const q = question;
    setQuestion("");
    ask(q);
  };

  return (
    <AgentView
      id={id}
      data={data}
      selected={!!selected}
      width={width}
      height={height}
      title={modelName}
      question={question}
      setQuestion={setQuestion}
      onSubmit={submit}
      onStop={stop}
      isLoading={isLoading}
      incomingMessage={incomingMessage}
      headerExtra={
        <AgentProviderSelector
          providers={availableProviders}
          current={provider}
          onSelect={setProvider}
        />
      }
    />
  );
}
