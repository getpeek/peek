import { Panel, useStore } from "@xyflow/react";
import { useAtomValue } from "jotai";
import { useEffect } from "react";
import { uiVisibilityAtom } from "../../state";
import { historyPreviewAtom } from "../history/state";
import { nodesAtom, regionsAtom } from "../state";
import { Beacons } from "./Beacons";
import { crossFade, DIM_THRESHOLD_T } from "./crossFade";
import { EdgePeekers } from "./EdgePeekers";
import { deriveRegions, type DerivedRegion } from "./regionGeometry";
import { useRegionsEnabled } from "./useRegionsEnabled";
import "./wayfinding.css";

/**
 * Split in two like RemoteCursorsLayer: this gate reads only atoms and bails
 * when there's nothing to draw, so the per-frame viewport subscription in
 * `WayfindingOverlay` only mounts on pages that actually have regions.
 */
export function WayfindingLayer() {
  const regionsEnabled = useRegionsEnabled();
  const uiVisible = useAtomValue(uiVisibilityAtom);
  const previewing = useAtomValue(historyPreviewAtom) !== null;
  const nodes = useAtomValue(nodesAtom);
  const regions = useAtomValue(regionsAtom);

  const derived = deriveRegions(nodes, regions);
  if (!regionsEnabled || !uiVisible || previewing || derived.length === 0) {
    return null;
  }

  return <WayfindingOverlay derived={derived} />;
}

function WayfindingOverlay({ derived }: { derived: DerivedRegion[] }) {
  const [tx, ty, tz] = useStore(s => s.transform);
  const t = crossFade(tz);
  const dimmed = t > DIM_THRESHOLD_T;

  // Dim nodes/edges through a DOM attribute (à la `data-interacting`) so the
  // canvas itself never re-renders for the cross-fade.
  useEffect(() => {
    const flowElement = document.querySelector(".react-flow");
    if (!(flowElement instanceof HTMLElement)) {
      return;
    }
    if (dimmed) {
      flowElement.dataset.wfLowzoom = "";
    }
    return () => {
      delete flowElement.dataset.wfLowzoom;
    };
  }, [dimmed]);

  return (
    <Panel position='top-left' className='wf-layer'>
      <Beacons derived={derived} t={t} transform={[tx, ty, tz]} />
      <EdgePeekers derived={derived} t={t} transform={[tx, ty, tz]} />
    </Panel>
  );
}
