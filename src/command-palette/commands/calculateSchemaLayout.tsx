// Define simulation constants - you'll need to tune these!
const ITERATIONS = 200;
const K_REPEL = 200000; // Repulsive force strength
const K_ATTRACT = 0.05; // Attractive force (spring) strength
const IDEAL_LENGTH = 350; // Ideal spring length
const DAMPING = 0.95; // Friction to slow things down

interface Node {
  id: string; // e.g., 'schema-table-users'
  name: string; // e.g., 'users'
  x: number;
  y: number;
  vx: number; // Velocity x
  vy: number; // Velocity y
  width: number;
  height: number;
}

interface Edge {
  from: string; // ID of the source node
  to: string; // ID of the target node
}

export function calculateLayout(schema: {
  tables: Record<string, [string, string][]>;
  references: Record<string, string[]>;
}) {
  // 1. Initialize Nodes
  const nodes: Record<string, Node> = {};
  Object.entries(schema.tables).forEach(([tableName, columns]) => {
    const id = `schema-table-${tableName}`;
    nodes[id] = {
      id,
      name: tableName,
      // Start at random positions to avoid perfect symmetry
      x: Math.random() * 500,
      y: Math.random() * 500,
      vx: 0,
      vy: 0,
      width: 450, // From your code
      height: columns.length * 60 + 100, // From your code
    };
  });

  // 2. Create Edges from references
  const edges: Edge[] = [];
  Object.entries(schema.references).forEach(([from, toTables]) => {
    const fromTable = from.split(".")[0];
    const fromId = `schema-table-${fromTable}`;
    toTables.forEach((toTableRef) => {
      const toTable = toTableRef.split(".")[0];
      const toId = `schema-table-${toTable}`;
      if (nodes[fromId] && nodes[toId]) {
        edges.push({ from: fromId, to: toId });
      }
    });
  });

  // 3. Simulation Loop
  for (let i = 0; i < ITERATIONS; i++) {
    // Calculate forces for each node
    for (const nodeA of Object.values(nodes)) {
      let totalForceX = 0;
      let totalForceY = 0;

      // Repulsive forces from all other nodes
      for (const nodeB of Object.values(nodes)) {
        if (nodeA.id === nodeB.id) continue;

        const dx = nodeA.x - nodeB.x;
        const dy = nodeA.y - nodeB.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1; // Avoid division by zero

        const force = K_REPEL / (distance * distance);
        totalForceX += (dx / distance) * force;
        totalForceY += (dy / distance) * force;
      }

      // Attractive forces from connected nodes (springs)
      edges.forEach((edge) => {
        let otherNodeId = null;
        if (edge.from === nodeA.id) otherNodeId = edge.to;
        if (edge.to === nodeA.id) otherNodeId = edge.from;

        if (otherNodeId) {
          const nodeB = nodes[otherNodeId];
          const dx = nodeB.x - nodeA.x;
          const dy = nodeB.y - nodeA.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;

          const displacement = distance - IDEAL_LENGTH;
          const force = K_ATTRACT * displacement;

          totalForceX += (dx / distance) * force;
          totalForceY += (dy / distance) * force;
        }
      });

      // Update velocity with damping
      nodeA.vx = (nodeA.vx + totalForceX) * DAMPING;
      nodeA.vy = (nodeA.vy + totalForceY) * DAMPING;
    }

    // Update positions based on velocity
    for (const node of Object.values(nodes)) {
      node.x += node.vx;
      node.y += node.vy;
    }
  }

  // (Optional but Recommended) Add a simple non-overlap pass here
  resolveOverlaps(nodes);

  // 4. Return the final positions
  const positions: Record<string, { x: number; y: number }> = {};
  for (const node of Object.values(nodes)) {
    positions[node.name] = { x: node.x, y: node.y };
  }

  // Center the graph
  const allX = Object.values(positions).map((p) => p.x);
  const allY = Object.values(positions).map((p) => p.y);
  const minX = Math.min(...allX);
  const minY = Math.min(...allY);

  for (const name in positions) {
    positions[name].x -= minX;
    positions[name].y -= minY;
  }

  return positions;
}

const RESOLVE_ITERATIONS = 10;
const PADDING = 10; // Extra space between shapes

function resolveOverlaps(nodes: Record<string, Node>) {
  const nodeArray = Object.values(nodes);

  for (let i = 0; i < RESOLVE_ITERATIONS; i++) {
    for (let j = 0; j < nodeArray.length; j++) {
      for (let k = j + 1; k < nodeArray.length; k++) {
        const nodeA = nodeArray[j];
        const nodeB = nodeArray[k];

        // Bounding box for each node
        const a = {
          x1: nodeA.x,
          y1: nodeA.y,
          x2: nodeA.x + nodeA.width,
          y2: nodeA.y + nodeA.height,
        };
        const b = {
          x1: nodeB.x,
          y1: nodeB.y,
          x2: nodeB.x + nodeB.width,
          y2: nodeB.y + nodeB.height,
        };

        // Check for intersection
        if (a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1) {
          // Calculate overlap on each axis
          const overlapX = Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1);
          const overlapY = Math.min(a.y2, b.y2) - Math.max(a.y1, b.y1);

          // Find the axis of least overlap to push them apart
          if (overlapX < overlapY) {
            const move = (overlapX + PADDING) / 2;
            if (a.x1 < b.x1) {
              nodeA.x -= move;
              nodeB.x += move;
            } else {
              nodeA.x += move;
              nodeB.x -= move;
            }
          } else {
            const move = (overlapY + PADDING) / 2;
            if (a.y1 < b.y1) {
              nodeA.y -= move;
              nodeB.y += move;
            } else {
              nodeA.y += move;
              nodeB.y -= move;
            }
          }
        }
      }
    }
  }
}
