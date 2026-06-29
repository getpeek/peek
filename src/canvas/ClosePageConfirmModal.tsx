import "./ClosePageConfirmModal.css";
import { useClickOutside, useHotkeys } from "@mantine/hooks";
import { IconX } from "@tabler/icons-react";
import { useAtom, useAtomValue } from "jotai";
import { canvasApiAtom, documentAtom, pendingPageCloseAtom } from "./state";

export function ClosePageConfirmModal() {
  const [pending, setPending] = useAtom(pendingPageCloseAtom);
  const canvas = useAtomValue(canvasApiAtom);
  const doc = useAtomValue(documentAtom);

  const page = pending ? doc.pages[pending.pageId] : null;
  const opened = !!pending && !!page;

  const close = () => setPending(null);
  const confirm = () => {
    if (pending && canvas) {
      canvas.deletePage(pending.pageId);
    }
    setPending(null);
  };

  const ref = useClickOutside(close);
  // Hooks run before the early return, so only bind Escape while the dialog is open.
  useHotkeys(opened ? [["Escape", close]] : []);

  if (!opened || !page) {
    return null;
  }

  const nodeCount = page.nodes.length;

  return (
    <div className='close-page-backdrop'>
      <div className='close-page-modal' ref={ref}>
        <div className='close-page-header'>
          <h2 className='close-page-title'>Close page?</h2>
          <button className='close-page-close' onClick={close} aria-label='Cancel'>
            <IconX size={16} />
          </button>
        </div>
        <div className='close-page-body'>
          <p className='close-page-message'>
            <strong>{page.name}</strong> has {nodeCount} {nodeCount === 1 ? "node" : "nodes"}.
            Closing it will discard them.
          </p>
        </div>
        <div className='close-page-footer'>
          <button className='close-page-btn' onClick={close}>
            Cancel
          </button>
          <button className='close-page-btn danger' onClick={confirm}>
            Close page
          </button>
        </div>
      </div>
    </div>
  );
}
