import type { ClipboardEvent } from "react";
import { useSyncedFieldValue } from "../../hooks/useSyncedFieldValue";

interface VariableTextInputProps {
  value: string;
  onChange: (next: string) => void;
  className: string;
  placeholder: string;
  onPasteLines?: (lines: string[]) => void;
}

export function VariableTextInput({
  value,
  onChange,
  className,
  placeholder,
  onPasteLines,
}: VariableTextInputProps) {
  const [local, setLocal] = useSyncedFieldValue(value);

  // A column copied out of a spreadsheet or a query result is a list, and an
  // <input> would silently flatten it into one unusable line. Report the split
  // so the caller can turn the row into the list it clearly is.
  const reportPastedLines = (e: ClipboardEvent<HTMLInputElement>) => {
    if (!onPasteLines) {
      return;
    }
    const { selectionStart, selectionEnd } = e.currentTarget;
    const merged =
      local.slice(0, selectionStart ?? 0) +
      e.clipboardData.getData("text") +
      local.slice(selectionEnd ?? local.length);
    const lines = merged.split(/\r?\n/u).filter(line => line.trim() !== "");
    if (lines.length < 2) {
      return;
    }
    e.preventDefault();
    onPasteLines(lines);
  };

  return (
    <input
      type='text'
      className={className}
      value={local}
      placeholder={placeholder}
      autoComplete='off'
      spellCheck={false}
      onPaste={reportPastedLines}
      onChange={e => {
        setLocal(e.currentTarget.value);
        onChange(e.currentTarget.value);
      }}
    />
  );
}
