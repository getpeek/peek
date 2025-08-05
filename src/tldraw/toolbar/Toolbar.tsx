import { useEditor, useValue } from "tldraw";
import "./Toolbar.css";
import { Button, Group } from "@mantine/core";
import {
  IconAi,
  IconMouse,
  IconPencil,
  IconSql,
  IconTypography,
} from "@tabler/icons-react";

export const TlDrawToolbar = () => {
  const editor = useEditor();
  const selectedTool = useValue(
    "current tool",
    () => editor.getCurrentToolId(),
    [editor],
  );

  const selectTool = (tool: string) => {
    editor.setCurrentTool(tool);
  };

  const tools = [
    {
      label: "Select",
      hotkey: "ESC",
      icon: (
        <IconMouse
          color={
            selectedTool === "select"
              ? "hsl(242deg, 45%, 90%)"
              : "hsl(242deg, 15%, 40%)"
          }
        />
      ),
      tool: "select",
    },
    {
      label: "Query node",
      hotkey: "(q)",
      icon: (
        <IconSql
          color={
            selectedTool === "query"
              ? "hsl(242deg, 45%, 90%)"
              : "hsl(242deg, 15%, 40%)"
          }
        />
      ),
      tool: "query",
    },
    {
      label: "AI",
      hotkey: "(a)",
      icon: (
        <IconAi
          color={
            selectedTool === "ai-prompt"
              ? "hsl(242deg, 45%, 90%)"
              : "hsl(242deg, 15%, 40%)"
          }
        />
      ),
      tool: "ai-prompt",
    },
    {
      label: "Draw",
      hotkey: "(d)",
      icon: (
        <IconPencil
          color={
            selectedTool === "draw"
              ? "hsl(242deg, 45%, 90%)"
              : "hsl(242deg, 15%, 40%)"
          }
        />
      ),
      tool: "draw",
    },
    {
      label: "Text",
      hotkey: "(t)",
      icon: (
        <IconTypography
          color={
            selectedTool === "text"
              ? "hsl(242deg, 45%, 90%)"
              : "hsl(242deg, 15%, 40%)"
          }
        />
      ),
      tool: "text",
    },
  ];

  return (
    <div className="toolbar">
      <Group gap={0} py={4}>
        {tools.map((tool) => (
          <Button
            key={tool.label}
            title={tool.label + " " + tool.hotkey}
            variant="transparent"
            onClick={() => selectTool(tool.tool)}
            size="md"
          >
            {tool.icon}
          </Button>
        ))}
      </Group>
    </div>
  );
};
