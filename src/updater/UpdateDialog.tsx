import "./UpdateDialog.css";
import { useClickOutside, useHotkeys } from "@mantine/hooks";
import { IconX } from "@tabler/icons-react";
import { useUpdateCheck } from "./useUpdateCheck";

export function UpdateDialog() {
  const { update, installState, progress, errorMessage, dismiss, install } = useUpdateCheck();
  const isWorking = installState === "downloading" || installState === "installing";
  // Hooks run before the early return, so only bind Escape when the dialog is actually open and
  // dismissable — otherwise it would swallow Escape globally while no update is pending.
  const ref = useClickOutside(() => {
    if (!isWorking) {
      dismiss();
    }
  });
  useHotkeys(update && !isWorking ? [["Escape", dismiss]] : []);

  if (!update) {
    return null;
  }

  return (
    <div className='update-dialog-backdrop'>
      <div className='update-dialog' ref={ref}>
        <div className='update-dialog-header'>
          <h2 className='update-dialog-title'>Update available — Peek {update.version}</h2>
          {!isWorking && (
            <button className='update-dialog-close' onClick={dismiss} aria-label='Close'>
              <IconX size={16} />
            </button>
          )}
        </div>
        <div className='update-dialog-body'>
          {update.body && <p className='update-dialog-notes'>{update.body}</p>}
          {installState === "downloading" && (
            <div className='update-dialog-progress'>
              <span className='update-dialog-status'>Downloading…</span>
              <div className='update-dialog-track'>
                <div className='update-dialog-fill' style={{ width: `${progress * 100}%` }} />
              </div>
            </div>
          )}
          {installState === "installing" && (
            <span className='update-dialog-status'>Installing… the app will relaunch.</span>
          )}
          {installState === "error" && errorMessage && (
            <span className='update-dialog-error'>Update failed: {errorMessage}</span>
          )}
        </div>
        {!isWorking && (
          <div className='update-dialog-footer'>
            <button className='update-dialog-btn' onClick={dismiss}>
              Later
            </button>
            <button className='update-dialog-btn primary' onClick={install}>
              Install and restart
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
