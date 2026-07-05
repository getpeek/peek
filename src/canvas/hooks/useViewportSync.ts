import { useAtomValue } from "jotai";
import { useEffect, useRef } from "react";
import { useReactFlow } from "@xyflow/react";
import { activePageIdAtom, loadEpochAtom, viewportAtom } from "../state";

// `defaultViewport` only applies on mount; restoring viewport on connection
// load or page switch needs an imperative setViewport (else camera drifts).
export function useViewportSync() {
  const viewport = useAtomValue(viewportAtom);
  const loadEpoch = useAtomValue(loadEpochAtom);
  const activePageId = useAtomValue(activePageIdAtom);
  const rf = useReactFlow();
  const syncRef = useRef<{ epoch: number; pageId: string } | null>(null);

  useEffect(() => {
    const last = syncRef.current;
    if (last === null) {
      // First mount — defaultViewport already wired this up.
      syncRef.current = { epoch: loadEpoch, pageId: activePageId };
      return;
    }
    if (last.epoch === loadEpoch && last.pageId === activePageId) {
      // Pan/zoom — `viewport` changed but neither load nor page did. Don't
      // re-apply; that would fight the user.
      return;
    }
    syncRef.current = { epoch: loadEpoch, pageId: activePageId };
    rf.setViewport(viewport);
  }, [loadEpoch, activePageId, viewport, rf]);
}
