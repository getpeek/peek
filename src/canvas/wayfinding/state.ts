import { atom } from "jotai";

export const regionsMenuOpenAtom = atom(false);

// Region currently being renamed inline in the RegionsMenu. Set together with
// `regionsMenuOpenAtom` by flows that create a region and hand off naming.
export const renamingRegionIdAtom = atom<string | null>(null);

// Region to highlight briefly. Folding nodes into an existing region keeps its
// name, so there is no rename handoff to signal what absorbed them — this does.
export const flashedRegionIdAtom = atom<string | null>(null);

const FLASH_MS = 900;

export const flashRegionAtom = atom(null, (_get, set, regionId: string) => {
  set(flashedRegionIdAtom, regionId);
  setTimeout(() => set(flashedRegionIdAtom, id => (id === regionId ? null : id)), FLASH_MS);
});
