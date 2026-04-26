import { IconPin, IconPinFilled, IconX } from "@tabler/icons-react";
import { useCanvas } from "../useCanvas";
import type { AppNodeType } from "../types";

interface NodeHeaderProps {
  nodeId: string;
  type: AppNodeType;
  label?: string;
  name?: string;
  pinned?: boolean;
  onPinToggle?: () => void;
  isLive?: boolean;
  onLiveToggle?: () => void;
}

const TYPE_LABELS: Record<AppNodeType, string> = {
  query: "QUERY",
  result: "RESULT",
  "ai-prompt": "AI",
  chat: "CHAT",
  barchart: "CHART",
  "query-error": "ERROR",
  "table-definition": "TABLE",
  text: "TEXT",
};

export function NodeHeader({
  nodeId,
  type,
  label,
  name,
  pinned,
  onPinToggle,
  isLive,
  onLiveToggle,
}: NodeHeaderProps) {
  const canvas = useCanvas();

  const close = (e: React.MouseEvent) => {
    e.stopPropagation();
    canvas.deleteNode(nodeId);
  };

  return (
    <div className={`app-node-header type-${type}`}>
      <span className="type-dot" />
      <span className="type-label">{label ?? TYPE_LABELS[type]}</span>
      {name && <span className="node-name">{name}</span>}
      <div className="header-actions nodrag">
        {onLiveToggle && (
          <button
            className={`header-icon-btn ${isLive ? "is-live" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              onLiveToggle();
            }}
            title={isLive ? "Stop live polling" : "Poll every 10s"}
          >
            <span className="live-dot" />
          </button>
        )}
        {onPinToggle && (
          <button
            className="header-icon-btn"
            onClick={(e) => {
              e.stopPropagation();
              onPinToggle();
            }}
            title="Pin"
          >
            {pinned ? <IconPinFilled size={12} /> : <IconPin size={12} />}
          </button>
        )}
        <button className="header-icon-btn" onClick={close} title="Delete">
          <IconX size={12} />
        </button>
      </div>
    </div>
  );
}
