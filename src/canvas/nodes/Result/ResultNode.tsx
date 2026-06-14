import { Handle, NodeProps, NodeResizer, Position } from "@xyflow/react";
import { Menu } from "@mantine/core";
import {
  IconChartBar,
  IconDownload,
  IconFileTypeCsv,
  IconFileTypeSql,
  IconGitFork,
  IconJson,
  IconMessageChatbot,
  IconSearch,
} from "@tabler/icons-react";
import { useAtomValue } from "jotai";
import { useRef } from "react";
import { exportRows } from "./exportRows";
import { getExportTableName } from "./inlineEdit";
import { useQueryInfo } from "./queryInfo";
import type { ExportFormat } from "./serializeRows";
import { ResultSearchBar } from "./ResultSearchBar";
import { ResultTable } from "./ResultTable";
import { useResultSearch } from "./useResultSearch";
import { useResultSearchMatches } from "./useResultSearchMatches";
import { useHotkey } from "../../../app/useHotkey";
import { useCanvas } from "../../hooks/useCanvas";
import { useChartSync } from "./useChartSync";
import { useCreateChart } from "./useCreateChart";
import { useScrollFallthrough } from "../../hooks/useScrollFallthrough";
import { HiddenHandles } from "../HiddenHandles";
import { NodeHeader } from "../NodeHeader";
import { NodeIndicator } from "../NodeIndicator";
import { Tooltip } from "../../../components/Tooltip/Tooltip";
import { resultsAtom } from "../../state";
import type { AgentNode, QueryNode, ResultNode as ResultNodeT } from "../../types";
import "./Result.css";

const DEFAULT_W = 620;
const DEFAULT_H = 640;

function nodeHeading(query: string): string {
  return (
    query
      .replace(/^--\s*/u, "")
      .split("\n")
      .map(l => l.trim())
      .join(" ")
      .slice(0, 60) + "..."
  );
}

export function ResultNode({ id, data, selected, width, height }: NodeProps<ResultNodeT>) {
  const canvas = useCanvas();
  const createChart = useCreateChart();
  const results = useAtomValue(resultsAtom);
  const rows = results[id] ?? [];
  useChartSync({ nodeId: id, rows });
  const queryInfo = useQueryInfo(data.query);
  const w = width ?? DEFAULT_W;
  const h = height ?? DEFAULT_H;
  const bodyRef = useRef<HTMLDivElement>(null);
  useScrollFallthrough(bodyRef);

  const search = useResultSearch();
  const matches = useResultSearchMatches(rows, search.query, search.active);
  useHotkey("meta-f", () => {
    if (selected) {
      search.open();
    }
  });

  const canChart =
    rows.length > 0 &&
    !!rows[0].some(
      ([key, value]) => typeof value === "number" && key !== "id" && !key.endsWith("_id"),
    );

  const runCreateChart = () => {
    const node = canvas.getNode(id);
    if (node && node.type === "result") {
      createChart(node);
    }
  };

  const fork = () => {
    const node = canvas.getNode(id);
    if (!node || node.type !== "result") {
      return;
    }

    const branchId = `${id}-branch`;
    const existing = canvas.getNode(branchId);
    if (existing) {
      canvas.updateNodeData<QueryNode["data"]>(branchId, {
        query: data.query,
      });
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
        data: { query: data.query },
      };
      canvas.addNode(queryNode);
      canvas.connect(id, branchId);
    }
    canvas.selectOnly(branchId);
    canvas.zoomToNode(branchId, { duration: 200 });
  };

  const ask = () => {
    const node = canvas.getNode(id);
    if (!node || node.type !== "result") {
      return;
    }

    const agentId = `${id}-agent`;
    const existing = canvas.getNode(agentId);
    if (!existing) {
      const agentNode: AgentNode = {
        id: agentId,
        type: "agent",
        position: {
          x: node.position.x + (node.width ?? DEFAULT_W) + 50,
          y: node.position.y,
        },
        width: 540,
        height: 400,
        data: {
          query: data.query,
          messages: [],
        },
      };
      canvas.addNode(agentNode);
      canvas.connect(id, agentId);
    }
    canvas.selectOnly(agentId);
    canvas.zoomToNode(agentId, { duration: 200 });
  };

  const queryName = nodeHeading(data.query);

  const exportAs = async (format: ExportFormat) => {
    const baseName =
      queryName.replaceAll(/[^a-z0-9_-]+/giu, "_").replaceAll(/^_+|_+$/gu, "") || "result";
    await exportRows(rows, format, baseName, getExportTableName(queryInfo, baseName));
  };

  return (
    <>
      <NodeResizer isVisible={!!selected} minWidth={400} minHeight={260} />
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
        <div className='app-node-subtoolbar nodrag'>
          {search.active ? (
            <ResultSearchBar
              query={search.query}
              matchCount={matches.visibleIndices.length}
              onChange={search.setQuery}
              onClose={search.close}
            />
          ) : (
            <>
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
                <Tooltip label='Search results'>
                  <button className='icon-btn' onClick={search.open} disabled={rows.length === 0}>
                    <IconSearch size={14} />
                  </button>
                </Tooltip>
                <Menu
                  position='bottom-end'
                  offset={4}
                  radius='md'
                  width={180}
                  withinPortal
                  classNames={{
                    dropdown: "column-menu-dropdown",
                    item: "column-menu-item",
                    label: "column-menu-label",
                    itemSection: "column-menu-item-section",
                  }}
                >
                  <Menu.Target>
                    <button className='icon-btn' title='Export' disabled={rows.length === 0}>
                      <IconDownload size={14} />
                    </button>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item
                      leftSection={<IconFileTypeCsv size={14} />}
                      onClick={() => exportAs("csv")}
                    >
                      Export as CSV
                    </Menu.Item>
                    <Menu.Item
                      leftSection={<IconJson size={14} />}
                      onClick={() => exportAs("json")}
                    >
                      Export as JSON
                    </Menu.Item>
                    <Menu.Item
                      leftSection={<IconFileTypeSql size={14} />}
                      onClick={() => exportAs("sql")}
                    >
                      Export as SQL
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              </div>
            </>
          )}
        </div>
        <div className='app-node-body nodrag' ref={bodyRef}>
          <ResultTable
            nodeId={id}
            data={rows}
            query={data.query}
            queryInfo={queryInfo}
            columnWidths={data.columnWidths}
            matches={matches}
          />
        </div>
      </div>
    </>
  );
}
