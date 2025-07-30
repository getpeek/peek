import { BaseBoxShapeTool } from "tldraw";

export class QueryTool extends BaseBoxShapeTool {
  static override id = "query" as const;
  static override initial = "idle";
  override shapeType = "query";
}
