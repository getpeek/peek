import { useState } from "react";
import {
  IconAlertTriangle,
  IconChevronRight,
  IconCircleCheck,
  IconLoader2,
  IconTool,
} from "@tabler/icons-react";
import type { Message } from "../../hooks/useExecutePrompt";

function statusIcon(status: Message["toolStatus"], isError: boolean) {
  if (isError) {
    return <IconAlertTriangle size={13} />;
  }
  if (status === "completed") {
    return <IconCircleCheck size={13} />;
  }
  if (status === "in_progress" || status === "pending") {
    return <IconLoader2 size={13} className='acp-spin' />;
  }
  return <IconTool size={13} />;
}

/** Renders a tool call the ACP agent ran itself (title, kind, live status, output). */
export const AcpToolBlock = ({ message }: { message: Message }) => {
  const [open, setOpen] = useState(false);
  const status = message.toolStatus ?? "pending";
  const isError = status === "failed" || message.isError === true;
  return (
    <div className={`tool ${open ? "is-open" : ""}`} data-state={isError ? "error" : status}>
      <button className='tool-row' onClick={() => setOpen(o => !o)}>
        <span className='tool-status'>{statusIcon(status, isError)}</span>
        <span className='tool-name'>{message.toolName ?? "tool"}</span>
        {message.toolKind && <span className='tool-sum'>{message.toolKind}</span>}
        <span className='tool-chev'>
          <IconChevronRight size={14} />
        </span>
      </button>
      {open && message.message.trim() && (
        <div className='tool-panel'>
          <div className='tp-sec'>
            <div className='tp-k'>Output</div>
            <pre className={`code-block ${isError ? "is-error" : ""}`}>{message.message}</pre>
          </div>
        </div>
      )}
    </div>
  );
};
