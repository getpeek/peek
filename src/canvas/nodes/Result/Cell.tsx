import { Text } from "@mantine/core";
import type { CellReference } from "../../../shapes/Result/ResultTable/findReferences";
import { syntaxHighlight } from "../../../shapes/Result/ResultTable/highlight-json";
import "../../../shapes/Result/ResultTable/Cell.css";

export const DataCell = ({
  value,
  type,
  inbound,
  outbound,
  onInboundClick,
  onOutboundClick,
}: {
  value: unknown;
  type: string;
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
        <div onClick={() => onInboundClick(inbound, value)} className='reference'>
          <Text c='inherit'>{value}</Text>
        </div>
      );
    }
    if (outbound?.length > 0 && onOutboundClick) {
      return (
        <div onClick={() => onOutboundClick(outbound, value)} className='reference'>
          <Text c='inherit'>{value}</Text>
        </div>
      );
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
