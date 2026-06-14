import { Panel, useReactFlow } from "@xyflow/react";
import { IconMaximize, IconMinus, IconPlus } from "@tabler/icons-react";
import { useAtomValue } from "jotai";
import { viewportAtom } from "../state";
import { Tooltip } from "../../components/Tooltip/Tooltip";
import "./Toolbar.css";

export function ZoomIndicator() {
  // Read from the atom (written on `onMoveEnd`) rather than the xyflow store's
  // live transform — the percentage settles on gesture-release instead of
  // re-rendering this panel every frame of a pan/zoom.
  const zoom = useAtomValue(viewportAtom).zoom;
  const rf = useReactFlow();

  return (
    <Panel position='bottom-left'>
      <div className='zoom-indicator'>
        <Tooltip label='Zoom out'>
          <button onClick={() => rf.zoomOut({ duration: 150 })}>
            <IconMinus size={14} />
          </button>
        </Tooltip>
        <Tooltip label='Reset zoom'>
          <span className='lvl' onClick={() => rf.zoomTo(1, { duration: 200 })}>
            {Math.round(zoom * 100)}%
          </span>
        </Tooltip>
        <Tooltip label='Zoom in'>
          <button onClick={() => rf.zoomIn({ duration: 150 })}>
            <IconPlus size={14} />
          </button>
        </Tooltip>
        <Tooltip label='Fit view'>
          <button onClick={() => rf.fitView({ duration: 250, padding: 0.15, maxZoom: 1 })}>
            <IconMaximize size={14} />
          </button>
        </Tooltip>
      </div>
    </Panel>
  );
}
