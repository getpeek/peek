import { Handle, Position } from "@xyflow/react";

const hiddenStyle = { opacity: 0, pointerEvents: "none" as const };
const hiddenButConnectableStyle = { opacity: 0 };

export function HiddenHandles({
  connectableTarget,
}: {
  connectableTarget?: boolean;
} = {}) {
  return (
    <>
      <Handle
        type='target'
        position={Position.Left}
        style={connectableTarget ? hiddenButConnectableStyle : hiddenStyle}
        isConnectable={!!connectableTarget}
      />
      <Handle type='source' position={Position.Right} style={hiddenStyle} isConnectable={false} />
    </>
  );
}
