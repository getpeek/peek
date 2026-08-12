import { useLayoutEffect, useRef } from "react";
import { VariableInput } from "./VariableInput";
import { Tooltip } from "../../../../components/Tooltip/Tooltip";
import "./cellEditorFooter.css";

// Past this the textarea scrolls. Matches the JSON editor so the two cell
// editors feel alike; the floor lives in CSS as `.edit-textarea`'s min-height.
const MAX_HEIGHT = 320;

export function TextCell({
  draft,
  error,
  saving,
  variableNames,
  onChange,
  onCommit,
  onCancel,
}: {
  draft: string;
  error: string | null;
  saving: boolean;
  variableNames: string[];
  onChange: (v: string) => void;
  onCommit: (draft?: string) => void;
  onCancel: () => void;
}) {
  const textareaRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) {
      return;
    }
    // Caret at the end rather than select-all: on a long value, select-all means
    // the first keystroke wipes it.
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, []);

  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) {
      return;
    }
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`;
  }, [draft]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
      return;
    }
    // Enter belongs to the textarea; ⌘S is the commit key for every cell editor.
    if (e.metaKey && e.key.toLowerCase() === "s") {
      e.preventDefault();
      onCommit();
    }
  };

  return (
    <div className='edit-wrapper'>
      <div className='edit-row edit-row-multiline'>
        <VariableInput
          value={draft}
          onChange={onChange}
          variableNames={variableNames}
          kind='textarea'
          className='edit-input edit-textarea'
          disabled={saving}
          spellCheck={false}
          inputRef={el => {
            textareaRef.current = el;
          }}
          onKeyDown={onKeyDown}
          onClick={e => e.stopPropagation()}
        />
        <Tooltip label='Set value to NULL'>
          <button
            type='button'
            className='edit-clear-null'
            disabled={saving}
            onMouseDown={e => e.preventDefault()}
            onClick={e => {
              e.stopPropagation();
              onCommit("");
            }}
          >
            NULL
          </button>
        </Tooltip>
      </div>
      <div className='cell-editor-footer'>
        <span>⏎ inserts a newline</span>
        <span className='cell-editor-actions'>
          <span className='cell-editor-kbd'>Esc</span>
          <button
            type='button'
            className='cell-mini-btn primary'
            disabled={saving}
            onMouseDown={e => e.preventDefault()}
            onClick={() => onCommit()}
          >
            Save <span className='kbd'>⌘S</span>
          </button>
        </span>
      </div>
      {error && <div className='edit-error'>{error}</div>}
    </div>
  );
}
