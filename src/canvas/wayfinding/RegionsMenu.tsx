import { IconMap2, IconPencil, IconSparkles, IconX } from "@tabler/icons-react";
import { useAtom, useAtomValue } from "jotai";
import { useEffect, useRef, useState } from "react";
import { historyPreviewAtom } from "../history/state";
import { nodesAtom, regionsAtom } from "../state";
import { Tooltip } from "../../components/Tooltip/Tooltip";
import type { RegionState } from "../types";
import { deriveRegions, regionColorVar } from "./regionGeometry";
import { regionsMenuOpenAtom, renamingRegionIdAtom } from "./state";
import { useGroupWithAi } from "./useGroupWithAi";
import { useRegionActions } from "./useRegionActions";
import { useRegionsEnabled } from "./useRegionsEnabled";
import "./wayfinding.css";

// Icon button + popover, rendered inline inside the bottom-left zoom cluster.
export function RegionsMenu() {
  const regionsEnabled = useRegionsEnabled();
  const previewing = useAtomValue(historyPreviewAtom) !== null;
  const [open, setOpen] = useAtom(regionsMenuOpenAtom);
  const [renamingId, setRenamingId] = useAtom(renamingRegionIdAtom);
  const regions = useAtomValue(regionsAtom);
  const nodes = useAtomValue(nodesAtom);
  const { renameRegion, removeRegion, flyToRegion } = useRegionActions();
  const groupWithAi = useGroupWithAi();
  const [aiBusy, setAiBusy] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click. The popover lives in a React Flow Panel above the
  // canvas pane, which stops propagation of bubble-phase mouse events — so we
  // listen in the capture phase to see the click before the pane swallows it.
  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointerDown = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setRenamingId(null);
      }
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [open, setOpen, setRenamingId]);

  const runGroupWithAi = async () => {
    if (!groupWithAi || aiBusy) {
      return;
    }
    setAiBusy(true);
    try {
      await groupWithAi();
    } finally {
      setAiBusy(false);
    }
  };

  const derived = deriveRegions(nodes, regions);
  const liveCountById = new Map(derived.map(d => [d.region.id, d.memberIds.length]));
  const groupedIds = new Set(derived.flatMap(d => d.memberIds));
  const ungroupedCount = nodes.filter(n => !groupedIds.has(n.id)).length;

  const commitRename = (region: RegionState, value: string) => {
    const name = value.trim();
    if (name.length > 0 && name !== region.name) {
      renameRegion(region.id, name);
    }
    setRenamingId(null);
  };

  if (!regionsEnabled || previewing) {
    return null;
  }

  return (
    <div ref={containerRef} className='wf-regions'>
      {open && (
        <div className='wf-region-list'>
          <div className='rl-title'>Regions</div>
          {regions.length === 0 && (
            <div className='rl-empty'>Select nodes and press ⌘G to group them</div>
          )}
          {regions.map(region => {
            const count = liveCountById.get(region.id) ?? 0;
            const renaming = renamingId === region.id;
            return (
              <div
                key={region.id}
                className={`rl-row ${count === 0 ? "muted" : ""}`}
                onClick={() => {
                  if (!renaming && count > 0) {
                    flyToRegion(region.id);
                    setOpen(false);
                  }
                }}
              >
                <span className='dot' style={{ background: regionColorVar(region.colorIndex) }} />
                {renaming ? (
                  <input
                    key={region.id}
                    className='rl-rename'
                    autoFocus
                    defaultValue={region.name}
                    onFocus={e => e.currentTarget.select()}
                    onClick={e => e.stopPropagation()}
                    onKeyDown={e => {
                      if (e.key === "Enter") {
                        commitRename(region, e.currentTarget.value);
                      }
                      if (e.key === "Escape") {
                        setRenamingId(null);
                      }
                      e.stopPropagation();
                    }}
                    onBlur={e => commitRename(region, e.currentTarget.value)}
                  />
                ) : (
                  <span className='nm'>{region.name}</span>
                )}
                {region.status === "suggested" && <span className='sug'>suggested</span>}
                <span className='ct'>{count}</span>
                {!renaming && (
                  <span className='rl-actions'>
                    <Tooltip label='Rename'>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setRenamingId(region.id);
                        }}
                      >
                        <IconPencil size={12} />
                      </button>
                    </Tooltip>
                    <Tooltip label='Remove region (keeps nodes)'>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          removeRegion(region.id);
                        }}
                      >
                        <IconX size={12} />
                      </button>
                    </Tooltip>
                  </span>
                )}
              </div>
            );
          })}
          {ungroupedCount > 0 && (
            <div className='rl-row muted'>
              <span className='dot hollow' />
              <span className='nm'>Ungrouped</span>
              <span className='ct'>{ungroupedCount}</span>
              {groupWithAi && (
                <span className='rl-actions ai'>
                  <Tooltip label='Group with AI'>
                    <button onClick={() => void runGroupWithAi()} disabled={aiBusy}>
                      {aiBusy ? <span className='spin' /> : <IconSparkles size={12} />}
                    </button>
                  </Tooltip>
                </span>
              )}
            </div>
          )}
        </div>
      )}
      <Tooltip label='Regions'>
        <button className={open ? "active" : ""} onClick={() => setOpen(v => !v)}>
          <IconMap2 size={14} />
        </button>
      </Tooltip>
    </div>
  );
}
