// Edges are colored by their TARGET node — "what this feeds" — so you can tell at a
// glance what kind of node an edge connects to. Returns the `--pk-type-*` token for a
// node type, or undefined to fall back to the neutral edge color.
const EDGE_COLOR_BY_TYPE: Record<string, string> = {
  query: "var(--pk-type-query)",
  result: "var(--pk-type-result)",
  agent: "var(--pk-type-agent)",
  barchart: "var(--pk-type-chart)",
  "query-error": "var(--pk-type-error)",
  variable: "var(--pk-type-variable)",
};

export function edgeColorForType(type: string | undefined): string | undefined {
  return type ? EDGE_COLOR_BY_TYPE[type] : undefined;
}
