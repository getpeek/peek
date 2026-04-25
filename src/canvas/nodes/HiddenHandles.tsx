import { Handle, Position } from "@xyflow/react";

const hiddenStyle = { opacity: 0, pointerEvents: "none" as const };

export function HiddenHandles() {
  return (
    <>
      <Handle
        type="target"
        position={Position.Left}
        style={hiddenStyle}
        isConnectable={false}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={hiddenStyle}
        isConnectable={false}
      />
    </>
  );
}
