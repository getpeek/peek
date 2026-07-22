import { IconTableExport } from "@tabler/icons-react";
import { open } from "@tauri-apps/plugin-dialog";
import { BaseDirectory, writeTextFile } from "@tauri-apps/plugin-fs";
import { join } from "@tauri-apps/api/path";
import { useAtomValue } from "jotai";
import { toJson } from "../../tools/export/json";
import { canvasApiAtom, resultsAtom } from "../../canvas/state";
import type { CommandPaletteResult } from ".";
import type { ResultNode } from "../../canvas/types";
import { configAtom } from "../../state";
import { ExportDetails } from "../details/ExportDetails";
import { exportFilename } from "./exportFilename";

export const useExportSelectedDataJsonCommand = (): CommandPaletteResult => {
  const canvas = useAtomValue(canvasApiAtom);
  const results = useAtomValue(resultsAtom);
  const config = useAtomValue(configAtom);

  return {
    icon: <IconTableExport size={16} />,
    action: "run",
    label: "Export selected data (JSON)",
    details: <ExportDetails format='json' />,
    onSelect: async () => {
      if (!canvas) {
        return;
      }
      const nodes = canvas.getSelectedNodes().filter((n): n is ResultNode => n.type === "result");
      if (nodes.length === 0) {
        return;
      }

      const path = await open({ directory: true, multiple: false });
      if (!path) {
        return;
      }

      for (const node of nodes) {
        const output = JSON.stringify(toJson(results[node.id] ?? []));
        const filename = await exportFilename(config, node.data.query, "json");
        const filepath = await join(path, filename);
        await writeTextFile(filepath, output, { baseDir: BaseDirectory.AppConfig });
      }
    },
  };
};
