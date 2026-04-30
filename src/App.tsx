import { useAtomValue } from "jotai";
import { createTheme, MantineProvider } from "@mantine/core";
import { MonacoManager } from "./shapes/Query/Editor/MonacoManager";
import { CustomTitleBar } from "./components/CustomTitleBar";
import { CommandPalette } from "./command-palette/CommandPalette";
import { DropZone } from "./drop-zone/DropZone";
import { useGetConfig } from "./app/useGetConfig";
import { ClosePageConfirmModal } from "./canvas/ClosePageConfirmModal";
import { ReactFlowCanvas } from "./canvas/ReactFlowCanvas";
import { useAutoSaveDocument } from "./canvas/hooks/useAutoSaveDocument";
import { useAutoSaveResults } from "./canvas/hooks/useAutoSaveResults";
import { useLoadDocument } from "./canvas/hooks/useLoadDocument";
import { useMultiplayer } from "./multiplayer/syncBridge";
import { darkModeAtom } from "./state";
import "@mantine/core/styles.css";
import "@mantine/charts/styles.css";
import "./canvas/theme.css";
import "./App.css";

const theme = createTheme({});

function App() {
  const isDarkMode = useAtomValue(darkModeAtom);

  useGetConfig();
  useAutoSaveDocument();
  useAutoSaveResults();
  useLoadDocument();
  useMultiplayer();

  return (
    <MantineProvider theme={theme} forceColorScheme={isDarkMode ? "dark" : "light"}>
      <CustomTitleBar />
      <DropZone />
      <MonacoManager />
      <ReactFlowCanvas />
      <CommandPalette />
      <ClosePageConfirmModal />
    </MantineProvider>
  );
}

export default App;
