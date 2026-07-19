import { getDefaultStore, useAtomValue, useSetAtom } from "jotai";
import { useEffect } from "react";
import { documentAtom } from "../canvas/state";
import { useCanvas } from "../canvas/hooks/useCanvas";
import { followingAuthorAtom, participantsAtom, remoteViewportsAtom } from "./state";

// Short glide so the camera eases between the ~15 Hz viewport samples rather
// than snapping.
const FOLLOW_PAN_MS = 120;

/**
 * While `followingAuthorAtom` is set, keeps the local camera matching that
 * peer's viewport — center and zoom — and follows their page. Stops
 * automatically if the peer leaves; the local user panning/zooming clears the
 * atom from `onMoveStart`.
 *
 * Mount inside <ReactFlowProvider> — `useCanvas()` needs the flow instance.
 */
export function useFollowPeer(): void {
  const canvas = useCanvas();
  const following = useAtomValue(followingAuthorAtom);
  const setFollowing = useSetAtom(followingAuthorAtom);

  useEffect(() => {
    if (!following) {
      return;
    }

    const store = getDefaultStore();

    // Read from the store rather than subscribing via Jotai so the ~15 Hz
    // viewport stream doesn't re-render this hook's owner.
    const apply = () => {
      if (!store.get(participantsAtom)[following]) {
        setFollowing(null);
        return;
      }
      const viewport = store.get(remoteViewportsAtom)[following];
      if (!viewport) {
        return;
      }
      if (viewport.pageId !== store.get(documentAtom).activePageId) {
        canvas.switchPage(viewport.pageId);
      }
      canvas.panToPoint(viewport.centerX, viewport.centerY, {
        zoom: viewport.zoom,
        duration: FOLLOW_PAN_MS,
      });
    };

    apply();
    const unsubViewports = store.sub(remoteViewportsAtom, apply);
    const unsubPeers = store.sub(participantsAtom, apply);
    return () => {
      unsubViewports();
      unsubPeers();
    };
  }, [following, canvas, setFollowing]);
}
