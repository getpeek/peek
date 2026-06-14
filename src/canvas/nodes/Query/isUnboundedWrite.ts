// Strip line/block comments and string literals so a `WHERE` hidden inside a
// string, or commented out, can't make an unbounded statement look bounded.
function stripCommentsAndStrings(query: string): string {
  return query
    .replaceAll(/--[^\n]*/gu, " ")
    .replaceAll(/\/\*[\s\S]*?\*\//gu, " ")
    .replaceAll(/'(?:[^'\\]|\\.)*'/gu, " ")
    .replaceAll(/"(?:[^"\\]|\\.)*"/gu, " ");
}

function isUnboundedStatement(statement: string): boolean {
  const head = statement.trim().toLowerCase();
  if (head.startsWith("truncate")) {
    return true;
  }
  return head.startsWith("delete") && !/\bwhere\b/u.test(head);
}

/**
 * A `DELETE` with no `WHERE`, or a `TRUNCATE`, wipes a whole table — flag those
 * so the caller can ask for confirmation before running.
 */
export function isUnboundedWrite(query: string): boolean {
  return stripCommentsAndStrings(query)
    .split(";")
    .some(statement => statement.trim() !== "" && isUnboundedStatement(statement));
}
