const focusFns = new Map<string, () => void>();
const pendingFocus = new Set<string>();

export function registerEditorFocus(id: string, fn: () => void) {
  focusFns.set(id, fn);
  if (pendingFocus.has(id)) {
    pendingFocus.delete(id);
    fn();
  }
  return () => {
    if (focusFns.get(id) === fn) {
      focusFns.delete(id);
    }
  };
}

export function focusEditor(id: string) {
  const fn = focusFns.get(id);
  if (fn) {
    fn();
    return;
  }
  pendingFocus.add(id);
}
