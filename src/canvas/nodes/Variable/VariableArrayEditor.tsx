import { Popover } from "@mantine/core";
import { useState } from "react";

export function VariableArrayEditor({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [opened, setOpened] = useState(false);
  const count = value.length;
  const label = count === 0 ? "empty" : `${count} ${count === 1 ? "value" : "values"}`;

  return (
    <Popover
      opened={opened}
      onChange={setOpened}
      position='bottom-start'
      withinPortal
      radius='md'
      shadow='md'
      offset={4}
      trapFocus
    >
      <Popover.Target>
        <button
          type='button'
          className={`variable-array-chip ${count === 0 ? "empty" : ""}`}
          onClick={() => setOpened(o => !o)}
        >
          {label}
        </button>
      </Popover.Target>
      <Popover.Dropdown className='variable-array-dropdown'>
        <textarea
          className='variable-array-textarea nodrag'
          value={value.join("\n")}
          placeholder='one value per line'
          autoComplete='off'
          spellCheck={false}
          onChange={e => onChange(e.currentTarget.value.split("\n"))}
        />
      </Popover.Dropdown>
    </Popover>
  );
}
