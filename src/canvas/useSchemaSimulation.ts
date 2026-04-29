import { useSetAtom } from "jotai";
import { useCallback, useEffect, useRef } from "react";
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
import { nodesAtom } from "./state";
import type { AppNode } from "./types";

export const SCHEMA_NODE_PREFIX = "schema-table-";
export const DEFAULT_W = 450;
export const DEFAULT_H = 200;

const PADDING = 140;
const LINK_DISTANCE = 950;
const LINK_STRENGTH = 0.18;
const CHARGE_STRENGTH = -9000;
const CENTERING_STRENGTH = 0.02;
const ALPHA_DECAY = 0.02;
const DRAG_ALPHA_TARGET = 0.3;

export interface SimNode extends SimulationNodeDatum {
  id: string;
  width: number;
  height: number;
}

export type SimLink = SimulationLinkDatum<SimNode>;

export function isSchemaNode(id: string) {
  return id.startsWith(SCHEMA_NODE_PREFIX);
}

export function tableIdFromRef(ref: string) {
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

  const resolvePair = (a: T, b: T, alpha: number) => {
    const ax = a.x ?? 0;
    const ay = a.y ?? 0;
    const bx = b.x ?? 0;
    const by = b.y ?? 0;
    const dx = bx - ax;
    const dy = by - ay;
    const overlapX = (a.width + b.width) / 2 + padding - Math.abs(dx);
    const overlapY = (a.height + b.height) / 2 + padding - Math.abs(dy);
    if (overlapX <= 0 || overlapY <= 0) {
      return;
    }
    if (overlapX < overlapY) {
      const shift = (overlapX / 2) * alpha * (dx < 0 ? -1 : 1);
      if (a.fx === null) {
        a.x = ax - shift;
      }
      if (b.fx === null) {
        b.x = bx + shift;
      }
    } else {
      const shift = (overlapY / 2) * alpha * (dy < 0 ? -1 : 1);
      if (a.fy === null) {
        a.y = ay - shift;
      }
      if (b.fy === null) {
        b.y = by + shift;
      }
    }
  };

  const force = (alpha: number) => {
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        resolvePair(nodes[i], nodes[j], alpha);
      }
    }
  };

  force.initialize = (ns: T[]) => {
    nodes = ns;
  };

  return force;
}

interface UseSchemaSimulationOptions {
  isSchemaPage: boolean;
  schemaNodes: AppNode[];
  referencePairs: { source: string; target: string }[];
  schemaNodeKey: string;
  referenceKey: string;
}

export function useSchemaSimulation({
  isSchemaPage,
  schemaNodes,
  referencePairs,
  schemaNodeKey,
  referenceKey,
}: UseSchemaSimulationOptions) {
  const setNodes = useSetAtom(nodesAtom);
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
    const simNodes: SimNode[] = schemaNodes.map(n => {
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

    const simNodeById = new Map(simNodes.map(n => [n.id, n]));
    const presentIds = new Set(simNodes.map(n => n.id));

    const simLinks: SimLink[] = referencePairs
      .filter(l => presentIds.has(l.source) && presentIds.has(l.target))
      .map(l => ({ source: l.source, target: l.target }));

    const sim = forceSimulation<SimNode, SimLink>(simNodes)
      .force(
        "link",
        forceLink<SimNode, SimLink>(simLinks)
          .id(d => d.id)
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
      setNodes(ns => {
        let mutated = false;
        const next = ns.map(n => {
          if (!isSchemaNode(n.id) || draggingRef.current.has(n.id)) {
            return n;
          }
          const sn = simNodeById.get(n.id);
          if (!sn) {
            return n;
          }
          const w = n.width ?? DEFAULT_W;
          const h = n.height ?? DEFAULT_H;
          const x = (sn.x ?? 0) - w / 2;
          const y = (sn.y ?? 0) - h / 2;
          if (x === n.position.x && y === n.position.y) {
            return n;
          }
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
    if (!isSchemaNode(node.id)) {
      return;
    }
    draggingRef.current.add(node.id);
    const sim = simRef.current;
    if (!sim) {
      return;
    }
    const sn = sim.nodes().find(s => s.id === node.id);
    if (!sn) {
      return;
    }
    const w = node.width ?? DEFAULT_W;
    const h = node.height ?? DEFAULT_H;
    sn.fx = node.position.x + w / 2;
    sn.fy = node.position.y + h / 2;
    sim.alphaTarget(DRAG_ALPHA_TARGET).restart();
  }, []);

  const onSchemaNodeDrag = useCallback((node: AppNode) => {
    if (!isSchemaNode(node.id)) {
      return;
    }
    const sim = simRef.current;
    if (!sim) {
      return;
    }
    const sn = sim.nodes().find(s => s.id === node.id);
    if (!sn) {
      return;
    }
    const w = node.width ?? DEFAULT_W;
    const h = node.height ?? DEFAULT_H;
    sn.fx = node.position.x + w / 2;
    sn.fy = node.position.y + h / 2;
  }, []);

  const onSchemaNodeDragStop = useCallback((node: AppNode) => {
    if (!isSchemaNode(node.id)) {
      return;
    }
    draggingRef.current.delete(node.id);
    const sim = simRef.current;
    if (!sim) {
      return;
    }
    const sn = sim.nodes().find(s => s.id === node.id);
    if (sn) {
      sn.fx = null;
      sn.fy = null;
    }
    sim.alphaTarget(0);
  }, []);

  return { onSchemaNodeDragStart, onSchemaNodeDrag, onSchemaNodeDragStop };
}
