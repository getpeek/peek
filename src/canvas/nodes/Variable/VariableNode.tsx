import { Handle, NodeProps, NodeResizer, Position } from "@xyflow/react";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useMemo, useRef } from "react";
import { useCanvas } from "../../useCanvas";
import { useScrollFallthrough } from "../useScrollFallthrough";
import { NodeHeader } from "../NodeHeader";
import { VARIABLE_NAME_RE } from "../../variables";
import type {
  VariableNode as VariableNodeT,
  VariableRow,
} from "../../types";
import "../node.css";
import "./Variable.css";

const DEFAULT_W = 280;
const DEFAULT_H = 220;

export function VariableNode({
  id,
  data,
  selected,
  width,
  height,
}: NodeProps<VariableNodeT>) {
  const canvas = useCanvas();
  const w = width ?? DEFAULT_W;
  const h = height ?? DEFAULT_H;
  const bodyRef = useRef<HTMLDivElement>(null);
  useScrollFallthrough(bodyRef);

  const updateRows = (next: VariableRow[]) => {
    canvas.updateNodeData<VariableNodeT["data"]>(id, { rows: next });
  };

  const setField = (
    index: number,
    field: "name" | "value",
    next: string,
  ) => {
    const rows = data.rows.map((r, i) =>
      i === index ? { ...r, [field]: next } : r,
    );
    updateRows(rows);
  };

  const removeRow = (index: number) => {
    const rows = data.rows.filter((_, i) => i !== index);
    updateRows(rows.length === 0 ? [{ name: "", value: "" }] : rows);
  };

  const addRow = () => updateRows([...data.rows, { name: "", value: "" }]);

  const nameCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of data.rows) {
      if (!r.name) continue;
      counts[r.name] = (counts[r.name] ?? 0) + 1;
    }
    return counts;
  }, [data.rows]);

  const headerName = useMemo(() => {
    const named = data.rows.filter((r) => r.name).length;
    return named === 0 ? "no variables" : `${named} variable${named === 1 ? "" : "s"}`;
  }, [data.rows]);

  return (
    <>
      <NodeResizer isVisible={!!selected} minWidth={220} minHeight={140} />
      <Handle
        type="source"
        position={Position.Right}
        className="variable-source-handle"
        isConnectable
      />
      <div
        className={`app-node ${selected ? "selected" : ""}`}
        style={{ width: w, height: h }}
      >
        <NodeHeader nodeId={id} type="variable" name={headerName} />
        <div className="app-node-body nodrag variable-body" ref={bodyRef}>
          <table className="variable-table">
            <colgroup>
              <col className="variable-col-name" />
              <col className="variable-col-value" />
              <col className="variable-col-actions" />
            </colgroup>
            <tbody>
              {data.rows.map((row, i) => {
                const nameInvalid =
                  row.name.length > 0 &&
                  (!VARIABLE_NAME_RE.test(row.name) ||
                    nameCounts[row.name] > 1);
                return (
                  <tr key={i}>
                    <td className="variable-name-cell">
                      <div className="variable-name-wrap">
                        <span className="at-sigil">@</span>
                        <input
                          type="text"
                          className={`variable-input ${nameInvalid ? "invalid" : ""}`}
                          value={row.name}
                          placeholder="name"
                          autoComplete="off"
                          spellCheck={false}
                          onChange={(e) => setField(i, "name", e.currentTarget.value)}
                        />
                      </div>
                    </td>
                    <td className="variable-value-cell">
                      <input
                        type="text"
                        className="variable-input"
                        value={row.value}
                        placeholder="value"
                        autoComplete="off"
                        spellCheck={false}
                        onChange={(e) => setField(i, "value", e.currentTarget.value)}
                      />
                    </td>
                    <td className="variable-actions-cell">
                      <button
                        type="button"
                        className="variable-row-delete"
                        onClick={() => removeRow(i)}
                        title="Remove row"
                      >
                        <IconTrash size={12} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="app-node-footer nodrag">
          <button className="btn btn-ghost" onClick={addRow}>
            <IconPlus size={13} />
            Add variable
          </button>
        </div>
      </div>
    </>
  );
}
