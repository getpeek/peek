import {
  Geometry2d,
  HTMLContainer,
  Rectangle2d,
  resizeBox,
  ShapeUtil,
  TLBaseShape,
  useEditor,
} from "tldraw";
import "./ErrorShape.css";
import { QueryShape } from "../Query/QueryShape";
import { useExecutePrompt } from "../Ai/useExecutePrompt";

type QueryErrorShape = TLBaseShape<
  "query-error",
  { message: string; w: number; h: number }
>;

export class QueryErrorShapeUtil extends ShapeUtil<QueryErrorShape> {
  static override type = "query-error" as const;

  override canResize = () => true;
  override canEdit = () => true;
  override canScroll = () => true;

  component(shape: QueryErrorShape) {
    const runPrompt = useExecutePrompt("fast");
    const editor = useEditor();
    const isEditing = editor.getOnlySelectedShape()?.id === shape.id;

    return (
      <HTMLContainer
        id={shape.id}
        style={{ pointerEvents: isEditing ? "all" : "auto" }}
      >
        <div className="error-shape">
          {shape.props.message} <button>Fix</button>
        </div>
      </HTMLContainer>
    );
  }

  getDefaultProps(): {
    message: string;
    w: number;
    h: number;
    queryShape: QueryShape | null;
  } {
    return { message: "", w: 300, h: 80, queryShape: null };
  }

  getGeometry(shape: QueryErrorShape): Geometry2d {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    });
  }

  indicator(shape: QueryErrorShape) {
    return <rect width={shape.props.w} height={shape.props.h} />;
  }

  override onResize(shape: QueryErrorShape, info: any) {
    return resizeBox(shape, info);
  }
}
