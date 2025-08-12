import { useAtomValue } from "jotai";
import { commands } from "./commands";
import { editorAtom } from "../state";
import { useGetQueryCommands } from "./commands/useQueryCommands";
import { useGetConnectionCommands } from "./commands/useGetConnectionCommands";

export const useSearch = (query: string) => {
  const editor = useAtomValue(editorAtom);
  const queryCommands = useGetQueryCommands();
  const connectionCommands = useGetConnectionCommands();

  if (!editor) {
    return [];
  }

  if (query.trim().length === 0) {
    return [];
  }

  return [...commands, ...queryCommands, ...connectionCommands]
    .filter((command) =>
      command.searchAgainst.toLowerCase().match(query.toLowerCase()),
    )
    .slice(0, 10);
};
