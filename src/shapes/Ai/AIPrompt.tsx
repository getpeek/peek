import { AIPromptShape } from "./AiShape";
import "./Ai.css";
import { useEditor } from "tldraw";
import { useEffect, useRef } from "react";

export const AIPrompt = ({
  shape,
  isEditing,
}: {
  shape: AIPromptShape;
  isEditing: boolean;
}) => {
  const editor = useEditor();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  return (
    <textarea
      value={shape.props.prompt}
      ref={inputRef}
      placeholder="All users that haven't logged in in the last 3 months"
      className={`prompt-input ${shape.props.isLoading ? "loading" : ""}`}
      onChange={(e) =>
        editor.updateShape({
          id: shape.id,
          type: "ai-prompt",
          props: {
            prompt: e.currentTarget.value,
          },
        })
      }
    />
  );
};
