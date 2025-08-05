import { track, useEditor, useValue } from "tldraw";
import { useRef } from "react";
import { AiPromptContextualToolbarComponent } from "../../shapes/Ai/AiPromptToolbar";
import { QueryContextualToolbarComponent } from "../../shapes/Query/QueryToolbar";
import { ResultContextualToolbarComponent } from "../../shapes/Result/ResultToolbar";
import "./ContextToolbar.css";

export const ContextToolbar = track(() => {
  const editor = useEditor();
  const shapeType = editor.getOnlySelectedShape()?.type;
  const showContextualToolbar = editor.isIn("select.idle");
  const containerRef = useRef<HTMLDivElement>(null);
  const { x, y } = useValue(
    "position",
    () => {
      const bounds = editor.getSelectionScreenBounds();
      if (!bounds) {
        return { x: null, y: null };
      }

      return { x: bounds.center.x, y: bounds.top - 10 };
    },
    [editor.getSelectionScreenBounds()],
  );

  if (!showContextualToolbar) {
    return null;
  }

  let child = null;
  if (shapeType === "query") {
    child = <QueryContextualToolbarComponent />;
  }

  if (shapeType === "ai-prompt") {
    child = <AiPromptContextualToolbarComponent />;
  }

  if (shapeType === "result") {
    child = <ResultContextualToolbarComponent />;
  }

  if (!child || x === null || y === null) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="context-toolbar"
      style={{
        top: y - 40,
        left: x,
        transform: "translateX(-50%)",
      }}
    >
      {child}
    </div>
  );
});
