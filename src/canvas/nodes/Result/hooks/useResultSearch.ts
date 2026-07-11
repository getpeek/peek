import { useAtom } from "jotai";
import { NO_FIND, resultFindAtom } from "../../../state";

export function useResultSearch(nodeId: string) {
  const [state, setState] = useAtom(resultFindAtom(nodeId));

  const open = () => setState(prev => ({ ...prev, active: true, autoFocus: true }));
  const close = () => setState(NO_FIND);
  const setQuery = (query: string) => setState(prev => ({ ...prev, query }));

  return {
    active: state.active,
    query: state.query,
    autoFocus: state.autoFocus,
    setQuery,
    open,
    close,
  };
}
