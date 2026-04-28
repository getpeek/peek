import { Button, CopyButton, Stack, Text } from "@mantine/core";
import { IconCheck, IconCopy } from "@tabler/icons-react";
import { useAtomValue } from "jotai";
import { useCallback, useState } from "react";
import {
  participantsAtom,
  sessionStateAtom,
} from "../multiplayer/state";
import type { MultiplayerControls } from "../multiplayer/syncBridge";
import "./SharePopover.css";

interface PeekMultiplayerWindow extends Window {
  peekMultiplayer?: MultiplayerControls;
}

function controls(): MultiplayerControls | undefined {
  return (window as PeekMultiplayerWindow).peekMultiplayer;
}

interface Props {
  onClose?: () => void;
}

export function SharePopover({ onClose }: Props) {
  const session = useAtomValue(sessionStateAtom);
  const participants = useAtomValue(participantsAtom);
  const [busy, setBusy] = useState(false);

  const startSession = useCallback(async () => {
    setBusy(true);
    try {
      await controls()?.host();
    } catch (e) {
      console.error("host session failed:", e);
    } finally {
      setBusy(false);
    }
  }, []);

  const endSession = useCallback(async () => {
    setBusy(true);
    try {
      await controls()?.end();
      onClose?.();
    } catch (e) {
      console.error("end session failed:", e);
    } finally {
      setBusy(false);
    }
  }, [onClose]);

  if (!session) {
    return (
      <Stack gap="sm" className="share-popover">
        <div>
          <Text size="sm" fw={600}>Share this canvas</Text>
          <Text size="xs" c="var(--pk-fg-muted)">
            Start a session to get a join ticket. Anyone with the ticket can
            mirror this canvas and edit alongside you.
          </Text>
        </div>
        <Button
          loading={busy}
          onClick={startSession}
          variant="filled"
          radius="md"
          size="sm"
        >
          Start session
        </Button>
      </Stack>
    );
  }

  const myDot = (
    <span
      className="participant-dot"
      style={{ backgroundColor: session.myColor }}
      title={`${session.myName} (you)`}
    />
  );
  const peerEntries = Object.values(participants).filter(
    (p) => p.author !== session.myAuthor,
  );

  return (
    <Stack gap="sm" className="share-popover">
      <div>
        <Text size="sm" fw={600}>
          {session.role === "host" ? "Hosting session" : "In session"}
        </Text>
        <Text size="xs" c="var(--pk-fg-muted)">
          {session.status === "connecting"
            ? "Connecting…"
            : session.role === "host"
              ? "Share the ticket below to invite a peer."
              : "Connected to host."}
        </Text>
      </div>

      <div className="share-ticket-row">
        <code className="share-ticket">{session.ticket}</code>
        <CopyButton value={session.ticket} timeout={1500}>
          {({ copied, copy }) => (
            <Button
              size="compact-sm"
              variant="light"
              color={copied ? "teal" : "gray"}
              onClick={copy}
              leftSection={
                copied ? <IconCheck size={12} /> : <IconCopy size={12} />
              }
            >
              {copied ? "Copied" : "Copy"}
            </Button>
          )}
        </CopyButton>
      </div>

      <div className="participants">
        <Text size="xs" c="var(--pk-fg-muted)">
          Participants
        </Text>
        <div className="participants-row">
          {myDot}
          <Text size="xs">{session.myName} (you)</Text>
        </div>
        {peerEntries.map((p) => (
          <div className="participants-row" key={p.author}>
            <span
              className="participant-dot"
              style={{ backgroundColor: p.color }}
              title={p.name}
            />
            <Text size="xs">{p.name}</Text>
          </div>
        ))}
      </div>

      <Button
        loading={busy}
        onClick={endSession}
        variant="light"
        color="red"
        radius="md"
        size="sm"
      >
        End session
      </Button>
    </Stack>
  );
}
