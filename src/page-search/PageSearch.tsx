import { useEffect, useRef, useState } from "react";
import "./PageSearch.css";
import { getHotkeyHandler, useClickOutside, useHotkeys } from "@mantine/hooks";
import { useAtom, useAtomValue } from "jotai";
import { IconSearch } from "@tabler/icons-react";
import { pageSearchOpenAtom } from "../state";
import { nodesAtom } from "../canvas/state";
import { useCanvasApi } from "../canvas/hooks/useCanvas";
import { useHotkey } from "../app/useHotkey";
import { useKeymap } from "../app/keymap";
import { highlightMatch } from "../Connection/highlightMatch";
import { useNodeSearch } from "./useNodeSearch";
import { KIND_META } from "./searchCorpus";
import { PageSearchDetails } from "./PageSearchDetails";

export const PageSearch = () => {
  const [show, setShow] = useAtom(pageSearchOpenAtom);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const results = useNodeSearch(query);
  const nodes = useAtomValue(nodesAtom);
  const canvas = useCanvasApi();
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  // Guards the live camera against re-flying to the node it already framed
  // when `results` gets a new identity on every keystroke.
  const flownTo = useRef<string | null>(null);
  const keymap = useKeymap();

  const close = () => {
    setShow(false);
    setQuery("");
    setCursor(0);
    flownTo.current = null;
  };

  const cancel = () => {
    if (!show) {
      return;
    }
    canvas?.deselectAll();
    close();
  };

  const commit = (id: string) => {
    canvas?.selectOnly(id);
    canvas?.fitNode(id, { duration: 300 });
    close();
  };

  const ref = useClickOutside(cancel);
  // Shares the command-palette pattern of self-registering its open hotkey, plus a
  // selection gate: with a result node selected the same combo belongs to the
  // in-result search (ResultNode's own Page::Search listener).
  useHotkey(keymap["Page::Search"], () => {
    if (canvas && canvas.getSelectedNodes().length === 0) {
      setShow(true);
    }
  });
  useHotkeys([["Escape", cancel]]);

  const moveCursor = (direction: -1 | 1) => {
    setCursor(prev => Math.max(0, Math.min(results.length - 1, prev + direction)));
  };

  useEffect(() => {
    itemRefs.current[cursor]?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  // Live camera: fly to whichever node is highlighted, as the prototype does,
  // so scanning results doubles as canvas wayfinding.
  useEffect(() => {
    if (!show || !canvas) {
      return;
    }
    const id = results[cursor]?.entry.id;
    if (!id || flownTo.current === id) {
      return;
    }
    flownTo.current = id;
    canvas.selectOnly(id);
    canvas.fitNode(id, { duration: 400 });
  }, [show, canvas, cursor, results]);

  if (!show) {
    return null;
  }

  return (
    <div className='page-search' ref={ref}>
      <div className='page-search-input'>
        <IconSearch size={16} className='page-search-input-icon' />
        <input
          autoFocus
          className='page-search-query'
          type='text'
          autoComplete='off'
          autoCorrect='off'
          value={query}
          onKeyDown={getHotkeyHandler([
            ["Escape", cancel],
            ["ArrowUp", () => moveCursor(-1)],
            ["ArrowDown", () => moveCursor(1)],
            [
              "Enter",
              () => {
                const entry = results[cursor]?.entry;
                if (entry) {
                  commit(entry.id);
                }
              },
            ],
          ])}
          onChange={e => {
            setCursor(0);
            setQuery(e.currentTarget.value);
          }}
          placeholder='Search across every node…'
        />
        <kbd>esc</kbd>
      </div>
      <div className='page-search-list'>
        {query.trim().length === 0 ? (
          <div className='page-search-empty'>Type to search every node on this page</div>
        ) : results.length === 0 ? (
          <div className='page-search-empty'>
            No nodes match <b>“{query}”</b>
          </div>
        ) : (
          results.map(({ entry, labelHighlight }, i) => {
            const active = i === cursor;
            const meta = KIND_META[entry.type];
            const foldOut = entry.type === "query" || entry.type === "result";
            return (
              <div
                ref={el => {
                  itemRefs.current[i] = el;
                }}
                key={entry.id}
                className={`page-search-row-wrap ${active ? "active" : ""}`}
                data-kind={entry.type}
              >
                <div
                  className='page-search-row'
                  onClick={() => commit(entry.id)}
                  onMouseEnter={() => setCursor(i)}
                >
                  <div className='page-search-row-icon'>
                    <meta.Icon size={16} />
                  </div>
                  <div className='page-search-row-text'>
                    <span className='page-search-row-title'>
                      {highlightMatch(labelHighlight, entry.label)}
                    </span>
                    <span className='page-search-row-snippet'>{entry.snippet}</span>
                  </div>
                  <div className='page-search-row-right'>
                    <span className='page-search-kind'>{meta.badge}</span>
                    {active && <kbd>↵</kbd>}
                  </div>
                </div>
                {active && foldOut && <PageSearchDetails entry={entry} query={query} />}
              </div>
            );
          })
        )}
      </div>
      <div className='page-search-footer'>
        <span className='page-search-footer-nav'>
          <kbd>↑</kbd>
          <kbd>↓</kbd>
          <span>navigate</span>
          <span className='page-search-footer-sep'>·</span>
          <kbd>↵</kbd>
          <span>jump</span>
          <span className='page-search-footer-sep'>·</span>
          <kbd>esc</kbd>
          <span>close</span>
        </span>
        {query.trim().length > 0 && results.length > 0 ? (
          <span className='page-search-footer-live'>
            <span className='page-search-live-dot' />
            camera tracking best match
          </span>
        ) : (
          <span>{nodes.length} nodes on page</span>
        )}
      </div>
    </div>
  );
};
