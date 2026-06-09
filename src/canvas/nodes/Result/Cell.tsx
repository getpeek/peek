import { Text } from "@mantine/core";
import type { CellReference } from "./findReferences";
import { syntaxHighlight } from "./highlight-json";

const ReferenceChip = ({ value, onClick }: { value: string | number; onClick?: () => void }) => (
  <div className={onClick ? "reference reference--link" : "reference"} onClick={onClick}>
    <Text c='inherit'>{value}</Text>
  </div>
);

export const DataCell = ({
  value,
  type,
  isKey,
  inbound,
  outbound,
  onInboundClick,
  onOutboundClick,
}: {
  value: unknown;
  type: string;
  isKey: boolean;
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
      return <ReferenceChip value={value} onClick={() => onInboundClick(inbound, value)} />;
    }
    if (outbound?.length > 0 && onOutboundClick) {
      return <ReferenceChip value={value} onClick={() => onOutboundClick(outbound, value)} />;
    }
    if (isKey) {
      return <ReferenceChip value={value} />;
    }
    return <Text c='inherit'>{value}</Text>;
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
