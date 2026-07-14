import type { CSSProperties } from "react";
import type { DerivedRegion } from "./regionGeometry";
import { regionColorVar } from "./regionGeometry";
import { useBeaconDrag } from "./useBeaconDrag";
import { useRegionActions } from "./useRegionActions";

interface BeaconProps {
  derived: DerivedRegion;
  transform: [number, number, number];
}

export function Beacon({ derived, transform }: BeaconProps) {
  const { region, bbox, memberIds } = derived;
  const [tx, ty, tz] = transform;
  const { flyToRegion } = useRegionActions();
  const { onPointerDown, onPointerMove, onPointerUp, draggedRef } = useBeaconDrag(memberIds, tz);

  return (
    <button
      className='wf-beacon'
      style={
        {
          left: (bbox.x + bbox.w / 2) * tz + tx,
          top: (bbox.y + bbox.h / 2) * tz + ty,
          "--rc": regionColorVar(region.colorIndex),
        } as CSSProperties
      }
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onClick={() => {
        if (draggedRef.current) {
          return;
        }
        flyToRegion(region.id);
      }}
    >
      <span className='bc-name'>{region.name}</span>
      {region.desc.length > 0 && <span className='bc-desc'>{region.desc}</span>}
      <span className='bc-meta'>
        <span className='dot' />
        {memberIds.length} nodes · drag to move · click to enter
      </span>
    </button>
  );
}
