import {
  Box,
  TldrawUiButton,
  TldrawUiContextualToolbar,
  track,
  useEditor,
} from "tldraw";
import { useExecuteQueries } from "./useExecuteQuery";
import { QueryShapeUtil } from "../shapes/Query/QueryShape";

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

  return (
    <TldrawUiContextualToolbar
      getSelectionBounds={getSelectionBounds}
      label="Sizes"
    >
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
