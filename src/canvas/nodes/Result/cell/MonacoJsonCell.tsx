import Editor, { type Monaco } from "@monaco-editor/react";
import type { editor as MonacoEditor } from "monaco-editor";
import { useRef, useState } from "react";
import { useAtomValue } from "jotai";
import { effectiveThemeAtom } from "../../../../state";
import { editorThemeForUiTheme } from "../../../../themes/editorTheme";
import "./MonacoJsonCell.css";

// The editor grows with its content between these bounds; past the max it scrolls.
const MIN_HEIGHT = 60;
const MAX_HEIGHT = 320;

const JSON_EDITOR_OPTIONS: MonacoEditor.IStandaloneEditorConstructionOptions = {
  language: "json",
  lineNumbers: "off",
  glyphMargin: false,
  folding: false,
  lineDecorationsWidth: 0,
  lineNumbersMinChars: 0,
  renderLineHighlight: "none",
  minimap: { enabled: false },
  overviewRulerLanes: 0,
  hideCursorInOverviewRuler: true,
  overviewRulerBorder: false,
  scrollBeyondLastLine: false,
  guides: { indentation: false },
  wordWrap: "on",
  wrappingStrategy: "advanced",
  contextmenu: false,
  occurrencesHighlight: "off",
  selectionHighlight: false,
  matchBrackets: "never",
  renderWhitespace: "none",
  scrollbar: {
    vertical: "auto",
    horizontal: "hidden",
    verticalScrollbarSize: 6,
    useShadows: false,
    alwaysConsumeMouseWheel: false,
  },
  padding: { top: 8, bottom: 8 },
  tabSize: 2,
  fixedOverflowWidgets: true,
  stickyScroll: { enabled: false },
  bracketPairColorization: { enabled: false },
  automaticLayout: true,
  fontSize: 12,
  lineHeight: 19,
  fontFamily: "Monaspace Krypton, SF Mono, ui-monospace, Menlo, monospace",
  cursorBlinking: "smooth",
  roundedSelection: false,
};

export function MonacoJsonCell({
  value,
  error,
  saving,
  onChange,
  onCommit,
  onCancel,
}: {
  value: string;
  error: string | null;
  saving: boolean;
  onChange: (next: string) => void;
  onCommit: () => void;
  onCancel: () => void;
}) {
  const theme = editorThemeForUiTheme(useAtomValue(effectiveThemeAtom));
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  // The draft arrives compact (JSON.stringify); open it pretty-printed for editing.
  const [initialValue] = useState(() => formatJson(value));
  const [height, setHeight] = useState(MIN_HEIGHT);
  const [valid, setValid] = useState(() => isValidJson(initialValue));

  // The ⌘S / Esc commands are bound once on mount; keep the latest callbacks reachable.
  const commitRef = useRef(onCommit);
  commitRef.current = onCommit;
  const cancelRef = useRef(onCancel);
  cancelRef.current = onCancel;

  const handleMount = (instance: MonacoEditor.IStandaloneCodeEditor, monaco: Monaco) => {
    editorRef.current = instance;
    instance.focus();
    // Keep the parent draft in step with the pretty-printed content we render.
    if (initialValue !== value) {
      onChange(initialValue);
    }

    const syncHeight = () => {
      setHeight(Math.min(Math.max(instance.getContentHeight(), MIN_HEIGHT), MAX_HEIGHT));
    };
    instance.onDidContentSizeChange(syncHeight);
    syncHeight();

    instance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => commitRef.current());
    instance.addCommand(monaco.KeyCode.Escape, () => cancelRef.current());
  };

  const format = () => {
    const instance = editorRef.current;
    if (!instance) {
      return;
    }
    // formatJson leaves invalid JSON untouched; the status indicator already flags it.
    instance.setValue(formatJson(instance.getValue()));
    instance.focus();
  };

  return (
    <>
      {/* Stop mousedown from reaching the canvas/table (pan, row-select) without
          blocking Monaco — it's a child, so it sees the event before this bubbles. */}
      <div className='json-editor nodrag' onMouseDown={event => event.stopPropagation()}>
        <Editor
          height={height}
          defaultLanguage='json'
          defaultValue={initialValue}
          theme={theme}
          onMount={handleMount}
          options={JSON_EDITOR_OPTIONS}
          onChange={next => {
            const text = next ?? "";
            onChange(text);
            setValid(isValidJson(text));
          }}
        />
        <div className='json-editor-footer'>
          <span className='json-editor-status'>
            <span className={valid ? "ok" : "err"}>●</span>
            {valid ? "valid jsonb" : "invalid json"}
          </span>
          <span className='json-editor-actions'>
            <span className='json-editor-kbd'>Esc</span>
            <button
              type='button'
              className='json-mini-btn'
              disabled={saving}
              onMouseDown={event => event.preventDefault()}
              onClick={format}
            >
              Format
            </button>
            <button
              type='button'
              className='json-mini-btn primary'
              disabled={saving}
              onMouseDown={event => event.preventDefault()}
              onClick={onCommit}
            >
              Save <span className='kbd'>⌘S</span>
            </button>
          </span>
        </div>
      </div>
      {/* Sibling of the overflow-clipped editor so the floating error isn't clipped. */}
      {error && <div className='edit-error'>{error}</div>}
    </>
  );
}

function formatJson(text: string): string {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

function isValidJson(text: string): boolean {
  // Empty commits to NULL, which is valid for a JSON column.
  if (text.trim() === "") {
    return true;
  }
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
}
