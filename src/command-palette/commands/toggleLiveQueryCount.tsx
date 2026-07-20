import { IconActivityHeartbeat } from "@tabler/icons-react";
import { invoke } from "@tauri-apps/api/core";
import { useAtom } from "jotai";
import { configAtom } from "../../state";
import type { CommandPaletteResult } from ".";

export const useToggleLiveQueryCountCommand = (): CommandPaletteResult => {
  const [config, setConfig] = useAtom(configAtom);
  const hidden = config?.ui.titlebar.live_query_count === "hide";
  const next = hidden ? "show" : "hide";

  return {
    icon: <IconActivityHeartbeat size={16} />,
    action: "run",
    label: hidden ? "Show live query count" : "Hide live query count",
    searchAgainst: "live query count titlebar indicator show hide toggle setting",
    onSelect: async () => {
      await invoke("set_ui_titlebar_live_query_count", { visibility: next });
      setConfig(prev =>
        prev
          ? {
              ...prev,
              ui: {
                ...prev.ui,
                titlebar: { ...prev.ui.titlebar, live_query_count: next },
              },
            }
          : prev,
      );
    },
  };
};
