import { IconMap } from "@tabler/icons-react";
import { invoke } from "@tauri-apps/api/core";
import { useAtom } from "jotai";
import { configAtom } from "../../state";
import type { CommandPaletteResult } from ".";

export const useToggleMinimapCommand = (): CommandPaletteResult => {
  const [config, setConfig] = useAtom(configAtom);
  const shown = config?.canvas.minimap === "show";
  const next = shown ? "hide" : "show";

  return {
    icon: <IconMap size={16} />,
    action: "run",
    label: shown ? "Hide minimap" : "Show minimap",
    searchAgainst: "minimap overview canvas navigate viewport show hide toggle setting",
    onSelect: async () => {
      await invoke("set_canvas_minimap", { visibility: next });
      setConfig(prev => (prev ? { ...prev, canvas: { ...prev.canvas, minimap: next } } : prev));
    },
  };
};
