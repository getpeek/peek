import React from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { TitleBarConnectionPicker } from "./TitleBarConnectionPicker";
import "./CustomTitleBar.css";
import { IconMaximize, IconMinus, IconX } from "@tabler/icons-react";

export const CustomTitleBar: React.FC = () => {
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
            <IconMaximize size={9} color="#333" className="icon" stroke={3} />
          </button>
        </div>
        <TitleBarConnectionPicker />
      </div>
    </div>
  );
};
