import { useEffect, useRef, useState } from "react";
import "./PageSearch.css";
import { getHotkeyHandler, useClickOutside, useHotkeys } from "@mantine/hooks";
import { useAtom, useAtomValue, useStore } from "jotai";
import { IconSearch } from "@tabler/icons-react";
import { pageSearchOpenAtom } from "../state";
import { NO_FIND, nodesAtom, resultFindAtom, resultsAtom } from "../canvas/state";
import { useCanvasApi } from "../canvas/hooks/useCanvas";
import { findRowMatches } from "./cellMatches";
import { useHotkey } from "../app/useHotkey";
import { useKeymap } from "../app/keymap";
import { highlightMatch } from "../Connection/highlightMatch";
import { useNodeSearch, type NodeSearchResult } from "./useNodeSearch";
import type { SearchableNodeType } from "./searchCorpus";
import { NodeIndicator } from "../canvas/nodes/NodeIndicator";
import { PageSearchDetails } from "./PageSearchDetails";

const MAX_RESULTS_PER_TYPE = 3;

export const PageSearch = () => {
  const [show, setShow] = useAtom(pageSearchOpenAtom);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const results = useNodeSearch(query);
  const nodes = useAtomValue(nodesAtom);
  const resultRows = useAtomValue(resultsAtom);
  const canvas = useCanvasApi();
  const store = useStore();
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  // Guards the live camera against re-flying to the node it already framed
  // when `results` gets a new identity on every keystroke.
  const flownTo = useRef<string | null>(null);
  // Result-node ids currently driven into find mode, plus the query last applied
  // to them, so the sync effect only touches nodes whose membership/query changed.
  const findNodes = useRef<Set<string>>(new Set());
  const appliedQuery = useRef("");
  const keymap = useKeymap();

  // Group the flat fuzzysort results by node type: the group holding the best-ranked
  // hit leads, and rows keep their score order within a group, capped at the top
  // MAX_RESULTS_PER_TYPE per type. `ordered` is those rows flattened back into visual
  // order, so the cursor walks straight down across group boundaries; `groupViews`
  // carries each row's flat index for keyboard/ref wiring.
  const groups: { type: SearchableNodeType; rows: NodeSearchResult[] }[] = [];
  for (const result of results) {
    const group = groups.find(g => g.type === result.entry.type);
    if (!group) {
      groups.push({ type: result.entry.type, rows: [result] });
    } else if (group.rows.length < MAX_RESULTS_PER_TYPE) {
      group.rows.push(result);
    }
  }
  const ordered = groups.flatMap(group => group.rows);
  let flatOffset = 0;
  const groupViews = groups.map(group => {
    const start = flatOffset;
    flatOffset += group.rows.length;
    return {
      type: group.type,
      rows: group.rows.map((result, i) => ({ result, index: start + i })),
    };
  });

  const clearFindMode = () => {
    for (const id of findNodes.current) {
      store.set(resultFindAtom(id), NO_FIND);
    }
    findNodes.current = new Set();
    appliedQuery.current = "";
  };

  const close = () => {
    // The sync effect early-returns once `show` is false, so un-find imperatively
    // here — this funnels every exit (Escape, click-outside, Enter/commit).
    clearFindMode();
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
    setCursor(prev => Math.max(0, Math.min(ordered.length - 1, prev + direction)));
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
    const id = ordered[cursor]?.entry.id;
    if (!id || flownTo.current === id) {
      return;
    }
    flownTo.current = id;
    canvas.selectOnly(id);
    canvas.fitNode(id, { duration: 400 });
  }, [show, canvas, cursor, ordered]);

  // Put every result node whose cells match the query into find mode (with the
  // query as its find value) so the matching cells highlight on the canvas, and
  // drop nodes back out as they stop matching. Cleanup on exit lives in `close()`.
  useEffect(() => {
    if (!show) {
      return;
    }
    const next = new Set<string>();
    if (query.trim().length > 0) {
      for (const node of nodes) {
        if (node.type !== "result") {
          continue;
        }
        if (findRowMatches(resultRows[node.id] ?? [], query).length > 0) {
          next.add(node.id);
        }
      }
    }
    const queryChanged = appliedQuery.current !== query;
    for (const id of next) {
      if (queryChanged || !findNodes.current.has(id)) {
        store.set(resultFindAtom(id), { active: true, query, autoFocus: false });
      }
    }
    for (const id of findNodes.current) {
      if (!next.has(id)) {
        store.set(resultFindAtom(id), NO_FIND);
      }
    }
    findNodes.current = next;
    appliedQuery.current = query;
  }, [show, query, nodes, resultRows, store]);

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
                const entry = ordered[cursor]?.entry;
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
          groupViews.map(group => (
            <div className='page-search-group' key={group.type}>
              <div className='page-search-group-header'>
                <NodeIndicator kind={group.type} />
              </div>
              {group.rows.map(({ result: { entry, labelHighlight }, index }) => {
                const active = index === cursor;
                const foldOut = entry.type === "result";
                return (
                  <div
                    ref={el => {
                      itemRefs.current[index] = el;
                    }}
                    key={entry.id}
                    className={`page-search-row-wrap ${active ? "active" : ""}`}
                  >
                    <div
                      className='page-search-row'
                      onClick={() => commit(entry.id)}
                      onMouseEnter={() => setCursor(index)}
                    >
                      <div className='page-search-row-text'>
                        <span className='page-search-row-title'>
                          {highlightMatch(labelHighlight, entry.label)}
                        </span>
                        <span className='page-search-row-snippet'>{entry.snippet}</span>
                      </div>
                      {active && (
                        <div className='page-search-row-right'>
                          <kbd>↵</kbd>
                        </div>
                      )}
                    </div>
                    {active && foldOut && <PageSearchDetails entry={entry} query={query} />}
                  </div>
                );
              })}
            </div>
          ))
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
