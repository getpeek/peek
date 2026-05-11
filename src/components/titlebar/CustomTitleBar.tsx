import { getCurrentWindow } from "@tauri-apps/api/window";
import { useAtomValue } from "jotai";
import { ConnectionPicker } from "./ConnectionPicker/ConnectionPicker";
import { PageSelector } from "./PageSelector/PageSelector";
import { CommandPaletteButton } from "./CommandPaletteButton/CommandPaletteButton";
import { CollaborateButton } from "./Collaborate/CollaborateButton";
import "./CustomTitleBar.css";
import { IconArrowsDiagonal2, IconMinus, IconX } from "@tabler/icons-react";
import { LiveQueryNotification } from "./LiveQueryNotification/LiveQueryNotification";
import { sessionStateAtom } from "../../multiplayer/state";
import { uiVisibilityAtom } from "../../state";

export const CustomTitleBar = () => {
  const session = useAtomValue(sessionStateAtom);
  const uiVisible = useAtomValue(uiVisibilityAtom);
  const isJoiner = session?.role === "joiner";

  const handleMinimize = async () => {
    const window = getCurrentWindow();
    await window.minimize();
  };

  const handleMaximize = async () => {
    const window = getCurrentWindow();
    await window.toggleMaximize();
  };

  const handleClose = async () => {
    const window = getCurrentWindow();
    await window.close();
  };

  return (
    <div className='custom-titlebar'>
      <div className='titlebar-content' data-tauri-drag-region>
        <div className='titlebar-left' data-tauri-drag-region>
          {uiVisible && (
            <>
              <div className='window-controls'>
                <button
                  className='control-button close-button'
                  onClick={handleClose}
                  aria-label='Close'
                  tabIndex={-1}
                >
                  <IconX size={9} color='#333' className='icon' stroke={3} />
                </button>
                <button
                  className='control-button minimize-button'
                  onClick={handleMinimize}
                  aria-label='Minimize'
                  tabIndex={-1}
                >
                  <IconMinus size={9} color='#333' className='icon' stroke={3} />
                </button>
                <button
                  className='control-button maximize-button'
                  onClick={handleMaximize}
                  aria-label='Maximize'
                  tabIndex={-1}
                >
                  <IconArrowsDiagonal2 size={9} color='#333' className='icon' stroke={3} />
                </button>
              </div>
              <PageSelector />
            </>
          )}
        </div>
        {uiVisible && (
          <div className='titlebar-right'>
            <LiveQueryNotification />
            <CommandPaletteButton />
            <CollaborateButton />
            {!isJoiner && <ConnectionPicker />}
          </div>
        )}
      </div>
    </div>
  );
};
