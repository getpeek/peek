import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { Workspace } from "./Connection/types";

export type DatabaseResult = [string, unknown, string][][];
export interface Config {
  ai: {
    model: string;
    url: string;
  };
  workspaces: Workspace[];
  name: string;
}

export const configAtom = atom<Config>();

export interface Schema {
  tables: Record<string, [string, string][]>;
  references: Record<string, string[]>;
  primaryKeys: Record<string, string[]>;
}

export const emptySchema = (): Schema => ({
  tables: {},
  references: {},
  primaryKeys: {},
});

export const schemaAtom = atom<Schema>(emptySchema());

export const persistanceAtom = atomWithStorage<string>("persistance", "default");

// Dark mode atom that syncs with localStorage
export const darkModeAtom = atomWithStorage<boolean>("darkMode", true);

export const commandPaletteOpenAtom = atom<boolean>(false);
