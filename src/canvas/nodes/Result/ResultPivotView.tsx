import { useAtomValue } from "jotai";
import { memo } from "react";
import { schemaAtom, type DatabaseResult } from "../../../state";
import { DataCell } from "./cell/Cell";
import { EditCell } from "./cell/EditCell";
import { classifyColumn } from "./columnRoles";
import { ResultEmpty } from "./ResultEmpty";
import { stringifyValue } from "./stringify";
import { useColumnReferences } from "./hooks/useColumnReferences";
import { useFollowReferences } from "./hooks/useFollowReferences";
import { useResultEditing } from "./hooks/useResultEditing";
import type { QueryInfo } from "./queryInfo";

const SCROLL_CONTAINER_STYLE = {
  height: "100%",
  width: "100%",
  overflow: "auto",
  background: "var(--pk-node-bg)",
} as React.CSSProperties;

/**
 * Record view for wide results: each row is rendered as a vertical table of
 * column-name → value pairs, so a result with many columns and few rows reads
 * top-to-bottom instead of scrolling sideways. Cells are editable, reusing the
 * same inline-edit machinery as the horizontal table.
 */
export const ResultPivotView = memo(function ResultPivotView({
  nodeId,
  data,
  query,
  queryInfo,
}: {
  nodeId: string;
  data: DatabaseResult;
  query: string;
  queryInfo: QueryInfo | null;
}) {
  const schema = useAtomValue(schemaAtom);
  const { editing, setEditing, commitEdit, variableNames } = useResultEditing({
    data,
    query,
    queryInfo,
    nodeId,
  });

  const headers = (data[0] ?? []).map(([key]) => key);
  const { inbound, outbound } = useColumnReferences(headers, queryInfo, schema.references);
  const followReferences = useFollowReferences(nodeId);

  if (data.length === 0) {
    return (
      <div style={SCROLL_CONTAINER_STYLE}>
        <ResultEmpty message='No results' />
      </div>
    );
  }

  const multipleRecords = data.length > 1;

  return (
    <div className='result-pivot' style={SCROLL_CONTAINER_STYLE}>
      {data.map((row, rowIndex) => (
        <section className='pivot-record' key={rowIndex}>
          {multipleRecords && <header className='pivot-record-header'>#{rowIndex + 1}</header>}
          <table>
            <tbody>
              {row.map(([column, value, type], columnIdx) => {
                const { isPk, isFk } = classifyColumn(
                  column,
                  columnIdx,
                  inbound[column],
                  outbound[column],
                );
                const isEditing =
                  !!editing && editing.row === rowIndex && editing.col === columnIdx;

                const valueClasses = ["pivot-value", "editable"];
                if (isPk) {
                  valueClasses.push("pk");
                } else if (isFk) {
                  valueClasses.push("fk");
                }
                if (isEditing) {
                  valueClasses.push("editing");
                }
                if (isEditing && editing.error) {
                  valueClasses.push("error");
                }

                return (
                  <tr key={columnIdx}>
                    <th className='pivot-field' scope='row'>
                      {column}
                    </th>
                    <td
                      className={valueClasses.join(" ")}
                      onDoubleClick={e => {
                        e.stopPropagation();
                        setEditing({
                          row: rowIndex,
                          col: columnIdx,
                          draft: stringifyValue(value),
                          error: null,
                          saving: false,
                        });
                      }}
                    >
                      {isEditing ? (
                        <EditCell
                          type={type}
                          draft={editing.draft}
                          error={editing.error}
                          saving={editing.saving}
                          variableNames={variableNames}
                          onChange={next =>
                            setEditing(current => (current ? { ...current, draft: next } : current))
                          }
                          onCommit={commitEdit}
                          onCancel={() => setEditing(null)}
                        />
                      ) : (
                        <DataCell
                          value={value}
                          type={type}
                          isKey={isPk || isFk}
                          inbound={inbound[column]}
                          outbound={outbound[column]}
                          onInboundClick={followReferences}
                          onOutboundClick={followReferences}
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
});
