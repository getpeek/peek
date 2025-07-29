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
import { QueryTool } from "./tools/QueryTool";
import { sqlLanguageAtom, sqlParserAtom } from "./state";
import { useAtom, useAtomValue } from "jotai";
import { createTheme, MantineProvider } from "@mantine/core";
import { Parser, Language } from "web-tree-sitter";
import { MonacoManager } from "./shapes/Query/Editor/MonacoManager";
import {
  activeConnectionAtom,
  snapshotForUrlAtom,
  snapshotsAtom,
} from "./Connection/state";
import { customShapes } from "./shapes";
import "tldraw/tldraw.css";
import "@mantine/core/styles.css";
import "@mantine/charts/styles.css";
import "./App.css";
import { AiPromptTool } from "./shapes/Ai/AiTool";

const theme = createTheme({});

function App() {
  const ref = useRef<Editor>();
  const [, setSqlParser] = useAtom(sqlParserAtom);
  const [, sqlSqlLanguage] = useAtom(sqlLanguageAtom);
  const activeConnection = useAtomValue(activeConnectionAtom);
  const initialSnapshot = useAtomValue(
    snapshotForUrlAtom(activeConnection?.connection.url ?? "default"),
  );
  const [store, setStore] = useState<TLStore>();
  const [, setSnapshots] = useAtom(snapshotsAtom);
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialLoadRef = useRef(true); // To track initial snapshot load

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

    loadSnapshot(store, initialSnapshot);
    isInitialLoadRef.current = false;
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
      console.log("Saved changes");
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
      <div style={{ position: "fixed", inset: 0 }}>
        <MonacoManager />
        <Tldraw
          onMount={(editor) => {
            ref.current = editor;
          }}
          store={store}
          shapeUtils={customShapes}
          overrides={customUiOverrides}
          components={customComponents}
          tools={[QueryTool, AiPromptTool]}
        />
      </div>
    </MantineProvider>
  );
}

export default App;
