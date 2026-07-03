import { useAtomValue } from "jotai";
import { nodesAtom, resultsAtom } from "../../canvas/state";
import type { ResultNode } from "../../canvas/types";

interface ExportDetailsProps {
  format: "csv" | "json";
}

export const ExportDetails = ({ format }: ExportDetailsProps) => {
  const nodes = useAtomValue(nodesAtom);
  const results = useAtomValue(resultsAtom);

  const selected = nodes.filter(
    (node): node is ResultNode => node.type === "result" && node.selected === true,
  );
  const totalRows = selected.reduce((sum, node) => sum + (results[node.id]?.length ?? 0), 0);
  const formatLabel = format === "csv" ? "CSV" : "JSON";

  return (
    <div className='cp-strip'>
      <span className='cp-strip-tag'>{formatLabel}</span>
      <span className='cp-strip-desc'>
        {selected.length === 0
          ? "Select result nodes on the canvas to export"
          : "Choose a folder to export the selection"}
      </span>
      {selected.length > 0 ? (
        <span className='cp-strip-meta'>
          <span className='m-strong'>{selected.length}</span>
          <span className='m-dim'>{selected.length === 1 ? "node" : "nodes"}</span>
          <span className='m-sep'>·</span>
          <span className='m-strong'>{totalRows.toLocaleString()}</span>
          <span className='m-dim'>{totalRows === 1 ? "row" : "rows"}</span>
        </span>
      ) : null}
    </div>
  );
};
