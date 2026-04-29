import { useState } from "react";
import { useCanvas } from "../../useCanvas";
import { defaultDimensions, makeNode } from "../../defaults";
import { stringifyValue } from "./stringify";
import type { VariableNode } from "../../types";

export type CellMenuState = {
  x: number;
  y: number;
  value: unknown;
  column: string;
};

export function useCellContextMenu(nodeId: string) {
  const canvas = useCanvas();
  const [cellMenu, setCellMenu] = useState<CellMenuState | null>(null);

  const openCellMenu = (e: React.MouseEvent, value: unknown, column: string) => {
    e.preventDefault();
    setCellMenu({ x: e.clientX, y: e.clientY, value, column });
  };

  const closeCellMenu = () => setCellMenu(null);

  const createVariableFromCell = () => {
    if (!cellMenu) {
      return;
    }
    const sourceNode = canvas.getNode(nodeId);
    if (!sourceNode) {
      setCellMenu(null);
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
      rows: [{ name: cellMenu.column, value: stringifyValue(cellMenu.value) }],
    };
    canvas.addNode(newNode);
    canvas.selectOnly(newNode.id);
    canvas.zoomToNode(newNode.id);
    setCellMenu(null);
  };

  const copyCellValue = () => {
    if (!cellMenu) {
      return;
    }
    navigator.clipboard.writeText(stringifyValue(cellMenu.value));
    setCellMenu(null);
  };

  return {
    cellMenu,
    openCellMenu,
    closeCellMenu,
    createVariableFromCell,
    copyCellValue,
  };
}
