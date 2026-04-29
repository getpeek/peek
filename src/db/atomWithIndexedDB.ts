import { atom, WritableAtom } from "jotai";
import { indexedDBService } from "./IndexedDBService";
import { Connection } from "../Connection/types";

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
        typeof update === "function" ? (update as (prev: T) => T)(get(baseAtom)) : update;

      set(baseAtom, nextValue);

      const valueToSave = options?.serialize ? options.serialize(nextValue) : nextValue;

      switch (key) {
        case "activeConnection":
          indexedDBService
            .saveActiveConnection(
              valueToSave as { connection: Connection; workspaceName: string } | undefined,
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
          const deserializedValue = options?.deserialize ? options.deserialize(value) : value;
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
