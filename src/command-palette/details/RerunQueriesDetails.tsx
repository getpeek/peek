import { Fragment } from "react";
import { useAtomValue } from "jotai";
import { nodesAtom } from "../../canvas/state";
import type { QueryNode } from "../../canvas/types";

interface RerunQueriesDetailsProps {
  scope: "all" | "selected";
}

export const RerunQueriesDetails = ({ scope }: RerunQueriesDetailsProps) => {
  const nodes = useAtomValue(nodesAtom);
  const queries = nodes.filter((node): node is QueryNode => {
    if (node.type !== "query") {
      return false;
    }
    return scope === "all" ? true : node.selected === true;
  });

  const breakdown = countByVerb(queries);
  const emptyHint =
    scope === "all" ? "No query nodes on this page" : "Select query nodes on the canvas to run";

  const verbs = (["select", "update", "delete", "other"] as const)
    .map(verb => ({ verb, count: breakdown[verb] }))
    .filter(({ count }) => count > 0);

  return (
    <div className='cp-strip'>
      <span className='cp-strip-tag'>RUN</span>
      <span className='cp-strip-desc'>
        {queries.length === 0
          ? emptyHint
          : `${queries.length} ${queries.length === 1 ? "query" : "queries"} · left to right`}
      </span>
      {queries.length > 0 ? (
        <span className='cp-strip-meta'>
          {verbs.map(({ verb, count }, i) => (
            <Fragment key={verb}>
              {i > 0 ? <span className='m-sep'>·</span> : null}
              <span className='m-strong'>{count}</span>
              <span className='m-dim'>{verb.toUpperCase()}</span>
            </Fragment>
          ))}
        </span>
      ) : null}
    </div>
  );
};

type Verb = "select" | "update" | "delete" | "other";

const detectVerb = (sql: string): Verb => {
  const head = sql.trim().toLowerCase();
  if (head.startsWith("select")) {
    return "select";
  }
  if (head.startsWith("update")) {
    return "update";
  }
  if (head.startsWith("delete")) {
    return "delete";
  }
  return "other";
};

const countByVerb = (queries: QueryNode[]) => {
  const counts: Record<Verb, number> = { select: 0, update: 0, delete: 0, other: 0 };
  for (const node of queries) {
    counts[detectVerb(node.data.query)] += 1;
  }
  return counts;
};
