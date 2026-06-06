import { useState } from "react";
import { IconAlertTriangle, IconChevronRight, IconTool } from "@tabler/icons-react";
import type { ToolCall } from "../../../shapes/Ai/useExecutePrompt";

interface ToolBlockProps {
  call: ToolCall;
  resultText: string;
  isError: boolean;
}

function toolSummary(args: unknown): string {
  if (!args || typeof args !== "object") {
    return "";
  }
  const record = args as Record<string, unknown>;
  const candidate = record.title ?? record.node_id ?? record.name;
  return typeof candidate === "string" ? candidate : "";
}

const ToolArgs = ({ args }: { args: unknown }) => {
  const record = (args && typeof args === "object" ? args : {}) as Record<string, unknown>;
  const { sql, ...rest } = record;
  const hasRest = Object.keys(rest).length > 0;
  return (
    <>
      {typeof sql === "string" && <pre className='code-block'>{sql}</pre>}
      {hasRest && <pre className='code-block'>{JSON.stringify(rest, null, 2)}</pre>}
    </>
  );
};

export const ToolBlock = ({ call, resultText, isError }: ToolBlockProps) => {
  const [open, setOpen] = useState(false);
  const summary = toolSummary(call.args);
  return (
    <div className={`tool ${open ? "is-open" : ""}`} data-state={isError ? "error" : "done"}>
      <button className='tool-row' onClick={() => setOpen(o => !o)}>
        <span className='tool-status'>
          {isError ? <IconAlertTriangle size={13} /> : <IconTool size={13} />}
        </span>
        <span className='tool-name'>{call.name}</span>
        {summary && <span className='tool-sum'>{summary}</span>}
        <span className='tool-chev'>
          <IconChevronRight size={14} />
        </span>
      </button>
      {open && (
        <div className='tool-panel'>
          <div className='tp-sec'>
            <div className='tp-k'>Arguments</div>
            <ToolArgs args={call.args} />
          </div>
          {resultText.trim() && (
            <div className='tp-sec'>
              <div className='tp-k'>Result</div>
              <pre className={`code-block ${isError ? "is-error" : ""}`}>{resultText}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
