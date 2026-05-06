import { useEffect, useRef, useState } from "react";
import { IconPlus } from "@tabler/icons-react";
import { usePageActions } from "../../../canvas/hooks/usePageActions";
import { siblingSlideX, useTabDragReorder } from "./useTabDragReorder";
import "./PageSelector.css";

const ENTER_MS = 180;
const EXIT_MS = 140;

export function PageSelector() {
  const { pages, activePageId, canClose, newPage, closePage, switchPage, renamePage, reorderPage } =
    usePageActions();
  const [renameId, setRenameId] = useState<string | null>(null);
  const [enteringIds, setEnteringIds] = useState<Set<string>>(new Set());
  const [exitingIds, setExitingIds] = useState<Set<string>>(new Set());
  const prevPageIds = useRef<Set<string>>(new Set(pages.map(p => p.id)));

  useEffect(() => {
    const currentIds = new Set(pages.map(p => p.id));
    const newIds: string[] = [];
    for (const id of currentIds) {
      if (!prevPageIds.current.has(id)) {
        newIds.push(id);
      }
    }
    prevPageIds.current = currentIds;

    if (newIds.length === 0) {
      return;
    }

    setEnteringIds(prev => new Set([...prev, ...newIds]));
    const timer = setTimeout(() => {
      setEnteringIds(prev => {
        const next = new Set(prev);
        for (const id of newIds) {
          next.delete(id);
        }
        return next;
      });
    }, ENTER_MS);
    return () => clearTimeout(timer);
  }, [pages]);

  function handleClosePage(id: string) {
    setExitingIds(prev => new Set([...prev, id]));
    setTimeout(() => {
      closePage(id);
      setExitingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, EXIT_MS);
  }

  const pageIds = pages.map(p => p.id);
  const { dragState, getTabHandlers, wasDragging } = useTabDragReorder(pageIds, reorderPage);

  return (
    <div className='titlebar-page-selector'>
      {pages.map((page, index) => {
        const active = page.id === activePageId;
        if (renameId === page.id) {
          return (
            <input
              key={page.id}
              autoFocus
              defaultValue={page.name}
              onBlur={e => {
                renamePage(page.id, e.target.value || page.name);
                setRenameId(null);
              }}
              onKeyDown={e => {
                if (e.key === "Enter") {
                  renamePage(page.id, e.currentTarget.value || page.name);
                  setRenameId(null);
                }
                if (e.key === "Escape") {
                  setRenameId(null);
                }
              }}
              className='page-tab page-tab-input'
              style={{ width: 110 }}
            />
          );
        }
        const isDragging = dragState?.draggingId === page.id;
        const isEntering = enteringIds.has(page.id);
        const isExiting = exitingIds.has(page.id);
        const translateX = isDragging
          ? (dragState?.pointerDx ?? 0)
          : siblingSlideX(index, dragState);
        const handlers = getTabHandlers(page.id, index);
        return (
          <button
            key={page.id}
            ref={handlers.ref}
            className={`page-tab ${active ? "active" : ""} ${isDragging ? "dragging" : ""} ${isEntering ? "entering" : ""} ${isExiting ? "exiting" : ""}`}
            style={
              isEntering || isExiting ? undefined : { transform: `translateX(${translateX}px)` }
            }
            onPointerDown={handlers.onPointerDown}
            onClick={() => {
              if (wasDragging()) {
                return;
              }
              switchPage(page.id);
            }}
            onDoubleClick={() => setRenameId(page.id)}
          >
            {active && <span className='dot' />}
            <span className='page-tab-label'>{page.name}</span>
            {active && canClose && (
              <span
                className='close'
                onPointerDown={e => e.stopPropagation()}
                onClick={e => {
                  e.stopPropagation();
                  handleClosePage(page.id);
                }}
                title='Delete page'
              >
                ×
              </span>
            )}
          </button>
        );
      })}
      <button className='page-tab add-btn' onClick={() => newPage()} title='New page'>
        <IconPlus size={13} />
      </button>
    </div>
  );
}
