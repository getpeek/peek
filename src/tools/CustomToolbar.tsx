import { track, useEditor } from "tldraw";
import { QueryContextualToolbarComponent } from "./QueryToolbar";
import { ResultContextualToolbarComponent } from "./ResultToolbar";
import { AiPromptContextualToolbarComponent } from "./AiPromptToolbar";

export const CustomContextualToolbarComponent = track(() => {
  const editor = useEditor();
  const shapeType = editor.getOnlySelectedShape()?.type;
  const showContextualToolbar = editor.isIn("select.idle");

  if (!showContextualToolbar) {
    return null;
  }

  if (shapeType === "query") {
    return <QueryContextualToolbarComponent />;
  }

  if (shapeType === "ai-prompt") {
    return <AiPromptContextualToolbarComponent />;
  }

  if (shapeType === "result") {
    return <ResultContextualToolbarComponent />;
  }

  return null;
});
