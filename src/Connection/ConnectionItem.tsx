import { Group, Text } from "@mantine/core";
import { Connection } from "./types";
import "./WorkspacePanel.css";
import { IconCheck } from "@tabler/icons-react";

interface ConnectionItemProps {
  isActive: boolean;
  connection: Connection;
  onActivate: () => void;
}

export const ConnectionItem = ({ isActive, connection, onActivate }: ConnectionItemProps) => {
  const redactedUrl = connection.url.replace(/(postgres:\/\/[^:]+:)[^@]+(@)/, "$1*****$2");

  return (
    <div onClick={onActivate} className='connection' data-is-active={isActive}>
      <Group align='center' justify='space-between' h={30}>
        <Group align='center'>
          <div className='color' style={{ backgroundColor: connection.color }} />
          <Text size='xs' fw='bold' truncate='end' maw={80} className='connection-name'>
            {connection.name}
          </Text>
          <Text size='xs' maw={250} truncate='end' className='connection-url'>
            {redactedUrl}
          </Text>
        </Group>
        {isActive ? <IconCheck color='var(--text-color)' /> : null}
      </Group>
    </div>
  );
};
