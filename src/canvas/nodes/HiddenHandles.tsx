import { Handle, Position } from "@xyflow/react";
import type { CSSProperties } from "react";

const hiddenStyle: CSSProperties = { opacity: 0, pointerEvents: "none" };

// Fills the whole node so a dragged connection can be released anywhere over it,
// not just on a centred edge handle. It stays invisible; `pointer-events` is
// toggled in node.css (inert at rest, captured during a connection drag) so it
// never swallows clicks on the node body.
const fullCoverStyle: CSSProperties = {
  position: "absolute",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  transform: "none",
  border: "none",
  background: "transparent",
  opacity: 0,
};

const positions = [Position.Left, Position.Right, Position.Top, Position.Bottom];

export function HiddenHandles({
  connectableTarget,
}: {
  connectableTarget?: boolean;
} = {}) {
  return (
    <>
      {connectableTarget ? (
        <Handle
          id='target'
          type='target'
          position={Position.Left}
          className='node-drop-target'
          style={fullCoverStyle}
          isConnectable
          isConnectableStart={false}
        />
      ) : (
        positions.map(position => (
          <Handle
            key={position}
            id={`target-${position}`}
            type='target'
            position={position}
            style={hiddenStyle}
            isConnectable={false}
          />
        ))
      )}
      {/* Invisible, non-interactive source handle present on every node so that
          edges created programmatically (e.g. query → result it spawns) have a
          source endpoint to attach to — React Flow drops an edge whose source
          node has no source handle. The visible drag affordance lives on the
          node's own handles; FloatingEdge ignores this one's position. */}
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
