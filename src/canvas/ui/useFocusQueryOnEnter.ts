import { useAtomValue } from "jotai";
import { useEffect } from "react";
import { useCanvas } from "../hooks/useCanvas";
import { historyPreviewAtom } from "../history/state";
import { focusEditor } from "../nodes/editorFocusRegistry";
import { isTextInputFocused } from "./KeyboardShortcuts";

/**
 * Non-configurable: with a single query node selected (and no editor already
 * focused), Enter drops the cursor straight into its SQL editor. Kept out of
 * the keymap like the other context-local Enter/Escape handlers.
 */
export function useFocusQueryOnEnter() {
  const canvas = useCanvas();
  const historyPreview = useAtomValue(historyPreviewAtom);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter" || isTextInputFocused() || historyPreview !== null) {
        return;
      }
      const selected = canvas.getSelectedNodes();
      if (selected.length !== 1 || selected[0].type !== "query") {
        return;
      }
      event.preventDefault();
      focusEditor(selected[0].id);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canvas, historyPreview]);
}
