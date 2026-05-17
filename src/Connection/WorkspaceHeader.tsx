import { IconChevronDown, IconPencil, IconPlus, IconTrash } from "@tabler/icons-react";
import { DotMenu } from "./DotMenu";
import { highlightMatch } from "./highlightMatch";

interface WorkspaceHeaderProps {
  name: string;
  connectionCount: number;
  isOpen: boolean;
  nameHighlight?: Fuzzysort.Result;
  onToggle: () => void;
  onEdit: () => void;
  onAddConnection: () => void;
  onRemove: () => void;
}

export const WorkspaceHeader = ({
  name,
  connectionCount,
  isOpen,
  nameHighlight,
  onToggle,
  onEdit,
  onAddConnection,
  onRemove,
}: WorkspaceHeaderProps) => {
  const mascot = name.charAt(0).toUpperCase() || "·";

  return (
    <div className='picker-ws-head' data-is-open={isOpen} onClick={onToggle}>
      <div className='picker-ws-mascot'>{mascot}</div>
      <div className='picker-ws-info'>
        <span className='picker-ws-name'>{highlightMatch(nameHighlight, name)}</span>
        <span className='picker-ws-sub'>
          {connectionCount} connection{connectionCount === 1 ? "" : "s"}
        </span>
      </div>
      <span className='picker-ws-actions'>
        <DotMenu
          ariaLabel='Workspace actions'
          items={[
            {
              icon: <IconPencil size={13} />,
              label: "Edit workspace",
              onClick: onEdit,
            },
            {
              icon: <IconPlus size={13} />,
              label: "Add connection",
              onClick: onAddConnection,
            },
            "divider",
            {
              icon: <IconTrash size={13} />,
              label: "Remove…",
              onClick: onRemove,
              danger: true,
            },
          ]}
        />
      </span>
      <span className='picker-ws-chev'>
        <IconChevronDown size={12} />
      </span>
    </div>
  );
};
