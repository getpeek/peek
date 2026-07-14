import { Beacon } from "./Beacon";
import type { DerivedRegion } from "./regionGeometry";
import { useCanvasWheelForward } from "./useCanvasWheelForward";

const INTERACTIVE_THRESHOLD_T = 0.35;

interface BeaconsProps {
  derived: DerivedRegion[];
  t: number;
  transform: [number, number, number];
}

/**
 * Zoomed-out region labels, rendered screen-space and centered on each
 * region's bounding box. Off-screen members are fine — everything derives
 * from state, never the DOM (nodes may be culled by onlyRenderVisibleElements).
 */
export function Beacons({ derived, t, transform }: BeaconsProps) {
  const wheelForwardRef = useCanvasWheelForward();

  return (
    <div
      ref={wheelForwardRef}
      className={`wf-beacons ${t > INTERACTIVE_THRESHOLD_T ? "interactive" : ""}`}
      style={{ opacity: t }}
    >
      {derived.map(d => (
        <Beacon key={d.region.id} derived={d} transform={transform} />
      ))}
    </div>
  );
}
