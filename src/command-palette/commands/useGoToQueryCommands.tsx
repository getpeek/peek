import { IconSql } from "@tabler/icons-react";
import { useAtomValue } from "jotai";
import { canvasApiAtom, nodesAtom } from "../../canvas/state";
import { CommandPaletteResult } from ".";
import type { QueryNode } from "../../canvas/types";
import { QueryDetails } from "../details/QueryDetails";

export const useGoToQueryCommands = (): CommandPaletteResult[] => {
  const nodes = useAtomValue(nodesAtom);
  const canvas = useAtomValue(canvasApiAtom);

  return nodes
    .filter((n): n is QueryNode => n.type === "query")
    .map(node => ({
      icon: <IconSql size={16} />,
      label: node.data.query.replaceAll(/\s/gu, " ").slice(0, 60),
      searchAgainst: node.data.query.toLowerCase(),
      details: <QueryDetails sql={node.data.query} />,
      onSelect: () => {
        if (!canvas) {
          return;
        }
        canvas.selectOnly(node.id);
        canvas.zoomToNode(node.id, { duration: 200 });
      },
    }));
};
