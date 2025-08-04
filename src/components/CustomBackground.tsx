import { useLayoutEffect, useRef } from "react";
import { useEditor, useIsDarkMode, useValue } from "tldraw";

const EDITOR_BACKGROUND = "#0E101A";
const DOT_COLOR = "#26233a"; // Rose Pine overlay color for subtle dots
const BASE_DOT_SIZE = 1; // Base dot radius in pixels
const MAJOR_DOT_SIZE = 2; // Major dot radius in pixels
const MAJOR_DOT_INTERVAL = 5; // Every 5th dot is larger

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

    // Calculate zoom-responsive spacing - closer dots when zoomed in
    const zoomFactor = Math.max(0.5, Math.min(2, camera.z));
    const adjustedSize = size / zoomFactor;

    const startPageX =
      Math.ceil(pageViewportBounds.minX / adjustedSize) * adjustedSize;
    const startPageY =
      Math.ceil(pageViewportBounds.minY / adjustedSize) * adjustedSize;
    const endPageX =
      Math.floor(pageViewportBounds.maxX / adjustedSize) * adjustedSize;
    const endPageY =
      Math.floor(pageViewportBounds.maxY / adjustedSize) * adjustedSize;
    const numRows = Math.round((endPageY - startPageY) / adjustedSize);
    const numCols = Math.round((endPageX - startPageX) / adjustedSize);

    // Set dot properties
    ctx.fillStyle = DOT_COLOR;
    ctx.globalAlpha = 0.6;

    // Draw dots at grid intersections
    for (let row = 0; row <= numRows; row++) {
      for (let col = 0; col <= numCols; col++) {
        const pageX = startPageX + col * adjustedSize;
        const pageY = startPageY + row * adjustedSize;

        // Convert page-space coordinates to canvas coordinates
        const canvasX = (pageX + camera.x) * camera.z * devicePixelRatio;
        const canvasY = (pageY + camera.y) * camera.z * devicePixelRatio;

        // Determine if this is a major dot (every 5th in both x and y)
        const isMajorDot =
          col % MAJOR_DOT_INTERVAL === 0 && row % MAJOR_DOT_INTERVAL === 0;
        const dotSize =
          (isMajorDot ? MAJOR_DOT_SIZE : BASE_DOT_SIZE) *
          devicePixelRatio *
          Math.max(0.5, camera.z);

        // Only draw dots that are within the canvas bounds
        if (
          canvasX >= -dotSize &&
          canvasX <= canvasW + dotSize &&
          canvasY >= -dotSize &&
          canvasY <= canvasH + dotSize
        ) {
          ctx.beginPath();
          ctx.arc(canvasX, canvasY, dotSize, 0, 2 * Math.PI);
          ctx.fill();
        }
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
