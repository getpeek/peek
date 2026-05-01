import type { ReactNode } from "react";

export const highlightMatch = (
  result: Fuzzysort.Result | undefined,
  fallback: string,
): ReactNode => {
  if (!result || result.indexes.length === 0) {
    return fallback;
  }
  return result.highlight((match, index) => (
    <mark key={index} className='match'>
      {match}
    </mark>
  ));
};
