import type { SessionStatusText } from "./useSessionStatusText";

interface Props {
  status: SessionStatusText;
  busy: boolean;
  /** Omitted for joiners — they leave via the button, not by flipping the host's switch. */
  onToggle?: () => void;
}

export function ShareStatusStrip({ status, busy, onToggle }: Props) {
  const on = status.tone !== "off";
  const toneClass = on ? (status.tone === "warn" ? "is-warn" : "is-on") : "";

  return (
    <div className={`collab-strip ${toneClass}`}>
      <span className={`collab-strip-dot ${status.tone === "starting" ? "collab-pulse" : ""}`} />
      <span className='collab-strip-text'>
        <span className='collab-strip-title'>{status.title}</span>
        <span className='collab-strip-meta'>{status.meta}</span>
      </span>
      {onToggle && (
        <button
          type='button'
          className={`collab-switch ${on ? "is-on" : ""}`}
          onClick={onToggle}
          disabled={busy || status.tone === "starting"}
          aria-pressed={on}
          aria-label={on ? "Stop sharing this canvas" : "Share this canvas"}
        />
      )}
    </div>
  );
}
