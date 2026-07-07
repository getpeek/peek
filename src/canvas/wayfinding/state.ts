import { atom } from "jotai";

export const regionsMenuOpenAtom = atom(false);

// Region currently being renamed inline in the RegionsMenu. Set together with
// `regionsMenuOpenAtom` by flows that create a region and hand off naming.
export const renamingRegionIdAtom = atom<string | null>(null);
