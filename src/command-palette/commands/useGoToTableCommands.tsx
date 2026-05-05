import { IconTable } from "@tabler/icons-react";
import { useAtomValue } from "jotai";
import { activePageAtom, canvasApiAtom, nodesAtom } from "../../canvas/state";
import { CommandPaletteResult } from ".";
import type { TableDefinitionNode } from "../../canvas/types";

export const useGoToTableCommands = (): CommandPaletteResult[] => {
  const activePage = useAtomValue(activePageAtom);
  const nodes = useAtomValue(nodesAtom);
  const canvas = useAtomValue(canvasApiAtom);

  if (activePage?.name !== "schema") {
    return [];
  }

  return nodes
    .filter((n): n is TableDefinitionNode => n.type === "table-definition")
    .map(node => ({
      icon: <IconTable size={16} />,
      label: node.data.table,
      searchAgainst: "table",
      onSelect: () => {
        if (!canvas) {
          return;
        }
        canvas.selectOnly(node.id);
        canvas.zoomToNode(node.id, { duration: 200 });
      },
    }));
};
