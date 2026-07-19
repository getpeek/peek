import { useAtomValue } from "jotai";
import { configAtom } from "../../../state";

// Defaults to tabs while the config is still loading so the titlebar doesn't
// flash the list pill before settling.
export function usePageDisplayMode(): "tabs" | "list" {
  const config = useAtomValue(configAtom);
  return config?.ui.pages.show_as ?? "tabs";
}
