import { useAtomValue, useSetAtom } from "jotai";
import { activeConnectionAtom, workspacesAtom } from "./state";
import { Workspace } from "./Workspace";
import { Stack } from "@mantine/core";
import { getHotkeyHandler } from "@mantine/hooks";
import "./WorkspacePopover.css";
import { useState } from "react";
import fuzzysort from "fuzzysort";
import type { Connection } from "./types";

interface WorkspacePopoverProps {
  onClose: () => void;
}

interface SearchableItem {
  workspaceName: string;
  connectionName: string;
  user: string;
  host: string;
  dbName: string;
  connection: Connection;
}

export interface ConnectionHighlights {
  workspaceName?: Fuzzysort.Result;
  connectionName?: Fuzzysort.Result;
  user?: Fuzzysort.Result;
  host?: Fuzzysort.Result;
  dbName?: Fuzzysort.Result;
}

interface ResultEntry {
  item: SearchableItem;
  highlights: ConnectionHighlights;
}

const searchKeys = ["workspaceName", "connectionName", "user", "host", "dbName"] as const;

export const WorkspacePopover = ({ onClose }: WorkspacePopoverProps) => {
  const workspaces = useAtomValue(workspacesAtom);
  const activeConnection = useAtomValue(activeConnectionAtom);
  const setActiveConnection = useSetAtom(activeConnectionAtom);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);

  const items: SearchableItem[] = workspaces.flatMap(workspace =>
    workspace.connections.map(connection => {
      const url = new URL(connection.url);
      return {
        workspaceName: workspace.name,
        connectionName: connection.name,
        user: url.username,
        host: url.hostname,
        dbName: url.pathname.replace(/^\//u, ""),
        connection,
      };
    }),
  );

  const filtered: ResultEntry[] =
    query.trim().length === 0
      ? items.map(item => ({ item, highlights: {} }))
      : fuzzysort.go(query, items, { keys: [...searchKeys] }).map(result => ({
          item: result.obj,
          highlights: {
            workspaceName: result[0],
            connectionName: result[1],
            user: result[2],
            host: result[3],
            dbName: result[4],
          },
        }));

  const clampedCursor = Math.min(cursor, Math.max(0, filtered.length - 1));
  const highlightedEntry = filtered[clampedCursor];

  const groupedNames: string[] = [];
  const groupedEntries = new Map<string, ResultEntry[]>();
  for (const entry of filtered) {
    const existing = groupedEntries.get(entry.item.workspaceName);
    if (existing) {
      existing.push(entry);
    } else {
      groupedNames.push(entry.item.workspaceName);
      groupedEntries.set(entry.item.workspaceName, [entry]);
    }
  }

  const activate = (workspaceName: string, connection: Connection) => {
    setActiveConnection({ workspaceName, connection });
    onClose();
  };

  return (
    <div className='popover'>
      <Stack gap='xl'>
        <input
          type='text'
          placeholder='Search connections'
          className='query'
          autoComplete='off'
          autoCorrect='off'
          autoFocus
          value={query}
          onChange={e => {
            setQuery(e.target.value);
            setCursor(0);
          }}
          onKeyDown={getHotkeyHandler([
            ["ArrowUp", () => setCursor(c => Math.max(0, c - 1))],
            ["ArrowDown", () => setCursor(c => Math.min(filtered.length - 1, c + 1))],
            [
              "Enter",
              () => {
                if (highlightedEntry) {
                  activate(highlightedEntry.item.workspaceName, highlightedEntry.item.connection);
                }
              },
            ],
          ])}
        />
        <Stack gap={40} mah='60vh' style={{ overflowY: "auto" }}>
          {groupedNames.map(name => {
            const entries = groupedEntries.get(name) ?? [];
            return (
              <Workspace
                key={name}
                name={name}
                entries={entries}
                workspaceNameHighlight={entries[0]?.highlights.workspaceName}
                activeUrl={
                  activeConnection?.workspaceName === name
                    ? activeConnection.connection.url
                    : undefined
                }
                highlightedUrl={
                  highlightedEntry?.item.workspaceName === name
                    ? highlightedEntry.item.connection.url
                    : undefined
                }
                onActivate={connection => activate(name, connection)}
                onHover={connection => {
                  const index = filtered.findIndex(
                    e => e.item.workspaceName === name && e.item.connection.url === connection.url,
                  );
                  if (index >= 0) {
                    setCursor(index);
                  }
                }}
              />
            );
          })}
        </Stack>
      </Stack>
    </div>
  );
};
