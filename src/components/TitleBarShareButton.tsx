import { Popover } from "@mantine/core";
import { IconShare2 } from "@tabler/icons-react";
import { useAtomValue } from "jotai";
import { useState } from "react";
import {
  participantsAtom,
  sessionStateAtom,
} from "../multiplayer/state";
import { SharePopover } from "./SharePopover";
import "./TitleBarShareButton.css";

export function TitleBarShareButton() {
  const session = useAtomValue(sessionStateAtom);
  const participants = useAtomValue(participantsAtom);
  const [opened, setOpened] = useState(false);

  const dots: { color: string; key: string }[] = [];
  if (session) {
    dots.push({ color: session.myColor, key: session.myAuthor });
    for (const p of Object.values(participants)) {
      if (p.author === session.myAuthor) continue;
      dots.push({ color: p.color, key: p.author });
    }
  }

  return (
    <Popover
      opened={opened}
      onChange={setOpened}
      radius="lg"
      trapFocus
      withArrow={false}
      position="bottom-end"
    >
      <Popover.Target>
        <button
          className={`titlebar-share-button ${session ? "active" : ""}`}
          onClick={() => setOpened((o) => !o)}
          aria-label={session ? "Open session info" : "Start a session"}
        >
          <IconShare2 size={12} stroke={2} />
          {dots.length > 0 ? (
            <span className="share-dots" aria-hidden>
              {dots.map((d) => (
                <span
                  key={d.key}
                  className="share-dot"
                  style={{ backgroundColor: d.color }}
                />
              ))}
            </span>
          ) : (
            <span>Share</span>
          )}
        </button>
      </Popover.Target>
      <Popover.Dropdown
        bg="transparent"
        bd="none"
        p={0}
        style={{ backdropFilter: "blur(10px)" }}
      >
        <SharePopover onClose={() => setOpened(false)} />
      </Popover.Dropdown>
    </Popover>
  );
}
