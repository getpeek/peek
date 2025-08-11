import { ReactNode, useCallback, useMemo } from "react";
import { useGetAllDocuments, useWorkspaces } from "../db/hooks";
import { IconFile, IconNetwork, IconPlayerPlay } from "@tabler/icons-react";
import { Group, Text } from "@mantine/core";
import { useAtomValue, useSetAtom } from "jotai";
import { activeConnectionAtom } from "../Connection/state";
import { editorAtom } from "../state";
import { executeAllQueriesOnPage } from "../tools/batchExecuteQueries";

export interface CommandPaletteResult {
  icon: ReactNode;
  label: ReactNode;
  description?: ReactNode;
  onSelect: () => void;
}

export const useSearch = (query: string) => {
  const { documents } = useGetAllDocuments();
  const connections = useWorkspaces();
  const editor = useAtomValue(editorAtom);
  const setActiveConnection = useSetAtom(activeConnectionAtom);

  const handleRerunAllQueries = useCallback(() => {
    if (!editor) {
      return;
    }
    executeAllQueriesOnPage(editor);
  }, [editor]);

  const results = useMemo(() => {
    if (query.length === 0) {
      return [];
    }

    const commands: CommandPaletteResult[] = [
      {
        shouldRender: () => "rerun all queries".includes(query),
        label: <Text size="xs">Rerun all queries</Text>,
        icon: <IconPlayerPlay size={16} />,
        onSelect: handleRerunAllQueries,
      },
    ].filter((command) => command.shouldRender());

    const matchingPages = documents
      .flatMap(({ document }) =>
        Object.values(document.store).filter(
          (shape) => shape.typeName === "page",
        ),
      )
      .filter((page) => page.name.toLowerCase().includes(query.toLowerCase()))
      .map((page) => ({
        icon: <IconFile size={16} />,
        label: <Text size="xs">{page.name}</Text>,
        onSelect() {},
      }));

    const matchingConnections = connections.workspaces
      .flatMap((workspace) =>
        workspace.connections.map((connection) => ({
          workspaceName: workspace.name,
          connection,
        })),
      )
      .filter(
        (workspace) =>
          workspace.workspaceName.toLowerCase().includes(query.toLowerCase()) ||
          workspace.connection.name.toLowerCase().includes(query.toLowerCase()),
      )
      .map((workspace) => ({
        icon: <IconNetwork size={16} />,
        label: (
          <Group gap="md" align="center">
            <div
              className="color"
              style={{
                background: workspace.connection.color,
                width: 12,
                height: 12,
              }}
            />
            <Text size="xs">
              {workspace.workspaceName} - {workspace.connection.name}
            </Text>
          </Group>
        ),
        onSelect() {
          setActiveConnection({
            workspaceName: workspace.workspaceName,
            connection: workspace.connection,
          });
        },
      }));

    return [...commands, ...matchingPages, ...matchingConnections];
  }, [
    query,
    documents,
    connections.workspaces,
    handleRerunAllQueries,
    setActiveConnection,
  ]);

  return results;
};
