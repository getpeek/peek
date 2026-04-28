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
import { useNewPageCommand } from "./commands/newPage";
import { useClosePageCommand } from "./commands/closePage";
import {
  useNextPageCommand,
  usePreviousPageCommand,
} from "./commands/nextPage";
import { useGoToPageCommands } from "./commands/useGoToPageCommands";
import { useGoToTableCommands } from "./commands/useGoToTableCommands";
import { useHostSessionCommand } from "./commands/hostSession";
import { useJoinSessionCommand } from "./commands/joinSession";

export const useSearch = (query: string): CommandPaletteResult[] => {
  const queryCommands = useGoToQueryCommands();
  const connectionCommands = useGetConnectionCommands();
  const toggleDarkModeCommand = useToggleDarkModeCommand();
  const viewSchemaCommand = useViewSchemaCommand();
  const rerunAllOnPage = useRerunAllQueriesOnPageCommand();
  const rerunSelected = useRerunSelectedQueriesCommand();
  const exportCsv = useExportSelectedDataCsvCommand();
  const exportJson = useExportSelectedDataJsonCommand();
  const newPageCommand = useNewPageCommand();
  const closePageCommand = useClosePageCommand();
  const nextPageCommand = useNextPageCommand();
  const previousPageCommand = usePreviousPageCommand();
  const goToPageCommands = useGoToPageCommands();
  const goToTableCommands = useGoToTableCommands();
  const hostSessionCommand = useHostSessionCommand();
  const joinSessionCommand = useJoinSessionCommand();

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
    newPageCommand,
    ...(closePageCommand ? [closePageCommand] : []),
    ...(nextPageCommand ? [nextPageCommand] : []),
    ...(previousPageCommand ? [previousPageCommand] : []),
    ...goToPageCommands,
    ...goToTableCommands,
    hostSessionCommand,
    ...(joinSessionCommand ? [joinSessionCommand] : []),
  ];
  return fuzzysort
    .go(query, searchSpace, { key: "searchAgainst" })
    .map((result) => result.obj);
};
