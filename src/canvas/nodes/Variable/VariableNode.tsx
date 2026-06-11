import { Handle, NodeProps, NodeResizer, Position } from "@xyflow/react";
import { IconBrackets, IconPlus, IconTrash, IconWorld } from "@tabler/icons-react";
import { useMemo, useRef } from "react";
import { useCanvas } from "../../hooks/useCanvas";
import { useScrollFallthrough } from "../../hooks/useScrollFallthrough";
import { NodeHeader } from "../NodeHeader";
import { NodeIndicator } from "../NodeIndicator";
import { VARIABLE_NAME_RE } from "../../variables";
import type { VariableNode as VariableNodeT, VariableRow } from "../../types";
import { VariableArrayEditor } from "./VariableArrayEditor";
import { VariableTextInput } from "./VariableTextInput";
import "./Variable.css";

const DEFAULT_W = 280;
const DEFAULT_H = 220;

export function VariableNode({ id, data, selected, width, height }: NodeProps<VariableNodeT>) {
  const canvas = useCanvas();
  const w = width ?? DEFAULT_W;
  const h = height ?? DEFAULT_H;
  const bodyRef = useRef<HTMLDivElement>(null);
  useScrollFallthrough(bodyRef);

  const updateRows = (next: VariableRow[]) => {
    canvas.updateNodeData<VariableNodeT["data"]>(id, { rows: next });
  };

  const setName = (index: number, next: string) => {
    const rows = data.rows.map((r, i) => (i === index ? { ...r, name: next } : r));
    updateRows(rows);
  };

  const setValue = (index: number, next: string | string[]) => {
    const rows = data.rows.map((r, i) => (i === index ? { ...r, value: next } : r));
    updateRows(rows);
  };

  const toggleArrayMode = (index: number) => {
    const rows = data.rows.map((r, i) => {
      if (i !== index) {
        return r;
      }
      if (Array.isArray(r.value)) {
        return { ...r, value: r.value.join("\n") };
      }
      return { ...r, value: r.value === "" ? [] : r.value.split("\n") };
    });
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
      if (!r.name) {
        continue;
      }
      counts[r.name] = (counts[r.name] ?? 0) + 1;
    }
    return counts;
  }, [data.rows]);

  const headerName = useMemo(() => {
    const named = data.rows.filter(r => r.name).length;
    return named === 0 ? "no variables" : `${named} variable${named === 1 ? "" : "s"}`;
  }, [data.rows]);

  return (
    <>
      <NodeResizer isVisible={!!selected} minWidth={220} minHeight={140} />
      <Handle
        id='top'
        type='source'
        position={Position.Top}
        className='variable-edge-handle variable-edge-handle--top'
        isConnectable
      />
      <Handle
        id='right'
        type='source'
        position={Position.Right}
        className='variable-edge-handle variable-edge-handle--right'
        isConnectable
      />
      <Handle
        id='bottom'
        type='source'
        position={Position.Bottom}
        className='variable-edge-handle variable-edge-handle--bottom'
        isConnectable
      />
      <Handle
        id='left'
        type='source'
        position={Position.Left}
        className='variable-edge-handle variable-edge-handle--left'
        isConnectable
      />
      <div className={`app-node ${selected ? "selected" : ""}`} style={{ width: w, height: h }}>
        <NodeHeader nodeId={id} name={headerName} indicator={<NodeIndicator kind='variable' />} />
        <div className='app-node-body nodrag variable-body' ref={bodyRef}>
          <table className='variable-table'>
            <colgroup>
              <col className='variable-col-name' />
              <col className='variable-col-value' />
              <col className='variable-col-actions' />
            </colgroup>
            <tbody>
              {data.rows.map((row, i) => {
                const nameInvalid =
                  row.name.length > 0 &&
                  (!VARIABLE_NAME_RE.test(row.name) || nameCounts[row.name] > 1);
                const isArray = Array.isArray(row.value);
                return (
                  <tr key={i}>
                    <td className='variable-name-cell'>
                      <div className='variable-name-wrap'>
                        <span className='at-sigil'>@</span>
                        <VariableTextInput
                          className={`variable-input ${nameInvalid ? "invalid" : ""}`}
                          value={row.name}
                          placeholder='name'
                          onChange={next => setName(i, next)}
                        />
                      </div>
                    </td>
                    <td className='variable-value-cell'>
                      {isArray ? (
                        <VariableArrayEditor
                          value={row.value as string[]}
                          onChange={next => setValue(i, next)}
                        />
                      ) : (
                        <VariableTextInput
                          className='variable-input'
                          value={row.value as string}
                          placeholder='value'
                          onChange={next => setValue(i, next)}
                        />
                      )}
                    </td>
                    <td className='variable-actions-cell'>
                      <button
                        type='button'
                        className={`variable-row-toggle ${isArray ? "active" : ""}`}
                        onClick={() => toggleArrayMode(i)}
                        title={isArray ? "Convert to single value" : "Convert to array"}
                      >
                        <IconBrackets size={12} />
                      </button>
                      <button
                        type='button'
                        className='variable-row-delete'
                        onClick={() => removeRow(i)}
                        title='Remove row'
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
        <div className='app-node-footer nodrag'>
          <button className='btn btn-ghost' onClick={addRow}>
            <IconPlus size={13} />
            Add variable
          </button>
          <button
            type='button'
            className={`variable-global-toggle ${data.isGlobal ? "active" : ""}`}
            title='Make this variable node global'
            onClick={() => {
              const next = !data.isGlobal;
              canvas.updateNodeData<VariableNodeT["data"]>(id, {
                isGlobal: next,
              });
              if (next) {
                for (const n of canvas.getNodes()) {
                  if (n.type === "query") {
                    canvas.connect(id, n.id);
                  }
                }
              }
            }}
          >
            <IconWorld size={14} />
          </button>
        </div>
      </div>
    </>
  );
}
