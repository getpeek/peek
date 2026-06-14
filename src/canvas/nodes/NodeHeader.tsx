import { IconX } from "@tabler/icons-react";
import { useCanvas } from "../hooks/useCanvas";
import { Tooltip } from "../../components/Tooltip/Tooltip";

interface NodeHeaderProps {
  nodeId: string;
  name?: string;
  indicator?: React.ReactNode;
  children?: React.ReactNode;
}

export function NodeHeader({ nodeId, name, indicator, children }: NodeHeaderProps) {
  const canvas = useCanvas();

  const close = (e: React.MouseEvent) => {
    e.stopPropagation();
    canvas.deleteNode(nodeId);
  };

  return (
    <div className='app-node-header'>
      {indicator}
      {name && <span className='node-name'>{name}</span>}
      <div className='header-actions nodrag'>
        {children}
        <Tooltip label='Delete'>
          <button className='header-icon-btn' onClick={close}>
            <IconX size={12} />
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
