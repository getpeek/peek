import { CommandPaletteResult } from "./index";
import { IconSchema } from "@tabler/icons-react";
import { Text } from "@mantine/core";
import { createShapeId, TLPage } from "tldraw";
import { useAtomValue } from "jotai";
import { DatabaseResult, schemaAtom } from "../../state";
import { ResultShape } from "../../shapes/Result/ResultShape";
import { createArrowBetweenShapes } from "../../tools/createArrowBetweenShapes";

export const useViewSchemaCommand = (): CommandPaletteResult => {
  const schema = useAtomValue(schemaAtom);

  return {
    icon: <IconSchema size={16} />,
    label: <Text size="xs">View Schema</Text>,
    searchAgainst: "View database schema",
    description: (
      <Text size="xs" c="var(--text-color-subtle)">
        opens in a new page
      </Text>
    ),
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
        const header: DatabaseResult = [
          [
            [table, "", ""],
            ["", "", ""],
          ],
        ];
        const data: DatabaseResult = columns.map(([col, kind]) => {
          return [
            ["column", col, "string"],
            ["type", kind, kind],
          ];
        });
        editor.createShape<ResultShape>({
          id: createShapeId(`schema-table-${table}`),
          type: "result",
          x,
          y,
          props: {
            query: `describe ${table}`,
            data: [...header, ...data],
            h: columns.length * 60 + 100,
            w: 450,
          },
        });
        x += 550;
        if (x > 1400) {
          x = 0;
          y += 500;
        }
      });

      const shapes = editor.getCurrentPageShapes() as ResultShape[];

      const references: Record<string, string[]> = {};

      Object.entries(schema.references).forEach(([from, to]) => {
        const fromTable = from.split(".")[0];
        const toTables = to.map((table) => table.split(".")[0]);
        references[fromTable] = toTables;
      });

      console.log(references);

      for (const shape of shapes) {
        const table = shape.props.query.split(" ")[1];

        const toShapes = (references[table] ?? []).flatMap((name) => {
          const id = createShapeId(`schema-table-${name}`);
          return editor.getShape(id) ?? [];
        });

        for (const toShape of toShapes) {
          createArrowBetweenShapes(editor, shape.id, toShape.id);
        }
      }
    },
  };
};
