import { Button, Group, Modal, Stack, Text } from "@mantine/core";
import { useAtom, useAtomValue } from "jotai";
import { canvasApiAtom, documentAtom, pendingPageCloseAtom } from "./state";

export function ClosePageConfirmModal() {
  const [pending, setPending] = useAtom(pendingPageCloseAtom);
  const canvas = useAtomValue(canvasApiAtom);
  const doc = useAtomValue(documentAtom);

  const page = pending ? doc.pages[pending.pageId] : null;
  const opened = !!pending && !!page;

  const close = () => setPending(null);

  const confirm = () => {
    if (pending && canvas) canvas.deletePage(pending.pageId);
    setPending(null);
  };

  return (
    <Modal
      opened={opened}
      onClose={close}
      title="Close page?"
      centered
      size="sm"
    >
      <Stack gap="md">
        <Text size="sm">
          {page ? (
            <>
              <strong>{page.name}</strong> has {page.nodes.length}{" "}
              {page.nodes.length === 1 ? "node" : "nodes"}. Closing it will
              discard them.
            </>
          ) : null}
        </Text>
        <Group justify="flex-end" gap="xs">
          <Button variant="default" size="xs" onClick={close}>
            Cancel
          </Button>
          <Button color="red" size="xs" onClick={confirm}>
            Close page
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
