import { CopyButton } from "@mantine/core";
import {
  IconAppWindow,
  IconCheck,
  IconShieldLock,
  IconTicket,
  IconWorld,
} from "@tabler/icons-react";
import type { ReactNode } from "react";

export type ShareTargetKey = "app" | "web" | "ticket";

interface ShareTarget {
  key: ShareTargetKey;
  label: string;
  hint: string;
  icon: ReactNode;
  value: (ticket: string) => string;
}

// `peek://invite/…` — not `join` — because `useDeepLinkInvite` matches on the
// `invite` hostname.
const TARGETS: ShareTarget[] = [
  {
    key: "app",
    label: "peek://",
    hint: "Opens straight in the Peek desktop app.",
    icon: <IconAppWindow size={13} stroke={2} />,
    value: ticket => `peek://invite/${ticket}`,
  },
  {
    key: "web",
    label: "Web",
    hint: "Join from any browser — nothing to install.",
    icon: <IconWorld size={13} stroke={2} />,
    value: ticket => `https://getpeek.dev/join/${ticket}`,
  },
  {
    key: "ticket",
    label: "Ticket",
    hint: "Paste inside Peek to join the session.",
    icon: <IconTicket size={13} stroke={2} />,
    value: ticket => ticket,
  },
];

export const SHARE_TARGET_LABELS: Record<ShareTargetKey, string> = {
  app: "peek://",
  web: "Web",
  ticket: "Ticket",
};

interface Props {
  ticket: string;
  selected: ShareTargetKey;
  onSelect: (key: ShareTargetKey) => void;
}

export function ShareTargets({ ticket, selected, onSelect }: Props) {
  const hint = TARGETS.find(t => t.key === selected)?.hint ?? "";

  return (
    <>
      <div className='collab-targets'>
        {TARGETS.map(target => (
          <CopyButton key={target.key} value={target.value(ticket)} timeout={1500}>
            {({ copied, copy }) => (
              <button
                type='button'
                className={`collab-target ${copied ? "is-copied" : target.key === selected ? "is-selected" : ""}`}
                onClick={() => {
                  onSelect(target.key);
                  copy();
                }}
              >
                {copied ? <IconCheck size={13} stroke={1.75} /> : target.icon}
                {copied ? "Copied" : target.label}
              </button>
            )}
          </CopyButton>
        ))}
      </div>
      <p className='collab-hint'>
        <IconShieldLock size={12} stroke={1.75} />
        {hint}
      </p>
    </>
  );
}
