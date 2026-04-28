import { getCurrentWindow } from "@tauri-apps/api/window";
import { useAtomValue } from "jotai";
import { TitleBarConnectionPicker } from "./TitleBarConnectionPicker";
import { TitleBarPageSelector } from "./TitleBarPageSelector";
import { TitleBarCommandPalette } from "./TitleBarCommandPalette";
import { TitleBarCollaborateButton } from "./TitleBarCollaborateButton";
import "./CustomTitleBar.css";
import { IconArrowsDiagonal2, IconMinus, IconX } from "@tabler/icons-react";
import { TitlebarLiveQueryNotification } from "./TitlebarLiveQueryNotification";
import { sessionStateAtom } from "../multiplayer/state";

export const CustomTitleBar = () => {
  const session = useAtomValue(sessionStateAtom);
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
    <div className="custom-titlebar">
      <div className="titlebar-content" data-tauri-drag-region>
        <div className="titlebar-left">
          <div className="window-controls">
            <button
              className="control-button close-button"
              onClick={handleClose}
              aria-label="Close"
              tabIndex={-1}
            >
              <IconX size={9} color="#333" className="icon" stroke={3} />
            </button>
            <button
              className="control-button minimize-button"
              onClick={handleMinimize}
              aria-label="Minimize"
              tabIndex={-1}
            >
              <IconMinus size={9} color="#333" className="icon" stroke={3} />
            </button>
            <button
              className="control-button maximize-button"
              onClick={handleMaximize}
              aria-label="Maximize"
              tabIndex={-1}
            >
              <IconArrowsDiagonal2 size={9} color="#333" className="icon" stroke={3} />
            </button>
          </div>
          <TitleBarPageSelector />
        </div>
        <div className="titlebar-right">
          <TitlebarLiveQueryNotification />
          <TitleBarCommandPalette />
          <TitleBarCollaborateButton />
          {!isJoiner && <TitleBarConnectionPicker />}
        </div>
      </div>
    </div>
  );
};
