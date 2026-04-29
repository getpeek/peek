import { IconSql } from "@tabler/icons-react";
import { Text } from "@mantine/core";
import { useAtomValue } from "jotai";
import { canvasApiAtom, nodesAtom } from "../../canvas/state";
import { CommandPaletteResult } from ".";
import type { QueryNode } from "../../canvas/types";

export const useGoToQueryCommands = (): CommandPaletteResult[] => {
  const nodes = useAtomValue(nodesAtom);
  const canvas = useAtomValue(canvasApiAtom);

  return nodes
    .filter((n): n is QueryNode => n.type === "query")
    .map((node) => ({
      icon: <IconSql />,
      label: (
        <Text size="xs">{node.data.query.replaceAll(/\s/g, " ").slice(0, 60).toString()}</Text>
      ),
      searchAgainst: node.data.query.toLowerCase(),
      onSelect: () => {
        if (!canvas) {
          return;
        }
        canvas.selectOnly(node.id);
        canvas.zoomToNode(node.id, { duration: 200 });
      },
    }));
};
