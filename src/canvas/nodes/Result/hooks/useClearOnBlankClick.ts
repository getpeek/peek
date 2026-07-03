/**
 * Clears the active selection when the scroll container is pressed on blank
 * space — anywhere that isn't a data row or the header. React bubbles synthetic
 * events through the component tree, so portaled children (Mantine Modal, Menu)
 * reach this handler too; the containment check ignores those.
 */
export function useClearOnBlankClick({
  hasSelection,
  clear,
}: {
  hasSelection: boolean;
  clear: () => void;
}) {
  return (e: React.MouseEvent<HTMLDivElement>) => {
    if (!hasSelection) {
      return;
    }
    const target = e.target as HTMLElement | null;
    if (!target || !e.currentTarget.contains(target)) {
      return;
    }
    if (target.closest("tr[data-index]") || target.closest("thead")) {
      return;
    }
    clear();
  };
}
