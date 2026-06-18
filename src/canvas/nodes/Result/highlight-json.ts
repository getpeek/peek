const jsonHtmlCache = new WeakMap<object, string>();

/**
 * Highlights a JSON cell value, memoizing the rendered HTML by value identity.
 * Result rows keep stable references for a given data load, so scrolling a JSON
 * cell off-screen and back reuses the work instead of re-stringifying and
 * re-running the highlighter on every virtualizer remount.
 */
export function highlightJsonValue(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return syntaxHighlight(JSON.stringify(value, null, 2));
  }
  const cached = jsonHtmlCache.get(value);
  if (cached !== undefined) {
    return cached;
  }
  const html = syntaxHighlight(JSON.stringify(value, null, 2));
  jsonHtmlCache.set(value, html);
  return html;
}

export function syntaxHighlight(json: string) {
  if (!json) {
    return "";
  }

  let formattedJson = json;
  try {
    const parsed = JSON.parse(json);
    formattedJson = JSON.stringify(parsed, null, 2);
  } catch {
    formattedJson = json;
  }

  formattedJson = formattedJson
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

  return formattedJson.replaceAll(
    /("(?:[^"\\]|\\.)*")\s*(:)?|(\btrue\b|\bfalse\b|\bnull\b|\bundefined\b)|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|([{}[\],])/gu,
    function (match, string, colon, keyword, number, punctuation) {
      if (string !== undefined) {
        if (colon !== undefined) {
          return '<span class="key">' + string + "</span>" + colon;
        }
        return '<span class="string">' + string + "</span>";
      }

      if (keyword !== undefined) {
        return `<span class="${keyword}">${keyword}</span>`;
      }

      if (number !== undefined) {
        return `<span class="number">${number}</span>`;
      }

      if (punctuation !== undefined) {
        return `<span class="punctuation">${punctuation}</span>`;
      }

      return match;
    },
  );
}
