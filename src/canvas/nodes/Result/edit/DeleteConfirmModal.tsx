import { Button, Group, Modal, Stack, Text } from "@mantine/core";

export function DeleteConfirmModal({
  opened,
  rowCount,
  table,
  saving,
  error,
  onCancel,
  onConfirm,
}: {
  opened: boolean;
  rowCount: number;
  table: string | null;
  saving: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const noun = rowCount === 1 ? "row" : "rows";
  return (
    <Modal
      opened={opened}
      onClose={onCancel}
      title={`Delete ${rowCount} ${noun}?`}
      centered
      size='sm'
    >
      <Stack gap='md'>
        <Text size='sm'>
          {table ? (
            <>
              This will permanently delete {rowCount} {noun} from <strong>{table}</strong>. This
              cannot be undone.
            </>
          ) : (
            <>
              This will permanently delete {rowCount} {noun}. This cannot be undone.
            </>
          )}
        </Text>
        {error && (
          <Text size='xs' c='red'>
            {error}
          </Text>
        )}
        <Group justify='flex-end' gap='xs'>
          <Button variant='default' size='xs' onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button color='red' size='xs' onClick={onConfirm} loading={saving}>
            Delete
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
