import { AIPromptShapeUtil } from "./Ai/AiShape";
import { BarChartShapeUtil } from "./Chart/BarChartShape";
import { ChatShapeUtil } from "./Chat/ChatShape";
import { QueryErrorShapeUtil } from "./Error/ErrorShape";
import { QueryShapeUtil } from "./Query/QueryShape";
import { ResultShapeUtil } from "./Result/ResultShape";

export const customShapes = [
  QueryShapeUtil,
  ResultShapeUtil,
  AIPromptShapeUtil,
  BarChartShapeUtil,
  QueryErrorShapeUtil,
  ChatShapeUtil,
];
