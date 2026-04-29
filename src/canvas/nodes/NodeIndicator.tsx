import type { AppNodeType } from "../types";

interface NodeIndicatorProps {
  kind: AppNodeType;
  label?: string;
}

const KIND_LABELS: Record<AppNodeType, string> = {
  query: "QUERY",
  result: "RESULT",
  "ai-prompt": "AI",
  chat: "CHAT",
  barchart: "CHART",
  "query-error": "ERROR",
  "table-definition": "TABLE",
  text: "TEXT",
  variable: "VARS",
  draw: "DRAW",
};

export function NodeIndicator({ kind, label }: NodeIndicatorProps) {
  return (
    <span className={`node-indicator type-${kind}`}>
      <span className='type-dot' />
      <span className='type-label'>{label ?? KIND_LABELS[kind]}</span>
    </span>
  );
}
