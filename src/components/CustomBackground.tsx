import { useLayoutEffect, useRef } from "react";
import { useEditor, useValue } from "tldraw";
import { useAtomValue } from "jotai";
import { darkModeAtom } from "../state";

export function CustomGrid({
  ...camera
}: {
  size: number;
  x: number;
  y: number;
  z: number;
}) {
  const editor = useEditor();

  const screenBounds = useValue(
    "screenBounds",
    () => editor.getViewportScreenBounds(),
    [],
  );
  const devicePixelRatio = useValue(
    "dpr",
    () => editor.getInstanceState().devicePixelRatio,
    [],
  );
  const isDarkMode = useAtomValue(darkModeAtom);

  const canvas = useRef<HTMLCanvasElement>(null);

  useLayoutEffect(() => {
    const EDITOR_BACKGROUND = isDarkMode
      ? "hsl(220deg, 50%, 10%)"
      : "hsl(30deg, 20%, 90%)";
    const GRID_COLOR = isDarkMode
      ? "hsla(220deg, 40%, 80%, 0.03)"
      : "hsla(220deg, 40%, 10%, 0.03)";
    const GRID_COLOR_BOLD = isDarkMode
      ? "hsla(220deg, 40%, 80%, 0.05)"
      : "hsla(220deg, 40%, 10%, 0.05)";

    if (!canvas.current) {
      return;
    }

    const canvasW = screenBounds.w * devicePixelRatio;
    const canvasH = screenBounds.h * devicePixelRatio;
    canvas.current.width = canvasW;
    canvas.current.height = canvasH;

    const ctx = canvas.current?.getContext("2d");
    if (!ctx) {
      return;
    }

    // Clear canvas with background color
    ctx.fillStyle = EDITOR_BACKGROUND;
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Determine grid spacing based on zoom level
    let baseGridSize: number;
    if (camera.z < 0.25) {
      baseGridSize = 100;
    } else if (camera.z < 0.5) {
      baseGridSize = 50;
    } else if (camera.z < 1) {
      baseGridSize = 25;
    } else if (camera.z < 2) {
      baseGridSize = 10;
    } else {
      baseGridSize = 5;
    }

    const gridSize = baseGridSize * camera.z * devicePixelRatio;

    // Calculate the offset for the grid based on camera position (negate to move with camera)
    const offsetX = (-camera.x * camera.z * devicePixelRatio) % (gridSize * 5);
    const offsetY = (-camera.y * camera.z * devicePixelRatio) % (gridSize * 5);

    // Calculate how many grid lines we need to draw
    const startX = -offsetX - gridSize * 5;
    const startY = -offsetY - gridSize * 5;
    const endX = canvasW + gridSize * 5;
    const endY = canvasH + gridSize * 5;

    ctx.save();

    // Draw vertical lines
    for (let x = startX; x <= endX; x += gridSize) {
      const gridIndex = Math.round((x + offsetX) / gridSize);
      const isBold = gridIndex % 5 === 0;

      ctx.strokeStyle = isBold ? GRID_COLOR_BOLD : GRID_COLOR;
      ctx.lineWidth = isBold ? 1.5 : 1;

      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvasH);
      ctx.stroke();
    }

    // Draw horizontal lines
    for (let y = startY; y <= endY; y += gridSize) {
      const gridIndex = Math.round((y + offsetY) / gridSize);
      const isBold = gridIndex % 5 === 0;

      ctx.strokeStyle = isBold ? GRID_COLOR_BOLD : GRID_COLOR;
      ctx.lineWidth = isBold ? 1.5 : 1;

      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvasW, y);
      ctx.stroke();
    }

    ctx.restore();
  }, [screenBounds, camera, devicePixelRatio, editor, isDarkMode]);

  return <canvas className="tl-grid" ref={canvas} />;
}

export function CustomBackground() {
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: -2,
      }}
    />
  );
}
