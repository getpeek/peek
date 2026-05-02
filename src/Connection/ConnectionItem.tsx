import { Group, Stack, Text } from "@mantine/core";
import { Connection } from "./types";
import type { ConnectionHighlights } from "./WorkspacePopover";
import { highlightMatch } from "./highlightMatch";
import "./WorkspacePanel.css";
import { IconBuildingTunnel, IconTerminal } from "@tabler/icons-react";

interface ConnectionItemProps {
  isActive: boolean;
  isHighlighted: boolean;
  connection: Connection;
  highlights: ConnectionHighlights;
  onActivate: () => void;
  onHover: () => void;
}

export const ConnectionItem = ({
  isActive,
  isHighlighted,
  connection,
  highlights,
  onActivate,
  onHover,
}: ConnectionItemProps) => {
  const url = new URL(connection.url);

  return (
    <div
      onClick={onActivate}
      onMouseEnter={onHover}
      className='connection'
      data-is-active={isActive}
      data-is-highlighted={isHighlighted}
      style={{ "--pk-active-color": connection.color } as React.CSSProperties}
    >
      <Group gap='sm' wrap='nowrap' align='flex-start' flex='1 1 auto' miw={0}>
        <div className='color' style={{ backgroundColor: connection.color }} />
        <Stack gap='xs' flex='1 1 auto' miw={0}>
          <Text size='xs' fw='bold' truncate='end' className='connection-name'>
            {highlightMatch(highlights.connectionName, connection.name)}
          </Text>
          <Text size='xs' truncate='end' c='var(--pk-fg-subtle)'>
            {highlightMatch(highlights.user, url.username)}@
            {highlightMatch(highlights.host, url.hostname)}
          </Text>
        </Stack>
        <div className='ssh'>
          {connection.ssh_tunnel ? (
            <>
              <IconTerminal size={14} />
              <Text fz={10}>SSH</Text>
            </>
          ) : null}
        </div>
      </Group>
    </div>
  );
};
