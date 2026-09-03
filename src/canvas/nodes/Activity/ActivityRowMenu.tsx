import { IconDots } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";

/** A menu closer than this to the bottom of the scroll area opens upward instead. */
const FLIP_MARGIN_PX = 130;

interface ActivityRowMenuProps {
  pid: number;
  /** The statement the kill will run, shown under the confirmation. */
  killLabel: string;
  onCopyQuery: () => void;
  onCopyPid: () => void;
  onKill: () => void;
  onOpenChange: (open: boolean) => void;
}

export function ActivityRowMenu({
  pid,
  killLabel,
  onCopyQuery,
  onCopyPid,
  onKill,
  onOpenChange,
}: ActivityRowMenuProps) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [flipUp, setFlipUp] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const close = () => {
    setOpen(false);
    setConfirming(false);
    onOpenChange(false);
  };

  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        close();
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        close();
      }
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown, true);
    };
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const toggle = () => {
    if (open) {
      close();
      return;
    }
    // Measured against the scroll container rather than the node, so a menu near
    // the bottom of the list isn't clipped by the overflow.
    const button = rootRef.current;
    const scroller = button?.closest(".activity-scroll");
    if (button && scroller) {
      const spaceBelow =
        scroller.getBoundingClientRect().bottom - button.getBoundingClientRect().bottom;
      setFlipUp(spaceBelow < FLIP_MARGIN_PX);
    }
    setOpen(true);
    onOpenChange(true);
  };

  const run = (action: () => void) => {
    action();
    close();
  };

  return (
    <div className='activity-row-menu' ref={rootRef}>
      <button
        className={`activity-dots ${open ? "is-open" : ""}`}
        onClick={toggle}
        type='button'
        aria-label='Row actions'
      >
        <IconDots size={14} />
      </button>

      {open && (
        <div className={`activity-menu ${flipUp ? "flip-up" : ""}`}>
          {confirming ? (
            <div className='activity-menu-confirm'>
              <div className='activity-menu-confirm-title'>Kill query on pid {pid}?</div>
              <div className='activity-menu-confirm-sub'>{killLabel}</div>
              <div className='activity-menu-confirm-actions'>
                <button className='btn btn-danger' onClick={() => run(onKill)} type='button'>
                  Yes
                </button>
                <button className='btn btn-ghost' onClick={close} type='button'>
                  No
                </button>
              </div>
            </div>
          ) : (
            <>
              <button onClick={() => run(onCopyQuery)} type='button'>
                Copy query
              </button>
              <button onClick={() => run(onCopyPid)} type='button'>
                Copy PID
              </button>
              <div className='activity-menu-sep' />
              <button className='is-danger' onClick={() => setConfirming(true)} type='button'>
                Kill query
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
