import { useAtomValue } from "jotai";
import { configAtom } from "../../state";

// Defaults on while the config is still loading so the UI doesn't pop in late.
export function useRegionsEnabled(): boolean {
  const config = useAtomValue(configAtom);
  return config?.canvas.enable_regions ?? true;
}
