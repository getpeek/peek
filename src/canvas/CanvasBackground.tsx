import { Background, BackgroundVariant } from "@xyflow/react";
import { useAtomValue } from "jotai";
import { effectiveThemeAtom } from "../state";

/* The reference grid must live inside React Flow's transformed pane so it pans and
   zooms with the canvas — grid lines painted into the static --pk-canvas-bg layer stay
   pinned to the viewport and read as broken while navigating. Most themes share one
   faint white dot grid; Blueprint and Paper get their own moving grid matching their
   design (a cyan engineering line grid, a warm dot grid). */
export const CanvasBackground = () => {
  const theme = useAtomValue(effectiveThemeAtom);

  if (theme === "blueprint") {
    return (
      <>
        <Background
          id='blueprint-minor'
          variant={BackgroundVariant.Lines}
          bgColor='transparent'
          color='rgba(224, 222, 244, 0.05)'
          gap={26}
        />
        <Background
          id='blueprint-major'
          variant={BackgroundVariant.Lines}
          bgColor='transparent'
          color='rgba(156, 207, 216, 0.12)'
          gap={130}
        />
      </>
    );
  }

  if (theme === "paper") {
    return (
      <Background
        variant={BackgroundVariant.Dots}
        bgColor='transparent'
        color='rgba(87, 82, 121, 0.16)'
        gap={28}
        size={1.4}
      />
    );
  }

  return (
    <Background
      variant={BackgroundVariant.Dots}
      bgColor='transparent'
      color='rgba(255, 255, 255, 0.18)'
      gap={28}
      size={1}
    />
  );
};
