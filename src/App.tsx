import { useRef } from "react";
import { Editor, Tldraw } from "tldraw";
import { customComponents, customUiOverrides } from "./TldrawUi";
import { darkModeAtom, editorAtom } from "./state";
import { useAtomValue, useSetAtom } from "jotai";
import { createTheme, MantineProvider } from "@mantine/core";
import { MonacoManager } from "./shapes/Query/Editor/MonacoManager";
import { customShapes } from "./shapes";
import { AiPromptTool } from "./shapes/Ai/AiTool";
import { QueryTool } from "./shapes/Query/QueryTool";
import { CustomBackground, CustomGrid } from "./components/CustomBackground";
import { CustomTitleBar } from "./components/CustomTitleBar";
import { CommandPalette } from "./command-palette/CommandPalette";
import { DropZone } from "./drop-zone/DropZone";
import { useGetConfig } from "./app/useGetConfig";
import { useTreesitter } from "./app/useInitTreesitter";
import { useTLStore } from "./app/useTLStore";
import { DarkModeSync } from "./app/DarkModeSync";
import { useAutoSaveDocument } from "./app/useAutoSaveDocument";
import { useLoadDocument } from "./app/useLoadDocument";
import "tldraw/tldraw.css";
import "@mantine/core/styles.css";
import "@mantine/charts/styles.css";
import "./App.css";

const theme = createTheme({});

function App() {
  const ref = useRef<Editor>();
  const setEditor = useSetAtom(editorAtom);
  const isDarkMode = useAtomValue(darkModeAtom);

  const store = useTLStore();
  useGetConfig();
  useTreesitter();
  useAutoSaveDocument(store);
  useLoadDocument(store);

  return (
    <MantineProvider
      theme={theme}
      forceColorScheme={isDarkMode ? "dark" : "light"}
    >
      <CustomTitleBar />
      <DropZone />
      <MonacoManager />

      <Tldraw
        onMount={(editor) => {
          ref.current = editor;
          setEditor(editor);
          editor.updateInstanceState({ isGridMode: true });
          editor.addListener("deleted-shapes", (ids) => {
            for (const id of ids) {
              const bindings = editor.getBindingsInvolvingShape(id);
              for (const binding of bindings) {
                const deletedShape = editor.getShape(id);
                if (deletedShape?.type === "arrow") {
                  continue;
                }
                const from = editor.getShape(binding.fromId);
                const to = editor.getShape(binding.toId);

                console.log(from, to);
                if (from?.type === "arrow") {
                  editor.deleteShape(from);
                }

                if (to?.type === "arrow") {
                  editor.deleteShape(to);
                }
              }
            }
          });
        }}
        store={store}
        shapeUtils={customShapes}
        overrides={customUiOverrides}
        components={{
          ...customComponents,
          Background: CustomBackground,
          Grid: CustomGrid,
        }}
        tools={[QueryTool, AiPromptTool]}
      >
        <DarkModeSync />
      </Tldraw>
      <CommandPalette />
    </MantineProvider>
  );
}

export default App;
