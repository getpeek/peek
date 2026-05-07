import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";

export type StatementType = "select" | "insert" | "update" | "delete" | "other";

export type TableRef = {
  name: string;
  alias: string | null;
  isJoined: boolean;
};

export type QueryInfo = {
  statementType: StatementType;
  tables: TableRef[];
};

export function useQueryInfo(query: string): QueryInfo | null {
  const [info, setInfo] = useState<QueryInfo | null>(null);

  useEffect(() => {
    let cancelled = false;
    invoke<QueryInfo>("get_query_info", { query })
      .then(result => {
        if (!cancelled) {
          setInfo(result);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setInfo(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [query]);

  return info;
}
