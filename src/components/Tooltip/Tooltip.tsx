import { Tooltip as MantineTooltip } from "@mantine/core";
import type { FloatingPosition } from "@mantine/core";
import type { ReactElement, ReactNode } from "react";
import "./Tooltip.css";

interface TooltipProps {
  label: ReactNode;
  children: ReactElement;
  position?: FloatingPosition;
}

export function Tooltip({ label, children, position = "top" }: TooltipProps) {
  return (
    <MantineTooltip
      label={label}
      position={position}
      offset={6}
      openDelay={400}
      transitionProps={{ transition: "fade", duration: 120 }}
      classNames={{ tooltip: "pk-tooltip" }}
    >
      {children}
    </MantineTooltip>
  );
}
