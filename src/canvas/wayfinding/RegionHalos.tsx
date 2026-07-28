import { ViewportPortal } from "@xyflow/react";
import { IconSparkles } from "@tabler/icons-react";
import { useAtomValue } from "jotai";
import { Fragment, useState, type CSSProperties } from "react";
import { nodesAtom, regionsAtom } from "../state";
import { deriveRegions, regionColorVar, type DerivedRegion } from "./regionGeometry";
import { flashedRegionIdAtom } from "./state";
import { useRegionActions } from "./useRegionActions";
import { useRegionsEnabled } from "./useRegionsEnabled";
import "./wayfinding.css";

/**
 * Canvas-space box drawn around every region. Confirmed regions get the Lasso
 * Glow look — a dark radial pool ringed by a soft region-colored glow — painted
 * as a plain div (CSS gradients only, no SVG filter) so pan/zoom stays cheap.
 * Suggested ones keep the always-on dashed box plus the Keep / Rename / Dismiss
 * review card. Rendered through ViewportPortal so the boxes track world
 * coordinates without transform math.
 *
 * This layer deliberately does NOT subscribe to the live zoom: confirmed regions
 * fade in CSS off `--pk-zoom` (see wayfinding.css), so nothing here re-renders
 * per zoom frame.
 */
export function RegionHalos() {
  const regionsEnabled = useRegionsEnabled();
  const nodes = useAtomValue(nodesAtom);
  const regions = useAtomValue(regionsAtom);
  const flashedId = useAtomValue(flashedRegionIdAtom);

  const derived = deriveRegions(nodes, regions);
  if (!regionsEnabled || derived.length === 0) {
    return null;
  }

  return (
    <ViewportPortal>
      {derived.map(d => (
        <Fragment key={d.region.id}>
          {d.region.status === "suggested" ? (
            <SuggestedRegion derived={d} />
          ) : (
            <ConfirmedRegion derived={d} />
          )}
          {d.region.id === flashedId && <FlashRing derived={d} />}
        </Fragment>
      ))}
    </ViewportPortal>
  );
}

// Confirmed halos are transparent above the beacon fade threshold, so a fold-in
// needs its own ring to be visible at working zoom levels.
function FlashRing({ derived }: { derived: DerivedRegion }) {
  const { region, bbox } = derived;
  return (
    <div
      className='wf-region-flash'
      style={
        {
          left: bbox.x,
          top: bbox.y,
          width: bbox.w,
          height: bbox.h,
          "--rc": regionColorVar(region.colorIndex),
        } as CSSProperties
      }
    />
  );
}

function ConfirmedRegion({ derived }: { derived: DerivedRegion }) {
  const { region, bbox } = derived;
  return (
    <div
      className='wf-region-halo confirmed'
      style={
        {
          left: bbox.x,
          top: bbox.y,
          width: bbox.w,
          height: bbox.h,
          "--rc": regionColorVar(region.colorIndex),
        } as CSSProperties
      }
    />
  );
}

function SuggestedRegion({ derived }: { derived: DerivedRegion }) {
  const { region, bbox, memberIds } = derived;
  const { confirmRegion, renameRegion, removeRegion } = useRegionActions();
  const [renaming, setRenaming] = useState(false);

  const commitRename = (value: string) => {
    const name = value.trim();
    if (name.length > 0) {
      renameRegion(region.id, name);
    }
    setRenaming(false);
  };

  return (
    <div
      className='wf-region-halo suggested'
      style={
        {
          left: bbox.x,
          top: bbox.y,
          width: bbox.w,
          height: bbox.h,
          "--rc": regionColorVar(region.colorIndex),
        } as CSSProperties
      }
    >
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
    </div>
  );
}
