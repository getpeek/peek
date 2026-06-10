import Editor, { Monaco } from "@monaco-editor/react";
import { editor, languages } from "monaco-editor";
import "./editor.css";
import { useEffect, useRef } from "react";
import { useStore } from "@xyflow/react";
import { useAtomValue } from "jotai";
import { scanVariableSites, type VariableValue } from "../../../variables";
import { attachLspDocumentSync } from "./lspProvider";
import { getOverflowWidgetsDomNode, syncOverflowWidgetsScale } from "./overflowWidgets";
import { configAtom } from "../../../../state";

const variablesByModelUri = new Map<string, string[]>();
let variableProviderRegistered = false;

// Markdown shown when hovering a resolved variable chip: the value for a single
// entry, or a count when a connected Variable node supplies a list.
function variableHoverMessage(value: VariableValue): string {
  const values = Array.isArray(value) ? value : [value];
  if (values.length === 1) {
    return `\`${values[0].replaceAll("`", "\\`")}\``;
  }
  return `${values.length} values`;
}

function ensureVariableProvider(monaco: Monaco) {
  if (variableProviderRegistered) {
    return;
  }
  variableProviderRegistered = true;
  const provider: languages.CompletionItemProvider = {
    triggerCharacters: ["@"],
    provideCompletionItems(model, position) {
      const uri = model.uri.toString();
      const variables = variablesByModelUri.get(uri) ?? [];
      if (variables.length === 0) {
        return { suggestions: [] };
      }

      const lineText = model.getLineContent(position.lineNumber);
      const before = lineText.slice(0, position.column - 1);
      const match = before.match(/@(\w*)$/u);
      if (!match) {
        return { suggestions: [] };
      }

      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: position.column - match[1].length,
        endColumn: word.endColumn,
      };

      return {
        suggestions: variables.map(v => ({
          label: `@${v}`,
          kind: monaco.languages.CompletionItemKind.Variable,
          insertText: v,
          range,
          detail: "variable",
          sortText: `0_${v}`,
        })),
      };
    },
  };
  monaco.languages.registerCompletionItemProvider("sql", provider);
}

export const SqlEditor = ({
  query,
  variables,
  onQueryChange,
  onMount,
}: {
  query: string;
  variables?: Record<string, VariableValue>;
  onQueryChange: (query: string) => void;
  onMount?: (editor: editor.IStandaloneCodeEditor, monaco: Monaco) => void;
}) => {
  const ref = useRef<Monaco | null>(null);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const decorationsRef = useRef<editor.IEditorDecorationsCollection | null>(null);
  const variablesRef = useRef<Record<string, VariableValue>>(variables ?? {});
  const zoom = useStore(s => s.transform[2]);
  const zoomRef = useRef(zoom);
  const config = useAtomValue(configAtom);
  const theme = config?.theme === "midday" ? "rose-pine-dawn" : "rose-pine";

  useEffect(() => {
    zoomRef.current = zoom;
    const ed = editorRef.current;
    if (ed) {
      syncOverflowWidgetsScale(ed, zoom);
    }
  }, [zoom]);

  useEffect(() => {
    variablesRef.current = variables ?? {};
    const ed = editorRef.current;
    const model = ed?.getModel();
    if (model) {
      variablesByModelUri.set(model.uri.toString(), Object.keys(variables ?? {}));
    }
    redrawDecorations();
  }, [variables]);

  const redrawDecorations = () => {
    const ed = editorRef.current;
    if (!ed) {
      return;
    }
    const model = ed.getModel();
    if (!model) {
      return;
    }

    const text = model.getValue();
    const sites = scanVariableSites(text);
    const known = variablesRef.current;

    const decorations: editor.IModelDeltaDecoration[] = sites.map(site => {
      const startPos = model.getPositionAt(site.start);
      const endPos = model.getPositionAt(site.end);
      const isMissing = !Object.prototype.hasOwnProperty.call(known, site.name);
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
            : { value: variableHoverMessage(known[site.name]) },
        },
      };
    });

    if (decorationsRef.current) {
      decorationsRef.current.set(decorations);
    } else {
      decorationsRef.current = ed.createDecorationsCollection(decorations);
    }
  };

  useEffect(() => {
    if (!ref.current) {
      return;
    }
    ref.current.editor.setTheme(theme);
  }, [theme, ref.current]);

  useEffect(() => {
    const ed = editorRef.current;
    if (!ed) {
      return;
    }
    if (ed.getValue() !== query) {
      ed.setValue(query);
    }
  }, [query]);

  return (
    <div style={{ height: "100%", width: "100%", position: "relative" }}>
      <div className='query-window' style={{ height: "100%", width: "100%" }}>
        <Editor
          height='100%'
          defaultLanguage='sql'
          defaultValue={query}
          theme={theme}
          onMount={(editor, monaco) => {
            ref.current = monaco;
            editorRef.current = editor;
            monaco.editor.setTheme(theme);
            ensureVariableProvider(monaco);
            const model = editor.getModel();
            if (model) {
              variablesByModelUri.set(model.uri.toString(), Object.keys(variablesRef.current));
            }
            const contentSub = editor.onDidChangeModelContent(() => {
              redrawDecorations();
            });
            // Widgets (hover/suggest) only ever show for the focused or
            // hovered editor; re-anchor the shared overflow node to it before
            // they appear so they land on the right anchor at any zoom.
            const syncScale = () => syncOverflowWidgetsScale(editor, zoomRef.current);
            const focusSub = editor.onDidFocusEditorWidget(syncScale);
            const editorDom = editor.getDomNode();
            editorDom?.addEventListener("mouseenter", syncScale);
            const lspSubs = attachLspDocumentSync(monaco, editor);
            const disposeSub = editor.onDidDispose(() => {
              contentSub.dispose();
              focusSub.dispose();
              editorDom?.removeEventListener("mouseenter", syncScale);
              lspSubs.forEach(s => s.dispose());
              if (model) {
                variablesByModelUri.delete(model.uri.toString());
              }
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
          onChange={value => onQueryChange(value ?? "")}
        />
      </div>
    </div>
  );
};
