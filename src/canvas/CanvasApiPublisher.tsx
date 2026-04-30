import { useEffect } from "react";
import { useSetAtom } from "jotai";
import { useCanvas } from "./hooks/useCanvas";
import { canvasApiAtom } from "./state";

export function CanvasApiPublisher() {
  const api = useCanvas();
  const setApi = useSetAtom(canvasApiAtom);
  useEffect(() => {
    setApi(api);
    return () => {
      setApi(null);
    };
  }, [api, setApi]);
  return null;
}
