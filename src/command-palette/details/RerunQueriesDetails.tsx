import { useAtomValue } from "jotai";
import { IconPlayerPlay } from "@tabler/icons-react";
import { nodesAtom } from "../../canvas/state";
import type { QueryNode } from "../../canvas/types";
import { SqlPreview } from "./SqlPreview";
import "./RerunQueriesDetails.css";

const PREVIEW_LIMIT = 4;

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
  const title = scope === "all" ? "Rerun all queries on page" : "Rerun selected queries";
  const eyebrow = scope === "all" ? "Run · All on page" : "Run · Selected";
  const emptyHint =
    scope === "all"
      ? "There are no query nodes on the current page."
      : "Select query nodes on the canvas to enable this command.";

  return (
    <div className='details-rerun'>
      <div className='details-eyebrow'>{eyebrow}</div>
      <div className='details-title-row'>
        <span className='details-rerun-glyph'>
          <IconPlayerPlay size={16} />
        </span>
        <div className='details-title'>{title}</div>
      </div>
      <div className='details-subtitle'>
        {queries.length === 0
          ? emptyHint
          : `${queries.length} ${queries.length === 1 ? "query" : "queries"} will run from left to right.`}
      </div>

      {queries.length > 0 ? (
        <div className='details-rerun-stats'>
          <Stat label='SELECT' value={breakdown.select} tone='select' />
          <Stat label='UPDATE' value={breakdown.update} tone='update' />
          <Stat label='DELETE' value={breakdown.delete} tone='delete' />
          <Stat label='Other' value={breakdown.other} />
        </div>
      ) : null}

      {queries.length > 0 ? (
        <div className='details-rerun-list'>
          {queries.slice(0, PREVIEW_LIMIT).map(node => (
            <QueryPreviewCard key={node.id} node={node} />
          ))}
          {queries.length > PREVIEW_LIMIT ? (
            <div className='details-rerun-more'>
              +{queries.length - PREVIEW_LIMIT} more{" "}
              {queries.length - PREVIEW_LIMIT === 1 ? "query" : "queries"}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className='details-action-hint'>
        <kbd className='details-key'>↵</kbd>
        <span>{queries.length === 0 ? "Nothing to run" : "Run them in order"}</span>
      </div>
    </div>
  );
};

const QueryPreviewCard = ({ node }: { node: QueryNode }) => {
  const sql = node.data.query.trim();
  const preview = sql.length > 240 ? `${sql.slice(0, 240)}…` : sql;
  const verb = detectVerb(sql);

  return (
    <section className='details-rerun-card'>
      <header className='details-rerun-card-header'>
        <span className={`details-rerun-verb verb-${verb}`}>{verb.toUpperCase()}</span>
        <span className='details-rerun-card-id'>{node.id.slice(0, 8)}</span>
      </header>
      <SqlPreview sql={preview} className='details-rerun-card-code' />
    </section>
  );
};

const Stat = ({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "select" | "update" | "delete";
}) => (
  <div className={`details-rerun-stat${tone ? ` tone-${tone}` : ""}`}>
    <span className='details-rerun-stat-value'>{value}</span>
    <span className='details-rerun-stat-label'>{label}</span>
  </div>
);

type Verb = "select" | "update" | "delete" | "insert" | "other";

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
  if (head.startsWith("insert")) {
    return "insert";
  }
  return "other";
};

const countByVerb = (queries: QueryNode[]) => {
  const counts = { select: 0, update: 0, delete: 0, other: 0 };
  for (const node of queries) {
    const verb = detectVerb(node.data.query);
    if (verb === "select" || verb === "update" || verb === "delete") {
      counts[verb] += 1;
    } else {
      counts.other += 1;
    }
  }
  return counts;
};
