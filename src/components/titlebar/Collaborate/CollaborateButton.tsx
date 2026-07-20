import { Popover } from "@mantine/core";
import { IconUsers } from "@tabler/icons-react";
import { useAtom, useAtomValue } from "jotai";
import { useRef } from "react";
import {
  collaboratePopoverOpenAtom,
  participantsAtom,
  sessionStateAtom,
} from "../../../multiplayer/state";
import { initialFromName } from "../../../multiplayer/identity";
import { useClickAwayCapture } from "../../../app/useClickAwayCapture";
import { SharePopover } from "./SharePopover";
import { Tooltip } from "../../Tooltip/Tooltip";
import "./CollaborateButton.css";

const MAX_AVATARS = 3;

export function CollaborateButton({ hidden = false }: { hidden?: boolean }) {
  const session = useAtomValue(sessionStateAtom);
  const participants = useAtomValue(participantsAtom);
  const [opened, setOpened] = useAtom(collaboratePopoverOpenAtom);
  const targetRef = useRef<HTMLButtonElement>(null);
  const anchorRef = useRef<HTMLSpanElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  useClickAwayCapture(opened, () => setOpened(false), [targetRef, anchorRef, dropdownRef]);

  const avatars: { color: string; name: string; key: string }[] = [];
  if (session) {
    avatars.push({
      color: session.myColor,
      name: session.myName,
      key: session.myAuthor,
    });
    for (const p of Object.values(participants)) {
      if (p.author === session.myAuthor) {
        continue;
      }
      avatars.push({ color: p.color, name: p.name, key: p.author });
    }
  }
  const visible = avatars.slice(0, MAX_AVATARS);
  const overflow = avatars.length - visible.length;

  return (
    <Popover
      opened={opened}
      onChange={setOpened}
      radius='lg'
      trapFocus
      withArrow={false}
      position='bottom-end'
      closeOnClickOutside={false}
    >
      <Popover.Target>
        {hidden ? (
          // The button is the popover anchor, but the popover can still be opened from the
          // command palette (Host/Join session), so keep a zero-size anchor when it's hidden.
          <span ref={anchorRef} aria-hidden style={{ width: 0, height: 0 }} />
        ) : (
          <button
            ref={targetRef}
            className={`titlebar-collab-button ${session ? "active" : ""}`}
            onClick={() => setOpened(o => !o)}
            aria-label={session ? "Open session info" : "Start collaborating"}
          >
            {session ? (
              <span className='collab-avatars' aria-hidden>
                {visible.map(a => (
                  <Tooltip key={a.key} label={a.name} position='bottom'>
                    <span className='collab-avatar' style={{ backgroundColor: a.color }}>
                      {initialFromName(a.name)}
                    </span>
                  </Tooltip>
                ))}
                {overflow > 0 && <span className='collab-avatar overflow'>+{overflow}</span>}
              </span>
            ) : (
              <>
                <IconUsers size={12} stroke={2} />
                <span className='collab-hint'>Collaborate</span>
              </>
            )}
          </button>
        )}
      </Popover.Target>
      <Popover.Dropdown ref={dropdownRef} p={0} my={12} bd='none' bg='transparent'>
        <SharePopover onClose={() => setOpened(false)} />
      </Popover.Dropdown>
    </Popover>
  );
}
