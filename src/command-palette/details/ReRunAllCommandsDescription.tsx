import { nodesAtom } from "../../canvas/state";
import { useAtomValue } from "jotai";

export const ReRunAllCommandsDetails = () => {
  const queries = useAtomValue(nodesAtom).filter(node => node.type === "query");

  const selects = queries.filter(node =>
    node.data.query.trim().toLowerCase().startsWith("select"),
  ).length;
  const updates = queries.filter(node =>
    node.data.query.trim().toLowerCase().startsWith("update"),
  ).length;
  const deletes = queries.filter(node =>
    node.data.query.trim().toLowerCase().startsWith("delete"),
  ).length;

  return (
    <div className='details-default'>
      <div className='details-default-label'>Rerun all queries</div>

      <div className='details-default-description'>
        Runs all the queries on the current page, from left to right.
      </div>

      <div className='details-action-hint'>{selects} SELECT</div>
      <div className='details-action-hint'>{updates} UPDATE</div>
      <div className='details-action-hint'>{deletes} DELETE</div>
    </div>
  );
};
