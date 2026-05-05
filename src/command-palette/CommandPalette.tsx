import { useEffect, useRef, useState } from "react";
import "./CommandPalette.css";
import { useSearch } from "./useSearch";
import { getHotkeyHandler, useClickOutside, useHotkeys } from "@mantine/hooks";
import { useAtom } from "jotai";
import { IconSearch } from "@tabler/icons-react";
import { commandPaletteOpenAtom } from "../state";
import { DefaultDetails } from "./details/DefaultDetails";
import { highlightMatch } from "../Connection/highlightMatch";

export const CommandPalette = () => {
  const [show, setShow] = useAtom(commandPaletteOpenAtom);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const results = useSearch(query);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const hideSearch = () => {
    setShow(false);
    setQuery("");
    setCursor(0);
  };
  const ref = useClickOutside(hideSearch);
  useHotkeys([["mod+shift+P", () => setShow(true)]], ["INPUT", "TEXTAREA"]);
  useHotkeys([["mod+P", () => setShow(true)]], ["INPUT", "TEXTAREA"]);
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

  const activeResult = results[cursor];
  const activeCommand = activeResult?.command;
  const detailsContent = activeCommand
    ? (activeCommand.details?.(activeCommand) ?? <DefaultDetails command={activeCommand} />)
    : null;

  return (
    <div className='command-palette' ref={ref}>
      <div className='command-palette-input'>
        <IconSearch size={14} className='command-palette-input-icon' />
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
          placeholder='Search workspace…'
        />
      </div>
      <div className='command-palette-body'>
        <div className='command-palette-list'>
          {results.length === 0 ? (
            <div className='command-palette-empty'>No matching commands</div>
          ) : (
            results.map(({ command, labelHighlight }, i) => (
              <div
                ref={el => {
                  itemRefs.current[i] = el;
                }}
                className={`result ${i === cursor ? "active" : ""}`}
                key={i}
                onClick={() => {
                  command.onSelect();
                  hideSearch();
                }}
                onMouseEnter={() => setCursor(i)}
              >
                {command.icon && <div className='result-icon'>{command.icon}</div>}
                <div className='result-text'>
                  <div className='result-label'>
                    {highlightMatch(labelHighlight, command.label)}
                  </div>
                  {command.description && (
                    <div className='result-description'>{command.description}</div>
                  )}
                </div>
                {command.keybinding && command.keybinding.length > 0 && (
                  <div className='result-keybinding'>
                    {command.keybinding.map((key, k) => (
                      <kbd key={k} className='details-key'>
                        {key}
                      </kbd>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
        <div className='command-palette-details'>{detailsContent}</div>
      </div>
      <div className='command-palette-footer'>
        <kbd className='details-key'>esc</kbd>
        <span>to close</span>
      </div>
    </div>
  );
};
