import { forwardRef } from "react";
import { createPortal } from "react-dom";

export const PortalAnchor = forwardRef<HTMLDivElement, { x: number; y: number }>(
  function PortalAnchor({ x, y }, ref) {
    return createPortal(
      <div
        ref={ref}
        style={{
          position: "fixed",
          left: x,
          top: y,
          width: 1,
          height: 1,
          pointerEvents: "none",
        }}
      />,
      document.body,
    );
  },
);
