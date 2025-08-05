import { useEditor, useValue } from "tldraw";
import "./ZoomIndicator.css";
import { Group, Text } from "@mantine/core";
import { IconRefresh } from "@tabler/icons-react";

export const ZoomIndicator = () => {
  const editor = useEditor();
  const zoom = useValue("zoom-level", () => editor.getZoomLevel(), [
    editor.getZoomLevel(),
  ]);

  return (
    <div className="zoom-indicator">
      <Group align="center" justify="center" gap="sm">
        <Text size="xs" c="var(--text-color)">
          {Math.round(zoom * 100)}%
        </Text>
        <IconRefresh size={20} color="var(--text-color)" />
      </Group>
    </div>
  );
};
