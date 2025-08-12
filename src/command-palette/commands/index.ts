import { ReactNode } from "react";
import { Editor } from "tldraw";
import { rerunAllQueriesOnPage } from "./rerunAllQueriesOnPage";
import { rerunSelectedQueries } from "./rerunSelectedQueries";

export interface CommandPaletteResult {
  icon: ReactNode;
  label: ReactNode;
  description?: ReactNode;
  searchAgainst: string;
  onSelect: (editor: Editor) => void;
}

export const commands = [rerunAllQueriesOnPage, rerunSelectedQueries];
