import { atom, WritableAtom } from "jotai";
import { indexedDBService } from "./IndexedDBService";
import { TLEditorSnapshot } from "tldraw";
import { Connection } from "../Connection/types";

// Helper to create an atom with IndexedDB persistence
export function atomWithIndexedDB<T, V = any>(
  key: string,
  initialValue: T,
  options?: {
    serialize?: (value: T) => V;
    deserialize?: (value: any) => T;
  },
): WritableAtom<T, [T | ((prev: T) => T)], void> {
  const baseAtom = atom(initialValue);

  const derivedAtom = atom(
    (get) => get(baseAtom),
    (get, set, update: T | ((prev: T) => T)) => {
      const nextValue =
        typeof update === "function"
          ? (update as (prev: T) => T)(get(baseAtom))
          : update;

      set(baseAtom, nextValue);

      const valueToSave = options?.serialize
        ? options.serialize(nextValue)
        : nextValue;

      switch (key) {
        case "activeConnection":
          indexedDBService
            .saveActiveConnection(
              valueToSave as
                | { connection: Connection; workspaceName: string }
                | undefined,
            )
            .catch(console.error);
          break;
        default:
          console.warn(`Unknown storage key: ${key}`);
      }
    },
  );

  derivedAtom.onMount = (setAtom) => {
    const loadData = async () => {
      try {
        let value: any;

        switch (key) {
          case "activeConnection":
            value = await indexedDBService.getActiveConnection();
            break;
          default:
            value = initialValue;
        }

        if (value !== undefined && value !== null) {
          const deserializedValue = options?.deserialize
            ? options.deserialize(value)
            : value;
          setAtom(deserializedValue);
        }
      } catch (error) {
        console.error(`Failed to load ${key} from IndexedDB:`, error);
      }
    };

    loadData();
  };

  return derivedAtom;
}

// Special atom for snapshots that handles individual document operations
export function atomWithIndexedDBSnapshots() {
  const baseAtom = atom<Record<string, TLEditorSnapshot>>({});

  const derivedAtom = atom(
    (get) => get(baseAtom),
    (
      get,
      set,
      update:
        | Record<string, TLEditorSnapshot>
        | ((
            prev: Record<string, TLEditorSnapshot>,
          ) => Record<string, TLEditorSnapshot>),
    ) => {
      const prevValue = get(baseAtom);
      const nextValue =
        typeof update === "function" ? update(prevValue) : update;

      set(baseAtom, nextValue);

      // Find changed documents and save them individually
      Object.keys(nextValue).forEach((url) => {
        if (JSON.stringify(nextValue[url]) !== JSON.stringify(prevValue[url])) {
          indexedDBService
            .saveDocument(url, nextValue[url])
            .catch(console.error);
        }
      });

      // Delete removed documents
      Object.keys(prevValue).forEach((url) => {
        if (!(url in nextValue)) {
          indexedDBService.deleteDocument(url).catch(console.error);
        }
      });
    },
  );

  // Initialize from IndexedDB
  derivedAtom.onMount = (setAtom) => {
    const loadData = async () => {
      try {
        const snapshots = await indexedDBService.getAllDocuments();
        if (snapshots && Object.keys(snapshots).length > 0) {
          setAtom(snapshots);
        }
      } catch (error) {
        console.error("Failed to load snapshots from IndexedDB:", error);
      }
    };

    loadData();
  };

  return derivedAtom;
}
