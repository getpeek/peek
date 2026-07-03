import { IconSql } from "@tabler/icons-react";
import { useAtomValue } from "jotai";
import { canvasApiAtom, nodesAtom, resultsAtom } from "../../canvas/state";
import { ids } from "../../canvas/ids";
import { CommandPaletteResult } from ".";
import type { QueryNode } from "../../canvas/types";
import { QueryDetails } from "../details/QueryDetails";

export const useGoToQueryCommands = (): CommandPaletteResult[] => {
  const nodes = useAtomValue(nodesAtom);
  const results = useAtomValue(resultsAtom);
  const canvas = useAtomValue(canvasApiAtom);

  return nodes
    .filter((n): n is QueryNode => n.type === "query")
    .map(node => {
      const rows = results[ids.result(node.id)]?.length;
      return {
        icon: <IconSql size={16} />,
        label: node.data.query.replaceAll(/\s/gu, " ").slice(0, 60),
        searchAgainst: node.data.query.toLowerCase(),
        action: "open",
        details: <QueryDetails sql={node.data.query} rows={rows} />,
        onSelect: () => {
          if (!canvas) {
            return;
          }
          canvas.selectOnly(node.id);
          canvas.zoomToNode(node.id, { duration: 200 });
        },
      };
    });
};
