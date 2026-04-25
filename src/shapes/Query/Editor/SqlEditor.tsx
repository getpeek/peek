import Editor, { Monaco } from "@monaco-editor/react";
import { editor } from "monaco-editor";
import "../Query.css";
import { useEffect, useRef } from "react";
import { useAtomValue } from "jotai";
import { darkModeAtom } from "../../../state";

export const SqlEditor = ({
  query,
  onQueryChange,
  onMount,
}: {
  query: string;
  onQueryChange: (query: string) => void;
  onMount?: (editor: editor.IStandaloneCodeEditor, monaco: Monaco) => void;
}) => {
  const isDarkMode = useAtomValue(darkModeAtom);
  const ref = useRef<Monaco | null>(null);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const theme = isDarkMode ? "rose-pine" : "rose-pine-dawn";

  useEffect(() => {
    if (!ref.current) {
      return;
    }
    ref.current.editor.setTheme(theme);
  }, [isDarkMode, ref.current]);

  useEffect(() => {
    const ed = editorRef.current;
    if (!ed) return;
    if (ed.getValue() !== query) {
      ed.setValue(query);
    }
  }, [query]);

  return (
    <div style={{ height: "100%", width: "100%", position: "relative" }}>
      <div className="query-window" style={{ height: "100%", width: "100%" }}>
        <Editor
          height="100%"
          defaultLanguage="sql"
          defaultValue={query}
          theme="rose-pine"
          onMount={(editor, monaco) => {
            ref.current = monaco;
            editorRef.current = editor;
            monaco.editor.setTheme(theme);
            onMount?.(editor, monaco);
          }}
          options={{
            lineNumbers: "off",
            wordWrap: "on",
            cursorStyle: "block",
            minimap: { enabled: false },
            padding: { top: 16, bottom: 16 },
            lineDecorationsWidth: 0,
            lineNumbersMinChars: 0,
            glyphMargin: false,
            guides: {
              indentation: false,
            },
            renderLineHighlight: "none",
            hideCursorInOverviewRuler: true,
            overviewRulerBorder: false,
            overviewRulerLanes: 0,
            autoClosingBrackets: "always",
            autoClosingOvertype: "always",
            autoClosingQuotes: "always",
            scrollbar: {
              vertical: "auto",
              horizontal: "auto",
              verticalScrollbarSize: 10,
              horizontalScrollbarSize: 10,
              useShadows: false,
            },
            suggest: {
              showKeywords: true,
              showSnippets: true,
              insertMode: "replace",
            },
            quickSuggestions: {
              other: true,
              comments: false,
              strings: false,
            },
            acceptSuggestionOnCommitCharacter: true,
            acceptSuggestionOnEnter: "on",
            accessibilitySupport: "off",
            automaticLayout: true,
            fontSize: 14,
            fontFamily:
              "Monaspace Krypton, SF Mono, Monaco, Inconsolata, Roboto Mono, monospace",
            lineHeight: 1.6,
            letterSpacing: 0.5,
            smoothScrolling: true,
            cursorBlinking: "solid",
            cursorSmoothCaretAnimation: "off",
            // Improve mouse interaction
            smartSelect: {
              selectSubwords: true,
              selectLeadingAndTrailingWhitespace: false,
            },
            mouseWheelZoom: false,
            dragAndDrop: true,
            multiCursorModifier: "ctrlCmd",
            selectOnLineNumbers: false,
            contextmenu: true,
            columnSelection: false,
            selectionHighlight: true,
            occurrencesHighlight: "singleFile",
            readOnly: false,
            renderControlCharacters: false,
            renderWhitespace: "none",
            copyWithSyntaxHighlighting: true,
          }}
          onChange={(value) => onQueryChange(value ?? "")}
        />
      </div>
    </div>
  );
};
