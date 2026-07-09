import type { Theme } from "../state";

export const THEMES: { id: Theme; name: string; tagline: string }[] = [
  { id: "pine", name: "Pine", tagline: "Purple-tinted dark" },
  { id: "midnight", name: "Midnight", tagline: "Pure dark" },
  { id: "midday", name: "Midday", tagline: "Light" },
  { id: "terminal", name: "Terminal", tagline: "Command console" },
];
