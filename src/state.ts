import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { Language, Parser } from "web-tree-sitter";
import { Editor } from "tldraw";

export type DatabaseResult = [string, unknown, string][][];

export const schemaAtom = atom<{
  tables: Record<string, [string, string][]>;
  references: Record<string, string[]>;
}>({
  tables: {},
  references: {},
});

export const persistanceAtom = atomWithStorage<string>(
  "persistance",
  "default",
);

export const sqlParserAtom = atom<Parser>();
export const sqlLanguageAtom = atom<Language>();
export const editorAtom = atom<Editor | null>(null);

// Dark mode atom that syncs with localStorage
export const darkModeAtom = atomWithStorage<boolean>("darkMode", true);
