import { useAtom } from "jotai";
import { useState } from "react";
import { IconPlus } from "@tabler/icons-react";
import { documentAtom } from "../canvas/state";
import { ids } from "../canvas/ids";

export function TitleBarPageSelector() {
  const [doc, setDoc] = useAtom(documentAtom);
  const [renameId, setRenameId] = useState<string | null>(null);

  const switchPage = (pageId: string) =>
    setDoc((d) => (d.pages[pageId] ? { ...d, activePageId: pageId } : d));

  const addPage = () => {
    const pageId = ids.page();
    setDoc((d) => ({
      ...d,
      pages: {
        ...d.pages,
        [pageId]: {
          id: pageId,
          name: `Page ${d.pageOrder.length + 1}`,
          nodes: [],
          edges: [],
          viewport: { x: 0, y: 0, zoom: 1 },
        },
      },
      pageOrder: [...d.pageOrder, pageId],
      activePageId: pageId,
    }));
  };

  const renamePage = (pageId: string, name: string) =>
    setDoc((d) =>
      d.pages[pageId]
        ? {
            ...d,
            pages: {
              ...d.pages,
              [pageId]: { ...d.pages[pageId], name },
            },
          }
        : d,
    );

  const deletePage = (pageId: string) =>
    setDoc((d) => {
      if (!d.pages[pageId] || d.pageOrder.length <= 1) return d;
      const { [pageId]: _removed, ...rest } = d.pages;
      const order = d.pageOrder.filter((id) => id !== pageId);
      return {
        ...d,
        pages: rest,
        pageOrder: order,
        activePageId:
          d.activePageId === pageId ? order[0] : d.activePageId,
      };
    });

  return (
    <div className="titlebar-page-selector">
      {doc.pageOrder.map((pageId) => {
        const page = doc.pages[pageId];
        if (!page) return null;
        const active = pageId === doc.activePageId;
        if (renameId === pageId) {
          return (
            <input
              key={pageId}
              autoFocus
              defaultValue={page.name}
              onBlur={(e) => {
                renamePage(pageId, e.target.value || page.name);
                setRenameId(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  renamePage(pageId, e.currentTarget.value || page.name);
                  setRenameId(null);
                }
                if (e.key === "Escape") setRenameId(null);
              }}
              className="page-tab page-tab-input"
              style={{ width: 110 }}
            />
          );
        }
        return (
          <button
            key={pageId}
            className={`page-tab ${active ? "active" : ""}`}
            onClick={() => switchPage(pageId)}
            onDoubleClick={() => setRenameId(pageId)}
          >
            <span className="dot" />
            {page.name}
            {active && doc.pageOrder.length > 1 && (
              <span
                className="close"
                onClick={(e) => {
                  e.stopPropagation();
                  deletePage(pageId);
                }}
                title="Delete page"
              >
                ×
              </span>
            )}
          </button>
        );
      })}
      <button
        className="page-tab add-btn"
        onClick={addPage}
        title="New page"
      >
        <IconPlus size={13} />
      </button>
    </div>
  );
}
