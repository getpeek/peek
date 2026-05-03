import { Button, Group, Modal, Progress, Stack, Text } from "@mantine/core";
import { useUpdateCheck } from "./useUpdateCheck";

export function UpdateDialog() {
  const { update, installState, progress, errorMessage, dismiss, install } = useUpdateCheck();

  if (!update) {
    return null;
  }

  const isWorking = installState === "downloading" || installState === "installing";

  return (
    <Modal
      opened
      onClose={dismiss}
      title={`Update available — Peek ${update.version}`}
      centered
      size='md'
      closeOnClickOutside={!isWorking}
      closeOnEscape={!isWorking}
      withCloseButton={!isWorking}
    >
      <Stack gap='md'>
        {update.body && (
          <Text size='sm' style={{ whiteSpace: "pre-wrap" }}>
            {update.body}
          </Text>
        )}
        {installState === "downloading" && (
          <Stack gap={4}>
            <Text size='xs' c='dimmed'>
              Downloading…
            </Text>
            <Progress value={progress * 100} animated />
          </Stack>
        )}
        {installState === "installing" && (
          <Text size='xs' c='dimmed'>
            Installing… the app will relaunch.
          </Text>
        )}
        {installState === "error" && errorMessage && (
          <Text size='xs' c='red'>
            Update failed: {errorMessage}
          </Text>
        )}
        {!isWorking && (
          <Group justify='flex-end' gap='xs'>
            <Button variant='default' size='xs' onClick={dismiss}>
              Later
            </Button>
            <Button size='xs' onClick={install}>
              Install and restart
            </Button>
          </Group>
        )}
      </Stack>
    </Modal>
  );
}
