import { useEffect, useRef, useState } from "react";
import "./CommandPalette.css";
import { useSearch } from "./useSearch";
import { getHotkeyHandler, useHotkeys } from "@mantine/hooks";
import { useAtom } from "jotai";
import { IconSearch } from "@tabler/icons-react";
import { commandPaletteOpenAtom } from "../state";
import { DefaultDetails } from "./details/DefaultDetails";
import { ACTION_GLYPH } from "./commands";
import { highlightMatch } from "../Connection/highlightMatch";
import { useHotkey } from "../app/useHotkey";
import { useKeymap } from "../app/keymap";
import { useClickAwayCapture } from "../app/useClickAwayCapture";

export const CommandPalette = () => {
  const [show, setShow] = useAtom(commandPaletteOpenAtom);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const results = useSearch(query);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const paletteRef = useRef<HTMLDivElement>(null);
  const hideSearch = () => {
    setShow(false);
    setQuery("");
    setCursor(0);
  };
  useClickAwayCapture(show, hideSearch, [paletteRef]);
  const keymap = useKeymap();
  useHotkey(keymap["CommandPalette::Open"], () => setShow(true));
  useHotkeys([["Escape", () => hideSearch()]]);

  const moveCursor = (direction: -1 | 1) => {
    setCursor(prev => Math.max(0, Math.min(results.length - 1, prev + direction)));
  };

  useEffect(() => {
    itemRefs.current[cursor]?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  if (!show) {
    return null;
  }

  return (
    <div className='command-palette' ref={paletteRef}>
      <div className='command-palette-input'>
        <IconSearch size={16} className='command-palette-input-icon' />
        <input
          autoFocus
          className='query'
          type='text'
          autoComplete='off'
          autoCorrect='off'
          value={query}
          onKeyDown={getHotkeyHandler([
            ["Escape", hideSearch],
            ["ArrowUp", () => moveCursor(-1)],
            ["ArrowDown", () => moveCursor(1)],
            [
              "Enter",
              () => {
                results[cursor]?.command.onSelect();
                hideSearch();
              },
            ],
          ])}
          onChange={e => {
            setCursor(0);
            setQuery(e.currentTarget.value);
          }}
          placeholder='Search…'
        />
      </div>
      <div className='command-palette-list'>
        {query.trim().length === 0 ? (
          <div className='command-palette-empty'>Type to search commands</div>
        ) : results.length === 0 ? (
          <div className='command-palette-empty'>No matching commands</div>
        ) : (
          results.map(({ command, labelHighlight }, i) => {
            const active = i === cursor;
            return (
              <div
                ref={el => {
                  itemRefs.current[i] = el;
                }}
                className={`result-wrap ${active ? "active" : ""}`}
                key={i}
              >
                <div
                  className='result'
                  onClick={() => {
                    command.onSelect();
                    hideSearch();
                  }}
                  onMouseEnter={() => setCursor(i)}
                >
                  {command.icon && <div className='result-icon'>{command.icon}</div>}
                  <div className='result-text'>
                    <span className='result-title'>
                      {highlightMatch(labelHighlight, command.label)}
                    </span>
                    {command.description && (
                      <span className='result-desc'>{command.description}</span>
                    )}
                  </div>
                  {command.keybinding && command.keybinding.length > 0 ? (
                    <div className='result-keybinding'>
                      {command.keybinding.map((key, k) => (
                        <kbd key={k} className='details-key'>
                          {key}
                        </kbd>
                      ))}
                    </div>
                  ) : command.action ? (
                    <span className='result-glyph' title={ACTION_GLYPH[command.action].label}>
                      {ACTION_GLYPH[command.action].glyph}
                    </span>
                  ) : null}
                </div>
                {active && (command.details ?? <DefaultDetails command={command} />)}
              </div>
            );
          })
        )}
      </div>
      <div className='command-palette-footer'>
        <span className='command-palette-footer-nav'>
          <kbd className='details-key'>↑</kbd>
          <kbd className='details-key'>↓</kbd>
          <span>navigate</span>
          <span className='command-palette-footer-sep'>·</span>
          <kbd className='details-key'>↵</kbd>
          <span>select</span>
        </span>
        <span className='command-palette-footer-item'>
          <kbd className='details-key'>esc</kbd>
          <span>to close</span>
        </span>
      </div>
    </div>
  );
};
