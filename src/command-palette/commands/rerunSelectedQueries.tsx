import { IconPlayerPlay } from "@tabler/icons-react";
import { Text } from "@mantine/core";
import { useAtomValue, useSetAtom } from "jotai";
import { canvasApiAtom, resultsAtom } from "../../canvas/state";
import { executeQueries } from "../../canvas/executeQueries";
import { sessionStateAtom } from "../../multiplayer/state";
import { requestRemoteExecution } from "../../multiplayer/syncBridge";
import type { CommandPaletteResult } from ".";
import type { QueryNode } from "../../canvas/types";

export const useRerunSelectedQueriesCommand = (): CommandPaletteResult => {
  const canvas = useAtomValue(canvasApiAtom);
  const setResults = useSetAtom(resultsAtom);
  const session = useAtomValue(sessionStateAtom);

  return {
    searchAgainst: "rerun selected queries",
    label: <Text size="xs">Rerun selected queries</Text>,
    icon: <IconPlayerPlay size={16} />,
    onSelect: async () => {
      if (!canvas) return;
      const queries = canvas
        .getSelectedNodes()
        .filter((n): n is QueryNode => n.type === "query");
      for (const node of queries) {
        const q = node.data.query.trim();
        if (!q) continue;
        if (session?.role === "joiner") {
          await requestRemoteExecution(node.id, [q]);
        } else {
          await executeQueries(canvas, setResults, node, [q]);
        }
        await new Promise((r) => setTimeout(r, 20));
      }
    },
  };
};
