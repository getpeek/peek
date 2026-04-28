import { Button, Modal, Stack, Text, TextInput } from "@mantine/core";
import { useAtom, useAtomValue } from "jotai";
import { useCallback, useState } from "react";
import {
  joinDialogOpenAtom,
  sessionStateAtom,
} from "../multiplayer/state";
import type { MultiplayerControls } from "../multiplayer/syncBridge";

interface PeekMultiplayerWindow extends Window {
  peekMultiplayer?: MultiplayerControls;
}

function controls(): MultiplayerControls | undefined {
  return (window as PeekMultiplayerWindow).peekMultiplayer;
}

export function JoinSessionDialog() {
  const [open, setOpen] = useAtom(joinDialogOpenAtom);
  const session = useAtomValue(sessionStateAtom);
  const [ticket, setTicket] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    setTicket("");
    setError(null);
  }, [setOpen]);

  const submit = useCallback(async () => {
    const trimmed = ticket.trim();
    if (!trimmed) {
      setError("Paste a ticket to join.");
      return;
    }
    if (session) {
      setError("Already in a session — leave first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await controls()?.join(trimmed);
      close();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }, [ticket, session, close]);

  return (
    <Modal
      opened={open}
      onClose={close}
      title="Join a session"
      centered
      radius="md"
      size="md"
    >
      <Stack gap="sm">
        <Text size="xs" c="var(--pk-fg-muted)">
          Paste the ticket the host shared with you. Your local canvas will be
          replaced by the host's; it'll be restored when you leave the session.
        </Text>
        <TextInput
          placeholder="docaaq…"
          value={ticket}
          onChange={(e) => setTicket(e.currentTarget.value)}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void submit();
            }
          }}
          error={error}
          disabled={busy}
        />
        <Button onClick={submit} loading={busy} disabled={!ticket.trim()}>
          Join
        </Button>
      </Stack>
    </Modal>
  );
}
