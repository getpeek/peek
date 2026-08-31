import { IconActivityHeartbeat } from "@tabler/icons-react";
import { useAtomValue } from "jotai";
import { CommandPaletteResult } from "./index";
import { canvasApiAtom } from "../../canvas/state";
import { showRunningQueries } from "../../canvas/nodes/Activity/showRunningQueries";
import { useKeybinding } from "./useKeybinding";

export const useShowRunningQueriesCommand = (): CommandPaletteResult => {
  const canvas = useAtomValue(canvasApiAtom);

  return {
    icon: <IconActivityHeartbeat size={16} />,
    action: "open",
    label: "Show running queries",
    description: "Live pg_stat_activity",
    searchAgainst: "activity backends pg_stat_activity kill terminate blocked locks",
    keybinding: useKeybinding("View::ShowRunningQueries"),
    onSelect: () => {
      if (!canvas) {
        return;
      }
      showRunningQueries(canvas);
    },
  };
};
