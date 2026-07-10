import { Panel, useStore } from "@xyflow/react";
import { useAtom, useAtomValue } from "jotai";
import { useEffect, useRef, useState } from "react";
import { useCanvas } from "../hooks/useCanvas";
import { nodesAtom } from "../state";
import { jumpTargets, type JumpTarget } from "./labels";
import { jumpModeAtom } from "./state";
import "./jump.css";

/**
 * Gate that only reads the mode atom, mirroring WayfindingLayer: the overlay
 * (which subscribes to the transform every frame and grabs the keyboard) is
 * mounted only while jump mode is actually on.
 */
export function JumpLabels() {
  const [active, setActive] = useAtom(jumpModeAtom);
  if (!active) {
    return null;
  }
  return <JumpOverlay onExit={() => setActive(false)} />;
}

function JumpOverlay({ onExit }: { onExit: () => void }) {
  const nodes = useAtomValue(nodesAtom);
  const tx = useStore(s => s.transform[0]);
  const ty = useStore(s => s.transform[1]);
  const tz = useStore(s => s.transform[2]);
  const width = useStore(s => s.width);
  const height = useStore(s => s.height);
  const canvas = useCanvas();
  const [typed, setTyped] = useState("");

  const targets = jumpTargets(nodes, [tx, ty, tz], { width, height });

  // The keydown handler is installed once but needs the live label set and the
  // in-progress prefix, so both are mirrored into refs it can read.
  const targetsRef = useRef<JumpTarget[]>(targets);
  targetsRef.current = targets;
  const typedRef = useRef("");

  useEffect(() => {
    const jumpTo = (id: string) => {
      canvas.selectOnly(id);
      canvas.panToNode(id, { zoom: canvas.getZoom(), duration: 300 });
      onExit();
    };

    // Capture phase so this preempts the bubble-phase canvas hotkeys — while
    // jump mode is on, letters pick a target instead of switching tools.
    const handle = (event: KeyboardEvent) => {
      // A modifier combo isn't a label — bail out and let it run normally.
      if (event.metaKey || event.ctrlKey || event.altKey) {
        onExit();
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();

      if (event.key === "Escape") {
        onExit();
        return;
      }
      if (event.key === "Backspace") {
        typedRef.current = typedRef.current.slice(0, -1);
        setTyped(typedRef.current);
        return;
      }

      const char = event.key.toLowerCase();
      if (char.length !== 1 || char < "a" || char > "z") {
        onExit();
        return;
      }

      const next = typedRef.current + char;
      const matches = targetsRef.current.filter(target => target.label.startsWith(next));
      if (matches.length === 0) {
        return;
      }
      if (matches.length === 1) {
        jumpTo(matches[0].id);
        return;
      }
      typedRef.current = next;
      setTyped(next);
    };

    window.addEventListener("keydown", handle, { capture: true });
    return () => window.removeEventListener("keydown", handle, { capture: true });
  }, [canvas, onExit]);

  return (
    <Panel position='top-left' className='jump-layer'>
      <div className='jump-scrim' onMouseDown={onExit} />
      {targets.map(target => {
        const matched = target.label.startsWith(typed);
        return (
          <div
            key={target.id}
            className={`jump-badge ${matched ? "" : "faded"}`}
            style={{ left: target.screenX, top: target.screenY }}
          >
            {matched && typed.length > 0 && (
              <span className='jump-typed'>{target.label.slice(0, typed.length)}</span>
            )}
            <span className='jump-rest'>
              {matched ? target.label.slice(typed.length) : target.label}
            </span>
          </div>
        );
      })}
    </Panel>
  );
}
