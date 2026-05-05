import { IconPlayerPlay } from "@tabler/icons-react";
import { useAtomValue, useSetAtom } from "jotai";
import { canvasApiAtom, resultsAtom } from "../../canvas/state";
import { executeQueries } from "../../canvas/executeQueries";
import { sessionStateAtom } from "../../multiplayer/state";
import { requestRemoteExecution } from "../../multiplayer/syncBridge";
import type { CommandPaletteResult } from ".";
import type { QueryNode } from "../../canvas/types";

export const useRerunAllQueriesOnPageCommand = (): CommandPaletteResult => {
  const canvas = useAtomValue(canvasApiAtom);
  const setResults = useSetAtom(resultsAtom);
  const session = useAtomValue(sessionStateAtom);

  return {
    icon: <IconPlayerPlay size={16} />,
    label: "Rerun all queries on page",
    onSelect: async () => {
      if (!canvas) {
        return;
      }
      const queries = canvas.getNodes().filter((n): n is QueryNode => n.type === "query");
      for (const node of queries) {
        const q = node.data.query.trim();
        if (!q) {
          continue;
        }
        if (session?.role === "joiner") {
          await requestRemoteExecution(node.id, [q]);
        } else {
          await executeQueries({ canvas, setResults, sourceNode: node, queries: [q] });
        }
        await new Promise<void>(r => {
          setTimeout(r, 20);
        });
      }
    },
  };
};
