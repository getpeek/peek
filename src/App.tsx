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
} from "tldraw";
import { customComponents, customUiOverrides } from "./TldrawUi";
import { sqlLanguageAtom, sqlParserAtom, editorAtom } from "./state";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
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

const theme = createTheme({});

function App() {
  const ref = useRef<Editor>();
  const [, setSqlParser] = useAtom(sqlParserAtom);
  const [, sqlSqlLanguage] = useAtom(sqlLanguageAtom);
  const setEditor = useSetAtom(editorAtom);
  const activeConnection = useAtomValue(activeConnectionAtom);
  const initialSnapshot = useAtomValue(
    snapshotForUrlAtom(activeConnection?.connection.url ?? "default"),
  );
  const [store, setStore] = useState<TLStore>();
  const [, setSnapshots] = useAtom(snapshotsAtom);
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
    const initialize = async () => {
      try {
        await indexedDBService.init();
      } catch (error) {
        console.error("Failed to initialize IndexedDB:", error);
      }
    };

    initialize();
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

  return (
    <MantineProvider theme={theme}>
      <CustomTitleBar />

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
      />
      <CommandPalette />
    </MantineProvider>
  );
}

export default App;
