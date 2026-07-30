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

  return (
    <div className='collab-panel'>
      <span className='collab-caret' aria-hidden />
      {session ? (
        <ShareLivePanel session={session} onClose={onClose} />
      ) : (
        <ShareIdlePanel onClose={onClose} />
      )}
    </div>
  );
}
