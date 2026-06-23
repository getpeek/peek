import { useSyncedFieldValue } from "../../hooks/useSyncedFieldValue";

interface VariableTextInputProps {
  value: string;
  onChange: (next: string) => void;
  className: string;
  placeholder: string;
}

export function VariableTextInput({
  value,
  onChange,
  className,
  placeholder,
}: VariableTextInputProps) {
  const [local, setLocal] = useSyncedFieldValue(value);

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
