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
        <IconMouse color={selectedTool === "select" ? "#B7B5E3" : "#212232"} />
      ),
      tool: "select",
    },
    {
      label: "Query node",
      hotkey: "(q)",
      icon: (
        <IconSql color={selectedTool === "query" ? "#B7B5E3" : "#212232"} />
      ),
      tool: "query",
    },
    {
      label: "AI",
      hotkey: "(a)",
      icon: (
        <IconAi color={selectedTool === "ai-prompt" ? "#B7B5E3" : "#212232"} />
      ),
      tool: "ai-prompt",
    },
    {
      label: "Draw",
      hotkey: "(d)",
      icon: (
        <IconPencil color={selectedTool === "draw" ? "#B7B5E3" : "#212232"} />
      ),
      tool: "draw",
    },
    {
      label: "Text",
      hotkey: "(t)",
      icon: (
        <IconTypography
          color={selectedTool === "text" ? "#B7B5E3" : "#212232"}
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
