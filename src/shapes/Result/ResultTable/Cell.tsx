import { Text } from "@mantine/core";
import { CellReference } from "./findReferences";
import { useEditor } from "tldraw";
import "./Cell.css";
import { useExecuteQueries } from "../../../tools/useExecuteQuery";

export const DataCell = ({
  value,
  type,
  inbound,
  outbound,
}: {
  value: unknown;
  type: string;
  inbound: CellReference[];
  outbound: CellReference[];
}) => {
  const editor = useEditor();
  const executeQuery = useExecuteQueries();

  const openOutboundReferences = async () => {
    const queries = outbound.map(
      (ref) =>
        `SELECT * FROM ${ref.table} WHERE ${ref.column} = '${value}' LIMIT 300`,
    );
    const shape = editor.getOnlySelectedShape()!;

    if (!shape) {
      return;
    }

    executeQuery(shape, queries);
  };

  const openInboundReferences = async () => {
    const queries = inbound.map(
      (ref) =>
        `SELECT * FROM ${ref.table} WHERE ${ref.column} = '${value}' LIMIT 300`,
    );
    const shape = editor.getOnlySelectedShape()!;

    if (!shape) {
      return;
    }

    executeQuery(shape, queries);
  };

  if ((type === "JSON" || type === "JSONB") && value !== null) {
    return <pre>{JSON.stringify(value, null, 2)}</pre>;
  }

  if (typeof value === "string" || typeof value === "number") {
    if (inbound.length > 0) {
      return (
        <div onClick={openInboundReferences} className="reference">
          <Text c="blue">{value}</Text>
        </div>
      );
    }
    if (outbound.length > 0) {
      return (
        <div onClick={openOutboundReferences} className="reference">
          <Text c="blue">{value}</Text>
        </div>
      );
    }
    return <Text c="#ABA6FF">{value}</Text>;
  }

  if (type === "BOOL") {
    return value ? (
      <Text fs="italic" c="blue">
        TRUE
      </Text>
    ) : (
      <Text fs="italic" c="red">
        FALSE
      </Text>
    );
  }

  if (value === null) {
    return (
      <Text fs="italic" c="gray">
        NULL
      </Text>
    );
  }

  return "unknown shape";
};
