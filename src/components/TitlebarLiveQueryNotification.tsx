import { useAtomValue } from "jotai";
import { nodesAtom } from "../canvas/state";
import { useCanvasApi } from "../canvas/hooks/useCanvas";
import "./TitlebarLiveQueryNotification.css";

export const TitlebarLiveQueryNotification = () => {
  const canvas = useCanvasApi();
  const nodes = useAtomValue(nodesAtom);

  if (!canvas) {
    return null;
  }

  const liveNodes = nodes.filter(node => node.type === "query" && node.data.liveIntervalMs) ?? [];

  if (liveNodes.length === 0) {
    return null;
  }

  const killLiveQueries = () => {
    liveNodes.forEach(node => canvas.updateNodeData(node.id, { liveIntervalMs: null }));
  };

  return (
    <button onClick={killLiveQueries} className='liveQueryNotification is-live'>
      <span className='live-dot' />
      {liveNodes.length} live {liveNodes.length === 1 ? "query" : "queries"}
    </button>
  );
};
