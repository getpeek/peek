import { useStore } from "@xyflow/react";
import { useState, type CSSProperties } from "react";
import { useCanvasWheelForward } from "./useCanvasWheelForward";
import { placePeeker, regionColorVar, type DerivedRegion } from "./regionGeometry";
import { useRegionActions } from "./useRegionActions";
import { useViewportMotion } from "./useViewportMotion";

// Peekers fade out a touch faster than beacons fade in, so the two layers
// never fight mid cross-fade.
const PEEK_FADE_FACTOR = 1.4;
const INTERACTIVE_OPACITY = 0.2;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

interface EdgePeekersProps {
  derived: DerivedRegion[];
  t: number;
  transform: [number, number, number];
}

/**
 * Off-screen regions peek from the viewport edges while the user moves the
 * canvas, then quietly fade once things settle. Hovering a label holds the
 * layer so it stays clickable.
 */
export function EdgePeekers({ derived, t, transform }: EdgePeekersProps) {
  const [tx, ty, tz] = transform;
  const width = useStore(s => s.width);
  const height = useStore(s => s.height);
  const moving = useViewportMotion(tx, ty, tz);
  const [hovered, setHovered] = useState(false);
  const { flyToRegion } = useRegionActions();
  const wheelForwardRef = useCanvasWheelForward();

  const peekBase = clamp01(1 - t * PEEK_FADE_FACTOR);
  const opacity = moving || hovered ? peekBase : 0;

  if (width === 0 || peekBase === 0) {
    return null;
  }

  const placed = derived.flatMap(d => {
    const placement = placePeeker(d.bbox, transform, { width, height });
    return placement ? [{ ...d, placement }] : [];
  });

  return (
    <div
      ref={wheelForwardRef}
      className={`wf-peekers ${opacity > INTERACTIVE_OPACITY ? "interactive" : ""}`}
      style={{ opacity }}
    >
      {placed.map(({ region, memberIds, placement }) => (
        <button
          key={region.id}
          className={`wf-peeker align-${placement.align}`}
          style={
            {
              left: placement.x,
              top: placement.y,
              "--rc": regionColorVar(region.colorIndex),
            } as CSSProperties
          }
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onClick={() => flyToRegion(region.id)}
          title={region.desc.length > 0 ? `${region.name} — ${region.desc}` : region.name}
        >
          <span className='pk-row'>
            <span className='pk-arrow' style={{ transform: `rotate(${placement.angle}deg)` }}>
              <svg width='11' height='11' viewBox='0 0 10 10'>
                <path d='M2 1 L9 5 L2 9 Z' fill='currentColor' />
              </svg>
            </span>
            <span className='pk-name'>{region.name}</span>
            <span className='pk-ct'>{memberIds.length}</span>
          </span>
          {region.desc.length > 0 && <span className='pk-desc'>{region.desc}</span>}
        </button>
      ))}
    </div>
  );
}
