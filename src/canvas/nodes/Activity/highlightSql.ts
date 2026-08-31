import { loader } from "@monaco-editor/react";
import { useAtomValue } from "jotai";
import { useEffect, useState } from "react";
import { effectiveThemeAtom } from "../../../state";
import { editorThemeForUiTheme } from "../../../themes/editorTheme";

// Monaco's colorizer emits theme-specific token classes, so the cache is keyed by
// theme as well as text. Bounded because a busy server can show thousands of
// distinct statements over a session.
const MAX_CACHED = 500;
const cache = new Map<string, string>();

function remember(key: string, html: string) {
  if (cache.size >= MAX_CACHED) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) {
      cache.delete(oldest);
    }
  }
  cache.set(key, html);
}

/**
 * Highlights SQL with the same Monaco grammar and theme the query node uses, but
 * as plain HTML — the rows need wrapped, selectable text, and one editor instance
 * per backend re-rendered every second would be far heavier than this.
 * `colorize` escapes its input, so DB-sourced text is safe to inject.
 */
export function useHighlightedSql(query: string): string | null {
  const editorTheme = editorThemeForUiTheme(useAtomValue(effectiveThemeAtom));
  const key = `${editorTheme} ${query}`;
  const [html, setHtml] = useState<string | null>(() => cache.get(key) ?? null);

  useEffect(() => {
    const cached = cache.get(key);
    if (cached !== undefined) {
      setHtml(cached);
      return;
    }

    let cancelled = false;
    void loader.init().then(async monaco => {
      // `colorize` reads the globally-set standalone theme. Without this the rows
      // would use whichever theme the last mounted editor happened to set.
      monaco.editor.setTheme(editorTheme);
      const colorized = await monaco.editor.colorize(query, "sql", { tabSize: 2 });
      remember(key, colorized);
      if (!cancelled) {
        setHtml(colorized);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [key, query, editorTheme]);

  return html;
}
