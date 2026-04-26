import Editor, { Monaco } from "@monaco-editor/react";
import { editor } from "monaco-editor";
import "../Query.css";
import { useEffect, useRef } from "react";
import { useAtomValue } from "jotai";
import { darkModeAtom } from "../../../state";
import { scanVariableSites } from "../../../canvas/variables";
import { attachLspDocumentSync } from "./lspProvider";

let overflowWidgetsDomNode: HTMLElement | null = null;
const getOverflowWidgetsDomNode = () => {
  if (overflowWidgetsDomNode) return overflowWidgetsDomNode;
  const node = document.createElement("div");
  node.className = "monaco-editor monaco-overflow-widgets-root";
  node.style.position = "absolute";
  node.style.top = "0";
  node.style.left = "0";
  node.style.zIndex = "10000";
  document.body.appendChild(node);
  overflowWidgetsDomNode = node;
  return node;
};

const variablesByModelUri = new Map<string, string[]>();
let variableProviderRegistered = false;

function ensureVariableProvider(monaco: Monaco) {
  if (variableProviderRegistered) return;
  variableProviderRegistered = true;
  monaco.languages.registerCompletionItemProvider("sql", {
    triggerCharacters: ["@"],
    provideCompletionItems(model, position) {
      const uri = model.uri.toString();
      const variables = variablesByModelUri.get(uri) ?? [];
      if (variables.length === 0) return { suggestions: [] };

      const lineText = model.getLineContent(position.lineNumber);
      const before = lineText.substring(0, position.column - 1);
      const match = before.match(/@(\w*)$/);
      if (!match) return { suggestions: [] };

      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: position.column - match[1].length,
        endColumn: word.endColumn,
      };

      return {
        suggestions: variables.map((v) => ({
          label: `@${v}`,
          kind: monaco.languages.CompletionItemKind.Variable,
          insertText: v,
          range,
          detail: "variable",
          sortText: `0_${v}`,
        })),
      };
    },
  });
}

export const SqlEditor = ({
  query,
  variables,
  onQueryChange,
  onMount,
}: {
  query: string;
  variables?: string[];
  onQueryChange: (query: string) => void;
  onMount?: (editor: editor.IStandaloneCodeEditor, monaco: Monaco) => void;
}) => {
  const isDarkMode = useAtomValue(darkModeAtom);
  const ref = useRef<Monaco | null>(null);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const decorationsRef = useRef<editor.IEditorDecorationsCollection | null>(null);
  const variablesRef = useRef<string[]>(variables ?? []);
  const theme = isDarkMode ? "rose-pine" : "rose-pine-dawn";

  useEffect(() => {
    variablesRef.current = variables ?? [];
    const ed = editorRef.current;
    const model = ed?.getModel();
    if (model) {
      variablesByModelUri.set(model.uri.toString(), variables ?? []);
    }
    redrawDecorations();
  }, [variables]);

  const redrawDecorations = () => {
    const ed = editorRef.current;
    if (!ed) return;
    const model = ed.getModel();
    if (!model) return;

    const text = model.getValue();
    const sites = scanVariableSites(text);
    const known = new Set(variablesRef.current);

    const decorations: editor.IModelDeltaDecoration[] = sites.map((site) => {
      const startPos = model.getPositionAt(site.start);
      const endPos = model.getPositionAt(site.end);
      const isMissing = !known.has(site.name);
      return {
        range: {
          startLineNumber: startPos.lineNumber,
          startColumn: startPos.column,
          endLineNumber: endPos.lineNumber,
          endColumn: endPos.column,
        },
        options: {
          inlineClassName: isMissing ? "sql-var-chip-missing" : "sql-var-chip",
          hoverMessage: isMissing
            ? { value: `\`@${site.name}\` is not defined by any connected Variable node` }
            : undefined,
        },
      };
    });

    if (!decorationsRef.current) {
      decorationsRef.current = ed.createDecorationsCollection(decorations);
    } else {
      decorationsRef.current.set(decorations);
    }
  };

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
            ensureVariableProvider(monaco);
            const model = editor.getModel();
            if (model) {
              variablesByModelUri.set(model.uri.toString(), variablesRef.current);
            }
            const contentSub = editor.onDidChangeModelContent(() => {
              redrawDecorations();
            });
            const lspSubs = attachLspDocumentSync(editor);
            const disposeSub = editor.onDidDispose(() => {
              contentSub.dispose();
              lspSubs.forEach((s) => s.dispose());
              if (model) variablesByModelUri.delete(model.uri.toString());
              disposeSub.dispose();
            });
            redrawDecorations();
            onMount?.(editor, monaco);
          }}
          options={{
            lineNumbers: "off",
            wordWrap: "on",
            cursorStyle: "line",
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
            fixedOverflowWidgets: true,
            overflowWidgetsDomNode: getOverflowWidgetsDomNode(),
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
            fontFamily: "Monaspace Krypton, SF Mono, Monaco, Inconsolata, Roboto Mono, monospace",
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
