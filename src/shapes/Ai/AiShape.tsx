import {
  Geometry2d,
  HTMLContainer,
  Rectangle2d,
  resizeBox,
  ShapeUtil,
  TLBaseShape,
} from "tldraw";
import { AIPrompt } from "./AIPrompt";

export type AIPromptShape = TLBaseShape<
  "ai-prompt",
  { prompt: string; w: number; h: number; isLoading: boolean; reason: string }
>;

export class AIPromptShapeUtil extends ShapeUtil<AIPromptShape> {
  static override type = "ai-prompt" as const;

  override canEdit = () => true;
  override canResize = () => true;
  override canScroll = () => true;

  component(shape: AIPromptShape) {
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
          <AIPrompt shape={shape} />
        </div>
      </HTMLContainer>
    );
  }

  override onDoubleClick() {}

  getGeometry(shape: AIPromptShape): Geometry2d {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    });
  }

  indicator(shape: AIPromptShape) {
    return (
      <rect width={shape.props.w} height={shape.props.h} rx={16} ry={16} />
    );
  }

  override onResize(shape: AIPromptShape, info: any) {
    return resizeBox(shape, info);
  }

  getDefaultProps(): AIPromptShape["props"] {
    return {
      prompt: "",
      reason: "",
      isLoading: false,
      w: 350,
      h: 240,
    };
  }
}
