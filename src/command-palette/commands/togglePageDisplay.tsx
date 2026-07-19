import { IconLayoutList } from "@tabler/icons-react";
import { invoke } from "@tauri-apps/api/core";
import { useAtom } from "jotai";
import { configAtom } from "../../state";
import type { CommandPaletteResult } from ".";

export const useTogglePageDisplayCommand = (): CommandPaletteResult => {
  const [config, setConfig] = useAtom(configAtom);
  const asList = config?.ui.pages.show_as === "list";
  const next = asList ? "tabs" : "list";

  return {
    icon: <IconLayoutList size={16} />,
    action: "run",
    label: asList ? "Show pages as tabs" : "Show pages as list",
    searchAgainst: "pages tabs list display show titlebar navigation toggle setting",
    onSelect: async () => {
      await invoke("set_ui_pages_show_as", { showAs: next });
      setConfig(prev => (prev ? { ...prev, ui: { ...prev.ui, pages: { show_as: next } } } : prev));
    },
  };
};
