import { useCanvas } from "../../../hooks/useCanvas";
import { useExecuteQueries } from "../../../hooks/useExecuteQueries";
import type { CellReference } from "../findReferences";

/** Runs `SELECT … WHERE <fk> = <value>` queries from the node, fanning the
 *  referenced rows onto the canvas. Shared by the table and pivot cell views. */
export function useFollowReferences(nodeId: string) {
  const canvas = useCanvas();
  const executeQueries = useExecuteQueries();

  return (refs: CellReference[], value: unknown) => {
    const sourceNode = canvas.getNode(nodeId);
    if (!sourceNode) {
      return;
    }
    const queries = refs.map(
      ref => `SELECT * FROM ${ref.table} WHERE ${ref.column} = '${value}' LIMIT 300`,
    );
    executeQueries(sourceNode, queries);
  };
}
