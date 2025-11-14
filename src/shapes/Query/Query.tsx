import { format } from "sql-formatter";
import { useExecuteQueries } from "../../tools/useExecuteQuery";
import { useEditor } from "tldraw";
import { QueryShape, QueryShapeUtil } from "./QueryShape";
import { SqlEditor } from "./Editor/SqlEditor";
import { useEffect, useRef } from "react";
import { editor } from "monaco-editor";

export const Query = ({
  shape,
  isEditing,
}: {
  shape: QueryShape;
  isEditing: boolean;
}) => {
  const executeQuery = useExecuteQueries();
  const tldrawEditor = useEditor();

  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const lastEditorValue = useRef(shape.props.query);

  useEffect(() => {
    const currentValue = lastEditorValue.current;
    const shapeValue = shape.props.query;

    if (shapeValue !== currentValue) {
      editorRef.current?.setValue(shapeValue);
      lastEditorValue.current = shapeValue;
    }
  }, [shape.props.query]);

  const runQuery = () => {
    const currentEditingShape = tldrawEditor.getOnlySelectedShape();

    if (!currentEditingShape || currentEditingShape.type !== "query") {
      return;
    }

    const query = (
      currentEditingShape.props as ReturnType<QueryShapeUtil["getDefaultProps"]>
    ).query;

    executeQuery(currentEditingShape, [query]);
  };

  const formatQuery = () => {
    const currentEditingShape = tldrawEditor.getOnlySelectedShape();

    if (!currentEditingShape) {
      return;
    }

    const query = (
      currentEditingShape.props as ReturnType<QueryShapeUtil["getDefaultProps"]>
    ).query;

    const formatted = format(query, {
      keywordCase: "upper",
      functionCase: "upper",
      language: "postgresql",
    });

    tldrawEditor.updateShape({
      ...currentEditingShape,
      props: { query: formatted },
    });
  };

  useEffect(() => {
    if (isEditing) {
      editorRef.current?.focus();
    }
  }, [isEditing]);

  return (
    <SqlEditor
      query={shape.props.query}
      onMount={(editor, monaco) => {
        editorRef.current = editor;

        editor.addCommand(
          monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
          runQuery,
        );

        editor.addCommand(
          monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyI,
          formatQuery,
        );
      }}
      onQueryChange={(query) => {
        lastEditorValue.current = query;
        tldrawEditor.updateShape<QueryShape>({
          id: shape.id,
          type: "query",
          props: { query },
        });
      }}
    />
  );
};
