import {
  IconChartBar,
  IconCopy,
  IconDownload,
  IconGitFork,
  IconLayoutRows,
  IconMessageChatbot,
  IconRowInsertBottom,
  IconSearch,
} from "@tabler/icons-react";
import { copyRows } from "./export/copyRows";
import { exportRows } from "./export/exportRows";
import { FormatMenu } from "./export/FormatMenu";
import { getEditableTableName, getExportTableName } from "./cell/inlineEdit";
import type { ExportFormat } from "./export/serializeRows";
import { nodeHeading } from "./queryHeading";
import { ResultSearchBar } from "./ResultSearchBar";
import { togglePivot } from "./togglePivot";
import type { QueryInfo } from "./queryInfo";
import { useResultSearch } from "./hooks/useResultSearch";
import { useCreateChart } from "./hooks/useCreateChart";
import { SelectionStats } from "./SelectionStats";
import { useAddRow } from "../ResultInsertForm/useInsertFormSpawn";
import { useCanvas } from "../../hooks/useCanvas";
import { Tooltip } from "../../../components/Tooltip/Tooltip";
import { cellSelectionSummaryAtom } from "../../state";
import { useAtomValue } from "jotai";
import type { DatabaseResult } from "../../../state";
import type { AgentNode, QueryNode } from "../../types";

// Fallback when a result node has no measured width yet (positions the agent
// node spawned by "ask" to the right of it).
const DEFAULT_NODE_WIDTH = 620;

export function ResultToolbar({
  nodeId,
  query,
  rows,
  queryInfo,
  pivoted,
  search,
  matchCount,
}: {
  nodeId: string;
  query: string;
  rows: DatabaseResult;
  queryInfo: QueryInfo | null;
  pivoted: boolean;
  search: ReturnType<typeof useResultSearch>;
  matchCount: number;
}) {
  const canvas = useCanvas();
  const createChart = useCreateChart();
  const summary = useAtomValue(cellSelectionSummaryAtom);
  const selectionStats = summary?.nodeId === nodeId ? summary : null;

  const canChart =
    rows.length > 0 &&
    !!rows[0].some(
      ([key, value]) => typeof value === "number" && key !== "id" && !key.endsWith("_id"),
    );

  const editableTable = getEditableTableName(queryInfo);
  const canInsert = editableTable !== null;
  const addRow = useAddRow(nodeId, editableTable);

  const runCreateChart = () => {
    const node = canvas.getNode(nodeId);
    if (node && node.type === "result") {
      createChart(node);
    }
  };

  const fork = () => {
    const node = canvas.getNode(nodeId);
    if (!node || node.type !== "result") {
      return;
    }

    const branchId = `${nodeId}-branch`;
    const existing = canvas.getNode(branchId);
    if (existing) {
      canvas.updateNodeData<QueryNode["data"]>(branchId, { query });
    } else {
      const queryNode: QueryNode = {
        id: branchId,
        type: "query",
        position: {
          x: node.position.x,
          y: node.position.y - 200,
        },
        width: 420,
        height: 320,
        data: { query },
      };
      canvas.addNode(queryNode);
      canvas.connect(nodeId, branchId);
    }
    canvas.selectOnly(branchId);
    canvas.zoomToNode(branchId, { duration: 200 });
  };

  const ask = () => {
    const node = canvas.getNode(nodeId);
    if (!node || node.type !== "result") {
      return;
    }

    const agentId = `${nodeId}-agent`;
    const existing = canvas.getNode(agentId);
    if (!existing) {
      const agentNode: AgentNode = {
        id: agentId,
        type: "agent",
        position: {
          x: node.position.x + (node.width ?? DEFAULT_NODE_WIDTH) + 50,
          y: node.position.y,
        },
        width: 540,
        height: 400,
        data: { query, messages: [] },
      };
      canvas.addNode(agentNode);
      canvas.connect(nodeId, agentId);
    }
    canvas.selectOnly(agentId);
    canvas.zoomToNode(agentId, { duration: 200 });
  };

  const baseName =
    nodeHeading(query)
      .replaceAll(/[^a-z0-9_-]+/giu, "_")
      .replaceAll(/^_+|_+$/gu, "") || "result";

  const exportAs = async (format: ExportFormat) => {
    await exportRows(rows, format, baseName, getExportTableName(queryInfo, baseName));
  };

  const copyAs = async (format: ExportFormat) => {
    await copyRows(rows, format, getExportTableName(queryInfo, baseName));
  };

  if (search.active && !pivoted) {
    return (
      <div className='app-node-subtoolbar nodrag'>
        <ResultSearchBar
          query={search.query}
          matchCount={matchCount}
          autoFocus={search.autoFocus}
          onChange={search.setQuery}
          onClose={search.close}
        />
      </div>
    );
  }

  if (selectionStats) {
    return (
      <div className='app-node-subtoolbar nodrag'>
        <SelectionStats summary={selectionStats} />
      </div>
    );
  }

  return (
    <div className='app-node-subtoolbar nodrag'>
      <div className='meta'>
        <span className='ok'>●</span>
        <span>{rows.length} rows</span>
        {queryInfo?.tables.map(t => (
          <span key={`${t.name}-${t.alias ?? ""}`} className='table-badge'>
            {t.name}
          </span>
        ))}
      </div>
      <div className='actions'>
        {canInsert && (
          <Tooltip label='Add row'>
            <button className='icon-btn' onClick={addRow}>
              <IconRowInsertBottom size={14} />
            </button>
          </Tooltip>
        )}
        {canChart && (
          <Tooltip label='Create chart'>
            <button className='icon-btn' onClick={runCreateChart}>
              <IconChartBar size={14} />
            </button>
          </Tooltip>
        )}
        <Tooltip label='Ask about this result'>
          <button className='icon-btn' onClick={ask}>
            <IconMessageChatbot size={14} />
          </button>
        </Tooltip>
        <Tooltip label='Fork query'>
          <button className='icon-btn' onClick={fork}>
            <IconGitFork size={14} />
          </button>
        </Tooltip>
        <FormatMenu
          icon={<IconDownload size={14} />}
          title='Export'
          verb='Export'
          disabled={rows.length === 0}
          onSelect={exportAs}
        />
        <FormatMenu
          icon={<IconCopy size={14} />}
          title='Copy'
          verb='Copy'
          disabled={rows.length === 0}
          onSelect={copyAs}
        />
        <Tooltip label={pivoted ? "Show as table" : "Pivot result"}>
          <button
            className={pivoted ? "icon-btn is-active" : "icon-btn"}
            onClick={() => {
              togglePivot(canvas, nodeId, rows[0]?.length ?? 0);
              // Pivoting reshapes the node, which is usually parked off-screen —
              // recenter so it doesn't get lost.
              canvas.zoomToNode(nodeId, { duration: 200 });
            }}
            disabled={rows.length === 0}
          >
            <IconLayoutRows size={14} />
          </button>
        </Tooltip>
        <Tooltip label='Search results'>
          <button
            className='icon-btn'
            onClick={search.open}
            disabled={rows.length === 0 || pivoted}
          >
            <IconSearch size={14} />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
