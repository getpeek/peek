import { IconChevronDown, IconPencil, IconPlus, IconX } from "@tabler/icons-react";
import { getHotkeyHandler } from "@mantine/hooks";
import { useAtom } from "jotai";
import { useEffect, useRef, useState } from "react";
import { usePageActions } from "../../../canvas/hooks/usePageActions";
import { useKeymap } from "../../../app/keymap";
import { formatCombo } from "../../../keymap-help/keymapActions";
import { Tooltip } from "../../Tooltip/Tooltip";
import { pagesMenuOpenAtom, renamingPageIdAtom } from "./state";
import "./PagesMenu.css";

// Single titlebar pill + popover shown when `ui.pages.show_as` is "list". Mirrors
// the regions picker (RegionsMenu): arrow/Enter navigation, inline rename/delete.
export function PagesMenu() {
  const { pages, activePageId, canClose, newPage, closePage, switchPage, renamePage } =
    usePageActions();
  const [open, setOpen] = useAtom(pagesMenuOpenAtom);
  const [renamingId, setRenamingId] = useAtom(renamingPageIdAtom);
  const [cursor, setCursor] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const keymap = useKeymap();

  const activePage = pages.find(page => page.id === activePageId);
  const openPickerCombo = keymap["Page::OpenPicker"][0];

  // Close on outside click. Capture phase mirrors RegionsMenu so the click is
  // seen before any pane below the titlebar can swallow it.
  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointerDown = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setRenamingId(null);
      }
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [open, setOpen, setRenamingId]);

  // Reset only on the open transition — `pages` is a fresh array every render, so
  // depending on it here would re-run (and snap the cursor back) on every keystroke.
  useEffect(() => {
    if (open) {
      const activeIndex = pages.findIndex(page => page.id === activePageId);
      setCursor(activeIndex === -1 ? 0 : activeIndex);
      listRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    itemRefs.current[cursor]?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  const selectPage = (id: string) => {
    switchPage(id);
    setOpen(false);
  };

  const commitRename = (id: string, current: string, value: string) => {
    const name = value.trim();
    if (name.length > 0 && name !== current) {
      renamePage(id, name);
    }
    setRenamingId(null);
  };

  return (
    <div ref={containerRef} className='pages-menu'>
      <Tooltip label='Pages' position='bottom'>
        <button className={`pages-pill ${open ? "active" : ""}`} onClick={() => setOpen(v => !v)}>
          <span className='dot' />
          <span className='pages-pill-label'>{activePage?.name ?? "Pages"}</span>
          <IconChevronDown size={12} className='pages-pill-caret' />
          {openPickerCombo && (
            <kbd className='pages-pill-kbd'>{formatCombo(openPickerCombo).join("")}</kbd>
          )}
        </button>
      </Tooltip>
      {open && (
        <div
          ref={listRef}
          className='pages-list'
          tabIndex={-1}
          onKeyDown={getHotkeyHandler([
            [
              "Escape",
              () => {
                setOpen(false);
                setRenamingId(null);
              },
            ],
            ["ArrowUp", () => setCursor(c => Math.max(0, c - 1))],
            ["ArrowDown", () => setCursor(c => Math.min(pages.length - 1, c + 1))],
            [
              "Enter",
              () => {
                const page = pages[cursor];
                if (page) {
                  selectPage(page.id);
                }
              },
            ],
          ])}
        >
          <div className='pl-title'>
            <span>Pages</span>
            <span className='pl-actions ai'>
              <Tooltip label='New page'>
                <button onClick={() => newPage()}>
                  <IconPlus size={12} />
                </button>
              </Tooltip>
            </span>
          </div>
          {pages.map((page, index) => {
            const active = page.id === activePageId;
            const renaming = renamingId === page.id;
            return (
              <div
                key={page.id}
                ref={el => {
                  itemRefs.current[index] = el;
                }}
                className={`pl-row ${index === cursor ? "active" : ""}`}
                onMouseEnter={() => setCursor(index)}
                onClick={() => {
                  if (!renaming) {
                    selectPage(page.id);
                  }
                }}
              >
                <span className={`dot ${active ? "" : "hollow"}`} />
                {renaming ? (
                  <input
                    key={page.id}
                    className='pl-rename'
                    autoFocus
                    defaultValue={page.name}
                    onFocus={e => e.currentTarget.select()}
                    onClick={e => e.stopPropagation()}
                    onKeyDown={e => {
                      if (e.key === "Enter") {
                        commitRename(page.id, page.name, e.currentTarget.value);
                      }
                      if (e.key === "Escape") {
                        setRenamingId(null);
                      }
                      e.stopPropagation();
                    }}
                    onBlur={e => commitRename(page.id, page.name, e.currentTarget.value)}
                  />
                ) : (
                  <span className='nm'>{page.name}</span>
                )}
                {!renaming && (
                  <span className='pl-actions'>
                    <Tooltip label='Rename'>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setRenamingId(page.id);
                        }}
                      >
                        <IconPencil size={12} />
                      </button>
                    </Tooltip>
                    {canClose && (
                      <Tooltip label='Delete page'>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            closePage(page.id);
                          }}
                        >
                          <IconX size={12} />
                        </button>
                      </Tooltip>
                    )}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
