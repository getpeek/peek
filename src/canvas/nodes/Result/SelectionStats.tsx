import type { SelectionAggregates } from "./aggregate";

const numberFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 4 });

/** Aggregate readout shown in the result toolbar while an all-numeric cell selection is active. */
export function SelectionStats({ summary }: { summary: SelectionAggregates }) {
  const stats: [string, number][] = [
    ["count", summary.count],
    ["sum", summary.sum],
    ["avg", summary.avg],
    ["min", summary.min],
    ["max", summary.max],
  ];

  return (
    <>
      {stats.map(([label, value]) => (
        <span key={label} className='stat'>
          <span className='label'>{label}</span>
          <span className='value'>{numberFormat.format(value)}</span>
        </span>
      ))}
    </>
  );
}
