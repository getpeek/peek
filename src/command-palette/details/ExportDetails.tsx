import { useAtomValue } from "jotai";
import { IconFileTypeCsv, IconJson } from "@tabler/icons-react";
import { nodesAtom, resultsAtom } from "../../canvas/state";
import type { ResultNode } from "../../canvas/types";
import type { DatabaseResult } from "../../state";
import "./ExportDetails.css";

const PREVIEW_ROWS = 4;
const PREVIEW_COLS = 5;
const VALUE_MAX = 32;

interface ExportDetailsProps {
  format: "csv" | "json";
}

export const ExportDetails = ({ format }: ExportDetailsProps) => {
  const nodes = useAtomValue(nodesAtom);
  const results = useAtomValue(resultsAtom);

  const selectedResults = nodes
    .filter((node): node is ResultNode => node.type === "result" && node.selected === true)
    .map(node => ({ node, rows: results[node.id] ?? [] }));

  const formatLabel = format === "csv" ? "CSV" : "JSON";
  const Icon = format === "csv" ? IconFileTypeCsv : IconJson;

  return (
    <div className='details-export'>
      <div className='details-eyebrow'>Export · {formatLabel}</div>
      <div className='details-title-row'>
        <span className='details-export-glyph'>
          <Icon size={18} />
        </span>
        <div className='details-title'>Export selected data</div>
      </div>
      <div className='details-subtitle'>
        {selectedResults.length === 0
          ? "Select result nodes on the canvas to enable this command."
          : `${selectedResults.length} result ${selectedResults.length === 1 ? "node" : "nodes"} ready to export as ${formatLabel}.`}
      </div>

      {selectedResults.length > 0 ? (
        <div className='details-export-list'>
          {selectedResults.slice(0, 3).map(({ node, rows }) => (
            <ExportPreview key={node.id} title={previewTitle(node)} rows={rows} />
          ))}
          {selectedResults.length > 3 ? (
            <div className='details-export-more'>
              +{selectedResults.length - 3} more result{selectedResults.length - 3 === 1 ? "" : "s"}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className='details-action-hint'>
        <kbd className='details-key'>↵</kbd>
        <span>{selectedResults.length === 0 ? "No selection" : "Choose a folder and export"}</span>
      </div>
    </div>
  );
};

const ExportPreview = ({ title, rows }: { title: string; rows: DatabaseResult }) => {
  if (rows.length === 0) {
    return (
      <section className='details-export-card'>
        <header className='details-export-card-header'>
          <span className='details-export-card-title'>{title}</span>
          <span className='details-export-card-meta'>empty</span>
        </header>
        <div className='details-export-empty'>This result has no rows yet.</div>
      </section>
    );
  }

  const headerRow = rows[0];
  const visibleColumns = headerRow.slice(0, PREVIEW_COLS);
  const hiddenColumns = Math.max(0, headerRow.length - PREVIEW_COLS);
  const visibleRows = rows.slice(0, PREVIEW_ROWS);
  const hiddenRows = Math.max(0, rows.length - PREVIEW_ROWS);

  return (
    <section className='details-export-card'>
      <header className='details-export-card-header'>
        <span className='details-export-card-title'>{title}</span>
        <span className='details-export-card-meta'>
          {rows.length} {rows.length === 1 ? "row" : "rows"} · {headerRow.length}{" "}
          {headerRow.length === 1 ? "col" : "cols"}
        </span>
      </header>
      <div className='details-export-table-wrap'>
        <table className='details-export-table'>
          <thead>
            <tr>
              {visibleColumns.map(([name], i) => (
                <th key={i} title={name}>
                  {name}
                </th>
              ))}
              {hiddenColumns > 0 ? (
                <th className='details-export-overflow'>+{hiddenColumns}</th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, r) => (
              <tr key={r}>
                {row.slice(0, PREVIEW_COLS).map(([, value], c) => (
                  <td key={c} title={String(value ?? "")}>
                    {formatCell(value)}
                  </td>
                ))}
                {hiddenColumns > 0 ? <td className='details-export-overflow'>…</td> : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hiddenRows > 0 ? (
        <div className='details-export-card-footer'>+{hiddenRows} more rows</div>
      ) : null}
    </section>
  );
};

const previewTitle = (node: ResultNode): string => {
  const query = node.data.query?.trim() ?? "";
  if (query.length === 0) {
    return node.id;
  }
  const collapsed = query.replaceAll(/\s+/gu, " ");
  return collapsed.length > 60 ? `${collapsed.slice(0, 60)}…` : collapsed;
};

const formatCell = (value: unknown): string => {
  if (value === null || value === undefined) {
    return "—";
  }
  const str = typeof value === "object" ? JSON.stringify(value) : String(value);
  return str.length > VALUE_MAX ? `${str.slice(0, VALUE_MAX)}…` : str;
};
