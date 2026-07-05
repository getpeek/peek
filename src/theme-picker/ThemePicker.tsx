import "./ThemePicker.css";
import { useEffect, useRef, useState } from "react";
import { useAtom, useSetAtom } from "jotai";
import { getHotkeyHandler, useClickOutside, useHotkeys } from "@mantine/hooks";
import { invoke } from "@tauri-apps/api/core";
import { configAtom, previewThemeAtom, themePickerOpenAtom } from "../state";
import type { Theme } from "../state";
import { THEMES } from "./themes";

const swatchTokens = [
  "--pk-swatch-bg",
  "--pk-swatch-node-bg",
  "--pk-swatch-border",
  "--pk-swatch-accent",
  "--pk-swatch-fg",
] as const;

export const ThemePicker = () => {
  const [open, setOpen] = useAtom(themePickerOpenAtom);
  const setPreview = useSetAtom(previewThemeAtom);
  const [config, setConfig] = useAtom(configAtom);
  const [cursor, setCursor] = useState(0);
  const ref = useClickOutside<HTMLDivElement>(() => close());
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  const close = () => {
    setPreview(null);
    setOpen(false);
  };

  const commit = async (theme: Theme) => {
    await invoke("set_theme", { theme });
    setConfig(prev => (prev ? { ...prev, theme } : prev));
    setPreview(null);
    setOpen(false);
  };

  const applyCursor = (index: number) => {
    const clamped = Math.max(0, Math.min(THEMES.length - 1, index));
    setCursor(clamped);
    setPreview(THEMES[clamped].id);
  };

  // Start the highlight on the saved theme so preview matches reality on open.
  useEffect(() => {
    if (!open) {
      return;
    }
    const selected = Math.max(
      0,
      THEMES.findIndex(theme => theme.id === config?.theme),
    );
    setCursor(selected);
    setPreview(THEMES[selected].id);
    ref.current?.focus();
  }, [open]);

  useEffect(() => {
    itemRefs.current[cursor]?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  useHotkeys([["Escape", () => close()]]);

  if (!open) {
    return null;
  }

  return (
    <div
      className='theme-picker'
      ref={ref}
      tabIndex={-1}
      onKeyDown={getHotkeyHandler([
        ["Escape", close],
        ["ArrowUp", () => applyCursor(cursor - 1)],
        ["ArrowDown", () => applyCursor(cursor + 1)],
        ["Enter", () => commit(THEMES[cursor].id)],
      ])}
    >
      <div className='theme-picker-header'>Select theme</div>
      <div className='theme-picker-list'>
        {THEMES.map((theme, i) => (
          <div
            key={theme.id}
            ref={el => {
              itemRefs.current[i] = el;
            }}
            className={`theme-picker-row ${i === cursor ? "active" : ""}`}
            onMouseEnter={() => applyCursor(i)}
            onClick={() => commit(theme.id)}
          >
            <span className={`theme-picker-swatches pk-theme-${theme.id}`}>
              {swatchTokens.map(token => (
                <span
                  key={token}
                  className='theme-picker-swatch'
                  style={{ background: `var(${token})` }}
                />
              ))}
            </span>
            <span className='theme-picker-name'>{theme.name}</span>
            <span className='theme-picker-tagline'>{theme.tagline}</span>
          </div>
        ))}
      </div>
      <div className='theme-picker-footer'>
        <kbd className='theme-picker-key'>↑</kbd>
        <kbd className='theme-picker-key'>↓</kbd>
        <span>navigate</span>
        <span className='theme-picker-footer-sep'>·</span>
        <kbd className='theme-picker-key'>↵</kbd>
        <span>select</span>
        <span className='theme-picker-footer-sep'>·</span>
        <kbd className='theme-picker-key'>esc</kbd>
        <span>cancel</span>
      </div>
    </div>
  );
};
