import { useState } from "react";
import "./CommandPalette.css";
import { useSearch } from "./useSearch";
import { Group, Stack } from "@mantine/core";
import { getHotkeyHandler, useClickOutside, useHotkeys } from "@mantine/hooks";
import { useAtomValue } from "jotai";
import { editorAtom } from "../state";

export const CommandPalette = () => {
  const [show, setShow] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const editor = useAtomValue(editorAtom);
  const results = useSearch(query);
  const hideSearch = () => {
    setShow(false);
    setQuery("");
  };
  const ref = useClickOutside(hideSearch);
  useHotkeys([["mod+shift+P", () => setShow(true)]], ["INPUT", "TEXTAREA"]);
  useHotkeys([["mod+P", () => setShow(true)]], ["INPUT", "TEXTAREA"]);

  const moveCursor = (direction: -1 | 1) => {
    setCursor((prev) =>
      Math.max(0, Math.min(results.length - 1, prev + direction)),
    );
  };

  if (!show || !editor) {
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
          ["Escape", hideSearch],
          ["ArrowUp", () => moveCursor(-1)],
          ["ArrowDown", () => moveCursor(1)],
          [
            "Enter",
            () => {
              results[cursor]?.onSelect(editor);
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
          borderRadius: results.length === 0 ? 16 : "16px 16px 0 0",
        }}
      />
      {results.length > 0 && (
        <div className="output">
          <Stack gap={4}>
            {results.map((result, i) => (
              <div
                className={`result ${i === cursor ? "active" : ""}`}
                key={i}
                onClick={() => result.onSelect(editor)}
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <Group gap="sm" align="center">
                  {result.icon}
                  <Group>
                    {result.label} {result.description}
                  </Group>
                </Group>
              </div>
            ))}
          </Stack>
        </div>
      )}
    </div>
  );
};
