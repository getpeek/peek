import { Handle, NodeProps, NodeResizer, Position } from "@xyflow/react";
import { useAtomValue } from "jotai";
import { memo, useRef } from "react";
import { nodeHeading } from "./queryHeading";
import { useQueryInfo } from "./queryInfo";
import { ResultPivotView } from "./ResultPivotView";
import { ResultTable } from "./ResultTable";
import { ResultToolbar } from "./ResultToolbar";
import { useResultSearch } from "./hooks/useResultSearch";
import { useResultSearchMatches } from "./hooks/useResultSearchMatches";
import { useChartSync } from "./hooks/useChartSync";
import { useHotkey } from "../../../app/useHotkey";
import { useKeymap } from "../../../app/keymap";
import { useScrollFallthrough } from "../../hooks/useScrollFallthrough";
import { useSelectionCursor } from "./hooks/useSelectionCursor";
import { HiddenHandles } from "../HiddenHandles";
import { NodeHeader } from "../NodeHeader";
import { NodeIndicator } from "../NodeIndicator";
import { resultRowsAtom } from "../../state";
import type { ResultNode as ResultNodeT } from "../../types";
import "./Result.css";

const DEFAULT_W = 620;
const DEFAULT_H = 640;

export const ResultNode = memo(function ResultNode({
  id,
  data,
  selected,
  width,
  height,
}: NodeProps<ResultNodeT>) {
  const rows = useAtomValue(resultRowsAtom(id));
  useChartSync({ nodeId: id, rows });
  const queryInfo = useQueryInfo(data.query);
  const w = width ?? DEFAULT_W;
  const h = height ?? DEFAULT_H;
  const bodyRef = useRef<HTMLDivElement>(null);
  useScrollFallthrough(bodyRef);

  // Cmd/Ctrl held → drag moves the node: drop `nodrag` so React Flow takes the
  // gesture, and show the matching cursor. Shift keeps its row-selection cursor.
  const modifierClass = useSelectionCursor();
  const bodyClasses = [
    "app-node-body",
    modifierClass === "move-cursor" ? null : "nodrag",
    modifierClass,
  ]
    .filter(Boolean)
    .join(" ");

  const pivoted = data.pivoted ?? false;
  const search = useResultSearch(id);
  const matches = useResultSearchMatches(rows, search.query, search.active);
  const keymap = useKeymap();
  useHotkey(keymap["Page::Search"], () => {
    if (selected && !pivoted) {
      search.open();
    }
  });

  const queryName = nodeHeading(data.query);

  return (
    <>
      <NodeResizer minWidth={400} minHeight={260} />
      <HiddenHandles connectableTarget />
      <Handle
        id='out-top'
        type='source'
        position={Position.Top}
        className='result-edge-handle result-edge-handle--top'
        isConnectable
      />
      <Handle
        id='out-right'
        type='source'
        position={Position.Right}
        className='result-edge-handle result-edge-handle--right'
        isConnectable
      />
      <Handle
        id='out-bottom'
        type='source'
        position={Position.Bottom}
        className='result-edge-handle result-edge-handle--bottom'
        isConnectable
      />
      <Handle
        id='out-left'
        type='source'
        position={Position.Left}
        className='result-edge-handle result-edge-handle--left'
        isConnectable
      />
      <div className={`app-node ${selected ? "selected" : ""}`} style={{ width: w, height: h }}>
        <NodeHeader
          nodeId={id}
          name={queryName ? `result · ${queryName}` : "result"}
          indicator={<NodeIndicator kind='result' />}
        />
        <ResultToolbar
          nodeId={id}
          query={data.query}
          rows={rows}
          queryInfo={queryInfo}
          pivoted={pivoted}
          search={search}
          matchCount={matches.visibleIndices.length}
        />
        <div className={bodyClasses} ref={bodyRef}>
          {pivoted ? (
            <ResultPivotView nodeId={id} data={rows} query={data.query} queryInfo={queryInfo} />
          ) : (
            <ResultTable
              nodeId={id}
              data={rows}
              query={data.query}
              queryInfo={queryInfo}
              columnWidths={data.columnWidths}
              matches={matches}
            />
          )}
        </div>
      </div>
    </>
  );
});
