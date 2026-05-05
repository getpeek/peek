import { CommandPaletteResult } from "./index";
import { IconSchema } from "@tabler/icons-react";
import { useAtomValue } from "jotai";
import { schemaAtom } from "../../state";
import { canvasApiAtom, documentAtom } from "../../canvas/state";
import type { TableDefinitionNode } from "../../canvas/types";

const NODE_WIDTH = 450;
const INITIAL_SPREAD = 400;

/**
 * Initial positions are spread on a circle around the origin so the live
 * d3-force simulation in `useSchemaForceLayout` has somewhere to start
 * pushing/pulling nodes from. The simulation does the actual layout work.
 */
function initialPositions(tableNames: string[]) {
  const n = tableNames.length;
  const radius = INITIAL_SPREAD + n * 30;
  const positions: Record<string, { x: number; y: number }> = {};
  tableNames.forEach((name, i) => {
    const angle = (i / Math.max(n, 1)) * Math.PI * 2;
    positions[name] = {
      x: Math.cos(angle) * radius - NODE_WIDTH / 2,
      y: Math.sin(angle) * radius,
    };
  });
  return positions;
}

export const useViewSchemaCommand = (): CommandPaletteResult => {
  const schema = useAtomValue(schemaAtom);
  const doc = useAtomValue(documentAtom);
  const canvas = useAtomValue(canvasApiAtom);

  return {
    icon: <IconSchema size={16} />,
    label: "View schema",
    description: "Opens in a new page",
    searchAgainst: "database",
    onSelect: () => {
      if (!canvas) {
        return;
      }
      let schemaPageId = doc.pageOrder.find(id => doc.pages[id]?.name === "schema");
      if (schemaPageId) {
        canvas.switchPage(schemaPageId);
      } else {
        schemaPageId = canvas.addPage("schema");
      }

      for (const node of canvas.getNodes()) {
        if (node.id.startsWith("schema-table-")) {
          canvas.deleteNode(node.id);
        }
      }

      const tableNames = Object.keys(schema.tables);
      const positions = initialPositions(tableNames);
      const createdIds: string[] = [];

      Object.entries(schema.tables).forEach(([table, columns]) => {
        const { x, y } = positions[table];
        const id = `schema-table-${table}`;
        const newNode: TableDefinitionNode = {
          id,
          type: "table-definition",
          position: { x, y },
          width: NODE_WIDTH,
          height: columns.length * 28 + 60,
          data: { table, columns },
        };
        canvas.addNode(newNode);
        createdIds.push(id);
      });

      if (createdIds.length === 1) {
        canvas.zoomToNode(createdIds[0], { duration: 300 });
      } else if (createdIds.length > 1) {
        canvas.zoomToNodes(createdIds, { duration: 300 });
      }

      // Edges between tables are derived from the schema atom by
      // `useSchemaForceLayout`, so we don't need to create them here.
    },
  };
};
