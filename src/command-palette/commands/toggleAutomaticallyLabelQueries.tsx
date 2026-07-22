import { IconTag } from "@tabler/icons-react";
import { invoke } from "@tauri-apps/api/core";
import { useAtom } from "jotai";
import { configAtom } from "../../state";
import type { CommandPaletteResult } from ".";

export const useToggleAutomaticallyLabelQueriesCommand = (): CommandPaletteResult | null => {
  const [config, setConfig] = useAtom(configAtom);
  const enabled = config?.ai.automatically_label_queries ?? false;

  // Labeling needs the ollama endpoint; no point offering the toggle without it.
  if (!config?.ai.ollama) {
    return null;
  }

  return {
    icon: <IconTag size={16} />,
    action: "run",
    label: enabled ? "Disable automatic query labels" : "Enable automatic query labels",
    searchAgainst:
      "ai automatically label queries description title name toggle setting enable disable",
    onSelect: async () => {
      await invoke("set_ai_automatically_label_queries", { enable: !enabled });
      setConfig(prev =>
        prev ? { ...prev, ai: { ...prev.ai, automatically_label_queries: !enabled } } : prev,
      );
    },
  };
};
