import { AIPromptShape } from "./AiShape";
import "./Ai.css";
import { useEditor } from "tldraw";
import { Stack, Text } from "@mantine/core";

export const AIPrompt = ({ shape }: { shape: AIPromptShape }) => {
  const editor = useEditor();

  return (
    <Stack gap="4">
      <textarea
        value={shape.props.prompt}
        placeholder="All users that haven't logged in in the last 3 months"
        className="prompt-input"
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
      <Text>{shape.props.reason}</Text>
    </Stack>
  );
};
