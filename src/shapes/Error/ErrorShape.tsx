import {
  createShapeId,
  Geometry2d,
  HTMLContainer,
  Rectangle2d,
  resizeBox,
  ShapeUtil,
  TLBaseShape,
  TLShapeId,
  useEditor,
} from "tldraw";
import { QueryShape } from "../Query/QueryShape";
import { ErrorFixer } from "./ErrorFixer";

export type QueryErrorShape = TLBaseShape<
  "query-error",
  {
    queryShapeId: TLShapeId;
    query: string;
    message: string;
    w: number;
    h: number;
  }
>;

export class QueryErrorShapeUtil extends ShapeUtil<QueryErrorShape> {
  static override type = "query-error" as const;

  override canResize = () => true;
  override canEdit = () => true;
  override canScroll = () => true;

  component(shape: QueryErrorShape) {
    const editor = useEditor();
    const isEditing = editor.getOnlySelectedShape()?.id === shape.id;

    return (
      <HTMLContainer
        id={shape.id}
        style={{
          pointerEvents: isEditing ? "all" : "auto",
          height: shape.props.h ?? 200,
        }}
      >
        <ErrorFixer shape={shape} />
      </HTMLContainer>
    );
  }

  getDefaultProps(): {
    queryShapeId: TLShapeId;
    message: string;
    query: string;
    w: number;
    h: number;
    queryShape: QueryShape | null;
  } {
    return {
      queryShapeId: createShapeId("query"),
      message: "",
      query: "",
      w: 400,
      h: 300,
      queryShape: null,
    };
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
