import { editor } from "monaco-editor";

export const rosePineDawnTheme: editor.IStandaloneThemeData = {
  base: "vs-dark",
  inherit: true,
  rules: [
    { token: "comment", foreground: "797593", fontStyle: "italic" },
    { token: "comment.line", foreground: "797593", fontStyle: "italic" },
    { token: "comment.block", foreground: "797593", fontStyle: "italic" },

    { token: "keyword", foreground: "286983", fontStyle: "bold" },
    { token: "keyword.control", foreground: "286983", fontStyle: "bold" },
    { token: "keyword.operator", foreground: "286983" },

    { token: "string", foreground: "ea9d34" },
    { token: "string.sql", foreground: "ea9d34" },
    { token: "string.quoted", foreground: "ea9d34" },

    { token: "number", foreground: "b4637a" },
    { token: "number.sql", foreground: "b4637a" },

    { token: "identifier", foreground: "d7827e" },
    { token: "identifier.sql", foreground: "d7827e" },

    { token: "predefined.sql", foreground: "907aa9" },
    { token: "function", foreground: "907aa9" },

    { token: "operator", foreground: "797593" },
    { token: "operator.sql", foreground: "797593" },

    { token: "delimiter", foreground: "797593" },
    { token: "delimiter.sql", foreground: "797593" },

    { token: "type", foreground: "EB6F92" },
    { token: "type.sql", foreground: "EB6F92" },

    { token: "tag", foreground: "eb6f92" },
    { token: "metatag", foreground: "eb6f92" },
    { token: "annotation", foreground: "eb6f92" },

    { token: "variable", foreground: "ebbcba" },
    { token: "constant", foreground: "ebbcba" },
  ],
  colors: {
    "editor.background": "#faf4ed",
    "editor.foreground": "#575279",

    "editorLineNumber.foreground": "#6e6a86",
    "editorLineNumber.activeForeground": "#908caa",

    "editorCursor.foreground": "#e0def4",

    "editor.selectionBackground": "#cecacd",
    "editor.inactiveSelectionBackground": "#cecacd",
    "editor.selectionHighlightBackground": "#cecacd",

    "editor.findMatchBackground": "#cecacd",
    "editor.findMatchHighlightBackground": "#cecacd",
    "editor.findRangeHighlightBackground": "#cecacd",

    "editorBracketMatch.background": "#cecacd",
    "editorBracketMatch.border": "#908caa",

    "editorIndentGuide.background": "#cecacd",
    "editorIndentGuide.activeBackground": "#6e6a86",

    "editorGutter.background": "#faf4ed",

    "scrollbarSlider.background": "#26233a",
    "scrollbarSlider.hoverBackground": "#403d52",
    "scrollbarSlider.activeBackground": "#524f67",

    "editorSuggestWidget.background": "#f2e9e1",
    "editorSuggestWidget.border": "#9893a5",
    "editorSuggestWidget.foreground": "#575279",
    "editorSuggestWidget.highlightForeground": "#dfdad9",
    "editorSuggestWidget.selectedBackground": "#cecacd",

    "editorHoverWidget.background": "#26233a",
    "editorHoverWidget.border": "#524f67",
    "editorHoverWidget.foreground": "#e0def4",

    "editorError.foreground": "#eb6f92",
    "editorWarning.foreground": "#f6c177",
    "editorInfo.foreground": "#9ccfd8",
    "editorHint.foreground": "#31748f",

    "editorWidget.background": "#26233a",
    "editorWidget.border": "#524f67",
    "editorWidget.foreground": "#e0def4",
  },
};
