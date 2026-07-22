import { IconShieldQuestion } from "@tabler/icons-react";
import type { AcpPermissionRequest } from "./acpUpdates";

interface PermissionPromptProps {
  request: AcpPermissionRequest;
  onRespond: (id: number, optionId: string | null) => void;
}

/** Surfaces an ACP `session/request_permission` so the user can allow or reject
 *  a tool the agent wants to run. */
export const PermissionPrompt = ({ request, onRespond }: PermissionPromptProps) => {
  const options = request.request.options ?? [];
  const title = request.request.toolCall?.title ?? "Run a tool";
  return (
    <div className='acp-permission nodrag'>
      <div className='acp-permission-head'>
        <IconShieldQuestion size={15} />
        <span>Permission needed</span>
      </div>
      <div className='acp-permission-tool'>{title}</div>
      <div className='acp-permission-actions'>
        {options.map(option => (
          <button
            key={option.optionId}
            className={`acp-perm-btn is-${option.kind}`}
            onClick={() => onRespond(request.id, option.optionId)}
          >
            {option.name}
          </button>
        ))}
        <button className='acp-perm-btn is-cancel' onClick={() => onRespond(request.id, null)}>
          Cancel
        </button>
      </div>
    </div>
  );
};
