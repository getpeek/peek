import { Connection, Workspace } from "./types";
import { atom } from "jotai";
import {
  atomWithIndexedDB,
  atomWithIndexedDBSnapshots,
} from "../db/atomWithIndexedDB";
import { configAtom } from "../state";

export const workspacesAtom = atom<Workspace[]>(
  (get) => get(configAtom)?.workspaces ?? [],
);

export const activeConnectionAtom = atomWithIndexedDB<
  { connection: Connection; workspaceName: string } | undefined
>("activeConnection", undefined);

export const snapshotsAtom = atomWithIndexedDBSnapshots();

export const snapshotForUrlAtom = (url: string) =>
  atom((get) => get(snapshotsAtom)[url]);
