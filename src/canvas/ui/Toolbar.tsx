import {
  IconAt,
  IconCode,
  IconLetterT,
  IconMouse,
  IconPencil,
  IconSparkles,
} from "@tabler/icons-react";
import { Panel } from "@xyflow/react";
import { useAtom } from "jotai";
import type { ComponentType } from "react";
import { placeModeAtom } from "../state";
import type { AppNodeType } from "../types";
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
    label: "AI prompt",
    hotkey: "A",
    mode: "ai-prompt",
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

  return (
    <Panel position="bottom-center">
      <div className="canvas-toolbar">
        <button
          className={`toolbar-btn ${placeMode === null ? "active" : ""}`}
          title="Select (Esc)"
          onClick={() => setPlaceMode(null)}
        >
          <IconMouse size={16} stroke={1.75} />
          <span className="kbd">Esc</span>
        </button>
        <span className="sep" />
        {tools.map((t) => {
          const active = placeMode === t.mode;
          const { Icon } = t;
          return (
            <button
              key={t.label}
              className={`toolbar-btn ${active ? "active" : ""}`}
              title={`${t.label} (${t.hotkey})`}
              onClick={() => setPlaceMode(t.mode)}
            >
              <Icon size={16} stroke={1.75} />
              <span className="kbd">{t.hotkey}</span>
            </button>
          );
        })}
      </div>
    </Panel>
  );
}
