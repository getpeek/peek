import { highlightMatch } from "../../../../Connection/highlightMatch";
import type { CellReference } from "../findReferences";
import { JsonCell } from "./JsonCell";

const ReferenceChip = ({
  value,
  match,
  onClick,
}: {
  value: string | number;
  match?: Fuzzysort.Result;
  onClick?: () => void;
}) => (
  <div className={onClick ? "reference reference--link" : "reference"} onClick={onClick}>
    {highlightMatch(match, String(value))}
  </div>
);

export const DataCell = ({
  value,
  type,
  isKey,
  match,
  inbound,
  outbound,
  onInboundClick,
  onOutboundClick,
}: {
  value: unknown;
  type: string;
  isKey: boolean;
  match?: Fuzzysort.Result;
  inbound: CellReference[];
  outbound: CellReference[];
  onInboundClick?: (refs: CellReference[], value: unknown) => void;
  onOutboundClick?: (refs: CellReference[], value: unknown) => void;
}) => {
  if ((type === "JSON" || type === "JSONB") && value !== null) {
    return <JsonCell value={value} />;
  }

  if (typeof value === "string" || typeof value === "number") {
    if (inbound?.length > 0 && onInboundClick) {
      return (
        <ReferenceChip value={value} match={match} onClick={() => onInboundClick(inbound, value)} />
      );
    }
    if (outbound?.length > 0 && onOutboundClick) {
      return (
        <ReferenceChip
          value={value}
          match={match}
          onClick={() => onOutboundClick(outbound, value)}
        />
      );
    }
    if (isKey) {
      return <ReferenceChip value={value} match={match} />;
    }
    return <>{highlightMatch(match, String(value))}</>;
  }

  if (type === "BOOL") {
    return value ? (
      <span className='cell-bool-true'>TRUE</span>
    ) : (
      <span className='cell-bool-false'>FALSE</span>
    );
  }

  if (value === null) {
    return <span className='cell-null'>NULL</span>;
  }

  return <>unknown shape</>;
};
