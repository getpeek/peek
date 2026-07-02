import { IconLock, IconLockOpen } from "@tabler/icons-react";
import { useAtom } from "jotai";
import { cameraLockedAtom } from "../../canvas/state";
import { useKeymap } from "../../app/keymap";
import { formatCombo } from "../../keymap-help/keymapActions";
import type { CommandPaletteResult } from ".";

export const useCameraLockCommand = (): CommandPaletteResult => {
  const [cameraLocked, setCameraLocked] = useAtom(cameraLockedAtom);
  const combo = useKeymap()["View::ToggleCameraLock"][0];

  return {
    icon: cameraLocked ? <IconLockOpen size={16} /> : <IconLock size={16} />,
    label: cameraLocked ? "Unlock camera" : "Lock camera",
    searchAgainst: "lock unlock camera pan zoom freeze",
    keybinding: combo ? formatCombo(combo) : undefined,
    onSelect: () => setCameraLocked(locked => !locked),
  };
};
