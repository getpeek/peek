import { Table } from "@mantine/core";
import { useCallback, useLayoutEffect, useRef } from "react";
import { isBooleanType, isNumericType } from "./inlineEdit";
import type { InsertingState } from "./useCommitInsert";
import { VariableInput, type VariableInputKind } from "./VariableInput";

export function InsertRow({
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
  inserting: InsertingState | null;
  setInserting: React.Dispatch<React.SetStateAction<InsertingState | null>>;
  onCommit: () => void;
}) {
  const firstInputRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null>(
    null,
  );
  const setFirstRef = useCallback(
    (el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null) => {
      firstInputRef.current = el;
    },
    [],
  );

  const isOpen = inserting !== null;

  useLayoutEffect(() => {
    if (isOpen) {
      firstInputRef.current?.focus();
    }
  }, [isOpen]);

  if (!inserting) {
    return (
      <Table.Tr className='insert-row-prompt'>
        <Table.Td
          colSpan={headers.length}
          className='insert-row-button'
          onClick={() =>
            setInserting({
              drafts: {},
              nullColumns: {},
              error: null,
              saving: false,
            })
          }
        >
          + Add row
        </Table.Td>
      </Table.Tr>
    );
  }

  const updateDraft = (column: string, value: string) =>
    setInserting(current => {
      if (!current) {
        return current;
      }
      const { [column]: _omitted, ...remainingNulls } = current.nullColumns;
      return {
        ...current,
        drafts: { ...current.drafts, [column]: value },
        nullColumns: remainingNulls,
      };
    });

  const toggleNull = (column: string) =>
    setInserting(current => {
      if (!current) {
        return current;
      }
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

  const onCommitKey = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === "Escape") {
      e.preventDefault();
      setInserting(null);
    } else if (e.metaKey && e.key.toLowerCase() === "s") {
      e.preventDefault();
      onCommit();
    }
  };

  const showStatus = inserting.saving || inserting.error !== null;

  return (
    <>
      <Table.Tr className='insert-row'>
        {headers.map((header, columnIdx) => {
          const type = columnTypes[header] ?? "";
          const draft = inserting.drafts[header] ?? "";
          const isNull = !!inserting.nullColumns[header];
          const isFirst = columnIdx === 0;

          if (isBooleanType(type)) {
            const selectValue = isNull ? "null" : draft;
            return (
              <Table.Td key={columnIdx} className='insert-cell'>
                <select
                  ref={isFirst ? setFirstRef : undefined}
                  className='insert-input bool-select'
                  disabled={inserting.saving}
                  value={selectValue}
                  onChange={e => {
                    const next = e.target.value;
                    if (next === "null") {
                      setInserting(current => {
                        if (!current) {
                          return current;
                        }
                        const { [header]: _draftOmitted, ...remainingDrafts } = current.drafts;
                        return {
                          ...current,
                          drafts: remainingDrafts,
                          nullColumns: { ...current.nullColumns, [header]: true },
                        };
                      });
                    } else {
                      updateDraft(header, next);
                    }
                  }}
                  onKeyDown={onCommitKey}
                  onClick={e => e.stopPropagation()}
                >
                  <option value=''>(default)</option>
                  <option value='true'>TRUE</option>
                  <option value='false'>FALSE</option>
                  <option value='null'>NULL</option>
                </select>
              </Table.Td>
            );
          }

          const kind: VariableInputKind = isNumericType(type) ? "number" : "text";

          return (
            <Table.Td key={columnIdx} className='insert-cell'>
              <div className='insert-cell-row'>
                <VariableInput
                  value={isNull ? "" : draft}
                  onChange={next => updateDraft(header, next)}
                  variableNames={variableNames}
                  kind={kind}
                  className={`insert-input ${isNull ? "is-null" : ""}`}
                  disabled={inserting.saving || isNull}
                  placeholder={isNull ? "NULL" : "(default)"}
                  spellCheck={false}
                  inputRef={isFirst ? setFirstRef : undefined}
                  onKeyDown={onCommitKey}
                  onClick={e => e.stopPropagation()}
                />
                <button
                  type='button'
                  className={`insert-null-toggle ${isNull ? "active" : ""}`}
                  disabled={inserting.saving}
                  onMouseDown={e => e.preventDefault()}
                  onClick={e => {
                    e.stopPropagation();
                    toggleNull(header);
                  }}
                  title={isNull ? "Clear NULL" : "Set value to NULL"}
                >
                  NULL
                </button>
              </div>
            </Table.Td>
          );
        })}
      </Table.Tr>
      {showStatus && (
        <Table.Tr className='insert-status-row'>
          <Table.Td colSpan={headers.length} className='insert-status'>
            {inserting.saving ? (
              <span className='insert-saving'>Saving…</span>
            ) : (
              <span className='insert-error'>{inserting.error}</span>
            )}
          </Table.Td>
        </Table.Tr>
      )}
    </>
  );
}
