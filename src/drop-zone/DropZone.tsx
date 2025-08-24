import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";
import "./DropZone.css";
import { readTextFile } from "@tauri-apps/plugin-fs";
// import { fromCsv } from "../tools/import/csv";
import { useAtomValue } from "jotai";
import { editorAtom, ImportedDataResult } from "../state";
import { fromJson } from "../tools/import/json";
import { ImportedDataSourceShape } from "../shapes/ImportedData/ImportedDataShape";
import { invoke } from "@tauri-apps/api/core";

export const DropZone = () => {
  const [showDropZone, setShowDropZone] = useState(false);
  const editor = useAtomValue(editorAtom);

  useEffect(() => {
    let [enter, leave, drop] = [null, null, null] as (UnlistenFn | null)[];

    listen("tauri://drag-enter", () => {
      setShowDropZone(true);
    }).then((cb) => (enter = cb));

    listen("tauri://drag-leave", () => setShowDropZone(false)).then(
      (cb) => (leave = cb),
    );

    listen("tauri://drag-drop", async (event) => {
      const payload = event.payload as Record<string, unknown>;
      setShowDropZone(false);
      if (!("paths" in payload) || !editor) {
        return;
      }

      for (const path of payload.paths as string[]) {
        let result: ImportedDataResult | null = null;
        const file = await readTextFile(path);
        if (path.endsWith(".csv")) {
          console.log("importing");
          try {
            await invoke("import_csv", {
              csv: file,
              tableName: "test_import",
            });
          } catch (e) {
            console.error(e);
          }

          // result = fromCsv(file);
        } else if (path.endsWith(".json")) {
          result = fromJson(file);
        }

        if (result) {
          editor.createShape<ImportedDataSourceShape>({
            type: "imported-data-source",
            props: {
              data: result,
              w: 1000,
              h: 1000,
            },
          });
        }
      }
    }).then((cb) => (drop = cb));

    return () => {
      enter?.();
      leave?.();
      drop?.();
    };
  }, [editor]);

  if (!showDropZone) {
    return null;
  }

  return <div className="drop-zone">Hello</div>;
};
