import { Connection, Workspace } from "./types";
import { atom } from "jotai";
import {
  atomWithIndexedDB,
  atomWithIndexedDBSnapshots,
} from "../db/atomWithIndexedDB";

export const workspacesAtom = atom<Workspace[]>([]);

export const activeConnectionAtom = atomWithIndexedDB<
  { connection: Connection; workspaceName: string } | undefined
>("activeConnection", undefined);

export const snapshotsAtom = atomWithIndexedDBSnapshots();

export const snapshotForUrlAtom = (url: string) =>
  atom((get) => get(snapshotsAtom)[url]);
