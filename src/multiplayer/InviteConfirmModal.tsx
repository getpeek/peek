import { Button, Group, Modal, Stack, Text } from "@mantine/core";
import { useAtom } from "jotai";
import type { MultiplayerControls } from "./syncBridgeUtils";
import { pendingInviteAtom } from "./useDeepLinkInvite";

interface PeekMultiplayerWindow extends Window {
  peekMultiplayer?: MultiplayerControls;
}

function controls(): MultiplayerControls | undefined {
  return (window as PeekMultiplayerWindow).peekMultiplayer;
}

export function InviteConfirmModal() {
  const [pending, setPending] = useAtom(pendingInviteAtom);
  const opened = !!pending;

  const close = () => setPending(null);

  const confirm = async () => {
    if (!pending) {
      return;
    }
    const { ticket } = pending;
    setPending(null);
    const peekControls = controls();
    if (!peekControls) {
      return;
    }
    try {
      await peekControls.end();
      await peekControls.join(ticket);
    } catch (e) {
      console.error("deep-link: end+join failed:", e);
    }
  };

  return (
    <Modal opened={opened} onClose={close} title='Join a different session?' centered size='sm'>
      <Stack gap='md'>
        <Text size='sm'>
          You&apos;re currently in a multiplayer session. End it and join the new one?
        </Text>
        <Group justify='flex-end' gap='xs'>
          <Button variant='default' size='xs' onClick={close}>
            Stay
          </Button>
          <Button color='red' size='xs' onClick={confirm}>
            End and join
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
