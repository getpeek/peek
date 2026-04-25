const focusFns = new Map<string, () => void>();

export function registerQueryEditorFocus(id: string, fn: () => void) {
  focusFns.set(id, fn);
  return () => {
    if (focusFns.get(id) === fn) focusFns.delete(id);
  };
}

export function focusQueryEditor(id: string) {
  focusFns.get(id)?.();
}
