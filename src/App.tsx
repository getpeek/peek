import { createTheme, MantineProvider } from "@mantine/core";
import { useAtomValue } from "jotai";
import { MonacoManager } from "./shapes/Query/Editor/MonacoManager";
import { CustomTitleBar } from "./components/titlebar/CustomTitleBar";
import { CommandPalette } from "./command-palette/CommandPalette";
import { DropZone } from "./drop-zone/DropZone";
import { useGetConfig } from "./app/useGetConfig";
import { ThemeStylesheet } from "./app/ThemeStylesheet";
import { ClosePageConfirmModal } from "./canvas/ClosePageConfirmModal";
import { ReactFlowCanvas } from "./canvas/ReactFlowCanvas";
import { useAutoSaveDocument } from "./canvas/hooks/useAutoSaveDocument";
import { useAutoSaveResults } from "./canvas/hooks/useAutoSaveResults";
import { useLoadDocument } from "./canvas/hooks/useLoadDocument";
import { InviteConfirmModal } from "./multiplayer/InviteConfirmModal";
import { useMultiplayer } from "./multiplayer/syncBridge";
import { useDeepLinkInvite } from "./multiplayer/useDeepLinkInvite";
import { UpdateDialog } from "./updater/UpdateDialog";
import { configAtom } from "./state";
import "@mantine/core/styles.css";
import "@mantine/charts/styles.css";
import "./canvas/theme.css";
import "./App.css";

const theme = createTheme({});

function App() {
  useGetConfig();
  useAutoSaveDocument();
  useAutoSaveResults();
  useLoadDocument();
  useMultiplayer();
  useDeepLinkInvite();

  const config = useAtomValue(configAtom);
  const colorScheme = config?.theme === "midday" ? "light" : "dark";

  return (
    <MantineProvider theme={theme} forceColorScheme={colorScheme}>
      <ThemeStylesheet />
      <CustomTitleBar />
      <DropZone />
      <MonacoManager />
      <ReactFlowCanvas />
      <CommandPalette />
      <ClosePageConfirmModal />
      <InviteConfirmModal />
      <UpdateDialog />
    </MantineProvider>
  );
}

export default App;
