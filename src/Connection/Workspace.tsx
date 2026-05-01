import { Group, Stack, Text } from "@mantine/core";
import { ConnectionItem } from "./ConnectionItem";
import { Connection } from "./types";
import type { ConnectionHighlights } from "./WorkspacePopover";
import { highlightMatch } from "./highlightMatch";
import "./WorkspacePanel.css";

interface WorkspaceEntry {
  item: { connection: Connection };
  highlights: ConnectionHighlights;
}

interface WorkspaceProps {
  name: string;
  entries: WorkspaceEntry[];
  workspaceNameHighlight?: Fuzzysort.Result;
  activeUrl?: string;
  highlightedUrl?: string;
  onActivate: (connection: Connection) => void;
}

export const Workspace = ({
  name,
  entries,
  workspaceNameHighlight,
  activeUrl,
  highlightedUrl,
  onActivate,
}: WorkspaceProps) => {
  return (
    <Stack gap='xs'>
      <Group gap={8} align='center' justify='flex-start'>
        <Text size='xs' fw='bold' pos='sticky' c='var(--text-color)'>
          {highlightMatch(workspaceNameHighlight, name)}
        </Text>
        <Text size='xs' c='var(--pk-fg-subtle)'>
          /
        </Text>
        <Text size='xs' c='var(--pk-fg-subtle)'>
          {entries.length} connections
        </Text>
      </Group>
      <Stack gap={0}>
        {entries.map(entry => (
          <ConnectionItem
            key={entry.item.connection.url}
            connection={entry.item.connection}
            isActive={entry.item.connection.url === activeUrl}
            isHighlighted={entry.item.connection.url === highlightedUrl}
            highlights={entry.highlights}
            onActivate={() => onActivate(entry.item.connection)}
          />
        ))}
      </Stack>
    </Stack>
  );
};
