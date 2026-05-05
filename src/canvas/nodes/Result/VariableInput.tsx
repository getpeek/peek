import { useVariableSuggest } from "./useVariableSuggest";
import { VariableSuggestPopover } from "./VariableSuggestPopover";

type FieldEl = HTMLInputElement | HTMLTextAreaElement;

export type VariableInputKind = "text" | "number" | "textarea";

export function VariableInput({
  value,
  onChange,
  variableNames,
  kind,
  className,
  disabled,
  placeholder,
  spellCheck = false,
  rows,
  inputRef,
  onKeyDown,
  onBlur,
  onClick,
}: {
  value: string;
  onChange: (next: string) => void;
  variableNames: string[];
  kind: VariableInputKind;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  spellCheck?: boolean;
  rows?: number;
  inputRef?: (el: FieldEl | null) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  onBlur?: (e: React.FocusEvent) => void;
  onClick?: (e: React.MouseEvent) => void;
}) {
  const sg = useVariableSuggest(variableNames, onChange);

  const handleChange = (e: React.ChangeEvent<FieldEl>) => {
    onChange(e.target.value);
    sg.refresh(e.target);
  };

  const handleSelect = (e: React.SyntheticEvent<FieldEl>) => {
    sg.refresh(e.currentTarget);
  };

  const handleKeyDown = (e: React.KeyboardEvent<FieldEl>) => {
    if (sg.handleKey(e)) {
      return;
    }
    onKeyDown?.(e);
  };

  const handleBlur = (e: React.FocusEvent<FieldEl>) => {
    sg.close();
    onBlur?.(e);
  };

  const sharedProps = {
    className,
    disabled,
    value,
    placeholder,
    spellCheck,
    onChange: handleChange,
    onSelect: handleSelect,
    onKeyDown: handleKeyDown,
    onBlur: handleBlur,
    onClick,
  };

  return (
    <>
      {kind === "textarea" ? (
        <textarea ref={el => inputRef?.(el)} rows={rows ?? 3} {...sharedProps} />
      ) : kind === "number" ? (
        <input
          ref={el => inputRef?.(el)}
          type='number'
          inputMode='decimal'
          step='any'
          {...sharedProps}
        />
      ) : (
        <input ref={el => inputRef?.(el)} type='text' {...sharedProps} />
      )}
      {sg.suggest && sg.filtered.length > 0 && (
        <VariableSuggestPopover
          inputEl={sg.suggest.inputEl}
          suggestions={sg.filtered}
          selectedIdx={sg.suggest.selectedIdx}
          onPick={sg.accept}
        />
      )}
    </>
  );
}
