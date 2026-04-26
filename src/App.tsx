import { useAtomValue } from "jotai";
import { createTheme, MantineProvider } from "@mantine/core";
import { MonacoManager } from "./shapes/Query/Editor/MonacoManager";
import { CustomTitleBar } from "./components/CustomTitleBar";
import { CommandPalette } from "./command-palette/CommandPalette";
import { DropZone } from "./drop-zone/DropZone";
import { useGetConfig } from "./app/useGetConfig";
import { ReactFlowCanvas } from "./canvas/ReactFlowCanvas";
import { useAutoSaveDocument } from "./canvas/useAutoSaveDocument";
import { useLoadDocument } from "./canvas/useLoadDocument";
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
  useLoadDocument();

  return (
    <MantineProvider
      theme={theme}
      forceColorScheme={isDarkMode ? "dark" : "light"}
    >
      <CustomTitleBar />
      <DropZone />
      <MonacoManager />
      <ReactFlowCanvas />
      <CommandPalette />
    </MantineProvider>
  );
}

export default App;
