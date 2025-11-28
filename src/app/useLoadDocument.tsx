import { useAtomValue } from "jotai";
import { useEffect, useRef } from "react";
import { getSnapshot, loadSnapshot, TLEditorSnapshot, TLStore } from "tldraw";
import { activeConnectionAtom } from "../Connection/state";
import { invoke } from "@tauri-apps/api/core";

export const useLoadDocument = (store: TLStore | undefined) => {
  const isInitialLoadRef = useRef(true);
  const activeConnection = useAtomValue(activeConnectionAtom);

  useEffect(() => {
    if (!store || !activeConnection) {
      return;
    }

    invoke("load", {
      workspace: activeConnection.workspaceName,
      connectionName: activeConnection.connection.name,
    }).then((result) => {
      snapshot = JSON.parse(result as string);
    });

    let snapshot: TLEditorSnapshot = getSnapshot(store);

    try {
      invoke("load", {
        workspace: activeConnection.workspaceName,
        connectionName: activeConnection.connection.name,
      }).then((result) => {
        console.log(result);
        snapshot = JSON.parse(result as string);
        loadSnapshot(store, snapshot);
        isInitialLoadRef.current = false;
      });
    } catch {}
  }, [store, activeConnection?.connection.url]);
};
