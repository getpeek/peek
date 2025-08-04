import React from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { TitleBarConnectionPicker } from "./TitleBarConnectionPicker";
import "./CustomTitleBar.css";

export const CustomTitleBar: React.FC = () => {
  const handleMinimize = async () => {
    console.log("minimizing");
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
          >
            <svg width="10" height="10" viewBox="0 0 10 10">
              <path
                d="M1.5 1.5l7 7m-7 0l7-7"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <button
            className="control-button minimize-button"
            onClick={handleMinimize}
            aria-label="Minimize"
          >
            <svg width="10" height="10" viewBox="0 0 10 10">
              <path
                d="M1 5h8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <button
            className="control-button maximize-button"
            onClick={handleMaximize}
            aria-label="Maximize"
          >
            <svg width="10" height="10" viewBox="0 0 10 10">
              <path
                d="M1.5 1.5h7v7h-7z"
                stroke="currentColor"
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
        <TitleBarConnectionPicker />
      </div>
    </div>
  );
};
