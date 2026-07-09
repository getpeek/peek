import type { Theme } from "../state";

// Maps a UI theme to its Monaco editor theme. Themes not listed fall back to the
// default dark editor (rose-pine).
const EDITOR_THEME_BY_UI: Partial<Record<Theme, string>> = {
  midday: "rose-pine-dawn",
  terminal: "terminal",
};

export const editorThemeForUiTheme = (theme: Theme): string =>
  EDITOR_THEME_BY_UI[theme] ?? "rose-pine";
