import { useLayoutEffect, useRef } from "react";
import { useEditor, useIsDarkMode, useValue } from "tldraw";

const EDITOR_BACKGROUND = "#0E101A";
const GRID_COLOR = "#1a1825"; // More subtle grid color
const MAJOR_GRID_COLOR = "#26233a"; // Slightly brighter for major lines
const BASE_GRID_SIZE = 100; // Base grid spacing in world units
const MAJOR_GRID_INTERVAL = 4; // Every 4th line is a major line

export function CustomGrid({
  size,
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
  const isDarkMode = useIsDarkMode();

  const canvas = useRef<HTMLCanvasElement>(null);

  useLayoutEffect(() => {
    if (!canvas.current) return;

    const canvasW = screenBounds.w * devicePixelRatio;
    const canvasH = screenBounds.h * devicePixelRatio;
    canvas.current.width = canvasW;
    canvas.current.height = canvasH;

    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;

    // Clear canvas and set background color
    ctx.fillStyle = EDITOR_BACKGROUND;
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Calculate the page viewport bounds
    const pageViewportBounds = editor.getViewportPageBounds();

    // Use fixed world-space grid size for smooth zooming
    const worldGridSize = BASE_GRID_SIZE;

    // Calculate grid bounds with margin
    const margin = worldGridSize * 2;
    const startX = pageViewportBounds.minX - margin;
    const endX = pageViewportBounds.maxX + margin;
    const startY = pageViewportBounds.minY - margin;
    const endY = pageViewportBounds.maxY + margin;

    // Calculate grid line positions in world space
    const firstGridX = Math.floor(startX / worldGridSize) * worldGridSize;
    const firstGridY = Math.floor(startY / worldGridSize) * worldGridSize;

    // Set line properties
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Calculate screen spacing and fade opacity based on zoom
    const screenGridSize = worldGridSize * camera.z * devicePixelRatio;
    const fadeOpacity = Math.min(1, Math.max(0, (screenGridSize - 10) / 30));

    // Only draw grid if it's not too dense on screen
    if (screenGridSize > 5) {
      // Draw vertical lines
      for (let x = firstGridX; x <= endX; x += worldGridSize) {
        // Determine line index for major/minor distinction
        const lineIndex = Math.round(x / worldGridSize);
        const isMajorLine = lineIndex % MAJOR_GRID_INTERVAL === 0;

        // Convert to screen coordinates
        const screenX = (x + camera.x) * camera.z * devicePixelRatio;

        // Skip lines outside the canvas
        if (screenX < -10 || screenX > canvasW + 10) continue;

        // Set line style with fade
        ctx.strokeStyle = isMajorLine ? MAJOR_GRID_COLOR : GRID_COLOR;
        ctx.lineWidth = isMajorLine
          ? 1 * devicePixelRatio
          : 0.5 * devicePixelRatio;
        ctx.globalAlpha = fadeOpacity * (isMajorLine ? 0.4 : 0.2);

        // Draw vertical line
        ctx.beginPath();
        ctx.moveTo(screenX, 0);
        ctx.lineTo(screenX, canvasH);
        ctx.stroke();
      }

      // Draw horizontal lines
      for (let y = firstGridY; y <= endY; y += worldGridSize) {
        // Determine line index for major/minor distinction
        const lineIndex = Math.round(y / worldGridSize);
        const isMajorLine = lineIndex % MAJOR_GRID_INTERVAL === 0;

        // Convert to screen coordinates
        const screenY = (y + camera.y) * camera.z * devicePixelRatio;

        // Skip lines outside the canvas
        if (screenY < -10 || screenY > canvasH + 10) continue;

        // Set line style with fade
        ctx.strokeStyle = isMajorLine ? MAJOR_GRID_COLOR : GRID_COLOR;
        ctx.lineWidth = isMajorLine
          ? 1 * devicePixelRatio
          : 0.5 * devicePixelRatio;
        ctx.globalAlpha = fadeOpacity * (isMajorLine ? 0.4 : 0.2);

        // Draw horizontal line
        ctx.beginPath();
        ctx.moveTo(0, screenY);
        ctx.lineTo(canvasW, screenY);
        ctx.stroke();
      }
    }
  }, [screenBounds, camera, size, devicePixelRatio, editor, isDarkMode]);

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
        backgroundColor: EDITOR_BACKGROUND,
        zIndex: -2,
      }}
    />
  );
}
