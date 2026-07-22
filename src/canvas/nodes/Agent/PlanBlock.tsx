import { IconCircle, IconCircleCheck, IconCircleDot } from "@tabler/icons-react";
import type { PlanEntry } from "../../hooks/useExecutePrompt";

function statusIcon(status: PlanEntry["status"]) {
  if (status === "completed") {
    return <IconCircleCheck size={14} />;
  }
  if (status === "in_progress") {
    return <IconCircleDot size={14} />;
  }
  return <IconCircle size={14} />;
}

export const PlanBlock = ({ entries }: { entries: PlanEntry[] }) => {
  if (entries.length === 0) {
    return null;
  }
  return (
    <div className='acp-plan'>
      <div className='acp-plan-title'>Plan</div>
      <ul className='acp-plan-list'>
        {entries.map((entry, index) => (
          <li key={`${index}-${entry.content}`} className={`acp-plan-item is-${entry.status}`}>
            <span className='acp-plan-ico'>{statusIcon(entry.status)}</span>
            <span className='acp-plan-text'>{entry.content}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
