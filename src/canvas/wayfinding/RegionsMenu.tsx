import { IconMap2, IconPencil, IconSparkles, IconX } from "@tabler/icons-react";
import { getHotkeyHandler } from "@mantine/hooks";
import { useAtom, useAtomValue } from "jotai";
import { useEffect, useRef, useState } from "react";
import { historyPreviewAtom } from "../history/state";
import { nodesAtom, regionsAtom } from "../state";
import { Tooltip } from "../../components/Tooltip/Tooltip";
import type { RegionState } from "../types";
import { deriveRegions, regionColorVar } from "./regionGeometry";
import { regionsMenuOpenAtom, renamingRegionIdAtom } from "./state";
import { useGroupWithAi } from "./useGroupWithAi";
import { useRegroupAllWithAi } from "./useRegroupAllWithAi";
import { useRegionActions } from "./useRegionActions";
import { useRegionsEnabled } from "./useRegionsEnabled";
import { useClickAwayCapture } from "../../app/useClickAwayCapture";
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
  const regroupAll = useRegroupAllWithAi();
  const [aiBusy, setAiBusy] = useState<"ungrouped" | "regroup" | null>(null);
  const [cursor, setCursor] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  useClickAwayCapture(open, () => {
    setOpen(false);
    setRenamingId(null);
  }, [containerRef]);

  useEffect(() => {
    if (open) {
      setCursor(0);
      listRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    itemRefs.current[cursor]?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  const runGroupUngrouped = async () => {
    if (!groupWithAi || aiBusy) {
      return;
    }
    setAiBusy("ungrouped");
    try {
      await groupWithAi();
    } finally {
      setAiBusy(null);
    }
  };

  const runRegroupAll = async () => {
    if (!regroupAll || aiBusy) {
      return;
    }
    setAiBusy("regroup");
    try {
      await regroupAll();
    } finally {
      setAiBusy(null);
    }
  };

  const derived = deriveRegions(nodes, regions);
  const liveCountById = new Map(derived.map(d => [d.region.id, d.memberIds.length]));
  const groupedIds = new Set(derived.flatMap(d => d.memberIds));
  const ungroupedCount = nodes.filter(n => !groupedIds.has(n.id)).length;

  const selectRegion = (region: RegionState, count: number) => {
    if (count > 0) {
      flyToRegion(region.id);
      setOpen(false);
    }
  };

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
        <div
          ref={listRef}
          className='wf-region-list'
          tabIndex={-1}
          onKeyDown={getHotkeyHandler([
            [
              "Escape",
              () => {
                setOpen(false);
                setRenamingId(null);
              },
            ],
            ["ArrowUp", () => setCursor(c => Math.max(0, c - 1))],
            ["ArrowDown", () => setCursor(c => Math.min(regions.length - 1, c + 1))],
            [
              "Enter",
              () => {
                const region = regions[cursor];
                if (region) {
                  selectRegion(region, liveCountById.get(region.id) ?? 0);
                }
              },
            ],
          ])}
        >
          <div className='rl-title'>
            <span>Regions</span>
            {regroupAll && (
              <span className='rl-actions ai'>
                <Tooltip label='Regroup all with AI'>
                  <button onClick={() => void runRegroupAll()} disabled={aiBusy !== null}>
                    {aiBusy === "regroup" ? <span className='spin' /> : <IconSparkles size={12} />}
                  </button>
                </Tooltip>
              </span>
            )}
          </div>
          {regions.length === 0 && (
            <div className='rl-empty'>Select nodes and press ⌘G to group them</div>
          )}
          {regions.map((region, index) => {
            const count = liveCountById.get(region.id) ?? 0;
            const renaming = renamingId === region.id;
            return (
              <div
                key={region.id}
                ref={el => {
                  itemRefs.current[index] = el;
                }}
                className={`rl-row ${count === 0 ? "muted" : ""} ${index === cursor ? "active" : ""}`}
                onMouseEnter={() => setCursor(index)}
                onClick={() => {
                  if (!renaming) {
                    selectRegion(region, count);
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
                  <Tooltip label='Group ungrouped with AI (slots into existing or creates new)'>
                    <button onClick={() => void runGroupUngrouped()} disabled={aiBusy !== null}>
                      {aiBusy === "ungrouped" ? (
                        <span className='spin' />
                      ) : (
                        <IconSparkles size={12} />
                      )}
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
