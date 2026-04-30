import { useAtomValue } from "jotai";
import { sessionStateAtom } from "../../../multiplayer/state";
import { ShareIdlePanel } from "./ShareIdlePanel";
import { ShareLivePanel } from "./ShareLivePanel";
import "./SharePopover.css";

interface Props {
  onClose?: () => void;
}

export function SharePopover({ onClose }: Props) {
  const session = useAtomValue(sessionStateAtom);

  if (!session) {
    return <ShareIdlePanel onClose={onClose} />;
  }
  return <ShareLivePanel session={session} onClose={onClose} />;
}
