import { IconPlus, IconSearch } from "@tabler/icons-react";
import { getHotkeyHandler } from "@mantine/hooks";
import fuzzysort from "fuzzysort";
import { useState } from "react";
import { ConnectionItem } from "./ConnectionItem";
import { WorkspaceHeader } from "./WorkspaceHeader";
import type { Connection, Workspace } from "./types";
import { parseConnectionUrl } from "./urlParts";

export interface ConnectionHighlights {
  workspaceName?: Fuzzysort.Result;
  connectionName?: Fuzzysort.Result;
  user?: Fuzzysort.Result;
  host?: Fuzzysort.Result;
  dbName?: Fuzzysort.Result;
}

interface SearchableItem {
  workspaceName: string;
  connectionName: string;
  user: string;
  host: string;
  dbName: string;
  connection: Connection;
}

interface ResultEntry {
  item: SearchableItem;
  highlights: ConnectionHighlights;
}

const searchKeys = ["workspaceName", "connectionName", "user", "host", "dbName"] as const;

interface WorkspaceListProps {
  workspaces: Workspace[];
  activeWorkspaceName?: string;
  activeConnectionUrl?: string;
  expandedNames: Set<string>;
  onToggleExpand: (name: string) => void;
  onActivate: (workspaceName: string, connection: Connection) => void;
  onEditConnection: (workspaceName: string, connection: Connection) => void;
  onAddConnection: (workspaceName: string) => void;
  onRemoveConnection: (workspaceName: string, connection: Connection) => void;
  onDuplicateConnection: (workspaceName: string, connection: Connection) => void;
  onEditWorkspace: (name: string) => void;
  onRemoveWorkspace: (name: string) => void;
  onAddWorkspace: () => void;
}

export const WorkspaceList = ({
  workspaces,
  activeWorkspaceName,
  activeConnectionUrl,
  expandedNames,
  onToggleExpand,
  onActivate,
  onEditConnection,
  onAddConnection,
  onRemoveConnection,
  onDuplicateConnection,
  onEditWorkspace,
  onRemoveWorkspace,
  onAddWorkspace,
}: WorkspaceListProps) => {
  const [query, setQuery] = useState("");

  const items: SearchableItem[] = workspaces.flatMap(workspace =>
    workspace.connections.map(connection => {
      const parsed = parseConnectionUrl(connection.url);
      return {
        workspaceName: workspace.name,
        connectionName: connection.name,
        user: parsed?.user ?? "",
        host: parsed?.host ?? "",
        dbName: parsed?.database ?? "",
        connection,
      };
    }),
  );

  const [cursor, setCursor] = useState(() => {
    if (!activeWorkspaceName || !activeConnectionUrl) {
      return 0;
    }
    const index = items.findIndex(
      item =>
        item.workspaceName === activeWorkspaceName && item.connection.url === activeConnectionUrl,
    );
    return Math.max(index, 0);
  });

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

  // Show all workspaces (even empty) when not searching.
  const isSearching = query.trim().length > 0;
  const allNames = isSearching ? groupedNames : workspaces.map(workspace => workspace.name);
  const cursorWorkspaceName = highlightedEntry?.item.workspaceName;

  return (
    <div className='picker-list-view'>
      <div className='picker-search'>
        <IconSearch size={14} className='icn' />
        <input
          type='text'
          className='picker-search-input'
          placeholder='Search workspaces & connections…'
          autoComplete='off'
          autoCorrect='off'
          autoFocus
          value={query}
          onChange={event => {
            setQuery(event.target.value);
            setCursor(0);
          }}
          onKeyDown={getHotkeyHandler([
            ["ArrowUp", () => setCursor(c => Math.max(0, c - 1))],
            ["ArrowDown", () => setCursor(c => Math.min(filtered.length - 1, c + 1))],
            [
              "Enter",
              () => {
                if (highlightedEntry) {
                  onActivate(highlightedEntry.item.workspaceName, highlightedEntry.item.connection);
                }
              },
            ],
          ])}
        />
      </div>

      <div className='picker-list'>
        {allNames.map(workspaceName => {
          const workspace = workspaces.find(w => w.name === workspaceName);
          if (!workspace) {
            return null;
          }
          const entries = groupedEntries.get(workspaceName) ?? [];
          const isOpen =
            isSearching ||
            expandedNames.has(workspaceName) ||
            cursorWorkspaceName === workspaceName;
          const connectionsToShow = isSearching
            ? entries.map(entry => ({
                connection: entry.item.connection,
                highlights: entry.highlights,
              }))
            : workspace.connections.map(connection => ({
                connection,
                highlights: {} as ConnectionHighlights,
              }));

          return (
            <div key={workspaceName} className='picker-ws'>
              <WorkspaceHeader
                name={workspaceName}
                connectionCount={workspace.connections.length}
                isOpen={isOpen}
                nameHighlight={entries[0]?.highlights.workspaceName}
                onToggle={() => onToggleExpand(workspaceName)}
                onEdit={() => onEditWorkspace(workspaceName)}
                onAddConnection={() => onAddConnection(workspaceName)}
                onRemove={() => onRemoveWorkspace(workspaceName)}
              />
              {isOpen && (
                <div className='picker-conns'>
                  {connectionsToShow.map(({ connection, highlights }) => (
                    <ConnectionItem
                      key={connection.url}
                      connection={connection}
                      highlights={highlights}
                      isActive={
                        workspaceName === activeWorkspaceName &&
                        connection.url === activeConnectionUrl
                      }
                      isHighlighted={
                        highlightedEntry?.item.workspaceName === workspaceName &&
                        highlightedEntry.item.connection.url === connection.url
                      }
                      onActivate={() => onActivate(workspaceName, connection)}
                      onHover={() => {
                        const index = filtered.findIndex(
                          e =>
                            e.item.workspaceName === workspaceName &&
                            e.item.connection.url === connection.url,
                        );
                        if (index >= 0) {
                          setCursor(index);
                        }
                      }}
                      onEdit={() => onEditConnection(workspaceName, connection)}
                      onDuplicate={() => onDuplicateConnection(workspaceName, connection)}
                      onRemove={() => onRemoveConnection(workspaceName, connection)}
                    />
                  ))}
                  {!isSearching && (
                    <button
                      type='button'
                      className='picker-add-row'
                      onClick={() => onAddConnection(workspaceName)}
                    >
                      <span className='plus'>
                        <IconPlus size={12} />
                      </span>
                      <span>Add connection</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {workspaces.length === 0 && (
          <div className='picker-empty'>No workspaces yet. Create your first one below.</div>
        )}
      </div>

      <div className='picker-foot'>
        <button type='button' className='picker-foot-add' onClick={onAddWorkspace}>
          <span className='plus'>
            <IconPlus size={12} />
          </span>
          <span>New workspace</span>
        </button>
        <span className='picker-foot-kbd'>
          <kbd>↵</kbd> switch
        </span>
      </div>
    </div>
  );
};
