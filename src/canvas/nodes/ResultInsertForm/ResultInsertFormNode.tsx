import { NodeProps, NodeResizer } from "@xyflow/react";
import { useRef, useState } from "react";
import { useAtomValue } from "jotai";
import { schemaAtom } from "../../../state";
import { useCanvas } from "../../hooks/useCanvas";
import { useGetVariablesForNode } from "../../hooks/useGetVariablesForNode";
import { useScrollFallthrough } from "../../hooks/useScrollFallthrough";
import { resultRowsAtom } from "../../state";
import { HiddenHandles } from "../HiddenHandles";
import { NodeHeader } from "../NodeHeader";
import { NodeIndicator } from "../NodeIndicator";
import { getEditableTableName } from "../Result/cell/inlineEdit";
import { useQueryInfo } from "../Result/queryInfo";
import { deriveInsertColumns } from "./insertColumns";
import { InsertFormFields } from "./InsertFormFields";
import { useCommitInsertForm, type InsertingState } from "./useCommitInsertForm";
import type { ResultInsertFormNode as ResultInsertFormNodeT } from "../../types";
import "./ResultInsertForm.css";

const DEFAULT_W = 560;
const DEFAULT_H = 220;

export function ResultInsertFormNode({
  id,
  data,
  selected,
  width,
  height,
}: NodeProps<ResultInsertFormNodeT>) {
  const canvas = useCanvas();
  const bodyRef = useRef<HTMLDivElement>(null);
  useScrollFallthrough(bodyRef);
  const [inserting, setInserting] = useState<InsertingState>(() => ({
    drafts: { ...data.initialValues },
    nullColumns: {},
    error: null,
    saving: false,
  }));

  const resultNode = canvas.getNode(data.resultNodeId);
  const sourceQuery = resultNode?.type === "result" ? resultNode.data.query : "";
  const queryInfo = useQueryInfo(sourceQuery);
  const schema = useAtomValue(schemaAtom);
  const rows = useAtomValue(resultRowsAtom(data.resultNodeId));
  // Variables connected to the form itself, plus any on the originating result,
  // so `@var` works whether the user wires the variable to the form or the result.
  const formVars = useGetVariablesForNode(id);
  const resultVars = useGetVariablesForNode(data.resultNodeId);
  const variables = { ...resultVars.direct, ...formVars.direct };
  const variableNames = Object.keys(variables).toSorted();

  const table = getEditableTableName(queryInfo);
  const { headers, columnTypes } = deriveInsertColumns(rows, schema, table);

  const commit = useCommitInsertForm({
    resultNodeId: data.resultNodeId,
    queryInfo,
    columnTypes,
    variables,
    inserting,
    setInserting,
  });

  const w = width ?? DEFAULT_W;
  const h = height ?? DEFAULT_H;

  const headerName = table ? `insert · ${table}` : "insert";

  return (
    <>
      <NodeResizer minWidth={360} minHeight={140} />
      <HiddenHandles connectableTarget />
      <div className={`app-node ${selected ? "selected" : ""}`} style={{ width: w, height: h }}>
        <NodeHeader
          nodeId={id}
          name={headerName}
          indicator={<NodeIndicator kind='result-insert-form' />}
        />
        <div className='app-node-body nodrag' ref={bodyRef}>
          <FormBody
            resultMissing={!resultNode || resultNode.type !== "result"}
            queryResolved={queryInfo !== null}
            table={table}
            headers={headers}
            columnTypes={columnTypes}
            variableNames={variableNames}
            inserting={inserting}
            setInserting={setInserting}
            onCommit={commit}
          />
        </div>
      </div>
    </>
  );
}

function FormBody({
  resultMissing,
  queryResolved,
  table,
  headers,
  columnTypes,
  variableNames,
  inserting,
  setInserting,
  onCommit,
}: {
  resultMissing: boolean;
  queryResolved: boolean;
  table: string | null;
  headers: string[];
  columnTypes: Record<string, string>;
  variableNames: string[];
  inserting: InsertingState;
  setInserting: React.Dispatch<React.SetStateAction<InsertingState>>;
  onCommit: () => void;
}) {
  if (resultMissing) {
    return <div className='insert-form-empty'>The source result was removed.</div>;
  }
  if (!queryResolved) {
    return <div className='insert-form-empty'>Loading…</div>;
  }
  if (!table) {
    return (
      <div className='insert-form-empty'>
        This result isn't a single-table SELECT — can't insert.
      </div>
    );
  }
  if (headers.length === 0) {
    return <div className='insert-form-empty'>No columns available for "{table}".</div>;
  }
  return (
    <InsertFormFields
      headers={headers}
      columnTypes={columnTypes}
      variableNames={variableNames}
      inserting={inserting}
      setInserting={setInserting}
      onCommit={onCommit}
    />
  );
}
