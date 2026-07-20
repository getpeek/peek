import { IconUsers } from "@tabler/icons-react";
import { invoke } from "@tauri-apps/api/core";
import { useAtom } from "jotai";
import { configAtom } from "../../state";
import type { CommandPaletteResult } from ".";

export const useToggleCollaborationButtonCommand = (): CommandPaletteResult => {
  const [config, setConfig] = useAtom(configAtom);
  const hidden = config?.ui.titlebar.collaboration_button === "hide";
  const next = hidden ? "show" : "hide";

  return {
    icon: <IconUsers size={16} />,
    action: "run",
    label: hidden ? "Show collaboration button" : "Hide collaboration button",
    searchAgainst:
      "collaboration collaborate button titlebar share session show hide toggle setting",
    onSelect: async () => {
      await invoke("set_ui_titlebar_collaboration_button", { visibility: next });
      setConfig(prev =>
        prev
          ? {
              ...prev,
              ui: {
                ...prev.ui,
                titlebar: { ...prev.ui.titlebar, collaboration_button: next },
              },
            }
          : prev,
      );
    },
  };
};
