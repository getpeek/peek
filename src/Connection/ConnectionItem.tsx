import { IconCopy, IconPencil, IconTerminal, IconTrash } from "@tabler/icons-react";
import { DotMenu } from "./DotMenu";
import { highlightMatch } from "./highlightMatch";
import type { ConnectionHighlights } from "./WorkspaceList";
import type { Connection } from "./types";
import { parseConnectionUrl } from "./urlParts";

interface ConnectionItemProps {
  connection: Connection;
  isActive: boolean;
  isHighlighted: boolean;
  highlights: ConnectionHighlights;
  onActivate: () => void;
  onHover: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
}

export const ConnectionItem = ({
  connection,
  isActive,
  isHighlighted,
  highlights,
  onActivate,
  onHover,
  onEdit,
  onDuplicate,
  onRemove,
}: ConnectionItemProps) => {
  const parsed = parseConnectionUrl(connection.url);

  return (
    <div
      className='picker-conn'
      data-is-active={isActive}
      data-is-highlighted={isHighlighted}
      onClick={onActivate}
      onMouseEnter={onHover}
      style={{ "--cdot": connection.color } as React.CSSProperties}
    >
      <span className='picker-conn-dot' />
      <div className='picker-conn-body'>
        <div className='picker-conn-row1'>
          <span className='picker-conn-name'>
            {highlightMatch(highlights.connectionName, connection.name)}
          </span>
          {connection.ssh_tunnel ? (
            <span className='picker-conn-env'>
              <IconTerminal size={10} /> SSH
            </span>
          ) : null}
          <span className='picker-conn-actions'>
            <DotMenu
              ariaLabel='Connection actions'
              items={[
                {
                  icon: <IconPencil size={13} />,
                  label: "Edit connection",
                  onClick: onEdit,
                },
                {
                  icon: <IconCopy size={13} />,
                  label: "Duplicate",
                  onClick: onDuplicate,
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
        </div>
        <div className='picker-conn-row2'>
          <span className='picker-conn-host'>
            {parsed ? (
              <>
                {highlightMatch(highlights.user, parsed.user)}@
                {highlightMatch(highlights.host, parsed.host)}
              </>
            ) : (
              connection.url
            )}
          </span>
        </div>
      </div>
    </div>
  );
};
