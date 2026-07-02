import { Panel } from "@xyflow/react";
import { IconLock } from "@tabler/icons-react";
import { useSetAtom } from "jotai";
import { cameraLockedAtom } from "../state";
import { useKeymap } from "../../app/keymap";
import { formatCombo } from "../../keymap-help/keymapActions";
import { Tooltip } from "../../components/Tooltip/Tooltip";
import "./CameraLockButton.css";

export function CameraLockButton() {
  const setCameraLocked = useSetAtom(cameraLockedAtom);
  const combo = useKeymap()["View::ToggleCameraLock"][0];

  return (
    <Panel position='bottom-right'>
      <Tooltip label='Unlock camera'>
        <button
          type='button'
          className='camera-lock-button'
          aria-label='Unlock camera'
          onClick={() => setCameraLocked(false)}
        >
          <IconLock size={16} />
          {combo && <span className='kbd'>{formatCombo(combo).join("")}</span>}
        </button>
      </Tooltip>
    </Panel>
  );
}
