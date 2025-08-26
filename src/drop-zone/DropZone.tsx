import { listen, TauriEvent, UnlistenFn } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { useAtomValue, useSetAtom } from "jotai";
import { editorAtom, schemaAtom } from "../state";
import { invoke } from "@tauri-apps/api/core";
import { QueryShape } from "../shapes/Query/QueryShape";
import "./DropZone.css";
import { IconFileUpload } from "@tabler/icons-react";
import { Text } from "@mantine/core";

export const DropZone = () => {
  const [showDropZone, setShowDropZone] = useState(false);
  const editor = useAtomValue(editorAtom);
  const setSchema = useSetAtom(schemaAtom);

  const fetchSchema = async () => {
    const response = (await invoke("get_schema")) as string;
    const schema = JSON.parse(response);
    setSchema(schema);
  };

  useEffect(() => {
    let [enter, leave, drop] = [null, null, null] as (UnlistenFn | null)[];

    listen(TauriEvent.DRAG_ENTER, () => {
      setShowDropZone(true);
    }).then((cb) => (enter = cb));

    listen(TauriEvent.DRAG_LEAVE, () => setShowDropZone(false)).then(
      (cb) => (leave = cb),
    );

    listen(TauriEvent.DRAG_DROP, async (event) => {
      const payload = event.payload as Record<string, unknown>;

      const { x, y } = payload.position as { x: number; y: number };
      setShowDropZone(false);
      if (!("paths" in payload) || !editor) {
        return;
      }

      for (const path of payload.paths as string[]) {
        const file = await readTextFile(path);
        const fileName =
          path.split("/").pop()?.split(".")[0] ?? "imported_data";
        if (path.endsWith(".csv")) {
          await invoke("import_csv", { tableName: fileName, csv: file });
          const pos = editor.screenToPage({ x, y });

          editor.createShape<QueryShape>({
            type: "query",
            x: pos.x,
            y: pos.y,
            props: {
              query: `SELECT * FROM ${fileName}`,
            },
          });
        }
      }

      await fetchSchema();
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

  return (
    <div className="drop-zone">
      <IconFileUpload size={80} color="#fff" />
      <Text>Import files</Text>
    </div>
  );
};
