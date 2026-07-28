import fuzzysort from "fuzzysort";
import { CommandPaletteResult } from "./commands";
import { useSearchPageCommand } from "./commands/searchPage";
import { useGoToNodeCommand } from "./commands/goToNode";
import { useOpenConnectionPickerCommand } from "./commands/openConnectionPicker";
import { useViewSchemaCommand } from "./commands/viewSchema";
import { useOrganizeCanvasCommand } from "./commands/organizeCanvas";
import { useRerunAllQueriesOnPageCommand } from "./commands/rerunAllQueriesOnPage";
import { useRerunSelectedQueriesCommand } from "./commands/rerunSelectedQueries";
import { useExportSelectedDataCsvCommand } from "./commands/exportSelectedDataCsv";
import { useExportSelectedDataJsonCommand } from "./commands/exportSelectedDataJson";
import { usePivotResultCommand } from "./commands/pivotResult";
import { useNewPageCommand } from "./commands/newPage";
import { useClosePageCommand } from "./commands/closePage";
import { useNextPageCommand, usePreviousPageCommand } from "./commands/nextPage";
import { useGoToPageCommands } from "./commands/useGoToPageCommands";
import { useHostSessionCommand } from "./commands/hostSession";
import { useJoinSessionCommand } from "./commands/joinSession";
import { useOpenThemePickerCommand } from "./commands/openThemePicker";
import { useShowHistoryCommand } from "./commands/showHistory";
import { useToggleUiCommand } from "./commands/toggleUi";
import { useShowKeymapCommand } from "./commands/showKeymap";
import { useAboutCommand } from "./commands/about";
import { useCameraLockCommand } from "./commands/cameraLock";
import {
  useFitNodesToViewAndLockCommand,
  useFitNodesToViewCommand,
} from "./commands/fitNodesToView";
import { useGroupSelectionIntoRegionCommand } from "./commands/groupSelectionIntoRegion";
import { useUngroupSelectionFromRegionCommand } from "./commands/ungroupSelectionFromRegion";
import { useGroupWithAiCommand } from "./commands/groupWithAi";
import { useRegroupAllWithAiCommand } from "./commands/regroupAllWithAi";
import { useToggleRegionsCommand } from "./commands/toggleRegions";
import { useToggleAutomaticallyLabelQueriesCommand } from "./commands/toggleAutomaticallyLabelQueries";
import { useTogglePageDisplayCommand } from "./commands/togglePageDisplay";
import { useToggleCommandPaletteButtonCommand } from "./commands/toggleCommandPaletteButton";
import { useToggleCollaborationButtonCommand } from "./commands/toggleCollaborationButton";
import { useToggleLiveQueryCountCommand } from "./commands/toggleLiveQueryCount";

export interface SearchResult {
  command: CommandPaletteResult;
  labelHighlight?: Fuzzysort.Result;
}

export const useSearch = (query: string): SearchResult[] => {
  const searchPageCommand = useSearchPageCommand();
  const goToNodeCommand = useGoToNodeCommand();
  const connectionPickerCommand = useOpenConnectionPickerCommand();
  const viewSchemaCommand = useViewSchemaCommand();
  const organizeCanvasCommand = useOrganizeCanvasCommand();
  const rerunAllOnPage = useRerunAllQueriesOnPageCommand();
  const rerunSelected = useRerunSelectedQueriesCommand();
  const exportCsv = useExportSelectedDataCsvCommand();
  const exportJson = useExportSelectedDataJsonCommand();
  const pivotResultCommand = usePivotResultCommand();
  const newPageCommand = useNewPageCommand();
  const closePageCommand = useClosePageCommand();
  const nextPageCommand = useNextPageCommand();
  const previousPageCommand = usePreviousPageCommand();
  const goToPageCommands = useGoToPageCommands();
  const hostSessionCommand = useHostSessionCommand();
  const joinSessionCommand = useJoinSessionCommand();
  const themePickerCommand = useOpenThemePickerCommand();
  const showHistoryCommand = useShowHistoryCommand();
  const toggleUiCommand = useToggleUiCommand();
  const showKeymapCommand = useShowKeymapCommand();
  const aboutCommand = useAboutCommand();
  const cameraLockCommand = useCameraLockCommand();
  const fitNodesCommand = useFitNodesToViewCommand();
  const fitNodesAndLockCommand = useFitNodesToViewAndLockCommand();
  const groupSelectionCommand = useGroupSelectionIntoRegionCommand();
  const ungroupSelectionCommand = useUngroupSelectionFromRegionCommand();
  const groupWithAiCommand = useGroupWithAiCommand();
  const regroupAllWithAiCommand = useRegroupAllWithAiCommand();
  const toggleRegionsCommand = useToggleRegionsCommand();
  const toggleAutomaticallyLabelQueriesCommand = useToggleAutomaticallyLabelQueriesCommand();
  const togglePageDisplayCommand = useTogglePageDisplayCommand();
  const toggleCommandPaletteButtonCommand = useToggleCommandPaletteButtonCommand();
  const toggleCollaborationButtonCommand = useToggleCollaborationButtonCommand();
  const toggleLiveQueryCountCommand = useToggleLiveQueryCountCommand();

  const searchSpace: CommandPaletteResult[] = [
    toggleUiCommand,
    cameraLockCommand,
    ...(fitNodesCommand ? [fitNodesCommand] : []),
    ...(fitNodesAndLockCommand ? [fitNodesAndLockCommand] : []),
    ...(groupSelectionCommand ? [groupSelectionCommand] : []),
    ...(ungroupSelectionCommand ? [ungroupSelectionCommand] : []),
    ...(groupWithAiCommand ? [groupWithAiCommand] : []),
    ...(regroupAllWithAiCommand ? [regroupAllWithAiCommand] : []),
    toggleRegionsCommand,
    ...(toggleAutomaticallyLabelQueriesCommand ? [toggleAutomaticallyLabelQueriesCommand] : []),
    togglePageDisplayCommand,
    toggleCommandPaletteButtonCommand,
    toggleCollaborationButtonCommand,
    toggleLiveQueryCountCommand,
    rerunAllOnPage,
    rerunSelected,
    exportCsv,
    exportJson,
    ...(pivotResultCommand ? [pivotResultCommand] : []),
    searchPageCommand,
    goToNodeCommand,
    connectionPickerCommand,
    viewSchemaCommand,
    organizeCanvasCommand,
    newPageCommand,
    ...(closePageCommand ? [closePageCommand] : []),
    ...(nextPageCommand ? [nextPageCommand] : []),
    ...(previousPageCommand ? [previousPageCommand] : []),
    ...goToPageCommands,
    hostSessionCommand,
    ...(joinSessionCommand ? [joinSessionCommand] : []),
    themePickerCommand,
    ...(showHistoryCommand ? [showHistoryCommand] : []),
    showKeymapCommand,
    aboutCommand,
  ];

  if (query.trim().length === 0) {
    return [];
  }

  return fuzzysort.go(query, searchSpace, { keys: ["label", "searchAgainst"] }).map(result => ({
    command: result.obj,
    labelHighlight: result[0],
  }));
};
