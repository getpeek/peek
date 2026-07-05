import { IconHash, IconMathAvg, IconMathMax, IconMathMin, IconSum } from "@tabler/icons-react";
import type { Icon } from "@tabler/icons-react";
import type { SelectionAggregates } from "./aggregate";

const numberFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 4 });

const stats: [keyof SelectionAggregates, Icon][] = [
  ["count", IconHash],
  ["sum", IconSum],
  ["avg", IconMathAvg],
  ["min", IconMathMin],
  ["max", IconMathMax],
];

/** Aggregate chips that take over the result toolbar while an all-numeric cell selection is active. */
export function SelectionStats({ summary }: { summary: SelectionAggregates }) {
  return (
    <div className='selection-stats'>
      {stats.map(([label, StatIcon]) => (
        <span key={label} className='stat-chip'>
          <StatIcon size={11} />
          <span className='label'>{label}</span>
          <span className='value'>{numberFormat.format(summary[label])}</span>
        </span>
      ))}
    </div>
  );
}
