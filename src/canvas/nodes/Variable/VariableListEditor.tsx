import { IconAlertTriangle } from "@tabler/icons-react";
import { type ClipboardEvent, useRef } from "react";
import { countUnquoted, quoteAllLines } from "./listQuoting";

export function VariableListEditor({
  name,
  text,
  onChange,
}: {
  name: string;
  text: string;
  onChange: (next: string) => void;
}) {
  const gutterRef = useRef<HTMLDivElement>(null);
  const lines = text.split("\n");
  const filled = lines.filter(line => line.trim() !== "").length;
  const unquoted = countUnquoted(lines);

  // A column copied out of a spreadsheet or a query result arrives padded with
  // blank rows and CRLFs; pasted as-is each one becomes a value that has to be
  // deleted by hand.
  const pasteWithoutBlanks = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const pasted = e.clipboardData.getData("text");
    const cleaned = pasted
      .split(/\r?\n/u)
      .filter(line => line.trim() !== "")
      .join("\n");
    if (cleaned === pasted) {
      return;
    }
    e.preventDefault();
    const field = e.currentTarget;
    const { selectionStart, selectionEnd } = field;
    const caret = selectionStart + cleaned.length;
    onChange(text.slice(0, selectionStart) + cleaned + text.slice(selectionEnd));
    // The field is controlled, so the caret only exists to be moved once the
    // new text has actually been committed to the DOM.
    requestAnimationFrame(() => field.setSelectionRange(caret, caret));
  };

  return (
    <div className='variable-list'>
      <div className='variable-list-head'>
        <span className='variable-list-name'>@{name || "unnamed"}</span>
        <span className='variable-list-count'>
          {filled} {filled === 1 ? "value" : "values"}
        </span>
      </div>
      <div className='variable-list-editor'>
        <textarea
          className='variable-list-textarea nodrag'
          value={text}
          placeholder='one value per line'
          autoComplete='off'
          spellCheck={false}
          autoFocus
          wrap='off'
          onScroll={e => {
            if (gutterRef.current) {
              gutterRef.current.scrollTop = e.currentTarget.scrollTop;
            }
          }}
          onPaste={pasteWithoutBlanks}
          onChange={e => onChange(e.currentTarget.value)}
        />
      </div>
      {unquoted > 0 && (
        <div className='variable-list-notice'>
          <IconAlertTriangle size={12} />
          <span className='variable-list-notice-text'>
            {unquoted} {unquoted === 1 ? "value" : "values"} would be inserted unquoted
          </span>
          <button
            type='button'
            className='variable-list-fix'
            onClick={() => onChange(quoteAllLines(lines).join("\n"))}
          >
            Quote all
          </button>
        </div>
      )}
    </div>
  );
}
