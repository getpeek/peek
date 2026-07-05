import {
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type Simulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from "d3-force";
import { computeAnchors, endpointId } from "./componentAnchors";
import { COLLIDE_PADDING, rectCollide } from "./rectCollide";

const LINK_GAP = 100;
const LINK_STRENGTH = 0.6;
const CHARGE_STRENGTH = -800;
const CHARGE_DISTANCE_MAX = 1000;
const ANCHOR_STRENGTH = 0.2;
const COLLIDE_ITERATIONS = 3;

export interface SimNode extends SimulationNodeDatum {
  id: string;
  width: number;
  height: number;
}

export type SimLink = SimulationLinkDatum<SimNode>;

const maxDimension = (node: SimNode) => Math.max(node.width, node.height);

/**
 * Builds the rectangle-aware force chain shared by the organize command and
 * the schema page's live simulation. Coordinates on `simNodes` are node
 * *centres*; callers convert to and from React Flow's top-left positions.
 */
export function buildForceSimulation(
  simNodes: SimNode[],
  simLinks: SimLink[],
  options: { alphaDecay?: number } = {},
): Simulation<SimNode, SimLink> {
  // forceLink mutates each link's endpoints from id strings into node
  // references when the simulation initializes, so anchors must be computed
  // from the raw links first.
  const anchors = computeAnchors(simNodes, simLinks);
  const anchorFor = (node: SimNode) => anchors.get(node.id) ?? { x: 0, y: 0 };

  const nodeById = new Map(simNodes.map(node => [node.id, node]));
  const linkDistance = (link: SimLink) => {
    const source = nodeById.get(endpointId(link.source));
    const target = nodeById.get(endpointId(link.target));
    return source && target
      ? (maxDimension(source) + maxDimension(target)) / 2 + LINK_GAP
      : LINK_GAP;
  };

  const simulation = forceSimulation<SimNode, SimLink>(simNodes)
    .force(
      "link",
      forceLink<SimNode, SimLink>(simLinks)
        .id(node => node.id)
        .distance(linkDistance)
        .strength(LINK_STRENGTH),
    )
    .force(
      "charge",
      forceManyBody<SimNode>().strength(CHARGE_STRENGTH).distanceMax(CHARGE_DISTANCE_MAX),
    )
    .force("anchorX", forceX<SimNode>(node => anchorFor(node).x).strength(ANCHOR_STRENGTH))
    .force("anchorY", forceY<SimNode>(node => anchorFor(node).y).strength(ANCHOR_STRENGTH))
    .force("collide", rectCollide<SimNode>(COLLIDE_PADDING, COLLIDE_ITERATIONS));

  if (options.alphaDecay !== undefined) {
    simulation.alphaDecay(options.alphaDecay);
  }
  return simulation;
}
