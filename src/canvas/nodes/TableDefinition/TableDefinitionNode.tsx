import { NodeProps, NodeResizer } from "@xyflow/react";
import { useRef } from "react";
import { useScrollFallthrough } from "../useScrollFallthrough";
import { HiddenHandles } from "../HiddenHandles";
import { NodeHeader } from "../NodeHeader";
import { TableDefinitionTable } from "./TableDefinitionTable";
import type { TableDefinitionNode as TableDefinitionNodeT } from "../../types";
import "../node.css";

const DEFAULT_W = 450;
const DEFAULT_H = 280;

export function TableDefinitionNode({
  id,
  data,
  selected,
  width,
  height,
}: NodeProps<TableDefinitionNodeT>) {
  const w = width ?? DEFAULT_W;
  const h = height ?? DEFAULT_H;
  const bodyRef = useRef<HTMLDivElement>(null);
  useScrollFallthrough(bodyRef);

  return (
    <>
      <NodeResizer isVisible={!!selected} minWidth={300} minHeight={140} />
      <HiddenHandles />
      <div
        className={`app-node ${selected ? "selected" : ""}`}
        style={{ width: w, height: h }}
      >
        <NodeHeader nodeId={id} type="table-definition" name={data.table} />
        <div className="app-node-body nodrag" ref={bodyRef}>
          <TableDefinitionTable table={data.table} columns={data.columns} />
        </div>
      </div>
    </>
  );
}
