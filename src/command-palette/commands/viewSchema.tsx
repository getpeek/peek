import { CommandPaletteResult } from "./index";
import { IconSchema } from "@tabler/icons-react";
import { Text } from "@mantine/core";
import { useAtomValue } from "jotai";
import { DatabaseResult, schemaAtom } from "../../state";
import { canvasApiAtom, documentAtom } from "../../canvas/state";
import { calculateLayout } from "./calculateSchemaLayout";
import type { ResultNode } from "../../canvas/types";

export const useViewSchemaCommand = (): CommandPaletteResult => {
  const schema = useAtomValue(schemaAtom);
  const doc = useAtomValue(documentAtom);
  const canvas = useAtomValue(canvasApiAtom);
  const positions = calculateLayout(schema);

  return {
    icon: <IconSchema size={16} />,
    label: <Text size="xs">View Schema</Text>,
    searchAgainst: "View database schema",
    description: (
      <Text size="xs" c="var(--text-color-subtle)">
        opens in a new page
      </Text>
    ),
    onSelect: () => {
      if (!canvas) return;
      let schemaPageId = doc.pageOrder.find(
        (id) => doc.pages[id]?.name === "schema",
      );
      if (!schemaPageId) {
        schemaPageId = canvas.addPage("schema");
      } else {
        canvas.switchPage(schemaPageId);
      }

      for (const node of canvas.getNodes()) {
        if (node.id.startsWith("schema-table-")) {
          canvas.deleteNode(node.id);
        }
      }

      Object.entries(schema.tables).forEach(([table, columns]) => {
        const { x, y } = positions[table];
        const header: DatabaseResult = [
          [
            [table, "", ""],
            ["", "", ""],
          ],
        ];
        const data: DatabaseResult = columns.map(([col, kind]) => [
          ["column", col, "string"],
          ["type", kind, kind],
        ]);
        const id = `schema-table-${table}`;
        const newNode: ResultNode = {
          id,
          type: "result",
          position: { x, y },
          width: 450,
          height: columns.length * 60 + 100,
          data: {
            query: `describe ${table}`,
            data: [...header, ...data],
          },
        };
        canvas.addNode(newNode);
      });

      const references: Record<string, string[]> = {};
      Object.entries(schema.references).forEach(([from, to]) => {
        const fromTable = from.split(".")[0];
        const toTables = to.map((table) => table.split(".")[0]);
        references[fromTable] = toTables;
      });

      for (const [fromTable, toTables] of Object.entries(references)) {
        const fromId = `schema-table-${fromTable}`;
        if (!canvas.getNode(fromId)) continue;
        for (const toTable of toTables) {
          const toId = `schema-table-${toTable}`;
          if (!canvas.getNode(toId)) continue;
          canvas.connect(fromId, toId);
        }
      }
    },
  };
};
