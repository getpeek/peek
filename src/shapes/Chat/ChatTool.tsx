import { BaseBoxShapeTool } from "tldraw";

export class ChatTool extends BaseBoxShapeTool {
  static override id = "chat" as const;
  static override initial = "idle";
  override shapeType = "chat";
}
