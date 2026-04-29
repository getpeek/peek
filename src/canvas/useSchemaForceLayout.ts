import { useAtomValue, useSetAtom } from "jotai";
import { useEffect, useMemo } from "react";
import { schemaAtom } from "../state";
import { activePageAtom, edgesAtom, nodesAtom } from "./state";
import { ids } from "./ids";
import type { AppEdge } from "./types";
import { isSchemaNode, tableIdFromRef, useSchemaSimulation } from "./useSchemaSimulation";

/**
 * Runs a live d3-force simulation for the schema page.
 *
 * - Active only when the current page is named `"schema"`.
 * - Both the visible React Flow edges *and* the simulation's spring
 *   links are derived from `schemaAtom.references` (the authoritative
 *   database schema), not from anything persisted on the page. This
 *   keeps the schema page in sync with the live database schema.
 * - Returns drag handlers that pin a node to the cursor and re-energise
 *   the simulation while it's being moved.
 */
export function useSchemaForceLayout() {
  const activePage = useAtomValue(activePageAtom);
  const schema = useAtomValue(schemaAtom);
  const setNodes = useSetAtom(nodesAtom);
  const setEdges = useSetAtom(edgesAtom);

  const isSchemaPage = activePage?.name === "schema";

  const schemaNodes = useMemo(
    () => activePage?.nodes.filter(n => isSchemaNode(n.id)) ?? [],
    [activePage?.nodes],
  );

  // Pairs derived from the database schema's foreign-key map.
  // De-duplicated and self-references are skipped.
  const referencePairs = useMemo(() => {
    const seen = new Set<string>();
    const out: { source: string; target: string }[] = [];
    for (const [from, refs] of Object.entries(schema.references)) {
      const fromId = tableIdFromRef(from);
      for (const ref of refs) {
        const toId = tableIdFromRef(ref);
        if (fromId === toId) {
          continue;
        }
        const key = `${fromId}->${toId}`;
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);
        out.push({ source: fromId, target: toId });
      }
    }
    return out;
  }, [schema.references]);

  const schemaNodeKey = useMemo(
    () =>
      schemaNodes
        .map(n => n.id)
        .toSorted()
        .join("|"),
    [schemaNodes],
  );

  const referenceKey = useMemo(
    () =>
      referencePairs
        .map(p => `${p.source}->${p.target}`)
        .toSorted()
        .join("|"),
    [referencePairs],
  );

  const selectedSchemaIdsKey = useMemo(
    () =>
      schemaNodes
        .filter(n => n.selected)
        .map(n => n.id)
        .toSorted()
        .join("|"),
    [schemaNodes],
  );

  useEffect(() => {
    if (!isSchemaPage) {
      return;
    }
    const presentIds = new Set(schemaNodes.map(n => n.id));
    const desired = referencePairs.filter(
      p => presentIds.has(p.source) && presentIds.has(p.target),
    );

    setEdges(es => {
      const isSchemaEdge = (e: AppEdge) => isSchemaNode(e.source) && isSchemaNode(e.target);

      const nonSchemaEdges = es.filter(e => !isSchemaEdge(e));
      const desiredById = new Map<string, AppEdge>();
      for (const pair of desired) {
        const id = ids.edge(pair.source, pair.target);
        desiredById.set(id, {
          id,
          source: pair.source,
          target: pair.target,
        });
      }

      // Preserve existing schema-edge instances (selection state, custom
      // styling, etc.) by keeping the same object reference where the
      // edge is still desired.
      const merged: AppEdge[] = [...nonSchemaEdges];
      const seen = new Set<string>();
      for (const e of es) {
        if (!isSchemaEdge(e)) {
          continue;
        }
        if (desiredById.has(e.id)) {
          merged.push(e);
          seen.add(e.id);
        }
      }
      for (const [id, edge] of desiredById) {
        if (!seen.has(id)) {
          merged.push(edge);
        }
      }

      // No-op if the result is structurally equivalent to the input.
      if (merged.length === es.length && merged.every((e, i) => e === es[i])) {
        return es;
      }
      return merged;
    });
  }, [isSchemaPage, schemaNodeKey, referenceKey, setEdges, schemaNodes, referencePairs]);

  // Highlight schema edges connected to a selected schema-table node by
  // tagging them with a `schema-edge-glow` className, and the schema
  // nodes on the *other* end of those edges with `schema-node-connected`.
  // Runs after the sync effect above, which preserves edge object
  // references (and thus any className we set).
  useEffect(() => {
    if (!isSchemaPage) {
      return;
    }
    const selected = new Set(selectedSchemaIdsKey ? selectedSchemaIdsKey.split("|") : []);
    const connected = new Set<string>();
    if (selected.size > 0) {
      for (const pair of referencePairs) {
        if (selected.has(pair.source) && !selected.has(pair.target)) {
          connected.add(pair.target);
        }
        if (selected.has(pair.target) && !selected.has(pair.source)) {
          connected.add(pair.source);
        }
      }
    }

    setEdges(es => {
      let mutated = false;
      const next = es.map(e => {
        if (!isSchemaNode(e.source) || !isSchemaNode(e.target)) {
          return e;
        }
        const shouldGlow = selected.size > 0 && (selected.has(e.source) || selected.has(e.target));
        const desired = shouldGlow ? "schema-edge-glow" : undefined;
        if (e.className === desired) {
          return e;
        }
        mutated = true;
        return { ...e, className: desired };
      });
      return mutated ? next : es;
    });

    setNodes(ns => {
      let mutated = false;
      const next = ns.map(n => {
        if (!isSchemaNode(n.id)) {
          return n;
        }
        const desired = connected.has(n.id) ? "schema-node-connected" : undefined;
        if (n.className === desired) {
          return n;
        }
        mutated = true;
        return { ...n, className: desired };
      });
      return mutated ? next : ns;
    });
  }, [isSchemaPage, selectedSchemaIdsKey, referenceKey, referencePairs, setEdges, setNodes]);

  return useSchemaSimulation({
    isSchemaPage,
    schemaNodes,
    referencePairs,
    schemaNodeKey,
    referenceKey,
  });
}
