import { Text } from "@mantine/core";
import { IconTableExport } from "@tabler/icons-react";
import { Editor } from "tldraw";
import { CommandPaletteResult } from ".";
import { open } from "@tauri-apps/plugin-dialog";
import { BaseDirectory, writeTextFile } from "@tauri-apps/plugin-fs";
import { ResultShape } from "../../shapes/Result/ResultShape";
import { join } from "@tauri-apps/api/path";
import { ChatOllama } from "@langchain/ollama";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { toJson } from "../../tools/export/json";

export const exportSelectedDataJson: CommandPaletteResult = {
  searchAgainst: "Export selected data as JSON",
  label: <Text size="xs">Export selected data (JSON)</Text>,
  icon: <IconTableExport size={16} />,
  onSelect: async (editor: Editor) => {
    const shapes = editor
      .getSelectedShapes()
      .filter((shape) => shape.type === "result");

    if (shapes.length === 0) {
      return;
    }

    const model = new ChatOllama({
      model: "qwen3:8b",
      baseUrl: "http://localhost:11434",
      streaming: false,
      numThread: 32,
    });

    const path = await open({ directory: true, multiple: false });
    if (!path) {
      return;
    }
    for (const shape of shapes) {
      const output = JSON.stringify(toJson((shape as ResultShape).props.data));

      model
        .invoke([
          new SystemMessage(
            `/no_think Your job is to create short, descriptive file names
for sql queries that have been exported to json. Focus on the semantics of the query and convey that.
Use only English characters, numbers and underscores and append .json to the end of the filename`,
          ),
          new HumanMessage(
            `The query is: ${(shape as ResultShape).props.query}`,
          ),
        ])
        .then((response) =>
          response.text.replace(/<think>[\s]+<\/think>/gi, "").trim(),
        )
        .then((filename) => join(path, filename))
        .then((filepath) =>
          writeTextFile(filepath, output, {
            baseDir: BaseDirectory.AppConfig,
          }),
        );
    }
  },
};
