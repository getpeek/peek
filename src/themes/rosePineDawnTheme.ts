import { editor } from "monaco-editor";

// The light editor theme. `base` must stay "vs": every color this file omits is
// filled in from the base theme's defaults, and the dark defaults (opaque greys,
// near-white overlays) are unreadable on the cream ground.
export const rosePineDawnTheme: editor.IStandaloneThemeData = {
  base: "vs",
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

    // Identifiers are the bulk of a query's text, so they take the theme ink like
    // they do in the dark themes. Dawn's rose (d7827e) is an accent tuned for
    // glyphs, not body text: it only reaches 2.7:1 on the cream ground.
    { token: "identifier", foreground: "575279" },
    { token: "identifier.sql", foreground: "575279" },

    { token: "predefined.sql", foreground: "907aa9" },
    { token: "function", foreground: "907aa9" },

    { token: "operator", foreground: "797593" },
    { token: "operator.sql", foreground: "797593" },

    { token: "delimiter", foreground: "797593" },
    { token: "delimiter.sql", foreground: "797593" },

    // Types and the tag family share the built-in-vocabulary slot with
    // predefined/function above, the way they share one color in the dark themes.
    { token: "type", foreground: "907aa9" },
    { token: "type.sql", foreground: "907aa9" },

    { token: "tag", foreground: "907aa9" },
    { token: "metatag", foreground: "907aa9" },
    { token: "annotation", foreground: "907aa9" },

    { token: "variable", foreground: "d7827e" },
    { token: "constant", foreground: "d7827e" },
  ],
  colors: {
    "editor.background": "#faf4ed",
    "editor.foreground": "#575279",

    "editorLineNumber.foreground": "#6e6a86",
    "editorLineNumber.activeForeground": "#908caa",

    "editorCursor.foreground": "#575279",

    // Every box drawn behind text is a translucent palette tint, never an opaque
    // fill: Monaco has no way to recolor the glyphs on top (editor.selectionForeground
    // only applies to high-contrast themes), so the fill alone has to leave the ink
    // above 4.5:1. Dawn's opaque #cecacd left selected text at 4.49:1 and every box
    // looking like the same grey slab; hue now tells them apart — pine for the
    // selection, iris for occurrences, gold for find matches.
    "editor.selectionBackground": "#28698340",
    "editor.inactiveSelectionBackground": "#28698326",

    // editor.wordHighlightTextBackground — the kind SQL gets, since it has no
    // document-highlight provider — inherits from the read color.
    "editor.selectionHighlightBackground": "#907aa940",
    "editor.wordHighlightBackground": "#907aa940",
    "editor.wordHighlightStrongBackground": "#28698340",

    "editor.findMatchBackground": "#ea9d3466",
    "editor.findMatchHighlightBackground": "#ea9d3440",
    "editor.findRangeHighlightBackground": "#ea9d341f",

    "editorBracketMatch.background": "#907aa926",
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
