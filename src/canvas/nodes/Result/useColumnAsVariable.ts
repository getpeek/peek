import { useCanvas } from "../../hooks/useCanvas";
import { defaultDimensions, makeNode } from "../../defaults";
import { formatSqlLiteral } from "./sqlLiteral";
import type { DatabaseResult } from "../../../state";
import type { VariableNode } from "../../types";

export function useColumnAsVariable({
  nodeId,
  data,
  headerTypes,
}: {
  nodeId: string;
  data: DatabaseResult;
  headerTypes: string[];
}) {
  const canvas = useCanvas();

  return (columnIdx: number, header: string) => {
    const columnType = headerTypes[columnIdx] ?? "";
    const literals = data
      .map(row => row[columnIdx])
      .filter((cell): cell is [string, unknown, string] => cell !== undefined)
      .map(([, value]) => formatSqlLiteral(value, columnType));
    if (literals.length === 0) {
      return;
    }
    const sourceNode = canvas.getNode(nodeId);
    if (!sourceNode) {
      return;
    }
    const sourceWidth = sourceNode.width ?? defaultDimensions.result.w;
    const position = {
      x: sourceNode.position.x + sourceWidth + 40,
      y: sourceNode.position.y,
    };
    const newNode = makeNode("variable", position) as VariableNode;
    newNode.data = {
      ...newNode.data,
      rows: [{ name: header, value: literals }],
    };
    canvas.addNode(newNode);
    canvas.selectOnly(newNode.id);
    canvas.zoomToNode(newNode.id);
  };
}
