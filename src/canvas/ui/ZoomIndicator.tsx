import { Panel, useReactFlow, useStore } from "@xyflow/react";
import { IconMaximize, IconMinus, IconPlus } from "@tabler/icons-react";
import "./Toolbar.css";

export function ZoomIndicator() {
  const zoom = useStore(s => s.transform[2]);
  const rf = useReactFlow();

  return (
    <Panel position='bottom-left'>
      <div className='zoom-indicator'>
        <button onClick={() => rf.zoomOut({ duration: 150 })} title='Zoom out'>
          <IconMinus size={14} />
        </button>
        <span className='lvl' onClick={() => rf.zoomTo(1, { duration: 200 })} title='Reset zoom'>
          {Math.round(zoom * 100)}%
        </span>
        <button onClick={() => rf.zoomIn({ duration: 150 })} title='Zoom in'>
          <IconPlus size={14} />
        </button>
        <button onClick={() => rf.fitView({ duration: 250, padding: 0.15 })} title='Fit view'>
          <IconMaximize size={14} />
        </button>
      </div>
    </Panel>
  );
}
