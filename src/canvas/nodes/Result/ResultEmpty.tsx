import { Text } from "@mantine/core";

export function ResultEmpty({ message }: { message: string }) {
  return (
    <div className='no-results' style={{ padding: 16 }}>
      <Text c='var(--pk-fg-muted)'>{message}</Text>
    </div>
  );
}
