import { Popover } from "@mantine/core";
import { IconUsers } from "@tabler/icons-react";
import { useAtom, useAtomValue } from "jotai";
import {
  collaboratePopoverOpenAtom,
  participantsAtom,
  sessionStateAtom,
} from "../../../multiplayer/state";
import { initialFromName } from "../../../multiplayer/identity";
import { SharePopover } from "./SharePopover";
import "./CollaborateButton.css";

const MAX_AVATARS = 3;

export function CollaborateButton() {
  const session = useAtomValue(sessionStateAtom);
  const participants = useAtomValue(participantsAtom);
  const [opened, setOpened] = useAtom(collaboratePopoverOpenAtom);

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
    >
      <Popover.Target>
        <button
          className={`titlebar-collab-button ${session ? "active" : ""}`}
          onClick={() => setOpened(o => !o)}
          aria-label={session ? "Open session info" : "Start collaborating"}
        >
          {session ? (
            <span className='collab-avatars' aria-hidden>
              {visible.map(a => (
                <span
                  key={a.key}
                  className='collab-avatar'
                  style={{ backgroundColor: a.color }}
                  title={a.name}
                >
                  {initialFromName(a.name)}
                </span>
              ))}
              {overflow > 0 && <span className='collab-avatar overflow'>+{overflow}</span>}
            </span>
          ) : (
            <>
              <IconUsers size={12} stroke={2} />
            </>
          )}
        </button>
      </Popover.Target>
      <Popover.Dropdown p={0} my={12} bd='none' bg='transparent'>
        <SharePopover onClose={() => setOpened(false)} />
      </Popover.Dropdown>
    </Popover>
  );
}
