import type { PlanEntry } from "../../hooks/useExecutePrompt";

// Shapes of the ACP `session/update` payloads Peek consumes, tagged by
// `sessionUpdate` (see the agent-client-protocol schema). Only the fields the UI
// reads are modelled; everything is best-effort so an unknown shape degrades to
// empty text rather than throwing.

export interface AcpUpdate {
  sessionUpdate: string;
  [key: string]: unknown;
}

interface ContentBlock {
  type?: string;
  text?: string;
}

interface ToolCallContentItem {
  type?: string;
  content?: ContentBlock;
}

export interface AcpPermissionOption {
  optionId: string;
  name: string;
  kind: string;
}

export interface AcpPermissionRequest {
  id: number;
  request: {
    toolCall?: { title?: string; kind?: string };
    options?: AcpPermissionOption[];
  };
}

function contentBlockText(block: ContentBlock | undefined): string {
  if (!block) {
    return "";
  }
  if (block.type === "text" && typeof block.text === "string") {
    return block.text;
  }
  return "";
}

/** Text of a streamed `agent_message_chunk` / `agent_thought_chunk`. */
export function chunkText(update: AcpUpdate): string {
  return contentBlockText(update.content as ContentBlock | undefined);
}

/** Best-effort text from a tool call's `content` array (skips diffs/terminals). */
export function toolContentText(content: unknown): string {
  if (!Array.isArray(content)) {
    return "";
  }
  return (content as ToolCallContentItem[])
    .map(item => (item.type === "content" ? contentBlockText(item.content) : ""))
    .filter(Boolean)
    .join("\n");
}

export function planEntries(update: AcpUpdate): PlanEntry[] {
  const entries = update.entries;
  if (!Array.isArray(entries)) {
    return [];
  }
  return entries as PlanEntry[];
}
