import { Fragment } from "react";

const KEYWORDS = new Set([
  "select",
  "from",
  "where",
  "join",
  "inner",
  "outer",
  "left",
  "right",
  "full",
  "cross",
  "natural",
  "on",
  "using",
  "as",
  "and",
  "or",
  "not",
  "in",
  "exists",
  "between",
  "like",
  "ilike",
  "is",
  "null",
  "order",
  "by",
  "group",
  "having",
  "limit",
  "offset",
  "insert",
  "into",
  "values",
  "update",
  "set",
  "delete",
  "create",
  "table",
  "view",
  "index",
  "alter",
  "drop",
  "case",
  "when",
  "then",
  "else",
  "end",
  "union",
  "all",
  "distinct",
  "with",
  "recursive",
  "returning",
  "asc",
  "desc",
  "true",
  "false",
  "begin",
  "commit",
  "rollback",
  "transaction",
]);

type TokenType = "keyword" | "string" | "number" | "comment" | "operator" | "identifier";
type Token = { type: TokenType; value: string } | { type: "whitespace"; value: string };

const isWord = (c: string) => /[a-zA-Z0-9_]/.test(c);
const isWordStart = (c: string) => /[a-zA-Z_]/.test(c);
const isDigit = (c: string) => c >= "0" && c <= "9";
const isQuote = (c: string) => c === "'" || c === '"' || c === "`";

const tokenize = (sql: string): Token[] => {
  const tokens: Token[] = [];
  let i = 0;
  while (i < sql.length) {
    const c = sql[i];

    if (/\s/.test(c)) {
      let j = i + 1;
      while (j < sql.length && /\s/.test(sql[j])) {
        j++;
      }
      tokens.push({ type: "whitespace", value: sql.slice(i, j) });
      i = j;
      continue;
    }

    if (c === "-" && sql[i + 1] === "-") {
      let j = i + 2;
      while (j < sql.length && sql[j] !== "\n") {
        j++;
      }
      tokens.push({ type: "comment", value: sql.slice(i, j) });
      i = j;
      continue;
    }

    if (c === "/" && sql[i + 1] === "*") {
      let j = i + 2;
      while (j < sql.length - 1 && !(sql[j] === "*" && sql[j + 1] === "/")) {
        j++;
      }
      j = Math.min(j + 2, sql.length);
      tokens.push({ type: "comment", value: sql.slice(i, j) });
      i = j;
      continue;
    }

    if (isQuote(c)) {
      let j = i + 1;
      while (j < sql.length && sql[j] !== c) {
        if (sql[j] === "\\" && j + 1 < sql.length) {
          j += 2;
          continue;
        }
        j++;
      }
      j = Math.min(j + 1, sql.length);
      tokens.push({ type: "string", value: sql.slice(i, j) });
      i = j;
      continue;
    }

    if (isDigit(c)) {
      let j = i + 1;
      while (j < sql.length && (isDigit(sql[j]) || sql[j] === ".")) {
        j++;
      }
      tokens.push({ type: "number", value: sql.slice(i, j) });
      i = j;
      continue;
    }

    if (isWordStart(c)) {
      let j = i + 1;
      while (j < sql.length && isWord(sql[j])) {
        j++;
      }
      const word = sql.slice(i, j);
      const type: TokenType = KEYWORDS.has(word.toLowerCase()) ? "keyword" : "identifier";
      tokens.push({ type, value: word });
      i = j;
      continue;
    }

    tokens.push({ type: "operator", value: c });
    i++;
  }
  return tokens;
};

interface SqlPreviewProps {
  sql: string;
  className?: string;
}

export const SqlPreview = ({ sql, className }: SqlPreviewProps) => {
  const source = sql.trim().length === 0 ? "-- this query is empty" : sql;
  const tokens = tokenize(source);

  return (
    <pre className={className ?? "details-query-code"}>
      {tokens.map((token, i) =>
        token.type === "whitespace" ? (
          <Fragment key={i}>{token.value}</Fragment>
        ) : (
          <span key={i} className={`sql-token sql-${token.type}`}>
            {token.value}
          </span>
        ),
      )}
    </pre>
  );
};
