import { useLayoutEffect, useRef } from "react";
import { isBooleanType, isNumericType } from "./inlineEdit";

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
  onChange,
  onCommit,
  onCancel,
}: {
  type: string;
  draft: string;
  error: string | null;
  saving: boolean;
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

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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
      <div className="edit-wrapper">
        <select
          ref={selectRef}
          className="bool-select"
          disabled={saving}
          value={current}
          onChange={(e) => {
            const next = e.target.value as "true" | "false" | "null";
            onChange(next === "null" ? "" : next);
          }}
          onKeyDown={onSelectKeyDown}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
        >
          <option value="true">TRUE</option>
          <option value="false">FALSE</option>
          <option value="null">NULL</option>
        </select>
        {error && <div className="edit-error">{error}</div>}
      </div>
    );
  }

  const common = {
    value: draft,
    disabled: saving,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange(e.target.value),
    onKeyDown,
    onClick: (e: React.MouseEvent) => e.stopPropagation(),
    onDoubleClick: (e: React.MouseEvent) => e.stopPropagation(),
    className: "edit-input",
    spellCheck: false,
  };

  const clearToNull = () => {
    onChange("");
    onCommit();
  };

  return (
    <div className="edit-wrapper">
      <div className="edit-row">
        {isMultiline ? (
          <textarea ref={inputRef as React.RefObject<HTMLTextAreaElement>} rows={3} {...common} />
        ) : isNumeric ? (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="number"
            inputMode="decimal"
            step="any"
            {...common}
          />
        ) : (
          <input ref={inputRef as React.RefObject<HTMLInputElement>} type="text" {...common} />
        )}
        <button
          type="button"
          className="edit-clear-null"
          disabled={saving}
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => {
            e.stopPropagation();
            clearToNull();
          }}
          title="Set value to NULL"
        >
          NULL
        </button>
      </div>
      {error && <div className="edit-error">{error}</div>}
    </div>
  );
}
