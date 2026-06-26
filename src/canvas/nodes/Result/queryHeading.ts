/** A short single-line heading derived from a query, used for the node title and
 *  as the base name for exported files. */
export function nodeHeading(query: string): string {
  return (
    query
      .replace(/^--\s*/u, "")
      .split("\n")
      .map(l => l.trim())
      .join(" ")
      .slice(0, 60) + "..."
  );
}
