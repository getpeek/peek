import { Parser, Language, Query, Node } from "web-tree-sitter";
import { languages } from "monaco-editor";

export const createSqlProvider = ({
  tables,
  parser,
  language,
}: {
  tables: Record<string, [string, string][]>;
  references: Record<string, string[]>;
  parser: Parser;
  language: Language;
}): languages.CompletionItemProvider => {
  parser.setLanguage(language);

  return {
    triggerCharacters: [" ", "."],

    provideCompletionItems: (model, position) => {
      const tree = parser.parse(model.getValue());
      if (!tree) {
        return;
      }

      const point = {
        row: position.lineNumber - 1,
        column: position.column - 1,
      };

      const node = tree.rootNode.descendantForPosition(point);

      const query = new Query(
        language,
        `(relation
        alias: (identifier) @variable)

        (object_reference
          name: (identifier) @type)

      (field
        name: (identifier) @field)`,
      );

      const matches = query.matches(tree.rootNode);

      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      const textBefore = model.getValueInRange({
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column - word.word.length, // Before the current word
      });

      console.log({ textBefore, range, word, matches, node });

      return {
        suggestions: [],
      };
    },
  };
};
