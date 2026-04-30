import { useSetAtom } from "jotai";
import { IconSearch } from "@tabler/icons-react";
import { commandPaletteOpenAtom } from "../../../state";
import "./CommandPaletteButton.css";

export const CommandPaletteButton = () => {
  const setOpen = useSetAtom(commandPaletteOpenAtom);

  return (
    <button
      className='titlebar-cmdk-hint'
      onClick={() => setOpen(true)}
      aria-label='Open command palette'
    >
      <IconSearch size={12} stroke={2} />
    </button>
  );
};
