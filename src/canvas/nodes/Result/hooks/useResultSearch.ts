import { useState } from "react";

export function useResultSearch() {
  const [active, setActive] = useState(false);
  const [query, setQuery] = useState("");

  const open = () => setActive(true);
  const close = () => {
    setActive(false);
    setQuery("");
  };

  return { active, query, setQuery, open, close };
}
