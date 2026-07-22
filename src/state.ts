import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { Workspace } from "./Connection/types";

export type DatabaseResult = [string, unknown, string][][];
export type Theme = "pine" | "midnight" | "midday" | "terminal" | "paper" | "blueprint";
export type AgentProvider = "ollama" | "acp";
export interface Config {
  ai: {
    default_provider: AgentProvider;
    // Optional: present only when configured. Absence disables the backend/feature.
    ollama?: {
      model: string;
      url: string;
    };
    automatically_label_queries: boolean;
    acp?: {
      command: string;
      args: string[];
      env: Record<string, string>;
      cwd?: string;
    };
    mcp: {
      enable: boolean;
      port: number;
    };
  };
  workspaces: Workspace[];
  name: string;
  theme: Theme;
  keymap: Record<string, string>;
  canvas: {
    enable_regions: boolean;
  };
  ui: {
    pages: {
      show_as: "tabs" | "list";
    };
    titlebar: {
      command_palette_button: "show" | "hide";
      collaboration_button: "show" | "hide";
      live_query_count: "show" | "hide";
    };
  };
}

export const configAtom = atom<Config>();

export const previewThemeAtom = atom<Theme | null>(null);

// Preview wins while the theme picker is open; otherwise the saved theme.
export const effectiveThemeAtom = atom(
  get => get(previewThemeAtom) ?? get(configAtom)?.theme ?? "pine",
);

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

export const commandPaletteOpenAtom = atom<boolean>(false);

export const pageSearchOpenAtom = atom<boolean>(false);

export const keymapHelpOpenAtom = atom<boolean>(false);

export const themePickerOpenAtom = atom<boolean>(false);

export const connectionPickerOpenAtom = atom<boolean>(false);

export const uiVisibilityAtom = atom<boolean>(true);
