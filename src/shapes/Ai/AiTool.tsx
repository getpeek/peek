import { BaseBoxShapeTool } from "tldraw";

export class AiPromptTool extends BaseBoxShapeTool {
  static override id = "ai-prompt" as const;
  static override initial = "idle";
  override shapeType = "ai-prompt";
}
