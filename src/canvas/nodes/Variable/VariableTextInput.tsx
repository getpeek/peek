import { useEffect, useState } from "react";

interface VariableTextInputProps {
  value: string;
  onChange: (next: string) => void;
  className: string;
  placeholder: string;
}

// Mirrors the incoming value in local state so the caret survives a keystroke.
// Binding `value` straight to node data sends each edit on a round trip through
// jotai and React Flow's internal store, which lands a frame late — long enough
// for the controlled input to render stale and the browser to jump the caret to
// the end. Rendering from local state keeps it synchronous; we only adopt the
// prop again when it changes from the outside (remote edit, undo, array toggle).
export function VariableTextInput({
  value,
  onChange,
  className,
  placeholder,
}: VariableTextInputProps) {
  const [local, setLocal] = useState(value);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  return (
    <input
      type='text'
      className={className}
      value={local}
      placeholder={placeholder}
      autoComplete='off'
      spellCheck={false}
      onChange={e => {
        setLocal(e.currentTarget.value);
        onChange(e.currentTarget.value);
      }}
    />
  );
}
