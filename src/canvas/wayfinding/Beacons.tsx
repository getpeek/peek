import type { CSSProperties } from "react";
import { regionColorVar, type DerivedRegion } from "./regionGeometry";
import { useRegionActions } from "./useRegionActions";

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
  const [tx, ty, tz] = transform;
  const { flyToRegion } = useRegionActions();

  return (
    <div
      className={`wf-beacons ${t > INTERACTIVE_THRESHOLD_T ? "interactive" : ""}`}
      style={{ opacity: t }}
    >
      {derived.map(({ region, bbox, memberIds }) => (
        <button
          key={region.id}
          className='wf-beacon'
          style={
            {
              left: (bbox.x + bbox.w / 2) * tz + tx,
              top: (bbox.y + bbox.h / 2) * tz + ty,
              "--rc": regionColorVar(region.colorIndex),
            } as CSSProperties
          }
          onClick={() => flyToRegion(region.id)}
        >
          <span className='bc-name'>{region.name}</span>
          {region.desc.length > 0 && <span className='bc-desc'>{region.desc}</span>}
          <span className='bc-meta'>
            <span className='dot' />
            {memberIds.length} nodes · click to enter
          </span>
        </button>
      ))}
    </div>
  );
}
