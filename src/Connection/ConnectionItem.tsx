import { Group, Stack, Text } from "@mantine/core";
import { Connection } from "./types";
import type { ConnectionHighlights } from "./WorkspacePopover";
import { highlightMatch } from "./highlightMatch";
import "./WorkspacePanel.css";

interface ConnectionItemProps {
  isActive: boolean;
  isHighlighted: boolean;
  connection: Connection;
  highlights: ConnectionHighlights;
  onActivate: () => void;
}

export const ConnectionItem = ({
  isActive,
  isHighlighted,
  connection,
  highlights,
  onActivate,
}: ConnectionItemProps) => {
  const url = new URL(connection.url);

  return (
    <div
      onClick={onActivate}
      className='connection'
      data-is-active={isActive}
      data-is-highlighted={isHighlighted}
      style={{ "--pk-active-color": connection.color } as React.CSSProperties}
    >
      <Group justify='space-between' align='center'>
        <Group gap={16} align='start' wrap='nowrap'>
          <div className='color' style={{ backgroundColor: connection.color }} />
          <Stack style={{ width: "100%" }}>
            <Text size='xs' fw='bold' truncate='end' maw={80} className='connection-name'>
              {highlightMatch(highlights.connectionName, connection.name)}
            </Text>
            <Text size='xs' truncate='end' c='var(--pk-fg-subtle)' w='100%'>
              {highlightMatch(highlights.user, url.username)}@
              {highlightMatch(highlights.host, url.hostname)}
            </Text>
          </Stack>
        </Group>
      </Group>
    </div>
  );
};
