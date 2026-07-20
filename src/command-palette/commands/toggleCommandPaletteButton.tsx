import { IconCommand } from "@tabler/icons-react";
import { invoke } from "@tauri-apps/api/core";
import { useAtom } from "jotai";
import { configAtom } from "../../state";
import type { CommandPaletteResult } from ".";

export const useToggleCommandPaletteButtonCommand = (): CommandPaletteResult => {
  const [config, setConfig] = useAtom(configAtom);
  const hidden = config?.ui.titlebar.command_palette_button === "hide";
  const next = hidden ? "show" : "hide";

  return {
    icon: <IconCommand size={16} />,
    action: "run",
    label: hidden ? "Show command palette button" : "Hide command palette button",
    searchAgainst: "command palette button titlebar show hide toggle setting",
    onSelect: async () => {
      await invoke("set_ui_titlebar_command_palette_button", { visibility: next });
      setConfig(prev =>
        prev
          ? {
              ...prev,
              ui: {
                ...prev.ui,
                titlebar: { ...prev.ui.titlebar, command_palette_button: next },
              },
            }
          : prev,
      );
    },
  };
};
