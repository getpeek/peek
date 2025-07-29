import { format } from "sql-formatter";
import { useExecuteQueries } from "../../tools/useExecuteQuery";
import { useEditor } from "tldraw";
import { QueryShape } from "./QueryShape";
import { SqlEditor } from "./Editor/SqlEditor";
import { useEffect, useRef } from "react";
import { editor } from "monaco-editor";
import { Monaco } from "@monaco-editor/react";

export const Query = ({
  shape,
  isEditing,
}: {
  shape: QueryShape;
  isEditing: boolean;
}) => {
  const executeQuery = useExecuteQueries();
  const editor = useEditor();

  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);

  useEffect(() => {
    editorRef.current?.setValue(shape.props.query);
  }, [shape.props.query]);

  const runQuery = () => {
    const editingShape = editor.getEditingShape();
    if (!editingShape) {
      return;
    }
    if (!editorRef.current) {
      return;
    }

    executeQuery(editingShape, [editorRef.current.getValue()]);
  };

  const formatQuery = () => {
    const editingShapeId = editor.getEditingShapeId();
    if (!editingShapeId) {
      return;
    }
    if (!editorRef.current) {
      return;
    }

    const formatted = format(editorRef.current.getValue(), {
      keywordCase: "upper",
      functionCase: "upper",
      language: "postgresql",
    });

    editorRef.current.setValue(formatted);
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
        monacoRef.current = monaco;

        editor.addCommand(
          monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
          runQuery,
        );

        editor.addCommand(
          monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyI,
          formatQuery,
        );
      }}
      onQueryChange={(query) =>
        editor.updateShape<QueryShape>({
          id: shape.id,
          type: "query",
          props: { query },
        })
      }
    />
  );
};
