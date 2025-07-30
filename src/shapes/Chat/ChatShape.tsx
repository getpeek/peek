import {
  Geometry2d,
  HTMLContainer,
  Rectangle2d,
  resizeBox,
  ShapeUtil,
  stopEventPropagation,
  TLBaseShape,
  useEditor,
} from "tldraw";
import "./Chat.css";
import { DatabaseResult } from "../../state";
import { Chat } from "./Chat";
import { useEffect, useState } from "react";

export interface Message {
  id: string;
  sender: "user" | "agent";
  message: string;
  timestamp: number;
  isStreaming?: boolean;
}

type ChatShape = TLBaseShape<
  "chat",
  {
    query: string;
    result: DatabaseResult;
    w: number;
    h: number;
    messages: Message[];
  }
>;

export class ChatShapeUtil extends ShapeUtil<ChatShape> {
  static override type = "chat" as const;

  override canResize = () => true;
  override canEdit = () => true;
  override canScroll = () => true;

  component(shape: ChatShape) {
    const editor = useEditor();

    const [isEditing, setIsEditing] = useState(
      editor.getEditingShapeId() === shape.id,
    );

    useEffect(() => {
      setIsEditing(editor.getEditingShapeId() === shape.id);
    }, [editor.getEditingShapeId()]);

    return (
      <HTMLContainer
        id={shape.id}
        onPointerDown={isEditing ? stopEventPropagation : undefined}
      >
        <div
          style={{
            width: shape.props.w,
            height: shape.props.h,
            pointerEvents: isEditing ? "all" : "auto",
          }}
        >
          <Chat
            query={shape.props.query}
            data={shape.props.result}
            isEditing={isEditing}
            messages={shape.props.messages}
            shapeId={shape.id}
          />
        </div>
      </HTMLContainer>
    );
  }

  getDefaultProps(): {
    query: string;
    result: DatabaseResult;
    w: number;
    h: number;
    messages: Message[];
  } {
    return { query: "", result: [], w: 400, h: 500, messages: [] };
  }

  getGeometry(shape: ChatShape): Geometry2d {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    });
  }

  indicator(shape: ChatShape) {
    return (
      <rect width={shape.props.w} height={shape.props.h} rx={16} ry={18} />
    );
  }

  override onResize(shape: ChatShape, info: any) {
    return resizeBox(shape, info);
  }

  override onDoubleClick() {}
  override onEditStart() {}
}
