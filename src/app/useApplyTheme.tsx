import { useAtomValue } from "jotai";
import { useEffect } from "react";
import { configAtom } from "../state";

const THEME_CLASSES = ["theme-pine", "theme-midnight", "theme-midday"];

export const useApplyTheme = () => {
  const config = useAtomValue(configAtom);

  useEffect(() => {
    const theme = config?.theme ?? "pine";
    document.body.classList.remove(...THEME_CLASSES);
    document.body.classList.add(`theme-${theme}`);
  }, [config?.theme]);
};
