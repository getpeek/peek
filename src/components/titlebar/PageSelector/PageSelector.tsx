import { useState } from "react";
import { IconPlus } from "@tabler/icons-react";
import { usePageActions } from "../../../canvas/hooks/usePageActions";
import { siblingSlideX, useTabDragReorder } from "./useTabDragReorder";

export function PageSelector() {
  const { pages, activePageId, canClose, newPage, closePage, switchPage, renamePage, reorderPage } =
    usePageActions();
  const [renameId, setRenameId] = useState<string | null>(null);

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
        const translateX = isDragging
          ? (dragState?.pointerDx ?? 0)
          : siblingSlideX(index, dragState);
        const handlers = getTabHandlers(page.id, index);
        return (
          <button
            key={page.id}
            ref={handlers.ref}
            className={`page-tab ${active ? "active" : ""} ${isDragging ? "dragging" : ""}`}
            style={{ transform: `translateX(${translateX}px)` }}
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
            {page.name}
            {active && canClose && (
              <span
                className='close'
                onPointerDown={e => e.stopPropagation()}
                onClick={e => {
                  e.stopPropagation();
                  closePage(page.id);
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
