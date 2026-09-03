import { IconActivityHeartbeat } from "@tabler/icons-react";
import { useAtomValue } from "jotai";
import { CommandPaletteResult } from "./index";
import { canvasApiAtom } from "../../canvas/state";
import { activeEngineAtom } from "../../Connection/engine";
import { activityEngineFor } from "../../canvas/nodes/Activity/activitySql";
import { showRunningQueries } from "../../canvas/nodes/Activity/showRunningQueries";
import { useKeybinding } from "./useKeybinding";

export const useShowRunningQueriesCommand = (): CommandPaletteResult => {
  const canvas = useAtomValue(canvasApiAtom);
  const engine = useAtomValue(activeEngineAtom);

  return {
    icon: <IconActivityHeartbeat size={16} />,
    action: "open",
    label: "Show running queries",
    description: activityEngineFor(engine).paletteDescription,
    searchAgainst: "activity backends pg_stat_activity processlist kill terminate blocked locks",
    keybinding: useKeybinding("View::ShowRunningQueries"),
    onSelect: () => {
      if (!canvas) {
        return;
      }
      showRunningQueries(canvas);
    },
  };
};
