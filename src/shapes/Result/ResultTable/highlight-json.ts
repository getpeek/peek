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
    .replaceAll('&', "&amp;")
    .replaceAll('<', "&lt;")
    .replaceAll('>', "&gt;");

  return formattedJson.replaceAll(
    /("(?:[^"\\]|\\.)*")\s*(:)?|(\btrue\b|\bfalse\b|\bnull\b|\bundefined\b)|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|([{}[\],])/g,
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
