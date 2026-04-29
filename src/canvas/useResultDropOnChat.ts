import { useAtomValue } from "jotai";
import { useCallback } from "react";
import { resultsAtom } from "./state";
import { defaultDimensions } from "./defaults";
import { toCsv } from "../tools/export/csv";
import type { Message } from "../shapes/Ai/useExecutePrompt";
import type { AppNode, ChatNode as ChatNodeT, ResultNode as ResultNodeT } from "./types";
import { useCanvas } from "./useCanvas";

export function useResultDropOnChat(onSchemaNodeDragStop: (node: AppNode) => void) {
  const canvas = useCanvas();
  const results = useAtomValue(resultsAtom);

  return useCallback(
    (_e: React.MouseEvent | MouseEvent | TouchEvent, dragged: AppNode) => {
      onSchemaNodeDragStop(dragged);

      if (dragged.type !== "result") {
        return;
      }
      const result = canvas.getNode(dragged.id) as ResultNodeT | undefined;
      if (!result || result.type !== "result") {
        return;
      }

      const r = {
        x: result.position.x,
        y: result.position.y,
        w: result.width ?? defaultDimensions.result.w,
        h: result.height ?? defaultDimensions.result.h,
      };

      const chats = canvas.getNodes().filter((n): n is ChatNodeT => n.type === "chat");

      for (const chat of chats) {
        const c = {
          x: chat.position.x,
          y: chat.position.y,
          w: chat.width ?? defaultDimensions.chat.w,
          h: chat.height ?? defaultDimensions.chat.h,
        };
        const overlap = !(r.x + r.w < c.x || r.x > c.x + c.w || r.y + r.h < c.y || r.y > c.y + c.h);
        if (!overlap) {
          continue;
        }

        const rows = results[result.id] ?? [];
        const csv = toCsv(rows);
        const message: Message = {
          type: "context",
          message: `The user ran an additional query ${result.data.query} which resulted in this data:\n${csv}`,
          timestamp: Date.now(),
        };
        canvas.updateNodeData<ChatNodeT["data"]>(chat.id, d => ({
          ...d,
          messages: [...d.messages, message],
        }));
        return;
      }
    },
    [canvas, onSchemaNodeDragStop, results],
  );
}
