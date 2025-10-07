import {
  Geometry2d,
  HTMLContainer,
  Rectangle2d,
  ShapeUtil,
  TLBaseShape,
  resizeBox,
} from "tldraw";
import "./Query.css";
import { Query } from "./Query";

export type QueryShape = TLBaseShape<
  "query",
  { query: string; w: number; h: number }
>;

export class QueryShapeUtil extends ShapeUtil<QueryShape> {
  static override type = "query" as const;

  override canEdit = () => true;
  override canResize = () => true;
  override canScroll = () => true;

  getDefaultProps(): QueryShape["props"] {
    return { query: "", w: 350, h: 240 };
  }

  component(shape: QueryShape) {
    const isEditing = this.editor.getEditingShapeId() === shape.id;

    return (
      <HTMLContainer id={shape.id}>
        <div
          style={{
            width: shape.props.w,
            height: shape.props.h,
            pointerEvents: isEditing ? "all" : undefined,
          }}
        >
          <Query shape={shape} isEditing={isEditing} />
        </div>
      </HTMLContainer>
    );
  }

  override onEditStart(): void {}
  override onDoubleClick(): void {}

  getGeometry(shape: QueryShape): Geometry2d {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    });
  }

  indicator(shape: QueryShape) {
    return (
      <rect width={shape.props.w} height={shape.props.h} rx={16} ry={16} />
    );
  }

  override onResize(shape: QueryShape, info: any) {
    return resizeBox(shape, info);
  }
}
