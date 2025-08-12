import { useAtomValue } from "jotai";
import fuzzysort from "fuzzysort";
import { commands } from "./commands";
import { editorAtom } from "../state";
import { useGoToQueryCommands } from "./commands/useGoToQueryCommands";
import { useGetConnectionCommands } from "./commands/useGetConnectionCommands";

export const useSearch = (query: string) => {
  const editor = useAtomValue(editorAtom);
  const queryCommands = useGoToQueryCommands();
  const connectionCommands = useGetConnectionCommands();

  if (!editor) {
    return [];
  }

  if (query.trim().length === 0) {
    return [];
  }

  const searchSpace = [...commands, ...queryCommands, ...connectionCommands];
  return fuzzysort
    .go(query, searchSpace, { key: "searchAgainst" })
    .map((result) => result.obj);
};
