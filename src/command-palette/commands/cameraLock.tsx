import { IconLock, IconLockOpen } from "@tabler/icons-react";
import { useAtom } from "jotai";
import { cameraLockedAtom } from "../../canvas/state";
import { useKeybinding } from "./useKeybinding";
import type { CommandPaletteResult } from ".";

export const useCameraLockCommand = (): CommandPaletteResult => {
  const [cameraLocked, setCameraLocked] = useAtom(cameraLockedAtom);

  return {
    icon: cameraLocked ? <IconLockOpen size={16} /> : <IconLock size={16} />,
    action: "run",
    label: cameraLocked ? "Unlock camera" : "Lock camera",
    searchAgainst: "lock unlock camera pan zoom freeze",
    keybinding: useKeybinding("View::ToggleCameraLock"),
    onSelect: () => setCameraLocked(locked => !locked),
  };
};
