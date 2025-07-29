import Editor, { Monaco } from "@monaco-editor/react";
import { editor } from "monaco-editor";
import "../Query.css";

export const SqlEditor = ({
  query,
  onQueryChange,
  onMount,
}: {
  query: string;
  onQueryChange: (query: string) => void;
  onMount?: (editor: editor.IStandaloneCodeEditor, monaco: Monaco) => void;
}) => {
  return (
    <div style={{ height: "100%", width: "100%", position: "relative" }}>
      <div className="query-window" style={{ height: "100%", width: "100%" }}>
        <Editor
          height="100%"
          defaultLanguage="sql"
          defaultValue={query}
          theme="vs-dark"
          onMount={onMount}
          options={{
            lineNumbers: "off",
            wordWrap: "on",
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
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: "on",
          }}
          onChange={(value) => onQueryChange(value ?? "")}
        />
      </div>
    </div>
  );
};
