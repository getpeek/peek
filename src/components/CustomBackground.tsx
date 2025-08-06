import { useLayoutEffect, useRef } from "react";
import { useEditor, useIsDarkMode, useValue } from "tldraw";

const EDITOR_BACKGROUND = "#0E101A";
const GRAIN_TEXTURE_SIZE = 512;

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
  const isDarkMode = useIsDarkMode();

  const canvas = useRef<HTMLCanvasElement>(null);
  const grainTexture = useRef<HTMLCanvasElement | null>(null);
  const grainPattern = useRef<CanvasPattern | null>(null);

  useLayoutEffect(() => {
    if (!grainTexture.current) {
      const offscreenCanvas = document.createElement("canvas");
      offscreenCanvas.width = GRAIN_TEXTURE_SIZE;
      offscreenCanvas.height = GRAIN_TEXTURE_SIZE;

      const offscreenCtx = offscreenCanvas.getContext("2d");
      if (!offscreenCtx) return;

      offscreenCtx.clearRect(0, 0, GRAIN_TEXTURE_SIZE, GRAIN_TEXTURE_SIZE);

      for (let i = 0; i < GRAIN_TEXTURE_SIZE * GRAIN_TEXTURE_SIZE * 0.5; i++) {
        const x = Math.random() * GRAIN_TEXTURE_SIZE;
        const y = Math.random() * GRAIN_TEXTURE_SIZE;

        const opacity = Math.random() * 0.02;
        offscreenCtx.fillStyle = `hsla(0, 0%, 100%, ${opacity})`;

        offscreenCtx.fillRect(x, y, 1, 1);
      }

      grainTexture.current = offscreenCanvas;
    }
  }, []);

  useLayoutEffect(() => {
    if (!canvas.current || !grainTexture.current) {
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

    ctx.fillStyle = EDITOR_BACKGROUND;
    ctx.fillRect(0, 0, canvasW, canvasH);

    if (!grainPattern.current && grainTexture.current) {
      grainPattern.current = ctx.createPattern(grainTexture.current, "repeat");
    }

    if (!grainPattern.current) {
      return;
    }

    ctx.save();

    const offsetX =
      (camera.x * camera.z * devicePixelRatio) % GRAIN_TEXTURE_SIZE;
    const offsetY =
      (camera.y * camera.z * devicePixelRatio) % GRAIN_TEXTURE_SIZE;

    ctx.translate(offsetX, offsetY);

    ctx.fillStyle = grainPattern.current;
    ctx.fillRect(
      -offsetX,
      -offsetY,
      canvasW + GRAIN_TEXTURE_SIZE,
      canvasH + GRAIN_TEXTURE_SIZE,
    );

    ctx.restore();

    const time = Date.now();
    if (time % 120 === 0) {
      ctx.globalAlpha = 0.005;
      ctx.fillStyle = `hsla(0, 0%, 100%, ${Math.random() * 0.01})`;
      ctx.fillRect(0, 0, canvasW, canvasH);
      ctx.globalAlpha = 1;
    }
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
        backgroundColor: EDITOR_BACKGROUND,
        zIndex: -2,
      }}
    />
  );
}
