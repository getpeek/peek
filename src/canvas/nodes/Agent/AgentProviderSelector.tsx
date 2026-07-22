import { Popover } from "@mantine/core";
import { useState } from "react";
import { IconChevronDown } from "@tabler/icons-react";
import type { AgentProvider } from "../../../state";

const LABELS: Record<AgentProvider, string> = {
  ollama: "Ollama",
  acp: "ACP",
};

interface AgentProviderSelectorProps {
  providers: AgentProvider[];
  current: AgentProvider;
  onSelect: (provider: AgentProvider) => void;
}

/** Header pill + popover for switching an Agent node's backend. Only rendered
 *  when more than one provider is configured. */
export const AgentProviderSelector = ({
  providers,
  current,
  onSelect,
}: AgentProviderSelectorProps) => {
  const [opened, setOpened] = useState(false);
  if (providers.length < 2) {
    return null;
  }

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
          <span>{LABELS[current]}</span>
          <IconChevronDown size={12} />
        </button>
      </Popover.Target>
      <Popover.Dropdown className='acp-mode-dropdown'>
        <div className='acp-mode-menu'>
          {providers.map(provider => (
            <button
              key={provider}
              type='button'
              className={`acp-mode-opt ${current === provider ? "is-active" : ""}`}
              onClick={() => {
                onSelect(provider);
                setOpened(false);
              }}
            >
              {LABELS[provider]}
            </button>
          ))}
        </div>
      </Popover.Dropdown>
    </Popover>
  );
};
