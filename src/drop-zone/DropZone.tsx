import { listen, TauriEvent, UnlistenFn } from "@tauri-apps/api/event";
import { useEffect, useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { schemaAtom } from "../state";
import { canvasApiAtom } from "../canvas/state";
import { invoke } from "@tauri-apps/api/core";
import { ids } from "../canvas/ids";
import type { QueryNode } from "../canvas/types";
import "./DropZone.css";
import { IconFileUpload } from "@tabler/icons-react";
import { Text } from "@mantine/core";

export const DropZone = () => {
  const [showDropZone, setShowDropZone] = useState(false);
  const canvas = useAtomValue(canvasApiAtom);
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
      if (!("paths" in payload) || !canvas) return;

      for (const path of payload.paths as string[]) {
        const tableName = await invoke("import_file", { path });
        const pos = canvas.screenToFlowPosition({ x, y });
        const node: QueryNode = {
          id: ids.query(),
          type: "query",
          position: pos,
          width: 350,
          height: 240,
          data: { query: `SELECT * FROM ${tableName}` },
        };
        canvas.addNode(node);
      }

      await fetchSchema();
    }).then((cb) => (drop = cb));

    return () => {
      enter?.();
      leave?.();
      drop?.();
    };
  }, [canvas]);

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
