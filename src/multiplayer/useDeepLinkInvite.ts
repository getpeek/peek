import { getCurrent, onOpenUrl, register } from "@tauri-apps/plugin-deep-link";
import { atom, getDefaultStore } from "jotai";
import { useEffect } from "react";
import { sessionStateAtom } from "./state";
import type { MultiplayerControls } from "./syncBridgeUtils";

export const pendingInviteAtom = atom<{ ticket: string } | null>(null);

interface PeekMultiplayerWindow extends Window {
  peekMultiplayer?: MultiplayerControls;
}

function controls(): MultiplayerControls | undefined {
  return (window as PeekMultiplayerWindow).peekMultiplayer;
}

// `peek://invite/<ticket>` parses with hostname="invite" and pathname="/<ticket>".
// Iroh DocTickets are base32 so the path slot needs no decoding.
function parseInviteUrl(raw: string): { ticket: string } | null {
  try {
    const u = new URL(raw);
    if (u.protocol !== "peek:") {
      return null;
    }
    if (u.hostname !== "invite") {
      return null;
    }
    const ticket = u.pathname.replace(/^\//, "").trim();
    return ticket ? { ticket } : null;
  } catch {
    return null;
  }
}

async function handleInvite(ticket: string): Promise<void> {
  const store = getDefaultStore();
  const peekControls = controls();
  if (!peekControls) {
    return;
  }

  if (!store.get(sessionStateAtom)) {
    try {
      await peekControls.join(ticket);
    } catch (e) {
      console.error("deep-link: join failed:", e);
    }
    return;
  }

  store.set(pendingInviteAtom, { ticket });
}

export function useDeepLinkInvite(): void {
  useEffect(() => {
    let cancelled = false;
    let unlisten: (() => void) | undefined;

    void (async () => {
      // Linux dev needs a runtime register; macOS/Windows pick up the scheme
      // from the bundle's Info.plist / installer. Throws on unsupported
      // platforms — swallow and continue.
      if (import.meta.env.DEV) {
        try {
          await register("peek");
        } catch {
          // expected on macOS / Windows
        }
      }

      try {
        const initial = await getCurrent();
        if (!cancelled && initial) {
          for (const url of initial) {
            const parsed = parseInviteUrl(url);
            if (parsed) {
              await handleInvite(parsed.ticket);
            }
          }
        }
      } catch (e) {
        console.warn("deep-link: getCurrent failed:", e);
      }

      try {
        unlisten = await onOpenUrl(urls => {
          for (const url of urls) {
            const parsed = parseInviteUrl(url);
            if (!parsed) {
              console.warn("deep-link: ignored URL", url);
              continue;
            }
            void handleInvite(parsed.ticket);
          }
        });
      } catch (e) {
        console.error("deep-link: onOpenUrl failed:", e);
      }
    })();

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);
}
