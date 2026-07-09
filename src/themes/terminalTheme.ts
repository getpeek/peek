import { editor } from "monaco-editor";

// Matches the Terminal UI theme: black editor, white text, CRT accent syntax colors.
// Hex values mirror the --pk-* tokens in src/canvas/nodes/theme/terminal.css.
export const terminalTheme: editor.IStandaloneThemeData = {
  base: "vs-dark",
  inherit: true,
  rules: [
    // Terminal core — white/gray/green.
    // Gray ramp de-emphasizes the scaffolding: comments, operators, punctuation.
    { token: "comment", foreground: "6e6e6e", fontStyle: "italic" },
    { token: "comment.line", foreground: "6e6e6e", fontStyle: "italic" },
    { token: "comment.block", foreground: "6e6e6e", fontStyle: "italic" },
    { token: "operator", foreground: "b5b5b5" },
    { token: "operator.sql", foreground: "b5b5b5" },
    { token: "delimiter", foreground: "b5b5b5" },
    { token: "delimiter.sql", foreground: "b5b5b5" },

    // Green (the phosphor active hue) carries SQL structure — the command keywords.
    { token: "keyword", foreground: "33ff66", fontStyle: "bold" },
    { token: "keyword.sql", foreground: "33ff66", fontStyle: "bold" },
    { token: "keyword.control", foreground: "33ff66", fontStyle: "bold" },
    { token: "keyword.operator", foreground: "7ee7a0" },

    // White is reserved for the data the user reads: table/column identifiers.
    { token: "identifier", foreground: "ffffff" },
    { token: "identifier.sql", foreground: "ffffff" },

    // Usability accents kept few and consistent:
    // cyan = functions & types, amber = string literals, orange = numeric literals.
    { token: "predefined.sql", foreground: "56d4ff" },
    { token: "function", foreground: "56d4ff" },
    { token: "type", foreground: "56d4ff" },
    { token: "type.sql", foreground: "56d4ff" },

    { token: "string", foreground: "ffd633" },
    { token: "string.sql", foreground: "ffd633" },
    { token: "string.quoted", foreground: "ffd633" },

    { token: "number", foreground: "ff9e33" },
    { token: "number.sql", foreground: "ff9e33" },

    // Magenta makes params / bind variables ($limit, :name) impossible to miss.
    { token: "variable", foreground: "c77dff" },
    { token: "constant", foreground: "c77dff" },
    { token: "tag", foreground: "c77dff" },
    { token: "metatag", foreground: "c77dff" },
    { token: "annotation", foreground: "c77dff" },

    // JSON cell (same theme): distinguish keys from values, literals stay in-palette.
    { token: "string.key.json", foreground: "56d4ff" },
    { token: "string.value.json", foreground: "ffd633" },
    { token: "keyword.json", foreground: "33ff66" },
    { token: "number.json", foreground: "ff9e33" },
  ],
  colors: {
    "editor.background": "#000000",
    "editor.foreground": "#ffffff",

    "editorLineNumber.foreground": "#6e6e6e",
    "editorLineNumber.activeForeground": "#b5b5b5",

    "editorCursor.foreground": "#33ff66",

    "editor.selectionBackground": "#333333",
    "editor.inactiveSelectionBackground": "#1f1f1f",
    "editor.selectionHighlightBackground": "#1f1f1f",

    "editor.findMatchBackground": "#333333",
    "editor.findMatchHighlightBackground": "#1f1f1f",
    "editor.findRangeHighlightBackground": "#1f1f1f",

    "editorBracketMatch.background": "#333333",
    "editorBracketMatch.border": "#b5b5b5",

    "editorIndentGuide.background": "#1f1f1f",
    "editorIndentGuide.activeBackground": "#4a4a4a",

    "editorGutter.background": "#000000",

    "scrollbarSlider.background": "#262626",
    "scrollbarSlider.hoverBackground": "#363636",
    "scrollbarSlider.activeBackground": "#4a4a4a",

    // Suggest widget — hex values mirror --pk-* tokens in theme/terminal.css
    "editorSuggestWidget.background": "#000000",
    "editorSuggestWidget.border": "#363636",
    "editorSuggestWidget.foreground": "#ffffff",
    "editorSuggestWidget.selectedBackground": "#111111",
    "editorSuggestWidget.selectedForeground": "#ffffff",
    "editorSuggestWidget.focusHighlightForeground": "#33ff66",
    "editorSuggestWidget.highlightForeground": "#33ff66",
    "editorSuggestWidgetStatus.foreground": "#b5b5b5",

    "editorHoverWidget.background": "#000000",
    "editorHoverWidget.border": "#363636",
    "editorHoverWidget.foreground": "#ffffff",

    "editorError.foreground": "#ff5c57",
    "editorWarning.foreground": "#ffd633",
    "editorInfo.foreground": "#33ccff",
    "editorHint.foreground": "#33ff66",

    "editorWidget.background": "#000000",
    "editorWidget.border": "#363636",
    "editorWidget.foreground": "#ffffff",
  },
};
