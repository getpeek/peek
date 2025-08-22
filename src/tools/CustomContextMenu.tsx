import {
  DefaultContextMenu,
  TldrawUiMenuGroup,
  TldrawUiMenuItem,
  TldrawUiMenuSubmenu,
  TLUiContextMenuProps,
  useEditor,
} from "tldraw";
import { writeTextFile, BaseDirectory } from "@tauri-apps/plugin-fs";
import { save } from "@tauri-apps/plugin-dialog";
import { ResultShapeUtil } from "../shapes/Result/ResultShape";
import { toJson } from "./export/json";
import { toCsv } from "./export/csv";
import { QueryShapeUtil } from "../shapes/Query/QueryShape";

export const CustomContextMenu = (props: TLUiContextMenuProps) => {
  const editor = useEditor();

  const exportAllSql = async () => {
    const queries = editor
      .getCurrentPageShapes()
      .filter((shape) => shape.type === "query")
      .map(
        (shape) =>
          (shape.props as ReturnType<QueryShapeUtil["getDefaultProps"]>).query,
      )
      .join("\n\n---\n\n");

    try {
      const path = await save({
        filters: [
          {
            name: "export",
            extensions: ["sql"],
          },
        ],
      });

      if (!path) {
        return;
      }

      await writeTextFile(path, queries, {
        baseDir: BaseDirectory.AppConfig,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const exportTo = async (format: "json" | "csv") => {
    try {
      const shape = editor.getOnlySelectedShape();
      if (!shape) {
        return;
      }

      if (shape.type !== "result") {
        return;
      }

      const data = (
        shape.props as ReturnType<ResultShapeUtil["getDefaultProps"]>
      ).data;

      let output = "";
      if (format === "json") {
        output = JSON.stringify(toJson(data));
      } else if (format === "csv") {
        output = toCsv(data);
      }

      const path = await save({
        filters: [
          {
            name: "export",
            extensions: [format],
          },
        ],
      });

      if (!path) {
        return;
      }

      await writeTextFile(path, output, {
        baseDir: BaseDirectory.AppConfig,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const shape = editor.getOnlySelectedShape();

  if (shape?.type !== "result") {
    <DefaultContextMenu {...props} />;
  }

  const items = [
    { id: "export-csv", label: "CSV", onSelect: () => exportTo("csv") },
    { id: "export-json", label: "JSON", onSelect: () => exportTo("json") },
  ];

  return (
    <DefaultContextMenu {...props}>
      <TldrawUiMenuItem
        id="export-sql"
        label="Export all SQL"
        onSelect={exportAllSql}
      />

      <TldrawUiMenuGroup id="export">
        <div>
          <TldrawUiMenuSubmenu id="export" label="Export">
            {items.map((item) => (
              <TldrawUiMenuItem
                id={item.id}
                key={item.id}
                label={item.label}
                onSelect={item.onSelect}
              />
            ))}
          </TldrawUiMenuSubmenu>
        </div>
      </TldrawUiMenuGroup>
    </DefaultContextMenu>
  );
};
