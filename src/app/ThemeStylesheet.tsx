import { useAtomValue } from "jotai";
import { useEffect } from "react";
import { effectiveThemeAtom } from "../state";
import pineHref from "../canvas/nodes/theme/pine.css?url";
import midnightHref from "../canvas/nodes/theme/midnight.css?url";
import middayHref from "../canvas/nodes/theme/midday.css?url";
import terminalHref from "../canvas/nodes/theme/terminal.css?url";
import paperHref from "../canvas/nodes/theme/paper.css?url";
import blueprintHref from "../canvas/nodes/theme/blueprint.css?url";

const themeHrefs = {
  pine: pineHref,
  midnight: midnightHref,
  midday: middayHref,
  terminal: terminalHref,
  paper: paperHref,
  blueprint: blueprintHref,
} as const;

const LINK_ID = "pk-theme";

/* React 19's precedence-managed <link> tags are persistent — switching href adds a
   new tag instead of replacing the old one, so previously-applied :root blocks linger
   and override the active theme. Manage a single <link> imperatively to avoid that. */
const getLinkElement = () => {
  const existing = document.querySelector(`#${LINK_ID}`);
  if (existing instanceof HTMLLinkElement) {
    return existing;
  }
  const created = document.createElement("link");
  created.id = LINK_ID;
  created.rel = "stylesheet";
  document.head.append(created);
  return created;
};

export const ThemeStylesheet = () => {
  const theme = useAtomValue(effectiveThemeAtom);

  useEffect(() => {
    getLinkElement().href = themeHrefs[theme];
  }, [theme]);

  return null;
};
