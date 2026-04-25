import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { Language, Parser } from "web-tree-sitter";
import { Workspace } from "./Connection/types";

export type DatabaseResult = [string, unknown, string][][];
export interface Config {
  ai: {
    model: string;
    url: string;
  };
  workspaces: Workspace[];
}

export const configAtom = atom<Config>();

export const schemaAtom = atom<{
  tables: Record<string, [string, string][]>;
  references: Record<string, string[]>;
  primaryKeys: Record<string, string[]>;
}>({
  tables: {},
  references: {},
  primaryKeys: {},
});

export const persistanceAtom = atomWithStorage<string>(
  "persistance",
  "default",
);

export const sqlParserAtom = atom<Parser>();
export const sqlLanguageAtom = atom<Language>();

// Dark mode atom that syncs with localStorage
export const darkModeAtom = atomWithStorage<boolean>("darkMode", true);

export const commandPaletteOpenAtom = atom<boolean>(false);
