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
    <Tooltip label='Unlock camera'>
      <button
        type='button'
        className='camera-lock-button'
        aria-label='Unlock camera'
        onClick={() => setCameraLocked(false)}
      >
        <IconLock size={16} />
        {combo &&
          formatCombo(combo).map(key => (
            <span className='kbd' key={key}>
              {key}
            </span>
          ))}
      </button>
    </Tooltip>
  );
}
