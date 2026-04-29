import { Text } from "@mantine/core";
import { IconTableExport } from "@tabler/icons-react";
import { open } from "@tauri-apps/plugin-dialog";
import { BaseDirectory, writeTextFile } from "@tauri-apps/plugin-fs";
import { join } from "@tauri-apps/api/path";
import { ChatOllama } from "@langchain/ollama";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { useAtomValue } from "jotai";
import { toJson } from "../../tools/export/json";
import { canvasApiAtom, resultsAtom } from "../../canvas/state";
import type { CommandPaletteResult } from ".";
import type { ResultNode } from "../../canvas/types";

export const useExportSelectedDataJsonCommand = (): CommandPaletteResult => {
  const canvas = useAtomValue(canvasApiAtom);
  const results = useAtomValue(resultsAtom);

  return {
    searchAgainst: "Export selected data as JSON",
    label: <Text size="xs">Export selected data (JSON)</Text>,
    icon: <IconTableExport size={16} />,
    onSelect: async () => {
      if (!canvas) {
        return;
      }
      const nodes = canvas.getSelectedNodes().filter((n): n is ResultNode => n.type === "result");
      if (nodes.length === 0) {
        return;
      }

      const model = new ChatOllama({
        model: "qwen3:14b",
        baseUrl: "http://localhost:11434",
        streaming: false,
        numThread: 32,
        keepAlive: "10m",
        think: false,
      });

      const path = await open({ directory: true, multiple: false });
      if (!path) {
        return;
      }

      for (const node of nodes) {
        const output = JSON.stringify(toJson(results[node.id] ?? []));
        model
          .invoke([
            new SystemMessage(
              `/no_think Your job is to create short, descriptive file names
for sql queries that have been exported to json. Focus on the semantics of the query and convey that.
Use only English characters, numbers and underscores and append .json to the end of the filename`,
            ),
            new HumanMessage(`The query is: ${node.data.query}`),
          ])
          .then((response) => response.text.replaceAll(/<think>[\s]+<\/think>/gi, "").trim())
          .then((filename) => join(path, filename))
          .then((filepath) =>
            writeTextFile(filepath, output, {
              baseDir: BaseDirectory.AppConfig,
            }),
          );
      }
    },
  };
};
