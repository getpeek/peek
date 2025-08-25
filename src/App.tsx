import { useEffect, useRef, useState } from "react";
import {
  createTLStore,
  defaultBindingUtils,
  defaultShapeUtils,
  Editor,
  getSnapshot,
  loadSnapshot,
  Tldraw,
  TLStore,
  useEditor,
} from "tldraw";
import { customComponents, customUiOverrides } from "./TldrawUi";
import {
  sqlLanguageAtom,
  sqlParserAtom,
  editorAtom,
  darkModeAtom,
} from "./state";
import { useAtomValue, useSetAtom } from "jotai";
import { createTheme, MantineProvider } from "@mantine/core";
import { Parser, Language } from "web-tree-sitter";
import { MonacoManager } from "./shapes/Query/Editor/MonacoManager";
import {
  activeConnectionAtom,
  snapshotForUrlAtom,
  snapshotsAtom,
} from "./Connection/state";
import { customShapes } from "./shapes";
import { indexedDBService } from "./db/IndexedDBService";
import "tldraw/tldraw.css";
import "@mantine/core/styles.css";
import "@mantine/charts/styles.css";
import "./App.css";
import { AiPromptTool } from "./shapes/Ai/AiTool";
import { QueryTool } from "./shapes/Query/QueryTool";
import { CustomBackground, CustomGrid } from "./components/CustomBackground";
import { CustomTitleBar } from "./components/CustomTitleBar";
import { CommandPalette } from "./command-palette/CommandPalette";
import { DropZone } from "./drop-zone/DropZone";

const theme = createTheme({});

function DarkModeSync() {
  const editor = useEditor();
  const isDarkMode = useAtomValue(darkModeAtom);

  useEffect(() => {
    if (editor) {
      editor.user.updateUserPreferences({
        colorScheme: isDarkMode ? "dark" : "light",
      });
    }
  }, [isDarkMode, editor]);

  return null;
}

function App() {
  const ref = useRef<Editor>();
  const setSqlParser = useSetAtom(sqlParserAtom);
  const sqlSqlLanguage = useSetAtom(sqlLanguageAtom);
  const setEditor = useSetAtom(editorAtom);
  const activeConnection = useAtomValue(activeConnectionAtom);
  const isDarkMode = useAtomValue(darkModeAtom);
  const initialSnapshot = useAtomValue(
    snapshotForUrlAtom(activeConnection?.connection.url ?? "default"),
  );
  const [store, setStore] = useState<TLStore>();
  const setSnapshots = useSetAtom(snapshotsAtom);
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialLoadRef = useRef(true);

  const initTreeSitter = async () => {
    await Parser.init();

    const wasmPath = new URL("/tree-sitter-sql.wasm", window.location.origin)
      .href;
    const SQL = await Language.load(wasmPath);

    const parser = new Parser();
    parser.setLanguage(SQL);
    setSqlParser(parser);
    sqlSqlLanguage(SQL);
  };

  useEffect(() => {
    indexedDBService.init().catch(console.error);
    initTreeSitter().then(() => {});
  }, []);

  useEffect(() => {
    const tlStore = createTLStore({
      shapeUtils: [...defaultShapeUtils, ...customShapes],
      bindingUtils: [...defaultBindingUtils],
    });
    setStore(tlStore);

    return () => {
      tlStore.dispose();
    };
  }, []);

  useEffect(() => {
    if (!store) {
      return;
    }

    try {
      loadSnapshot(store, initialSnapshot);
      isInitialLoadRef.current = false;
    } catch {}
  }, [store, initialSnapshot, activeConnection?.connection.url]);

  useEffect(() => {
    if (!activeConnection || !store) {
      return;
    }

    const saveSnapshot = () => {
      setSnapshots((previous) => ({
        ...previous,
        [activeConnection.connection.url]: getSnapshot(store),
      }));
      console.log("Saved changes at", new Date().toISOString());
    };

    const cleanup = store.listen(
      () => {
        if (debounceTimeoutRef.current) {
          clearTimeout(debounceTimeoutRef.current);
        }
        debounceTimeoutRef.current = setTimeout(() => {
          saveSnapshot();
          debounceTimeoutRef.current = null;
        }, 3000);
      },
      { scope: "document", source: "user" },
    );

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      cleanup();
    };
  }, [activeConnection?.connection.url]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

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
