import { Panel } from "@xyflow/react";
import { useAtom } from "jotai";
import { placeModeAtom } from "../state";
import type { AppNodeType } from "../types";
import "./Toolbar.css";

interface ToolDef {
  label: string;
  hotkey: string;
  mode: AppNodeType | null;
  swatchColor: string;
}

const tools: ToolDef[] = [
  {
    label: "Query",
    hotkey: "Q",
    mode: "query",
    swatchColor: "var(--pk-type-query)",
  },
  {
    label: "AI prompt",
    hotkey: "A",
    mode: "ai-prompt",
    swatchColor: "var(--pk-type-ai)",
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
          Select
          <span className="kbd">Esc</span>
        </button>
        <span className="sep" />
        {tools.map((t) => {
          const active = placeMode === t.mode;
          return (
            <button
              key={t.label}
              className={`toolbar-btn ${active ? "active" : ""}`}
              title={`${t.label} (${t.hotkey})`}
              onClick={() => setPlaceMode(t.mode)}
            >
              <span className="swatch" style={{ background: t.swatchColor }} />
              {t.label}
              <span className="kbd">{t.hotkey}</span>
            </button>
          );
        })}
      </div>
    </Panel>
  );
}
