import { useAtomValue } from "jotai";
import { configAtom } from "../../state";

// Everything defaults to visible while the config is still loading so titlebar
// items don't flash hidden before the saved config settles.
export function useTitlebarVisibility() {
  const titlebar = useAtomValue(configAtom)?.ui.titlebar;
  return {
    commandPalette: titlebar?.command_palette_button !== "hide",
    collaboration: titlebar?.collaboration_button !== "hide",
    liveQueryCount: titlebar?.live_query_count !== "hide",
  };
}
