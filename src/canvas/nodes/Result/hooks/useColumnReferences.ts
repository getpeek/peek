import { useMemo } from "react";
import { getInboundReferences, getOutboundReferences } from "../findReferences";
import type { Reference } from "../columnRoles";
import type { QueryInfo } from "../queryInfo";

/** Inbound/outbound FK references per column, recomputed only when the columns,
 *  query shape, or schema references change. */
export function useColumnReferences(
  headers: string[],
  queryInfo: QueryInfo | null,
  references: Record<string, string[]>,
): { inbound: Record<string, Reference[]>; outbound: Record<string, Reference[]> } {
  return useMemo(() => {
    const inbound: Record<string, Reference[]> = {};
    const outbound: Record<string, Reference[]> = {};
    headers.forEach(column => {
      inbound[column] = getInboundReferences(queryInfo, references, column);
      outbound[column] = getOutboundReferences(queryInfo, references, column);
    });
    return { inbound, outbound };
  }, [headers, queryInfo, references]);
}
