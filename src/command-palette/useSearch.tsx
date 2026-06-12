import fuzzysort from "fuzzysort";
import { CommandPaletteResult } from "./commands";
import { useGoToQueryCommands } from "./commands/useGoToQueryCommands";
import { useGetConnectionCommands } from "./commands/useGetConnectionCommands";
import { useViewSchemaCommand } from "./commands/viewSchema";
import { useOrganizeCanvasCommand } from "./commands/organizeCanvas";
import { useRerunAllQueriesOnPageCommand } from "./commands/rerunAllQueriesOnPage";
import { useRerunSelectedQueriesCommand } from "./commands/rerunSelectedQueries";
import { useExportSelectedDataCsvCommand } from "./commands/exportSelectedDataCsv";
import { useExportSelectedDataJsonCommand } from "./commands/exportSelectedDataJson";
import { useNewPageCommand } from "./commands/newPage";
import { useClosePageCommand } from "./commands/closePage";
import { useNextPageCommand, usePreviousPageCommand } from "./commands/nextPage";
import { useGoToPageCommands } from "./commands/useGoToPageCommands";
import { useGoToTableCommands } from "./commands/useGoToTableCommands";
import { useHostSessionCommand } from "./commands/hostSession";
import { useJoinSessionCommand } from "./commands/joinSession";
import { useSetThemeCommands } from "./commands/setTheme";
import { useToggleUiCommand } from "./commands/toggleUi";
import { useAboutCommand } from "./commands/about";

export interface SearchResult {
  command: CommandPaletteResult;
  labelHighlight?: Fuzzysort.Result;
}

export const useSearch = (query: string): SearchResult[] => {
  const queryCommands = useGoToQueryCommands();
  const connectionCommands = useGetConnectionCommands();
  const viewSchemaCommand = useViewSchemaCommand();
  const organizeCanvasCommand = useOrganizeCanvasCommand();
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
  const setThemeCommands = useSetThemeCommands();
  const toggleUiCommand = useToggleUiCommand();
  const aboutCommand = useAboutCommand();

  const searchSpace: CommandPaletteResult[] = [
    toggleUiCommand,
    rerunAllOnPage,
    rerunSelected,
    exportCsv,
    exportJson,
    ...queryCommands,
    ...connectionCommands,
    viewSchemaCommand,
    organizeCanvasCommand,
    newPageCommand,
    ...(closePageCommand ? [closePageCommand] : []),
    ...(nextPageCommand ? [nextPageCommand] : []),
    ...(previousPageCommand ? [previousPageCommand] : []),
    ...goToPageCommands,
    ...goToTableCommands,
    hostSessionCommand,
    ...(joinSessionCommand ? [joinSessionCommand] : []),
    ...setThemeCommands,
    aboutCommand,
  ];

  if (query.trim().length === 0) {
    return searchSpace.map(command => ({ command }));
  }

  return fuzzysort.go(query, searchSpace, { keys: ["label", "searchAgainst"] }).map(result => ({
    command: result.obj,
    labelHighlight: result[0],
  }));
};
