import { format, type FormatOptionsWithLanguage } from "sql-formatter";
import type { CanvasApi } from "./state";
import type { VariableData } from "./types";

export type VariableSite = { name: string; start: number; end: number };

export const VARIABLE_NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;
const VARIABLE_RE = /@([A-Za-z_][A-Za-z0-9_]*)/g;

export function scanVariableSites(query: string): VariableSite[] {
  const sites: VariableSite[] = [];
  for (const match of query.matchAll(VARIABLE_RE)) {
    const start = match.index ?? 0;
    sites.push({ name: match[1], start, end: start + match[0].length });
  }
  return sites;
}

export function extractVariableRefs(query: string): string[] {
  const seen = new Set<string>();
  for (const site of scanVariableSites(query)) seen.add(site.name);
  return Array.from(seen);
}

export function substituteVariables(
  query: string,
  vars: Record<string, string>,
): { resolved: string; missing: string[] } {
  const sites = scanVariableSites(query);
  const missingSet = new Set<string>();
  let out = "";
  let cursor = 0;
  for (const site of sites) {
    out += query.slice(cursor, site.start);
    if (Object.prototype.hasOwnProperty.call(vars, site.name)) {
      out += vars[site.name];
    } else {
      missingSet.add(site.name);
      out += query.slice(site.start, site.end);
    }
    cursor = site.end;
  }
  out += query.slice(cursor);
  return { resolved: out, missing: Array.from(missingSet) };
}

export function collectVariablesFor(
  canvas: CanvasApi,
  queryNodeId: string,
): Record<string, string> {
  const edges = canvas
    .getEdges()
    .filter((e) => e.target === queryNodeId)
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id));

  const merged: Record<string, string> = {};
  for (const edge of edges) {
    const source = canvas.getNode(edge.source);
    if (!source || source.type !== "variable") continue;
    const data = source.data as VariableData;
    for (const row of data.rows) {
      if (!row.name) continue;
      merged[row.name] = row.value;
    }
  }
  return merged;
}

export function formatPreservingVars(
  query: string,
  options: FormatOptionsWithLanguage,
): string {
  const sites = scanVariableSites(query);
  if (sites.length === 0) return format(query, options);

  const placeholderFor = new Map<string, string>();
  let next = 0;
  for (const site of sites) {
    if (!placeholderFor.has(site.name)) {
      placeholderFor.set(site.name, `__pkvar_${next++}__`);
    }
  }

  let swapped = "";
  let cursor = 0;
  for (const site of sites) {
    swapped += query.slice(cursor, site.start);
    swapped += placeholderFor.get(site.name)!;
    cursor = site.end;
  }
  swapped += query.slice(cursor);

  let formatted: string;
  try {
    formatted = format(swapped, options);
  } catch {
    return query;
  }

  for (const [name, placeholder] of placeholderFor) {
    formatted = formatted.split(placeholder).join(`@${name}`);
  }
  return formatted;
}
