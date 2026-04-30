import { Handle, Position } from "@xyflow/react";

const hiddenStyle = { opacity: 0, pointerEvents: "none" as const };
const hiddenButConnectableStyle = { opacity: 0 };

export function HiddenHandles({
  connectableTarget,
}: {
  connectableTarget?: boolean;
} = {}) {
  const positions = [Position.Left, Position.Right, Position.Top, Position.Bottom];

  return (
    <>
      {positions.map(position => (
        <Handle
          key={position}
          id={`target-${position}`}
          type='target'
          position={position}
          style={connectableTarget ? hiddenButConnectableStyle : hiddenStyle}
          isConnectable={!!connectableTarget}
        />
      ))}
      <Handle
        id='source-right'
        type='source'
        position={Position.Right}
        style={hiddenStyle}
        isConnectable={false}
      />
    </>
  );
}
