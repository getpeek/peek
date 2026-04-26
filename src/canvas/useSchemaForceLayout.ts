import { useAtomValue, useSetAtom } from "jotai";
import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  forceCenter,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type Simulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from "d3-force";
import { schemaAtom } from "../state";
import { activePageAtom, edgesAtom, nodesAtom } from "./state";
import { ids } from "./ids";
import type { AppEdge, AppNode } from "./types";

const SCHEMA_NODE_PREFIX = "schema-table-";
const DEFAULT_W = 450;
const DEFAULT_H = 200;
const PADDING = 140;
const LINK_DISTANCE = 950;
const LINK_STRENGTH = 0.18;
const CHARGE_STRENGTH = -9000;
const CENTERING_STRENGTH = 0.02;
const ALPHA_DECAY = 0.02;
const DRAG_ALPHA_TARGET = 0.3;

interface SimNode extends SimulationNodeDatum {
  id: string;
  width: number;
  height: number;
}

type SimLink = SimulationLinkDatum<SimNode>;

function isSchemaNode(id: string) {
  return id.startsWith(SCHEMA_NODE_PREFIX);
}

function tableIdFromRef(ref: string) {
  return `${SCHEMA_NODE_PREFIX}${ref.split(".")[0]}`;
}

/**
 * Custom rectangular collision force for d3-force. The built-in
 * `forceCollide` treats nodes as circles which leaves a lot of unused
 * space when nodes are wide rectangles like our table cards.
 *
 * Mirrors the `collision.js` helper that ships with the React Flow
 * Force Layout pro example.
 */
function rectCollide<T extends SimNode>(padding: number) {
  let nodes: T[] = [];

  const force = (alpha: number) => {
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      const ax = a.x ?? 0;
      const ay = a.y ?? 0;
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        const bx = b.x ?? 0;
        const by = b.y ?? 0;
        const dx = bx - ax;
        const dy = by - ay;
        const overlapX = (a.width + b.width) / 2 + padding - Math.abs(dx);
        const overlapY = (a.height + b.height) / 2 + padding - Math.abs(dy);
        if (overlapX > 0 && overlapY > 0) {
          if (overlapX < overlapY) {
            const shift = (overlapX / 2) * alpha * (dx < 0 ? -1 : 1);
            if (a.fx == null) a.x = ax - shift;
            if (b.fx == null) b.x = bx + shift;
          } else {
            const shift = (overlapY / 2) * alpha * (dy < 0 ? -1 : 1);
            if (a.fy == null) a.y = ay - shift;
            if (b.fy == null) b.y = by + shift;
          }
        }
      }
    }
  };

  force.initialize = (ns: T[]) => {
    nodes = ns;
  };

  return force;
}

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
    () => activePage?.nodes.filter((n) => isSchemaNode(n.id)) ?? [],
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
        if (fromId === toId) continue;
        const key = `${fromId}->${toId}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ source: fromId, target: toId });
      }
    }
    return out;
  }, [schema.references]);

  // Stable string keys so the effects only re-run when the relevant
  // identity actually changes (not on every node-position tick).
  const schemaNodeKey = useMemo(
    () =>
      schemaNodes
        .map((n) => n.id)
        .sort()
        .join("|"),
    [schemaNodes],
  );

  const referenceKey = useMemo(
    () =>
      referencePairs
        .map((p) => `${p.source}->${p.target}`)
        .sort()
        .join("|"),
    [referencePairs],
  );

  // IDs of currently-selected schema-table nodes. Used to highlight
  // their connected edges so the user can see which other tables a
  // selected table relates to.
  const selectedSchemaIdsKey = useMemo(
    () =>
      schemaNodes
        .filter((n) => n.selected)
        .map((n) => n.id)
        .sort()
        .join("|"),
    [schemaNodes],
  );

  // Sync rendered edges on the schema page with the schema atom. We only
  // touch edges whose endpoints are both schema-table nodes, so other
  // edges on the page are left alone (and edges on other pages are not
  // affected at all because the edges atom is page-scoped).
  useEffect(() => {
    if (!isSchemaPage) return;
    const presentIds = new Set(schemaNodes.map((n) => n.id));
    const desired = referencePairs.filter(
      (p) => presentIds.has(p.source) && presentIds.has(p.target),
    );

    setEdges((es) => {
      const isSchemaEdge = (e: AppEdge) =>
        isSchemaNode(e.source) && isSchemaNode(e.target);

      const nonSchemaEdges = es.filter((e) => !isSchemaEdge(e));
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
        if (!isSchemaEdge(e)) continue;
        if (desiredById.has(e.id)) {
          merged.push(e);
          seen.add(e.id);
        }
      }
      for (const [id, edge] of desiredById) {
        if (!seen.has(id)) merged.push(edge);
      }

      // No-op if the result is structurally equivalent to the input.
      if (
        merged.length === es.length &&
        merged.every((e, i) => e === es[i])
      ) {
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
    if (!isSchemaPage) return;
    const selected = new Set(
      selectedSchemaIdsKey ? selectedSchemaIdsKey.split("|") : [],
    );
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

    setEdges((es) => {
      let mutated = false;
      const next = es.map((e) => {
        if (!isSchemaNode(e.source) || !isSchemaNode(e.target)) return e;
        const shouldGlow =
          selected.size > 0 &&
          (selected.has(e.source) || selected.has(e.target));
        const desired = shouldGlow ? "schema-edge-glow" : undefined;
        if (e.className === desired) return e;
        mutated = true;
        return { ...e, className: desired };
      });
      return mutated ? next : es;
    });

    setNodes((ns) => {
      let mutated = false;
      const next = ns.map((n) => {
        if (!isSchemaNode(n.id)) return n;
        const desired = connected.has(n.id)
          ? "schema-node-connected"
          : undefined;
        if (n.className === desired) return n;
        mutated = true;
        return { ...n, className: desired };
      });
      return mutated ? next : ns;
    });
  }, [
    isSchemaPage,
    selectedSchemaIdsKey,
    referenceKey,
    referencePairs,
    setEdges,
    setNodes,
  ]);

  const draggingRef = useRef<Set<string>>(new Set());
  const simRef = useRef<Simulation<SimNode, SimLink> | null>(null);

  useEffect(() => {
    if (!isSchemaPage || schemaNodes.length === 0) {
      simRef.current?.stop();
      simRef.current = null;
      return;
    }

    // Snapshot the schema sub-graph for the simulation. Coordinates are
    // tracked at the node *centre* in the simulation but stored as the
    // top-left corner in React Flow.
    const simNodes: SimNode[] = schemaNodes.map((n) => {
      const w = n.width ?? DEFAULT_W;
      const h = n.height ?? DEFAULT_H;
      return {
        id: n.id,
        width: w,
        height: h,
        x: n.position.x + w / 2,
        y: n.position.y + h / 2,
      };
    });

    const simNodeById = new Map(simNodes.map((n) => [n.id, n]));
    const presentIds = new Set(simNodes.map((n) => n.id));

    const simLinks: SimLink[] = referencePairs
      .filter((l) => presentIds.has(l.source) && presentIds.has(l.target))
      .map((l) => ({ source: l.source, target: l.target }));

    const sim = forceSimulation<SimNode, SimLink>(simNodes)
      .force(
        "link",
        forceLink<SimNode, SimLink>(simLinks)
          .id((d) => d.id)
          .distance(LINK_DISTANCE)
          .strength(LINK_STRENGTH),
      )
      .force("charge", forceManyBody<SimNode>().strength(CHARGE_STRENGTH))
      .force("x", forceX<SimNode>(0).strength(CENTERING_STRENGTH))
      .force("y", forceY<SimNode>(0).strength(CENTERING_STRENGTH))
      .force("center", forceCenter(0, 0))
      .force("collide", rectCollide<SimNode>(PADDING))
      .alphaDecay(ALPHA_DECAY);

    sim.on("tick", () => {
      setNodes((ns) => {
        let mutated = false;
        const next = ns.map((n) => {
          if (!isSchemaNode(n.id)) return n;
          if (draggingRef.current.has(n.id)) return n;
          const sn = simNodeById.get(n.id);
          if (!sn) return n;
          const w = n.width ?? DEFAULT_W;
          const h = n.height ?? DEFAULT_H;
          const x = (sn.x ?? 0) - w / 2;
          const y = (sn.y ?? 0) - h / 2;
          if (x === n.position.x && y === n.position.y) return n;
          mutated = true;
          return { ...n, position: { x, y } };
        });
        return mutated ? next : ns;
      });
    });

    simRef.current = sim;

    return () => {
      sim.stop();
      simRef.current = null;
    };
    // We intentionally use the stable string keys instead of `schemaNodes`
    // / `referencePairs` directly so we don't tear down and rebuild the
    // simulation on every node-position update.
  }, [isSchemaPage, schemaNodeKey, referenceKey]);

  const onSchemaNodeDragStart = useCallback((node: AppNode) => {
    if (!isSchemaNode(node.id)) return;
    draggingRef.current.add(node.id);
    const sim = simRef.current;
    if (!sim) return;
    const sn = sim.nodes().find((s) => s.id === node.id);
    if (!sn) return;
    const w = node.width ?? DEFAULT_W;
    const h = node.height ?? DEFAULT_H;
    sn.fx = node.position.x + w / 2;
    sn.fy = node.position.y + h / 2;
    sim.alphaTarget(DRAG_ALPHA_TARGET).restart();
  }, []);

  const onSchemaNodeDrag = useCallback((node: AppNode) => {
    if (!isSchemaNode(node.id)) return;
    const sim = simRef.current;
    if (!sim) return;
    const sn = sim.nodes().find((s) => s.id === node.id);
    if (!sn) return;
    const w = node.width ?? DEFAULT_W;
    const h = node.height ?? DEFAULT_H;
    sn.fx = node.position.x + w / 2;
    sn.fy = node.position.y + h / 2;
  }, []);

  const onSchemaNodeDragStop = useCallback((node: AppNode) => {
    if (!isSchemaNode(node.id)) return;
    draggingRef.current.delete(node.id);
    const sim = simRef.current;
    if (!sim) return;
    const sn = sim.nodes().find((s) => s.id === node.id);
    if (sn) {
      sn.fx = null;
      sn.fy = null;
    }
    sim.alphaTarget(0);
  }, []);

  return {
    onSchemaNodeDragStart,
    onSchemaNodeDrag,
    onSchemaNodeDragStop,
  };
}
