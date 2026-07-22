import { Popover } from "@mantine/core";
import { useState } from "react";
import { IconChevronDown } from "@tabler/icons-react";
import type { AcpMode } from "./useAcpStream";

interface AgentModeSelectorProps {
  modes: AcpMode[];
  current: string | null;
  onSelect: (modeId: string) => void;
}

/** Current ACP mode shown next to the agent name; the pill opens a popover to
 *  switch (mirroring Claude Code's plan / accept-edits / manual modes). */
export const AgentModeSelector = ({ modes, current, onSelect }: AgentModeSelectorProps) => {
  const [opened, setOpened] = useState(false);
  if (modes.length === 0) {
    return null;
  }
  const currentName = modes.find(mode => mode.id === current)?.name ?? modes[0].name;

  return (
    <Popover
      opened={opened}
      onChange={setOpened}
      position='bottom-end'
      withinPortal
      radius='md'
      shadow='md'
      offset={4}
    >
      <Popover.Target>
        <button type='button' className='acp-mode-pill' onClick={() => setOpened(o => !o)}>
          <span>{currentName}</span>
          <IconChevronDown size={12} />
        </button>
      </Popover.Target>
      <Popover.Dropdown className='acp-mode-dropdown'>
        <div className='acp-mode-menu'>
          {modes.map(mode => (
            <button
              key={mode.id}
              type='button'
              className={`acp-mode-opt ${current === mode.id ? "is-active" : ""}`}
              onClick={() => {
                onSelect(mode.id);
                setOpened(false);
              }}
            >
              {mode.name}
            </button>
          ))}
          <div className='acp-mode-hint'>
            <kbd>⇧</kbd>
            <kbd>⇥</kbd>
            <span>to cycle modes</span>
          </div>
        </div>
      </Popover.Dropdown>
    </Popover>
  );
};
