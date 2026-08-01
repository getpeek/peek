// The `--pk-type-*` token for a node type, or undefined for types that have no
// colour of their own. Edges use it to tint by their target node; the minimap
// uses it to fill each node's rectangle.
const COLOR_BY_TYPE: Record<string, string> = {
  query: "var(--pk-type-query)",
  result: "var(--pk-type-result)",
  agent: "var(--pk-type-agent)",
  barchart: "var(--pk-type-chart)",
  "query-error": "var(--pk-type-error)",
  variable: "var(--pk-type-variable)",
};

export function nodeTypeColorVar(type: string | undefined): string | undefined {
  return type ? COLOR_BY_TYPE[type] : undefined;
}
