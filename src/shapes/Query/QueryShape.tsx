import {
  Geometry2d,
  HTMLContainer,
  Rectangle2d,
  ShapeUtil,
  TLBaseShape,
  resizeBox,
  stopEventPropagation,
  useEditor,
} from "tldraw";
import "./Query.css";
import { Query } from "./Query";
import { useEffect, useState } from "react";

export type QueryShape = TLBaseShape<
  "query",
  { query: string; w: number; h: number }
>;

export class QueryShapeUtil extends ShapeUtil<QueryShape> {
  static override type = "query" as const;

  override canEdit = () => true;
  override canResize = () => true;

  getDefaultProps(): QueryShape["props"] {
    return { query: "", w: 350, h: 240 };
  }

  component(shape: QueryShape) {
    const editor = useEditor();
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
      setIsEditing(editor.getEditingShapeId() === shape.id);
    }, [editor.getEditingShapeId()]);

    return (
      <HTMLContainer
        id={shape.id}
        onPointerDown={isEditing ? stopEventPropagation : undefined}
      >
        <Query shape={shape} isEditing={isEditing} />
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
