import { useState } from "react";
import { IconAlertTriangle } from "@tabler/icons-react";
import { AgentModeSelector } from "./AgentModeSelector";
import { AgentProviderSelector } from "./AgentProviderSelector";
import { AgentView } from "./AgentView";
import { PermissionPrompt } from "./PermissionPrompt";
import { useAcpStream } from "./useAcpStream";
import type { AgentBackendProps } from "./AgentNode";

/** The built-in agent backed by an external ACP agent (e.g. Claude Code). The
 *  agent runs its own tool loop and reaches the canvas through Peek's MCP server. */
export function AcpAgentNode({
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
  const {
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
  } = useAcpStream({ nodeId: id });

  const submit = () => {
    const q = question;
    setQuestion("");
    ask(q);
  };

  const headerExtra = (
    <>
      <AgentProviderSelector
        providers={availableProviders}
        current={provider}
        onSelect={setProvider}
      />
      {modes.length > 0 && (
        <AgentModeSelector modes={modes} current={currentMode} onSelect={setMode} />
      )}
    </>
  );

  const banner = warning ? (
    <div className='acp-banner nodrag'>
      <IconAlertTriangle size={14} />
      <span>{warning}</span>
    </div>
  ) : undefined;

  const overlay = pending ? (
    <PermissionPrompt request={pending} onRespond={respondPermission} />
  ) : undefined;

  return (
    <AgentView
      id={id}
      data={data}
      selected={!!selected}
      width={width}
      height={height}
      title='Claude Code'
      question={question}
      setQuestion={setQuestion}
      onSubmit={submit}
      onStop={stop}
      isLoading={isLoading}
      incomingMessage={incomingMessage}
      incomingThought={incomingThought}
      headerExtra={headerExtra}
      banner={banner}
      overlay={overlay}
      onCycleMode={cycleMode}
    />
  );
}
