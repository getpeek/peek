import {
  Geometry2d,
  Rectangle2d,
  resizeBox,
  ShapeUtil,
  TLBaseShape,
} from "tldraw";
import "./ResultShape.css";
import { ResultTable } from "./ResultTable/ResultTable";
import { DatabaseResult } from "../../state";

export type ResultShape = TLBaseShape<
  "result",
  { data: DatabaseResult; w: number; h: number; query: string }
>;

export class ResultShapeUtil extends ShapeUtil<ResultShape> {
  static override type = "result" as const;

  override canResize = () => true;
  override canEdit = () => true;
  override canScroll = () => true;

  component(shape: ResultShape) {
    return <ResultTable shape={shape} />;
  }

  getDefaultProps(): {
    data: DatabaseResult;
    w: number;
    h: number;
    query: string;
  } {
    return {
      data: [],
      w: 300,
      h: 500,
      query: "",
    };
  }

  getGeometry(shape: ResultShape): Geometry2d {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    });
  }

  indicator(shape: ResultShape) {
    return <rect width={shape.props.w} height={shape.props.h} />;
  }

  override onResize(shape: ResultShape, info: any) {
    return resizeBox(shape, info);
  }
}
