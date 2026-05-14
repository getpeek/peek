const focusFns = new Map<string, () => void>();
const pendingFocus = new Set<string>();

// Monaco 0.55+ silently drops focus() if the editor's view hasn't been laid
// out yet — and on first mount the container is briefly hidden by
// @monaco-editor/react until `isEditorReady` flips, so the initial focus
// lands too early. Defer to the next frame to let layout settle.
const deferredFocus = (fn: () => void) => requestAnimationFrame(fn);

export function registerEditorFocus(id: string, fn: () => void) {
  focusFns.set(id, fn);
  if (pendingFocus.has(id)) {
    pendingFocus.delete(id);
    deferredFocus(fn);
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
    deferredFocus(fn);
    return;
  }
  pendingFocus.add(id);
}
