import { Text } from "@mantine/core";
import { highlightMatch } from "../../../Connection/highlightMatch";
import type { CellReference } from "./findReferences";
import { syntaxHighlight } from "./highlight-json";

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
    <Text c='inherit'>{highlightMatch(match, String(value))}</Text>
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
    return (
      <pre
        className='json'
        dangerouslySetInnerHTML={{
          __html: syntaxHighlight(JSON.stringify(value, null, 2)),
        }}
      />
    );
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
    return <Text c='inherit'>{highlightMatch(match, String(value))}</Text>;
  }

  if (type === "BOOL") {
    return value ? (
      <Text fs='italic' c='blue'>
        TRUE
      </Text>
    ) : (
      <Text fs='italic' c='red'>
        FALSE
      </Text>
    );
  }

  if (value === null) {
    return (
      <Text fs='italic' c='gray'>
        NULL
      </Text>
    );
  }

  return <>unknown shape</>;
};
