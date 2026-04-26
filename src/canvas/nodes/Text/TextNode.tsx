import { NodeProps, NodeResizer } from "@xyflow/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useCanvas } from "../../useCanvas";
import { HiddenHandles } from "../HiddenHandles";
import type { TextNode as TextNodeT } from "../../types";
import "../node.css";

const DEFAULT_W = 280;
const DEFAULT_H = 100;
const FONT_SIZE_RATIO = 0.62;
const MIN_FONT_SIZE = 12;
const WIDTH_PADDING = 16;

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
  const wrapperRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isEditing, setIsEditing] = useState(data.text.length === 0);
  const [fontSize, setFontSize] = useState(
    Math.max(MIN_FONT_SIZE, h * FONT_SIZE_RATIO),
  );

  useLayoutEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const update = () => {
      setFontSize(Math.max(MIN_FONT_SIZE, el.clientHeight * FONT_SIZE_RATIO));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useLayoutEffect(() => {
    const m = measureRef.current;
    if (!m) return;
    const required = Math.ceil(m.offsetWidth) + WIDTH_PADDING;
    if (required > w) {
      canvas.updateNode(id, (n) => ({ ...n, width: required }));
    }
  }, [data.text, fontSize, w, canvas, id]);

  useEffect(() => {
    if (isEditing) {
      const ta = textareaRef.current;
      if (!ta) return;
      ta.focus();
      const len = ta.value.length;
      ta.setSelectionRange(len, len);
    }
  }, [isEditing]);

  const lines = (data.text.length > 0 ? data.text : " ").split("\n");

  return (
    <>
      <NodeResizer isVisible={!!selected} minWidth={80} minHeight={32} />
      <HiddenHandles />
      <div
        ref={wrapperRef}
        className={`text-node ${selected ? "selected" : ""} ${isEditing ? "editing" : ""}`}
        style={{ width: w, height: h, fontSize }}
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
            wrap="off"
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
        <div ref={measureRef} className="text-node-measure" aria-hidden="true">
          {lines.map((line, i) => (
            <div key={i}>{line.length > 0 ? line : " "}</div>
          ))}
        </div>
      </div>
    </>
  );
}
