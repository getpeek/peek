import { NodeProps, NodeResizer } from "@xyflow/react";
import { Menu } from "@mantine/core";
import {
  IconChartBar,
  IconDownload,
  IconDots,
  IconFileTypeCsv,
  IconGitFork,
  IconJson,
  IconMessageChatbot,
} from "@tabler/icons-react";
import { useAtomValue } from "jotai";
import { useRef } from "react";
import { schemaAtom } from "../../../state";
import { exportRows } from "./exportRows";
import { ResultTable } from "./ResultTable";
import { useCanvas } from "../../hooks/useCanvas";
import { useCreateChart } from "./useCreateChart";
import { useScrollFallthrough } from "../../hooks/useScrollFallthrough";
import { HiddenHandles } from "../HiddenHandles";
import { NodeHeader } from "../NodeHeader";
import { NodeIndicator } from "../NodeIndicator";
import { ids } from "../../ids";
import { resultsAtom } from "../../state";
import type { ChatNode, QueryNode, ResultNode as ResultNodeT } from "../../types";
import "./Result.css";

const DEFAULT_W = 620;
const DEFAULT_H = 640;

function firstLineOfQuery(query: string): string {
  const line = query.split("\n").find(l => l.trim().length > 0);
  if (!line) {
    return "";
  }
  return line
    .replace(/^--\s*/, "")
    .trim()
    .slice(0, 60);
}

export function ResultNode({ id, data, selected, width, height }: NodeProps<ResultNodeT>) {
  const canvas = useCanvas();
  const createChart = useCreateChart();
  const schema = useAtomValue(schemaAtom);
  const results = useAtomValue(resultsAtom);
  const rows = results[id] ?? [];
  const w = width ?? DEFAULT_W;
  const h = height ?? DEFAULT_H;
  const bodyRef = useRef<HTMLDivElement>(null);
  useScrollFallthrough(bodyRef);

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

    const chatId = ids.chat(id);
    const existing = canvas.getNode(chatId);
    if (!existing) {
      const chatNode: ChatNode = {
        id: chatId,
        type: "chat",
        position: {
          x: node.position.x + (node.width ?? DEFAULT_W) + 50,
          y: node.position.y,
        },
        width: 540,
        height: 400,
        data: {
          query: data.query,
          result: rows,
          schema: {
            tables: Object.fromEntries(
              Object.entries(schema.tables).map(([k, cols]) => [k, cols.map(([col]) => col)]),
            ),
            references: schema.references,
          },
          messages: [],
        },
      };
      canvas.addNode(chatNode);
      canvas.connect(id, chatId);
    }
    canvas.selectOnly(chatId);
    canvas.zoomToNode(chatId, { duration: 200 });
  };

  const queryName = firstLineOfQuery(data.query);

  const exportAs = async (format: "csv" | "json") => {
    const baseName =
      queryName.replaceAll(/[^a-z0-9_-]+/gi, "_").replaceAll(/^_+|_+$/g, "") || "result";
    await exportRows(rows, format, baseName);
  };

  return (
    <>
      <NodeResizer isVisible={!!selected} minWidth={400} minHeight={260} />
      <HiddenHandles connectableTarget />
      <div className={`app-node ${selected ? "selected" : ""}`} style={{ width: w, height: h }}>
        <NodeHeader
          nodeId={id}
          name={queryName ? `result · ${queryName}` : "result"}
          indicator={<NodeIndicator kind='result' />}
        />
        <div className='app-node-subtoolbar nodrag'>
          <div className='meta'>
            <span className='ok'>●</span>
            <span>{rows.length} rows</span>
            {queryName && <span>{queryName.slice(0, 20)}...</span>}
          </div>
          <div className='actions'>
            {canChart && (
              <button className='icon-btn' title='Create chart' onClick={runCreateChart}>
                <IconChartBar size={14} />
              </button>
            )}
            <button className='icon-btn' title='Ask about this result' onClick={ask}>
              <IconMessageChatbot size={14} />
            </button>
            <button className='icon-btn' title='Fork query' onClick={fork}>
              <IconGitFork size={14} />
            </button>
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
                <Menu.Item leftSection={<IconJson size={14} />} onClick={() => exportAs("json")}>
                  Export as JSON
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
            <button className='icon-btn' title='More'>
              <IconDots size={14} />
            </button>
          </div>
        </div>
        <div className='app-node-body nodrag' ref={bodyRef}>
          <ResultTable
            nodeId={id}
            data={rows}
            query={data.query}
            columnWidths={data.columnWidths}
          />
        </div>
      </div>
    </>
  );
}
