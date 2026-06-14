import { useLayoutEffect, useRef } from "react";
import { isBooleanType, isNumericType } from "./inlineEdit";
import { VariableInput, type VariableInputKind } from "./VariableInput";
import { Tooltip } from "../../../components/Tooltip/Tooltip";

function parseBooleanDraft(draft: string): "true" | "false" | "null" {
  const value = draft.toLowerCase();
  if (value === "true" || value === "t" || value === "1") {
    return "true";
  }
  if (value === "false" || value === "f" || value === "0") {
    return "false";
  }
  return "null";
}

export function EditCell({
  type,
  draft,
  error,
  saving,
  variableNames,
  onChange,
  onCommit,
  onCancel,
}: {
  type: string;
  draft: string;
  error: string | null;
  saving: boolean;
  variableNames: string[];
  onChange: (v: string) => void;
  onCommit: () => void;
  onCancel: () => void;
}) {
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const selectRef = useRef<HTMLSelectElement | null>(null);
  const isMultiline = type === "JSON" || type === "JSONB";
  const isBoolean = isBooleanType(type);
  const isNumeric = isNumericType(type);

  useLayoutEffect(() => {
    if (isBoolean) {
      const select = selectRef.current;
      if (!select) {
        return;
      }
      select.focus();
      try {
        select.showPicker?.();
      } catch {
        // showPicker can throw if the element is not in a user-gesture context;
        // focus alone is fine in that case.
      }
      return;
    }
    const input = inputRef.current;
    if (!input) {
      return;
    }
    input.focus();
    if (input instanceof HTMLInputElement) {
      input.select();
    }
  }, [isBoolean]);

  const handleCommitKeys = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
      return true;
    }
    if (e.metaKey && e.key.toLowerCase() === "s") {
      e.preventDefault();
      onCommit();
      return true;
    }
    return false;
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    handleCommitKeys(e);
  };

  if (isBoolean) {
    const current = parseBooleanDraft(draft);

    const onSelectKeyDown = (e: React.KeyboardEvent<HTMLSelectElement>) => {
      e.stopPropagation();
      if (handleCommitKeys(e)) {
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        onCommit();
      }
    };

    return (
      <div className='edit-wrapper'>
        <select
          ref={selectRef}
          className='bool-select'
          disabled={saving}
          value={current}
          onChange={e => {
            const next = e.target.value as "true" | "false" | "null";
            onChange(next === "null" ? "" : next);
          }}
          onKeyDown={onSelectKeyDown}
          onClick={e => e.stopPropagation()}
          onDoubleClick={e => e.stopPropagation()}
        >
          <option value='true'>TRUE</option>
          <option value='false'>FALSE</option>
          <option value='null'>NULL</option>
        </select>
        {error && <div className='edit-error'>{error}</div>}
      </div>
    );
  }

  const clearToNull = () => {
    onChange("");
    onCommit();
  };

  const kind: VariableInputKind = isMultiline ? "textarea" : isNumeric ? "number" : "text";

  return (
    <div className='edit-wrapper'>
      <div className='edit-row'>
        <VariableInput
          value={draft}
          onChange={onChange}
          variableNames={variableNames}
          kind={kind}
          className='edit-input'
          disabled={saving}
          spellCheck={false}
          rows={3}
          inputRef={el => {
            inputRef.current = el;
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
              clearToNull();
            }}
          >
            NULL
          </button>
        </Tooltip>
      </div>
      {error && <div className='edit-error'>{error}</div>}
    </div>
  );
}
