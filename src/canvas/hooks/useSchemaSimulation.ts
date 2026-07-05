import { useSetAtom } from "jotai";
import { useCallback, useEffect, useRef } from "react";
import type { Simulation } from "d3-force";
import { nodesAtom } from "../state";
import { applySimulationPositions } from "../layout/applySimulationPositions";
import { buildForceSimulation, type SimLink, type SimNode } from "../layout/forceSimulation";
import type { AppNode } from "../types";

export const SCHEMA_NODE_PREFIX = "schema-table-";
export const DEFAULT_W = 450;
export const DEFAULT_H = 200;

const DRAG_ALPHA_TARGET = 0.3;

export function isSchemaNode(id: string) {
  return id.startsWith(SCHEMA_NODE_PREFIX);
}

export function tableIdFromRef(ref: string) {
  return `${SCHEMA_NODE_PREFIX}${ref.split(".")[0]}`;
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

    const sim = buildForceSimulation(simNodes, simLinks);
    const applyPositions = applySimulationPositions(simNodeById, n =>
      draggingRef.current.has(n.id),
    );

    sim.on("tick", () => {
      setNodes(applyPositions);
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
