import { AIPromptShape } from "./AiShape";
import "./Ai.css";
import { useEditor } from "tldraw";

export const AIPrompt = ({ shape }: { shape: AIPromptShape }) => {
  const editor = useEditor();

  return (
    <textarea
      value={shape.props.prompt}
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
