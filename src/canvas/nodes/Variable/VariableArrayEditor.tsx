import { Popover } from "@mantine/core";
import { useEffect, useState } from "react";
import { useSyncedFieldValue } from "../../hooks/useSyncedFieldValue";
import { countUnquoted } from "./listQuoting";
import { VariableListEditor } from "./VariableListEditor";

export function VariableArrayEditor({
  name,
  value,
  onChange,
}: {
  name: string;
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [opened, setOpened] = useState(false);
  const [text, setText] = useSyncedFieldValue(value.join("\n"));
  const lines = text.split("\n");
  const filled = lines.filter(line => line.trim() !== "").length;
  const unquoted = countUnquoted(lines);
  const label = filled === 0 ? "empty" : `${filled} ${filled === 1 ? "value" : "values"}`;

  const setLines = (next: string) => {
    setText(next);
    onChange(next.split("\n"));
  };

  // Mantine closes on a document-level mousedown, which never arrives: d3-zoom
  // on the React Flow pane calls stopImmediatePropagation as soon as a drag
  // could start. Listening in the capture phase gets ahead of it. The chip is
  // excluded so its own click still toggles rather than reopening what this
  // just closed.
  useEffect(() => {
    if (!opened) {
      return;
    }
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target instanceof Element ? e.target : null;
      if (target?.closest(".variable-list-dropdown, .variable-array-chip")) {
        return;
      }
      setOpened(false);
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [opened]);

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
          className={`variable-array-chip ${filled === 0 ? "empty" : ""}`}
          onClick={() => setOpened(o => !o)}
        >
          {label}
          {unquoted > 0 && <span className='variable-array-chip-warn' />}
        </button>
      </Popover.Target>
      <Popover.Dropdown className='variable-list-dropdown'>
        <VariableListEditor name={name} text={text} onChange={setLines} />
      </Popover.Dropdown>
    </Popover>
  );
}
