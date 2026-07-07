import { IconMap2 } from "@tabler/icons-react";
import { invoke } from "@tauri-apps/api/core";
import { useAtom } from "jotai";
import { configAtom } from "../../state";
import type { CommandPaletteResult } from ".";

export const useToggleRegionsCommand = (): CommandPaletteResult => {
  const [config, setConfig] = useAtom(configAtom);
  const enabled = config?.canvas.enable_regions ?? true;

  return {
    icon: <IconMap2 size={16} />,
    action: "run",
    label: enabled ? "Disable regions" : "Enable regions",
    searchAgainst: "regions waypoints wayfinding beacons canvas toggle setting enable disable",
    onSelect: async () => {
      await invoke("set_canvas_enable_regions", { enable: !enabled });
      setConfig(prev =>
        prev ? { ...prev, canvas: { ...prev.canvas, enable_regions: !enabled } } : prev,
      );
    },
  };
};
