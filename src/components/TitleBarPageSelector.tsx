import { useState } from "react";
import { IconPlus } from "@tabler/icons-react";
import { usePageActions } from "../canvas/hooks/usePageActions";

export function TitleBarPageSelector() {
  const { pages, activePageId, canClose, newPage, closePage, switchPage, renamePage } =
    usePageActions();
  const [renameId, setRenameId] = useState<string | null>(null);

  return (
    <div className='titlebar-page-selector'>
      {pages.map(page => {
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
        return (
          <button
            key={page.id}
            className={`page-tab ${active ? "active" : ""}`}
            onClick={() => switchPage(page.id)}
            onDoubleClick={() => setRenameId(page.id)}
          >
            {active && <span className='dot' />}
            {page.name}
            {active && canClose && (
              <span
                className='close'
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
