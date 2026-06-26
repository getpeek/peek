import { useLayoutEffect, useRef } from "react";
import { isBooleanType, isNumericType, isUuidType } from "../Result/cell/inlineEdit";
import { VariableInput, type VariableInputKind } from "../Result/cell/VariableInput";
import { Tooltip } from "../../../components/Tooltip/Tooltip";
import { emptyInsertingState, type InsertingState } from "./useCommitInsertForm";

type FieldEl = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

export function InsertFormFields({
  headers,
  columnTypes,
  variableNames,
  inserting,
  setInserting,
  onCommit,
}: {
  headers: string[];
  columnTypes: Record<string, string>;
  variableNames: string[];
  inserting: InsertingState;
  setInserting: React.Dispatch<React.SetStateAction<InsertingState>>;
  onCommit: () => void;
}) {
  const firstInputRef = useRef<FieldEl | null>(null);

  useLayoutEffect(() => {
    firstInputRef.current?.focus();
  }, []);

  const updateDraft = (column: string, value: string) =>
    setInserting(current => {
      const { [column]: _omitted, ...remainingNulls } = current.nullColumns;
      return {
        ...current,
        drafts: { ...current.drafts, [column]: value },
        nullColumns: remainingNulls,
      };
    });

  const toggleNull = (column: string) =>
    setInserting(current => {
      if (current.nullColumns[column]) {
        const { [column]: _omitted, ...remainingNulls } = current.nullColumns;
        return { ...current, nullColumns: remainingNulls };
      }
      const { [column]: _draftOmitted, ...remainingDrafts } = current.drafts;
      return {
        ...current,
        drafts: remainingDrafts,
        nullColumns: { ...current.nullColumns, [column]: true },
      };
    });

  const onKey = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === "Escape") {
      e.preventDefault();
      setInserting(emptyInsertingState);
    } else if (e.metaKey && e.key.toLowerCase() === "s") {
      e.preventDefault();
      onCommit();
    }
  };

  return (
    <div className='insert-form' onKeyDown={onKey}>
      <div className='insert-form-fields'>
        {headers.map((header, columnIdx) => {
          const type = columnTypes[header] ?? "";
          const draft = inserting.drafts[header] ?? "";
          const isNull = !!inserting.nullColumns[header];
          const isFirst = columnIdx === 0;

          return (
            <div className='insert-form-field' key={header}>
              <label className='insert-form-label'>
                <span className='insert-form-name'>{header}</span>
                <span className='insert-form-type'>{type}</span>
              </label>
              {isBooleanType(type) ? (
                <select
                  ref={el => {
                    if (isFirst) {
                      firstInputRef.current = el;
                    }
                  }}
                  className='insert-input bool-select'
                  disabled={inserting.saving}
                  value={isNull ? "null" : draft}
                  onChange={e => {
                    const next = e.target.value;
                    if (next === "null") {
                      toggleNullTo(setInserting, header);
                    } else {
                      updateDraft(header, next);
                    }
                  }}
                >
                  <option value=''>(default)</option>
                  <option value='true'>TRUE</option>
                  <option value='false'>FALSE</option>
                  <option value='null'>NULL</option>
                </select>
              ) : (
                <div className='insert-cell-row'>
                  <VariableInput
                    value={isNull ? "" : draft}
                    onChange={next => updateDraft(header, next)}
                    variableNames={variableNames}
                    kind={isNumericType(type) ? ("number" as VariableInputKind) : "text"}
                    className={`insert-input ${isNull ? "is-null" : ""}`}
                    disabled={inserting.saving || isNull}
                    placeholder={isNull ? "NULL" : "(default)"}
                    spellCheck={false}
                    inputRef={el => {
                      if (isFirst) {
                        firstInputRef.current = el;
                      }
                    }}
                  />
                  {isUuidType(type) && (
                    <Tooltip label='Generate a UUID v4'>
                      <button
                        type='button'
                        className='insert-uuid-btn'
                        disabled={inserting.saving}
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => updateDraft(header, crypto.randomUUID())}
                      >
                        v4
                      </button>
                    </Tooltip>
                  )}
                  <Tooltip label={isNull ? "Clear NULL" : "Set value to NULL"}>
                    <button
                      type='button'
                      className={`insert-null-toggle ${isNull ? "active" : ""}`}
                      disabled={inserting.saving}
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => toggleNull(header)}
                    >
                      NULL
                    </button>
                  </Tooltip>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className='insert-form-footer'>
        <span className='insert-form-status'>
          {inserting.saving ? (
            <span className='insert-saving'>Saving…</span>
          ) : inserting.error ? (
            <span className='insert-error'>{inserting.error}</span>
          ) : null}
        </span>
        <button className='insert-form-save' onClick={onCommit} disabled={inserting.saving}>
          Add row
        </button>
      </div>
    </div>
  );
}

function toggleNullTo(
  setInserting: React.Dispatch<React.SetStateAction<InsertingState>>,
  column: string,
) {
  setInserting(current => {
    const { [column]: _draftOmitted, ...remainingDrafts } = current.drafts;
    return {
      ...current,
      drafts: remainingDrafts,
      nullColumns: { ...current.nullColumns, [column]: true },
    };
  });
}
