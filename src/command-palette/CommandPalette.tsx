import { useState } from "react";
import "./CommandPalette.css";
import { useSearch } from "./useSearch";
import { Group, Stack } from "@mantine/core";
import { getHotkeyHandler, useClickOutside, useHotkeys } from "@mantine/hooks";

export const CommandPalette = () => {
  const [show, setShow] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const results = useSearch(query);
  const hideSearch = () => {
    setQuery("");
    setShow(false);
  };
  const ref = useClickOutside(hideSearch);
  useHotkeys([["meta+shift+P", () => setShow(true)]], ["INPUT", "TEXTAREA"]);

  const moveCursor = (direction: -1 | 1) => {
    setCursor((prev) =>
      Math.max(0, Math.min(results.length - 1, prev + direction)),
    );
  };

  if (!show) {
    return null;
  }

  return (
    <div className="command-palette" ref={ref}>
      <input
        autoFocus
        className="query"
        type="text"
        autoComplete="off"
        autoCorrect="off"
        value={query}
        onKeyDown={getHotkeyHandler([
          ["esc", hideSearch],
          ["arrowup", () => moveCursor(-1)],
          ["arrowdown", () => moveCursor(1)],
          [
            "enter",
            () => {
              results[cursor]?.onSelect();
              hideSearch();
            },
          ],
        ])}
        onChange={(e) => {
          setCursor(0);
          setQuery(e.currentTarget.value);
        }}
        placeholder="Search a command or anything else"
        style={{
          borderBottom:
            results.length > 0 ? `1px solid hsla(0deg, 0%, 90%, 0.1)` : "",
          borderRadius: results.length === 0 ? "16px" : "",
        }}
      />
      {results.length > 0 && (
        <div className="output">
          <Stack gap={4}>
            {results.map((result, i) => (
              <div
                className={`result ${i === cursor ? "active" : ""}`}
                key={i}
                onClick={result.onSelect}
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <Group gap="sm">
                  {result.icon} {result.label}
                </Group>
              </div>
            ))}
          </Stack>
        </div>
      )}
    </div>
  );
};
