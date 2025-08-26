import { useAtomValue, useSetAtom } from "jotai";
import { activeConnectionAtom, snapshotsAtom } from "../Connection/state";
import { useEffect, useRef } from "react";
import { getSnapshot, TLStore } from "tldraw";

export const useAutoSaveDocument = (store: TLStore | undefined) => {
  const activeConnection = useAtomValue(activeConnectionAtom);
  const setSnapshots = useSetAtom(snapshotsAtom);
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!activeConnection || !store) {
      return;
    }

    const saveSnapshot = () => {
      setSnapshots((previous) => ({
        ...previous,
        [activeConnection.connection.url]: getSnapshot(store),
      }));
      console.log("Saved changes at", new Date().toISOString());
    };

    const cleanup = store.listen(
      () => {
        if (debounceTimeoutRef.current) {
          clearTimeout(debounceTimeoutRef.current);
        }
        debounceTimeoutRef.current = setTimeout(() => {
          saveSnapshot();
          debounceTimeoutRef.current = null;
        }, 3000);
      },
      { scope: "document", source: "user" },
    );

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      cleanup();
    };
  }, [activeConnection?.connection.url, store, setSnapshots]);
};
