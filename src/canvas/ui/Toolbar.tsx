import {
  IconAt,
  IconCode,
  IconLasso,
  IconLetterT,
  IconMouse,
  IconPencil,
  IconSparkles,
} from "@tabler/icons-react";
import { Panel } from "@xyflow/react";
import { useAtom } from "jotai";
import type { ComponentType } from "react";
import { placeModeAtom, selectionToolAtom } from "../state";
import type { AppNodeType } from "../types";
import { Tooltip } from "../../components/Tooltip/Tooltip";
import "./Toolbar.css";

interface ToolDef {
  label: string;
  hotkey: string;
  mode: AppNodeType | null;
  Icon: ComponentType<{ size?: number; stroke?: number }>;
}

const tools: ToolDef[] = [
  {
    label: "Query",
    hotkey: "Q",
    mode: "query",
    Icon: IconCode,
  },
  {
    label: "Agent",
    hotkey: "A",
    mode: "agent",
    Icon: IconSparkles,
  },
  {
    label: "Text",
    hotkey: "T",
    mode: "text",
    Icon: IconLetterT,
  },
  {
    label: "Variable",
    hotkey: "V",
    mode: "variable",
    Icon: IconAt,
  },
  {
    label: "Draw",
    hotkey: "D",
    mode: "draw",
    Icon: IconPencil,
  },
];

export function Toolbar() {
  const [placeMode, setPlaceMode] = useAtom(placeModeAtom);
  const [selectionTool, setSelectionTool] = useAtom(selectionToolAtom);

  return (
    <Panel position='bottom-center'>
      <div className='canvas-toolbar'>
        {selectionTool === "lasso" ? (
          <Tooltip label='Lasso (L)'>
            <button
              className={`toolbar-btn ${placeMode === null ? "active" : ""}`}
              onClick={() => setPlaceMode(null)}
            >
              <IconLasso size={16} stroke={1.75} />
              <span className='kbd'>L</span>
            </button>
          </Tooltip>
        ) : (
          <Tooltip label='Select (Esc)'>
            <button
              className={`toolbar-btn ${placeMode === null ? "active" : ""}`}
              onClick={() => setPlaceMode(null)}
            >
              <IconMouse size={16} stroke={1.75} />
              <span className='kbd'>Esc</span>
            </button>
          </Tooltip>
        )}
        <span className='sep' />
        {tools.map(t => {
          const active = placeMode === t.mode;
          const { Icon } = t;
          return (
            <Tooltip key={t.label} label={`${t.label} (${t.hotkey})`}>
              <button
                className={`toolbar-btn ${active ? "active" : ""}`}
                onClick={() => {
                  setPlaceMode(t.mode);
                  setSelectionTool("default");
                }}
              >
                <Icon size={16} stroke={1.75} />
                <span className='kbd'>{t.hotkey}</span>
              </button>
            </Tooltip>
          );
        })}
      </div>
    </Panel>
  );
}
