import { useAtomValue } from "jotai";
import { cellSelectionSummaryAtom } from "../state";
import "./SelectionSummary.css";

const numberFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 4 });

export function SelectionSummary() {
  const summary = useAtomValue(cellSelectionSummaryAtom);
  if (!summary) {
    return null;
  }

  const stats: [string, number][] = [
    ["count", summary.count],
    ["sum", summary.sum],
    ["avg", summary.avg],
    ["min", summary.min],
    ["max", summary.max],
  ];

  return (
    <div className='selection-summary'>
      {stats.map(([label, value]) => (
        <span key={label} className='stat'>
          <span className='label'>{label}</span>
          <span className='value'>{numberFormat.format(value)}</span>
        </span>
      ))}
    </div>
  );
}
