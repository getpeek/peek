import { useAtomValue } from "jotai";
import { useEffect } from "react";
import { useEditor } from "tldraw";
import { darkModeAtom } from "../state";

export function DarkModeSync() {
  const editor = useEditor();
  const isDarkMode = useAtomValue(darkModeAtom);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  useEffect(() => {
    if (editor) {
      editor.user.updateUserPreferences({
        colorScheme: isDarkMode ? "dark" : "light",
      });
    }
  }, [isDarkMode, editor]);

  return null;
}
