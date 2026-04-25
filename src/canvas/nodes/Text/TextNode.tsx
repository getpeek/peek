import { NodeProps, NodeResizer } from "@xyflow/react";
import { useEffect, useRef, useState } from "react";
import { useCanvas } from "../../useCanvas";
import { HiddenHandles } from "../HiddenHandles";
import type { TextNode as TextNodeT } from "../../types";
import "../node.css";

const DEFAULT_W = 280;
const DEFAULT_H = 100;

export function TextNode({
  id,
  data,
  selected,
  width,
  height,
}: NodeProps<TextNodeT>) {
  const canvas = useCanvas();
  const w = width ?? DEFAULT_W;
  const h = height ?? DEFAULT_H;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isEditing, setIsEditing] = useState(data.text.length === 0);

  useEffect(() => {
    if (isEditing) {
      const ta = textareaRef.current;
      if (!ta) return;
      ta.focus();
      const len = ta.value.length;
      ta.setSelectionRange(len, len);
    }
  }, [isEditing]);

  return (
    <>
      <NodeResizer isVisible={!!selected} minWidth={120} minHeight={48} />
      <HiddenHandles />
      <div
        className={`text-node ${selected ? "selected" : ""} ${isEditing ? "editing" : ""}`}
        style={{ width: w, height: h }}
        onDoubleClick={() => setIsEditing(true)}
      >
        {isEditing ? (
          <textarea
            ref={textareaRef}
            className="text-node-input nodrag"
            value={data.text}
            placeholder="Type..."
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            onChange={(e) =>
              canvas.updateNodeData<TextNodeT["data"]>(id, {
                text: e.currentTarget.value,
              })
            }
            onBlur={() => setIsEditing(false)}
          />
        ) : (
          <div className="text-node-display">
            {data.text ? (
              data.text
            ) : (
              <span className="text-node-placeholder">Double-click to edit</span>
            )}
          </div>
        )}
      </div>
    </>
  );
}
