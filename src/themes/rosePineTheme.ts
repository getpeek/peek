import { editor } from "monaco-editor";

export const rosePineTheme: editor.IStandaloneThemeData = {
  base: "vs-dark",
  inherit: true,
  rules: [
    { token: "comment", foreground: "6e6a86", fontStyle: "italic" },
    { token: "comment.line", foreground: "6e6a86", fontStyle: "italic" },
    { token: "comment.block", foreground: "6e6a86", fontStyle: "italic" },

    { token: "keyword", foreground: "3E8FB0", fontStyle: "bold" },
    { token: "keyword.control", foreground: "31748f", fontStyle: "bold" },
    { token: "keyword.operator", foreground: "31748f" },

    { token: "string", foreground: "f6c177" },
    { token: "string.sql", foreground: "f6c177" },
    { token: "string.quoted", foreground: "f6c177" },

    { token: "number", foreground: "ea9a97" },
    { token: "number.sql", foreground: "ea9a97" },

    { token: "identifier", foreground: "e0def4" },
    { token: "identifier.sql", foreground: "e0def4" },

    { token: "predefined.sql", foreground: "EB6F92" },
    { token: "function", foreground: "EB6F92" },

    { token: "operator", foreground: "908caa" },
    { token: "operator.sql", foreground: "908caa" },

    { token: "delimiter", foreground: "908caa" },
    { token: "delimiter.sql", foreground: "908caa" },

    { token: "type", foreground: "EB6F92" },
    { token: "type.sql", foreground: "EB6F92" },

    { token: "tag", foreground: "eb6f92" },
    { token: "metatag", foreground: "eb6f92" },
    { token: "annotation", foreground: "eb6f92" },

    { token: "variable", foreground: "ebbcba" },
    { token: "constant", foreground: "ebbcba" },
  ],
  colors: {
    "editor.background": "#0F1021",
    "editor.foreground": "#e0def4",

    "editorLineNumber.foreground": "#6e6a86",
    "editorLineNumber.activeForeground": "#908caa",

    "editorCursor.foreground": "#e0def4",

    "editor.selectionBackground": "#403d52",
    "editor.inactiveSelectionBackground": "#26233a",
    "editor.selectionHighlightBackground": "#26233a",

    "editor.findMatchBackground": "#403d52",
    "editor.findMatchHighlightBackground": "#26233a",
    "editor.findRangeHighlightBackground": "#26233a",

    "editorBracketMatch.background": "#403d52",
    "editorBracketMatch.border": "#908caa",

    "editorIndentGuide.background": "#26233a",
    "editorIndentGuide.activeBackground": "#6e6a86",

    "editorGutter.background": "#0F1021",

    "scrollbarSlider.background": "#26233a",
    "scrollbarSlider.hoverBackground": "#403d52",
    "scrollbarSlider.activeBackground": "#524f67",

    // Suggest widget — hex values mirror --pk-* tokens in src/canvas/nodes/node.css
    "editorSuggestWidget.background": "#16141c",
    "editorSuggestWidget.border": "#2a2733",
    "editorSuggestWidget.foreground": "#e8e5f0",
    "editorSuggestWidget.selectedBackground": "#251c36",
    "editorSuggestWidget.selectedForeground": "#e8e5f0",
    "editorSuggestWidget.focusHighlightForeground": "#9354e0",
    "editorSuggestWidget.highlightForeground": "#9354e0",
    "editorSuggestWidgetStatus.foreground": "#9c97ab",

    "editorHoverWidget.background": "#1c1a24",
    "editorHoverWidget.border": "#2a2733",
    "editorHoverWidget.foreground": "#e8e5f0",

    "editorError.foreground": "#eb6f92",
    "editorWarning.foreground": "#f6c177",
    "editorInfo.foreground": "#9ccfd8",
    "editorHint.foreground": "#31748f",

    "editorWidget.background": "#1c1a24",
    "editorWidget.border": "#2a2733",
    "editorWidget.foreground": "#e8e5f0",
  },
};
