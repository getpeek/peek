import { Panel } from "@xyflow/react";
import { useAtomValue } from "jotai";
import { uiVisibilityAtom } from "../../state";
import { Minimap } from "../minimap/Minimap";
import { useMinimapEnabled } from "../minimap/useMinimapEnabled";
import { cameraLockedAtom } from "../state";
import { CameraLockButton } from "./CameraLockButton";
import { HideUiDot } from "./HideUiDot";
import "./BottomRightStack.css";

// Everything that anchors to the canvas' bottom-right corner shares one Panel —
// sibling Panels at the same position would stack on top of each other.
export function BottomRightStack() {
  const uiVisible = useAtomValue(uiVisibilityAtom);
  const cameraLocked = useAtomValue(cameraLockedAtom);
  const minimapEnabled = useMinimapEnabled();

  return (
    <Panel position='bottom-right'>
      <div className='bottom-right-stack'>
        {!uiVisible && <HideUiDot />}
        {cameraLocked && <CameraLockButton />}
        {uiVisible && minimapEnabled && <Minimap />}
      </div>
    </Panel>
  );
}
