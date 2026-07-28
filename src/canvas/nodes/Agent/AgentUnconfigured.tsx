import { NodeResizer } from "@xyflow/react";
import { IconAlertTriangle } from "@tabler/icons-react";
import { HiddenHandles } from "../HiddenHandles";
import { NodeHeader } from "../NodeHeader";
import { NodeIndicator } from "../NodeIndicator";

interface AgentUnconfiguredProps {
  id: string;
  selected: boolean;
  width?: number;
  height?: number;
}

/** Shown when neither `ai.ollama` nor `ai.acp` is configured, so the Agent node
 *  has no backend to talk to. */
export function AgentUnconfigured({ id, selected, width, height }: AgentUnconfiguredProps) {
  return (
    <>
      <NodeResizer minWidth={400} minHeight={300} />
      <HiddenHandles connectableTarget />
      <div
        className={`app-node ${selected ? "selected" : ""}`}
        style={{ width: width ?? 540, height: height ?? 400 }}
      >
        <NodeHeader nodeId={id} name='agent' indicator={<NodeIndicator kind='agent' />} />
        <div className='app-node-body nodrag'>
          <div className='agent-unconfigured'>
            <IconAlertTriangle size={22} />
            <div className='agent-unconfigured-title'>No AI backend configured</div>
            <div className='agent-unconfigured-body'>
              Add an <code>ai.ollama</code> or <code>ai.acp</code> block to{" "}
              <code>~/peek/settings.json</code> to use the agent.
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
