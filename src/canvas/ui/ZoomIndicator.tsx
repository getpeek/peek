import { Panel, useReactFlow } from "@xyflow/react";
import { IconMaximize, IconMinus, IconPlus } from "@tabler/icons-react";
import { useAtomValue } from "jotai";
import { cameraLockedAtom, viewportAtom } from "../state";
import { Tooltip } from "../../components/Tooltip/Tooltip";
import { RegionsMenu } from "../wayfinding/RegionsMenu";
import "./Toolbar.css";

export function ZoomIndicator() {
  // Read from the atom (written on `onMoveEnd`) rather than the xyflow store's
  // live transform — the percentage settles on gesture-release instead of
  // re-rendering this panel every frame of a pan/zoom.
  const zoom = useAtomValue(viewportAtom).zoom;
  const cameraLocked = useAtomValue(cameraLockedAtom);
  const rf = useReactFlow();

  return (
    <Panel position='bottom-left'>
      <div className='zoom-indicator'>
        <Tooltip label='Zoom out'>
          <button disabled={cameraLocked} onClick={() => rf.zoomOut({ duration: 150 })}>
            <IconMinus size={14} />
          </button>
        </Tooltip>
        <Tooltip label='Reset zoom'>
          <span className='lvl' onClick={() => !cameraLocked && rf.zoomTo(1, { duration: 200 })}>
            {Math.round(zoom * 100)}%
          </span>
        </Tooltip>
        <Tooltip label='Zoom in'>
          <button disabled={cameraLocked} onClick={() => rf.zoomIn({ duration: 150 })}>
            <IconPlus size={14} />
          </button>
        </Tooltip>
        <Tooltip label='Fit view'>
          <button
            disabled={cameraLocked}
            onClick={() => rf.fitView({ duration: 250, padding: 0.15, maxZoom: 1 })}
          >
            <IconMaximize size={14} />
          </button>
        </Tooltip>
        <RegionsMenu />
      </div>
    </Panel>
  );
}
