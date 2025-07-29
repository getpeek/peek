import {
  Box,
  TldrawUiButton,
  TldrawUiContextualToolbar,
  track,
  useEditor,
} from "tldraw";
import { useExecuteQueries } from "./useExecuteQuery";
import { QueryShapeUtil } from "../shapes/Query/QueryShape";
import { format } from "sql-formatter";

export const QueryContextualToolbarComponent = track(() => {
  const editor = useEditor();

  const shape = editor
    .getSelectedShapes()
    .find((shape) => shape.type === "query")!;

  const executeQuery = useExecuteQueries();

  const getSelectionBounds = () => {
    const fullBounds = editor.getSelectionRotatedScreenBounds();
    if (!fullBounds) {
      return undefined;
    }
    return new Box(fullBounds.x, fullBounds.y, fullBounds.width, 0);
  };

  const runExecuteQuery = async () => {
    const query = (shape.props as ReturnType<QueryShapeUtil["getDefaultProps"]>)
      .query;

    executeQuery(shape, [query]);
  };

  const formatQuery = () => {
    const query = (shape.props as ReturnType<QueryShapeUtil["getDefaultProps"]>)
      .query;

    const formatted = format(query, {
      keywordCase: "upper",
      functionCase: "upper",
      language: "postgresql",
    });

    editor.updateShape({
      id: shape.id,
      type: shape.type,
      props: {
        query: formatted,
      },
    });
  };

  return (
    <TldrawUiContextualToolbar
      getSelectionBounds={getSelectionBounds}
      label="Sizes"
    >
      <TldrawUiButton title="Format query" type="normal" onClick={formatQuery}>
        Format
      </TldrawUiButton>
      <TldrawUiButton
        title="Execute query"
        type="normal"
        onClick={runExecuteQuery}
      >
        Execute
      </TldrawUiButton>
    </TldrawUiContextualToolbar>
  );
});
