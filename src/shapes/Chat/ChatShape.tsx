import {
  Geometry2d,
  HTMLContainer,
  Rectangle2d,
  resizeBox,
  ShapeUtil,
  TLBaseShape,
  TLShape,
  useEditor,
} from "tldraw";
import "./Chat.css";
import { DatabaseResult } from "../../state";
import { Chat } from "./Chat";
import { useEffect, useState } from "react";
import { Message } from "../Ai/useExecutePrompt";
import { sha1 } from "object-hash";
import { ResultShape } from "../Result/ResultShape";
import { toCsv } from "../../tools/export/csv";

export type ChatShape = TLBaseShape<
  "chat",
  {
    query: string;
    result: DatabaseResult;
    schema: {
      tables: Record<string, string[]>;
      references: Record<string, string[]>;
    };
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
    const [isSelected, setIsSelected] = useState(
      editor.getSelectedShapeIds().includes(shape.id),
    );

    useEffect(() => {
      setIsEditing(editor.getEditingShapeId() === shape.id);
      setIsSelected(editor.getSelectedShapeIds().includes(shape.id));
    }, [editor.getEditingShapeId(), editor.getSelectedShapeIds()]);

    return (
      <HTMLContainer
        id={shape.id}
        onPointerDown={(event) => {
          if (isEditing) {
            editor.markEventAsHandled(event);
            event.stopPropagation();
          }
        }}
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
            schema={shape.props.schema}
            isEditing={isEditing}
            isSelected={isSelected}
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
    schema: {
      tables: Record<string, string[]>;
      references: Record<string, string[]>;
    };
    w: number;
    h: number;
    messages: Message[];
  } {
    return {
      query: "",
      result: [],
      w: 550,
      h: 600,
      messages: [
        {
          type: "system",
          message: `/no_think You are an expert database engineer and assistant.

Your role is to help the user analyze SQL query results and provide insights using the provided data, query, and database schema.

You have access to the following tools:

1. **branchToNewConversation** — Use this **only** when the user **explicitly** asks you to create a **new PostgreSQL query** to branch out from the current conversation. Do not use this tool for analysis, explanation, or answering questions.

2. **getAdditionalContext** — Use this when you need **more data** to complete your analysis, or when the user asks for more data. You may call this tool freely when needed.

If the user asks a vague or open-ended question, ask a clarifying question, such as if they want you to create a new query or pull in additional context, before taking any action.

Always prioritize direct answers, summaries, or reasoning over tool use — unless tool usage is clearly necessary.
You can help guide the user by suggesting deeper analysis by factoring in the database schema, query and result set to find causes and trends that the user might not have considered in the original query.

Only call a tool **once per request**, unless the user specifies otherwise.`,
          contextKey: sha1("systemprompt"),
          timestamp: Date.now(),
        },
      ],
      schema: { tables: {}, references: {} },
    };
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

  override onDropShapesOver(
    target: ChatShape,
    draggingShapes: TLShape[],
  ): void {
    const messages: Message[] = [];
    for (const shape of draggingShapes) {
      if (shape.type !== "result") {
        continue;
      }

      const { query, data } = (shape as ResultShape).props;

      const csv = toCsv(data);

      messages.push({
        type: "context",
        message: `The user ran an additional query ${query} which resulted in this data:
${csv}`,
        timestamp: Date.now(),
      });
    }

    this.editor.updateShape<ChatShape>({
      ...target,
      props: {
        ...target.props,
        messages: target.props.messages.concat(messages),
      },
    });
  }

  override onDoubleClick() {}
  override onEditStart() {}
}
