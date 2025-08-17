import { CommandPaletteResult } from "./index";
import { IconSchema } from "@tabler/icons-react";
import { Text } from "@mantine/core";
import { createShapeId, TLPage } from "tldraw";
import { useAtomValue } from "jotai";
import { DatabaseResult, schemaAtom } from "../../state";
import { ResultShape } from "../../shapes/Result/ResultShape";

export const useViewSchemaCommand = (): CommandPaletteResult => {
  const schema = useAtomValue(schemaAtom);

  return {
    icon: <IconSchema size={16} />,
    label: <Text size="xs">View Schema</Text>,
    searchAgainst: "View database schema",
    onSelect: (editor) => {
      let schemaPage = editor.getPages().find((page) => page.name === "schema");

      if (!schemaPage) {
        editor.createPage({
          name: "schema",
        });

        schemaPage = editor
          .getPages()
          .find((page) => page.name === "schema") as TLPage;
      }

      editor.setCurrentPage(schemaPage);
      const previousSchema = editor.getCurrentPageShapes();
      editor.deleteShapes(previousSchema);

      let x = 0;
      let y = 0;

      Object.entries(schema.tables).forEach(([table, columns]) => {
        const data: DatabaseResult = columns.map((col) => [
          [table, col, "string"],
        ]);
        editor.createShape<ResultShape>({
          id: createShapeId(`schema-table-${table}`),
          type: "result",
          x,
          y,
          props: {
            query: `describe ${table}`,
            data,
            h: columns.length * 60 + 50,
          },
        });
        x += 400;
        if (x > 1400) {
          x = 0;
          y += 500;
        }
      });
    },
  };
};
