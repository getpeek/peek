import { useAtomValue } from "jotai";
import { useEffect, useRef } from "react";
import { loadSnapshot, TLStore } from "tldraw";
import { snapshotForUrlAtom, activeConnectionAtom } from "../Connection/state";

export const useLoadDocument = (store: TLStore | undefined) => {
  const isInitialLoadRef = useRef(true);
  const activeConnection = useAtomValue(activeConnectionAtom);
  const initialSnapshot = useAtomValue(
    snapshotForUrlAtom(activeConnection?.connection.url ?? "default"),
  );

  useEffect(() => {
    if (!store) {
      return;
    }

    try {
      loadSnapshot(store, initialSnapshot);
      isInitialLoadRef.current = false;
    } catch {}
  }, [store, initialSnapshot, activeConnection?.connection.url]);
};
