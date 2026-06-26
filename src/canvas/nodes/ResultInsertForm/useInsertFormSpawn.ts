import { useAtomValue } from "jotai";
import { schemaAtom, type DatabaseResult } from "../../../state";
import { useCanvas } from "../../hooks/useCanvas";
import { ids } from "../../ids";
import { resultRowsAtom } from "../../state";
import { stringifyValue } from "../Result/stringify";
import type { ResultInsertFormNode } from "../../types";
import { deriveInsertColumns, estimateInsertFormHeight } from "./insertColumns";

const FORM_WIDTH = 560;
const FORM_GAP = 40;
const RESULT_DEFAULT_HEIGHT = 640;

// One reusable insert form per result, spawned from the toolbar. Reuses the
// existing node (deterministic id) so repeated clicks just re-focus it.
export function useAddRow(resultNodeId: string, table: string | null) {
  const canvas = useCanvas();
  const rows = useAtomValue(resultRowsAtom(resultNodeId));
  const schema = useAtomValue(schemaAtom);

  return () => {
    const node = canvas.getNode(resultNodeId);
    if (!node || node.type !== "result") {
      return;
    }
    const formId = `${resultNodeId}-insert`;
    if (!canvas.getNode(formId)) {
      const fieldCount = deriveInsertColumns(rows, schema, table).headers.length;
      const formNode: ResultInsertFormNode = {
        id: formId,
        type: "result-insert-form",
        position: {
          x: node.position.x,
          y: node.position.y + (node.height ?? RESULT_DEFAULT_HEIGHT) + 50,
        },
        width: FORM_WIDTH,
        height: estimateInsertFormHeight(fieldCount),
        data: { resultNodeId },
      };
      canvas.addNode(formNode);
      canvas.connect(resultNodeId, formId);
    }
    canvas.selectOnly(formId);
    canvas.zoomToNode(formId, { duration: 200 });
  };
}

// Spawn one pre-filled insert form per row (the "duplicate" flow). Primary key
// columns are left blank so the DB assigns a fresh key on save.
export function useDuplicateRows({
  resultNodeId,
  data,
  table,
  closeMenu,
}: {
  resultNodeId: string;
  data: DatabaseResult;
  table: string | null;
  closeMenu: () => void;
}) {
  const canvas = useCanvas();
  const schema = useAtomValue(schemaAtom);

  return (indices: number[]) => {
    closeMenu();
    const sourceNode = canvas.getNode(resultNodeId);
    if (!sourceNode || !table || indices.length === 0) {
      return;
    }
    const pkColumns = new Set(schema.primaryKeys[table] ?? []);
    const baseX = sourceNode.position.x;
    const baseY = sourceNode.position.y + (sourceNode.height ?? RESULT_DEFAULT_HEIGHT) + 50;
    const spawnedIds: string[] = [];
    let offsetY = baseY;
    for (const rowIndex of [...indices].toSorted((a, b) => a - b)) {
      const row = data[rowIndex];
      if (!row) {
        continue;
      }
      const initialValues: Record<string, string> = {};
      for (const [name, value] of row) {
        if (pkColumns.has(name)) {
          continue;
        }
        initialValues[name] = stringifyValue(value);
      }
      const formId = ids.resultInsertForm();
      const height = estimateInsertFormHeight(row.length);
      const formNode: ResultInsertFormNode = {
        id: formId,
        type: "result-insert-form",
        position: { x: baseX, y: offsetY },
        width: FORM_WIDTH,
        height,
        data: { resultNodeId, initialValues },
      };
      canvas.addNode(formNode);
      canvas.connect(resultNodeId, formId);
      spawnedIds.push(formId);
      offsetY += height + FORM_GAP;
    }
    if (spawnedIds.length > 0) {
      canvas.selectOnly(spawnedIds);
      canvas.zoomToNodes(spawnedIds, { duration: 200 });
    }
  };
}
