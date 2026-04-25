import fuzzysort from "fuzzysort";
import { CommandPaletteResult } from "./commands";
import { useGoToQueryCommands } from "./commands/useGoToQueryCommands";
import { useGetConnectionCommands } from "./commands/useGetConnectionCommands";
import { useToggleDarkModeCommand } from "./commands/toggleDarkMode";
import { useViewSchemaCommand } from "./commands/viewSchema";
import { useRerunAllQueriesOnPageCommand } from "./commands/rerunAllQueriesOnPage";
import { useRerunSelectedQueriesCommand } from "./commands/rerunSelectedQueries";
import { useExportSelectedDataCsvCommand } from "./commands/exportSelectedDataCsv";
import { useExportSelectedDataJsonCommand } from "./commands/exportSelectedDataJson";

export const useSearch = (query: string): CommandPaletteResult[] => {
  const queryCommands = useGoToQueryCommands();
  const connectionCommands = useGetConnectionCommands();
  const toggleDarkModeCommand = useToggleDarkModeCommand();
  const viewSchemaCommand = useViewSchemaCommand();
  const rerunAllOnPage = useRerunAllQueriesOnPageCommand();
  const rerunSelected = useRerunSelectedQueriesCommand();
  const exportCsv = useExportSelectedDataCsvCommand();
  const exportJson = useExportSelectedDataJsonCommand();

  if (query.trim().length === 0) {
    return [];
  }

  const searchSpace: CommandPaletteResult[] = [
    rerunAllOnPage,
    rerunSelected,
    exportCsv,
    exportJson,
    ...queryCommands,
    ...connectionCommands,
    toggleDarkModeCommand,
    viewSchemaCommand,
  ];
  return fuzzysort
    .go(query, searchSpace, { key: "searchAgainst" })
    .map((result) => result.obj);
};
