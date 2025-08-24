import {
  Geometry2d,
  HTMLContainer,
  Rectangle2d,
  resizeBox,
  ShapeUtil,
  TLBaseShape,
  useEditor,
} from "tldraw";
import { ImportedDataSource } from "./ImportedDataSource";
import { ImportedDataResult } from "../../state";
import "./ImportedResult.css";

export type ImportedDataSourceShape = TLBaseShape<
  "imported-data-source",
  {
    data: ImportedDataResult;
    w: number;
    h: number;
  }
>;

export class ImportedDataSourceShapeUtil extends ShapeUtil<ImportedDataSourceShape> {
  static override type = "imported-data-source" as const;

  override canResize = () => true;
  override canEdit = () => true;
  override canScroll = () => true;

  component(shape: ImportedDataSourceShape) {
    const editor = useEditor();
    const isEditing = editor.getOnlySelectedShape()?.id === shape.id;

    return (
      <HTMLContainer
        id={shape.id}
        className="imported-result-container"
        style={{
          pointerEvents: isEditing ? "all" : "auto",
          height: shape.props.h,
          width: shape.props.w,
        }}
      >
        <ImportedDataSource shape={shape} />
      </HTMLContainer>
    );
  }

  getDefaultProps(): {
    w: number;
    h: number;
    data: ImportedDataResult;
  } {
    return {
      data: [],
      w: 400,
      h: 300,
    };
  }

  getGeometry(shape: ImportedDataSourceShape): Geometry2d {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    });
  }

  indicator(shape: ImportedDataSourceShape) {
    return (
      <rect width={shape.props.w} height={shape.props.h} rx={16} ry={16} />
    );
  }

  override onResize(shape: ImportedDataSourceShape, info: any) {
    return resizeBox(shape, info);
  }
}
