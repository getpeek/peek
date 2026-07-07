import { ViewportPortal } from "@xyflow/react";
import { IconSparkles } from "@tabler/icons-react";
import { useAtomValue } from "jotai";
import { useState, type CSSProperties } from "react";
import { nodesAtom, regionsAtom } from "../state";
import { useCrossFade } from "./crossFade";
import { deriveRegions, regionColorVar, type DerivedRegion } from "./regionGeometry";
import { useRegionActions } from "./useRegionActions";
import { useRegionsEnabled } from "./useRegionsEnabled";
import "./wayfinding.css";

/**
 * Canvas-space bounding box drawn around every region. Confirmed regions get a
 * quiet solid halo that fades in with the beacons as the user zooms out (so it
 * never clutters working zoom); suggested ones get an always-on dashed halo
 * plus the Keep / Rename / Dismiss review card. Rendered through ViewportPortal
 * so the boxes track world coordinates without manual transform math.
 */
export function RegionHalos() {
  const regionsEnabled = useRegionsEnabled();
  const nodes = useAtomValue(nodesAtom);
  const regions = useAtomValue(regionsAtom);
  const t = useCrossFade();

  const derived = deriveRegions(nodes, regions);
  if (!regionsEnabled || derived.length === 0) {
    return null;
  }

  return (
    <ViewportPortal>
      {derived.map(d => (
        <RegionHalo key={d.region.id} derived={d} t={t} />
      ))}
    </ViewportPortal>
  );
}

function RegionHalo({ derived, t }: { derived: DerivedRegion; t: number }) {
  const { region, bbox, memberIds } = derived;
  const { confirmRegion, renameRegion, removeRegion } = useRegionActions();
  const [renaming, setRenaming] = useState(false);
  const suggested = region.status === "suggested";

  const commitRename = (value: string) => {
    const name = value.trim();
    if (name.length > 0) {
      renameRegion(region.id, name);
    }
    setRenaming(false);
  };

  return (
    <div
      className={`wf-region-halo ${suggested ? "suggested" : "confirmed"}`}
      style={
        {
          left: bbox.x,
          top: bbox.y,
          width: bbox.w,
          height: bbox.h,
          // Confirmed halos track the beacon cross-fade; suggested ones stay
          // put so the review card is reachable at working zoom.
          opacity: suggested ? 1 : t,
          "--rc": regionColorVar(region.colorIndex),
        } as CSSProperties
      }
    >
      {suggested && (
        <div className='wf-suggest-card nodrag' onMouseDown={e => e.stopPropagation()}>
          <div className='sc-head'>
            <IconSparkles size={12} />
            <span>AI suggests grouping these {memberIds.length} nodes</span>
          </div>
          {renaming ? (
            <input
              className='sc-input'
              autoFocus
              defaultValue={region.name}
              onFocus={e => e.currentTarget.select()}
              onKeyDown={e => {
                if (e.key === "Enter") {
                  commitRename(e.currentTarget.value);
                }
                if (e.key === "Escape") {
                  setRenaming(false);
                }
                e.stopPropagation();
              }}
              onBlur={e => commitRename(e.currentTarget.value)}
            />
          ) : (
            <div className='sc-name'>“{region.name}”</div>
          )}
          <div className='sc-actions'>
            {!renaming && (
              <>
                <button className='primary' onClick={() => confirmRegion(region.id)}>
                  ✓ Keep
                </button>
                <button onClick={() => setRenaming(true)}>Rename</button>
                <button className='ghost' onClick={() => removeRegion(region.id)}>
                  Dismiss
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
