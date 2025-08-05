import { useEditor, useValue } from "tldraw";
import "./ZoomIndicator.css";
import { Group, Text } from "@mantine/core";

export const ZoomIndicator = () => {
  const editor = useEditor();
  const zoom = useValue("zoom-level", () => editor.getZoomLevel(), [
    editor.getZoomLevel(),
  ]);

  const resetZoom = () => {
    editor.resetZoom();
  };

  return (
    <div className="zoom-indicator" onClick={resetZoom}>
      <Group align="center" justify="center" gap="sm">
        <Text size="xs" c="var(--text-color)">
          {Math.round(zoom * 100)}%
        </Text>
      </Group>
    </div>
  );
};
