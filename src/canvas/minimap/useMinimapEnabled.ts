import { useAtomValue } from "jotai";
import { configAtom } from "../../state";

// Opt-in, so it stays off while the config is still loading rather than
// flashing in and out on launch.
export function useMinimapEnabled(): boolean {
  const config = useAtomValue(configAtom);
  return config?.canvas.minimap === "show";
}
