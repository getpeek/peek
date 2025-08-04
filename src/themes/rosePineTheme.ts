import { editor } from "monaco-editor";

export const rosePineTheme: editor.IStandaloneThemeData = {
  base: "vs-dark",
  inherit: true,
  rules: [
    // Comments
    { token: "comment", foreground: "6e6a86", fontStyle: "italic" },
    { token: "comment.line", foreground: "6e6a86", fontStyle: "italic" },
    { token: "comment.block", foreground: "6e6a86", fontStyle: "italic" },

    // Keywords
    { token: "keyword", foreground: "31748f", fontStyle: "bold" },
    { token: "keyword.control", foreground: "31748f", fontStyle: "bold" },
    { token: "keyword.operator", foreground: "31748f" },

    // Strings
    { token: "string", foreground: "f6c177" },
    { token: "string.sql", foreground: "f6c177" },
    { token: "string.quoted", foreground: "f6c177" },

    // Numbers
    { token: "number", foreground: "ea9a97" },
    { token: "number.sql", foreground: "ea9a97" },

    // Identifiers and variables
    { token: "identifier", foreground: "e0def4" },
    { token: "identifier.sql", foreground: "e0def4" },

    // Functions
    { token: "predefined.sql", foreground: "9ccfd8" },
    { token: "function", foreground: "9ccfd8" },

    // Operators
    { token: "operator", foreground: "908caa" },
    { token: "operator.sql", foreground: "908caa" },

    // Delimiters
    { token: "delimiter", foreground: "908caa" },
    { token: "delimiter.sql", foreground: "908caa" },

    // Types
    { token: "type", foreground: "c4a7e7" },
    { token: "type.sql", foreground: "c4a7e7" },

    // Special
    { token: "tag", foreground: "eb6f92" },
    { token: "metatag", foreground: "eb6f92" },
    { token: "annotation", foreground: "eb6f92" },

    // Variables and constants
    { token: "variable", foreground: "ebbcba" },
    { token: "constant", foreground: "ebbcba" },
  ],
  colors: {
    // Editor background
    "editor.background": "#1F1D2E",
    "editor.foreground": "#e0def4",

    // Line numbers
    "editorLineNumber.foreground": "#6e6a86",
    "editorLineNumber.activeForeground": "#908caa",

    // Cursor
    "editorCursor.foreground": "#e0def4",

    // Selection
    "editor.selectionBackground": "#403d52",
    "editor.inactiveSelectionBackground": "#26233a",
    "editor.selectionHighlightBackground": "#26233a",

    // Find/match highlighting
    "editor.findMatchBackground": "#403d52",
    "editor.findMatchHighlightBackground": "#26233a",
    "editor.findRangeHighlightBackground": "#26233a",

    // Brackets
    "editorBracketMatch.background": "#403d52",
    "editorBracketMatch.border": "#908caa",

    // Indentation guides
    "editorIndentGuide.background": "#26233a",
    "editorIndentGuide.activeBackground": "#6e6a86",

    // Gutter
    "editorGutter.background": "#1f1d2e",

    // Scrollbar
    "scrollbarSlider.background": "#26233a",
    "scrollbarSlider.hoverBackground": "#403d52",
    "scrollbarSlider.activeBackground": "#524f67",

    // Suggest widget
    "editorSuggestWidget.background": "#26233a",
    "editorSuggestWidget.border": "#524f67",
    "editorSuggestWidget.foreground": "#e0def4",
    "editorSuggestWidget.highlightForeground": "#c4a7e7",
    "editorSuggestWidget.selectedBackground": "#403d52",

    // Hover widget
    "editorHoverWidget.background": "#26233a",
    "editorHoverWidget.border": "#524f67",
    "editorHoverWidget.foreground": "#e0def4",

    // Error/warning underlines
    "editorError.foreground": "#eb6f92",
    "editorWarning.foreground": "#f6c177",
    "editorInfo.foreground": "#9ccfd8",
    "editorHint.foreground": "#31748f",

    // Widget backgrounds
    "editorWidget.background": "#26233a",
    "editorWidget.border": "#524f67",
    "editorWidget.foreground": "#e0def4",
  },
};
