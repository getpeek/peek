import type { ReactNode } from "react";
import "./JsonCell.css";

// Strings longer than this are middle-truncated (head…tail + char-count badge) so a
// single long value (tokens, URLs) can't dominate the cell.
const LONG_STRING_THRESHOLD = 36;

export function JsonCell({ value }: { value: unknown }) {
  return <div className='json-pretty'>{renderNode(normalize(value), false)}</div>;
}

// JSONB cells usually arrive already parsed, but some drivers hand back a JSON string —
// parse it so we render structure rather than an escaped blob.
function normalize(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function renderNode(value: unknown, trailingComma: boolean): ReactNode {
  const body = isArray(value)
    ? renderArray(value)
    : isObject(value)
      ? renderObject(value)
      : renderPrimitive(value);
  return (
    <>
      {body}
      {trailingComma && <span className='json-punct'>,</span>}
    </>
  );
}

function renderObject(obj: Record<string, unknown>): ReactNode {
  const entries = Object.entries(obj);
  if (entries.length === 0) {
    return <span className='json-brace'>{"{}"}</span>;
  }
  return (
    <>
      <span className='json-brace'>{"{"}</span>
      <div className='json-indent'>
        {entries.map(([key, val], index) => (
          <div className='json-kv' key={key}>
            <span className='json-key'>"{key}":</span> {renderNode(val, index < entries.length - 1)}
          </div>
        ))}
      </div>
      <span className='json-brace'>{"}"}</span>
    </>
  );
}

function renderArray(arr: unknown[]): ReactNode {
  if (arr.length === 0) {
    return <span className='json-brace'>[]</span>;
  }
  return (
    <>
      <span className='json-brace'>[</span>
      <div className='json-indent'>
        {arr.map((val, index) => (
          // Index keys are stable for a static render of a fixed value.
          <div className='json-kv' key={index}>
            {renderNode(val, index < arr.length - 1)}
          </div>
        ))}
      </div>
      <span className='json-brace'>]</span>
    </>
  );
}

function renderPrimitive(value: unknown): ReactNode {
  if (value === null || value === undefined) {
    return <span className='json-pill json-null'>null</span>;
  }
  if (value === true) {
    return <span className='json-pill json-true'>true</span>;
  }
  if (value === false) {
    return <span className='json-pill json-false'>false</span>;
  }
  if (typeof value === "number") {
    return <span className='json-num'>{value}</span>;
  }
  if (typeof value === "string") {
    if (value === "") {
      return <span className='json-empty'>""</span>;
    }
    if (value.length > LONG_STRING_THRESHOLD) {
      return (
        <span className='json-str'>
          <LongString value={value} />
        </span>
      );
    }
    return <span className='json-str'>"{value}"</span>;
  }
  return <span className='json-str'>{String(value)}</span>;
}

function LongString({
  value,
  head = 14,
  tail = 6,
}: {
  value: string;
  head?: number;
  tail?: number;
}) {
  return (
    <span className='json-longstr' title={value}>
      <span className='q'>"</span>
      {value.slice(0, head)}
      <span className='ell'>…</span>
      {value.slice(-tail)}
      <span className='q'>"</span>
      <span className='charcount'>{value.length}ch</span>
    </span>
  );
}

function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}
