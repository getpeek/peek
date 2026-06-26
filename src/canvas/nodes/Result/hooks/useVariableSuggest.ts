import { useState } from "react";

const VARIABLE_TRIGGER_RE = /@(\w*)$/u;

type FieldEl = HTMLInputElement | HTMLTextAreaElement;

export type Suggest = {
  prefix: string;
  selectedIdx: number;
  inputEl: FieldEl;
};

export function useVariableSuggest(variableNames: string[], setValue: (next: string) => void) {
  const [suggest, setSuggest] = useState<Suggest | null>(null);

  const filtered = suggest
    ? variableNames.filter(v => v.toLowerCase().startsWith(suggest.prefix.toLowerCase()))
    : [];

  const refresh = (input: FieldEl) => {
    if (variableNames.length === 0) {
      setSuggest(null);
      return;
    }
    const cursor = input.selectionStart ?? input.value.length;
    const match = input.value.slice(0, cursor).match(VARIABLE_TRIGGER_RE);
    if (!match) {
      setSuggest(null);
      return;
    }
    setSuggest(current =>
      current && current.prefix === match[1]
        ? current
        : { prefix: match[1], selectedIdx: 0, inputEl: input },
    );
  };

  const accept = (chosen: string) => {
    if (!suggest) {
      return;
    }
    const input = suggest.inputEl;
    const cursor = input.selectionStart ?? input.value.length;
    const replaceStart = cursor - suggest.prefix.length;
    const nextValue = input.value.slice(0, replaceStart) + chosen + input.value.slice(cursor);
    const newCursor = replaceStart + chosen.length;
    setValue(nextValue);
    setSuggest(null);
    requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(newCursor, newCursor);
    });
  };

  // Returns true if the key event was consumed by the suggest UI.
  const handleKey = (e: React.KeyboardEvent): boolean => {
    if (!suggest || filtered.length === 0) {
      return false;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSuggest(s => (s ? { ...s, selectedIdx: (s.selectedIdx + 1) % filtered.length } : s));
      return true;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSuggest(s =>
        s ? { ...s, selectedIdx: (s.selectedIdx - 1 + filtered.length) % filtered.length } : s,
      );
      return true;
    }
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      accept(filtered[suggest.selectedIdx]);
      return true;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setSuggest(null);
      return true;
    }
    return false;
  };

  const close = () => setSuggest(null);

  return { suggest, filtered, refresh, accept, handleKey, close };
}
