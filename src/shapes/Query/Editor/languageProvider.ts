import { languages } from "monaco-editor";
import { Parser, Language, Query, Node } from "web-tree-sitter";

export const createSqlProvider = ({
  tables,
  references,
  parser,
  language,
}: {
  tables: Record<string, [string, string][]>;
  references: Record<string, string[]>;
  parser: Parser;
  language: Language;
}): languages.CompletionItemProvider => {
  const tableNames = Object.keys(tables);
  const allColumns = Array.from(
    new Set(
      Object.entries(tables)
        .flatMap(([, entry]) => entry)
        .flat(),
    ),
  );

  const findNodeAtPosition = (
    node: Node,
    line: number,
    column: number,
  ): Node | null => {
    const targetLine = line - 1;
    const targetColumn = column - 1;

    if (
      targetLine < node.startPosition.row ||
      targetLine > node.endPosition.row ||
      (targetLine === node.startPosition.row &&
        targetColumn < node.startPosition.column) ||
      (targetLine === node.endPosition.row &&
        targetColumn > node.endPosition.column)
    ) {
      return null;
    }

    for (const child of node.children) {
      if (!child) {
        continue;
      }
      const childResult = findNodeAtPosition(child, line, column);
      if (childResult) {
        return childResult;
      }
    }

    return node;
  };

  const getTableAliases = (rootNode: Node): Map<string, string> => {
    const aliases = new Map<string, string>();

    const aliasQuery = new Query(
      language,
      `
      (relation
        (object_reference name: (identifier) @table_name)
        alias: (identifier) @table_alias)
      `,
    );

    const captures = aliasQuery.captures(rootNode);
    for (let i = 0; i < captures.length; i += 2) {
      const tableName = captures[i]?.node.text;
      const aliasName = captures[i + 1]?.node.text;
      if (tableName && aliasName) {
        aliases.set(aliasName, tableName);
      }
    }

    return aliases;
  };

  const getColumnsForTable = (tableName: string): [string, string][] => {
    return tables[tableName] || [];
  };

  const getCompletionContext = (
    node: Node | null,
    rootNode: Node,
    model: any,
    position: any,
  ): {
    type:
      | "table"
      | "column"
      | "table_for_join"
      | "where_clause"
      | "join_on_clause"
      | "general";
    tableContext?: string;
  } => {
    if (!node) return { type: "general" };

    const lineText = model.getLineContent(position.lineNumber);
    const textBeforeCursor = lineText.substring(0, position.column - 1);
    const textBeforeCursorTrimmed = textBeforeCursor.trim();

    const dotMatch = textBeforeCursor.match(/(\w+)\.$/);
    if (dotMatch) {
      const tableAlias = dotMatch[1];
      const aliases = getTableAliases(rootNode);
      const actualTable = aliases.get(tableAlias) || tableAlias;
      return { type: "column", tableContext: actualTable };
    }

    const afterFromMatch = textBeforeCursorTrimmed.match(/\bFROM\s*$/i);
    if (afterFromMatch) {
      return { type: "table" };
    }

    const afterJoinMatch = textBeforeCursorTrimmed.match(
      /\b(INNER\s+JOIN|LEFT\s+JOIN|RIGHT\s+JOIN|FULL\s+JOIN|JOIN)\s*$/i,
    );
    if (afterJoinMatch) {
      return { type: "table_for_join" };
    }

    const onMatch = textBeforeCursorTrimmed.match(
      /\b(INNER\s+JOIN|LEFT\s+JOIN|RIGHT\s+JOIN|FULL\s+JOIN|JOIN)\s+(\w+)(?:\s+(\w+))?\s+ON\s*$/i,
    );
    if (onMatch) {
      return { type: "join_on_clause" };
    }

    const afterWhereMatch = textBeforeCursorTrimmed.match(/\bWHERE\s*$/i);
    if (afterWhereMatch) {
      return { type: "where_clause" };
    }

    let currentNode: Node | null = node;

    while (currentNode) {
      const nodeType = currentNode.type;

      if (nodeType === "field" || currentNode.parent?.type === "field") {
        const fieldNode =
          nodeType === "field" ? currentNode : currentNode.parent!;
        const objectRef = fieldNode.childForFieldName("object");
        if (objectRef) {
          const tableAlias = objectRef.text;
          const aliases = getTableAliases(rootNode);
          const actualTable = aliases.get(tableAlias) || tableAlias;
          return { type: "column", tableContext: actualTable };
        }
      }

      if (nodeType === "where" || currentNode.parent?.type === "where") {
        return { type: "where_clause" };
      }

      if (nodeType === "from" || currentNode.parent?.type === "from") {
        if (currentNode.parent?.type === "from") {
          const fromNode = currentNode.parent;
          const fromKeyword = fromNode.children.find(
            (child) => child?.type === "keyword_from",
          );
          if (fromKeyword) {
            const fromEndPos = fromKeyword.endPosition;
            const cursorPos = {
              row: position.lineNumber - 1,
              column: position.column - 1,
            };
            if (
              cursorPos.row > fromEndPos.row ||
              (cursorPos.row === fromEndPos.row &&
                cursorPos.column >= fromEndPos.column)
            ) {
              return { type: "table" };
            }
          }
        }
        return { type: "table" };
      }

      if (nodeType === "join" || currentNode.parent?.type === "join") {
        if (currentNode.parent?.type === "join") {
          const joinNode = currentNode.parent;
          const joinKeywords = joinNode.children.filter(
            (child) =>
              child?.type === "keyword_join" ||
              child?.type === "keyword_inner" ||
              child?.type === "keyword_left" ||
              child?.type === "keyword_right" ||
              child?.type === "keyword_full",
          );

          if (joinKeywords.length > 0) {
            const lastJoinKeyword = joinKeywords[joinKeywords.length - 1];
            const joinEndPos = lastJoinKeyword?.endPosition;

            if (!joinEndPos) {
              continue;
            }
            const cursorPos = {
              row: position.lineNumber - 1,
              column: position.column - 1,
            };
            if (
              cursorPos.row > joinEndPos.row ||
              (cursorPos.row === joinEndPos.row &&
                cursorPos.column >= joinEndPos.column)
            ) {
              return { type: "table_for_join" };
            }
          }
        }
        return { type: "table_for_join" };
      }

      if (
        nodeType === "select_expression" ||
        currentNode.parent?.type === "select_expression"
      ) {
        if (currentNode.parent?.type === "select_expression") {
          const selectNode = currentNode.parent.parent;
          if (selectNode) {
            const selectKeyword = selectNode.children.find(
              (child) => child?.type === "keyword_select",
            );
            if (selectKeyword) {
              const selectEndPos = selectKeyword.endPosition;
              const cursorPos = {
                row: position.lineNumber - 1,
                column: position.column - 1,
              };
              if (
                cursorPos.row > selectEndPos.row ||
                (cursorPos.row === selectEndPos.row &&
                  cursorPos.column >= selectEndPos.column)
              ) {
                return { type: "column" };
              }
            }
          }
        }
        return { type: "column" };
      }

      if (nodeType === "relation" || currentNode.parent?.type === "relation") {
        let joinNode: Node | null = currentNode;
        while (joinNode && joinNode.type !== "join") {
          joinNode = joinNode.parent;
        }

        if (joinNode && joinNode.type === "join") {
          return { type: "table_for_join" };
        }

        return { type: "table" };
      }

      currentNode = currentNode.parent;
    }

    const fullText = model.getValue();
    const textBeforePosition = fullText.substring(
      0,
      model.getOffsetAt(position),
    );

    const directOnMatch = textBeforeCursorTrimmed.match(/\bON\s*$/i);
    if (directOnMatch) {
      return { type: "join_on_clause" };
    }

    const whereMatch = textBeforePosition.match(
      /\bWHERE\b(?!.*\bORDER\b)(?!.*\bGROUP\b)(?!.*\bHAVING\b)/is,
    );
    if (whereMatch) {
      return { type: "where_clause" };
    }

    const selectMatch = textBeforePosition.match(/\bSELECT\b(?!.*\bFROM\b)/is);
    if (selectMatch) {
      return { type: "column" };
    }

    const fromMatch = textBeforePosition.match(
      /\bFROM\b(?!.*\bWHERE\b)(?!.*\bORDER\b)(?!.*\bGROUP\b)/is,
    );
    if (fromMatch) {
      return { type: "table" };
    }

    const onConditionMatch = textBeforePosition.match(
      /\bON\s+[^;]*?(?:AND|OR)?\s*$/i,
    );
    if (
      onConditionMatch &&
      !textBeforePosition.match(/\b(?:WHERE|ORDER|GROUP|HAVING|LIMIT)\b/i)
    ) {
      return { type: "join_on_clause" };
    }

    return { type: "general" };
  };

  const getAvailableTablesAndAliases = (
    rootNode: Node,
  ): {
    tables: Map<string, string>;
    availableColumns: string[];
  } => {
    const tables = new Map<string, string>();
    const availableColumns: string[] = [];

    const fromQuery = new Query(
      language,
      `
        (from
          (relation
            (object_reference name: (identifier) @table_name)
            alias: (identifier) @table_alias))

        (from
          (relation
            (object_reference name: (identifier) @table_name)))
        `,
    );

    const joinQuery = new Query(
      language,
      `
        (join
          (relation
            (object_reference name: (identifier) @table_name)
            alias: (identifier) @table_alias))

        (join
          (relation
            (object_reference name: (identifier) @table_name)))
        `,
    );

    const fromCaptures = fromQuery.captures(rootNode);
    for (let i = 0; i < fromCaptures.length; i++) {
      const capture = fromCaptures[i];
      if (capture.name === "table_name") {
        const tableName = capture.node.text;
        const nextCapture = fromCaptures[i + 1];
        if (nextCapture && nextCapture.name === "table_alias") {
          const alias = nextCapture.node.text;
          tables.set(alias, tableName);
          tables.set(tableName, tableName);
          i++;
        } else {
          tables.set(tableName, tableName);
        }
      }
    }

    const joinCaptures = joinQuery.captures(rootNode);
    for (let i = 0; i < joinCaptures.length; i++) {
      const capture = joinCaptures[i];
      if (capture.name === "table_name") {
        const tableName = capture.node.text;
        const nextCapture = joinCaptures[i + 1];
        if (nextCapture && nextCapture.name === "table_alias") {
          const alias = nextCapture.node.text;
          tables.set(alias, tableName);
          tables.set(tableName, tableName);
          i++;
        } else {
          tables.set(tableName, tableName);
        }
      }
    }

    const uniqueTableNames = new Set(Array.from(tables.values()));
    for (const tableName of uniqueTableNames) {
      const columns = getColumnsForTable(tableName).map(([col]) => col);
      availableColumns.push(...columns);
    }

    return { tables, availableColumns: Array.from(new Set(availableColumns)) };
  };

  return {
    triggerCharacters: [" ", ".", ",", "\n", "\t"],
    provideCompletionItems(model, position) {
      const word = model.getWordUntilPosition(position);
      const query = model.getValue();

      try {
        const tree = parser.parse(query);
        if (!tree) {
          return { suggestions: [] };
        }

        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        const nodeAtCursor = findNodeAtPosition(
          tree.rootNode,
          position.lineNumber,
          position.column,
        );

        const context = getCompletionContext(
          nodeAtCursor,
          tree.rootNode,
          model,
          position,
        );

        let suggestions: languages.CompletionItem[] = [];

        switch (context.type) {
          case "table":
            suggestions = tableNames.map((tableName) => ({
              label: tableName,
              kind: languages.CompletionItemKind.Class,
              insertText: tableName,
              range,
              documentation: `Table: ${tableName}`,
            }));
            break;

          case "column":
            if (context.tableContext) {
              const columns = getColumnsForTable(context.tableContext).map(
                ([col]) => col,
              );
              suggestions = columns.map((column) => ({
                label: column,
                kind: languages.CompletionItemKind.Field,
                insertText: column,
                range,
                documentation: `Column from ${context.tableContext}: ${column}`,
              }));
            } else {
              const availableContext = getAvailableTablesAndAliases(
                tree.rootNode,
              );

              const aliasCompletions = Array.from(
                availableContext.tables.keys(),
              )
                .filter((alias) => alias !== availableContext.tables.get(alias))
                .map((alias) => ({
                  label: alias,
                  kind: languages.CompletionItemKind.Variable,
                  insertText: alias,
                  range,
                  documentation: `Table alias: ${alias} (${availableContext.tables.get(alias)})`,
                }));

              const columnCompletions = availableContext.availableColumns.map(
                (column) => ({
                  label: column,
                  kind: languages.CompletionItemKind.Field,
                  insertText: column,
                  range,
                  documentation: `Column: ${column}`,
                }),
              );

              suggestions = [...aliasCompletions, ...columnCompletions];
            }
            break;

          case "where_clause":
            const availableContext = getAvailableTablesAndAliases(
              tree.rootNode,
            );

            const aliasCompletions = Array.from(availableContext.tables.keys())
              .filter((alias) => alias !== availableContext.tables.get(alias))
              .map((alias) => ({
                label: alias,
                kind: languages.CompletionItemKind.Variable,
                insertText: alias,
                range,
                documentation: `Table alias: ${alias} (${availableContext.tables.get(alias)})`,
              }));

            const columnCompletions = availableContext.availableColumns.map(
              (column) => ({
                label: column,
                kind: languages.CompletionItemKind.Field,
                insertText: column,
                range,
                documentation: `Column: ${column}`,
              }),
            );

            suggestions = [...aliasCompletions, ...columnCompletions];
            break;

          case "table_for_join":
            const joinableTables = tableNames.filter(
              (table) =>
                references[table] ||
                Object.values(references).some((refs) => refs.includes(table)),
            );

            suggestions = joinableTables.map((tableName) => ({
              label: tableName,
              kind: languages.CompletionItemKind.Class,
              insertText: tableName,
              range,
              documentation: `Joinable table: ${tableName}`,
            }));
            break;

          case "join_on_clause":
            suggestions = [
              {
                label: "= ",
                kind: languages.CompletionItemKind.Operator,
                insertText: "= ",
                range,
                documentation: "Equality operator",
              },
              {
                label: "AND ",
                kind: languages.CompletionItemKind.Keyword,
                insertText: "AND ",
                range,
                documentation: "Logical AND operator",
              },
              {
                label: "OR ",
                kind: languages.CompletionItemKind.Keyword,
                insertText: "OR ",
                range,
                documentation: "Logical OR operator",
              },
            ];

            suggestions.push(
              ...allColumns.map((column) => ({
                label: column,
                kind: languages.CompletionItemKind.Field,
                insertText: column,
                range,
                documentation: `Column: ${column}`,
              })),
            );
            break;

          case "general":
          default:
            suggestions = [
              ...tableNames.map((name) => ({
                label: name,
                kind: languages.CompletionItemKind.Class,
                insertText: name,
                range,
                documentation: `Table: ${name}`,
              })),
              ...allColumns.map((column) => ({
                label: column,
                kind: languages.CompletionItemKind.Field,
                insertText: column,
                range,
                documentation: `Column: ${column}`,
              })),
            ];
            break;
        }

        return { suggestions };
      } catch (e) {
        console.error("Error in completion provider:", e);
        return { suggestions: [] };
      }
    },
  };
};
