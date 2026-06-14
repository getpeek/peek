import { initialFromName } from "../../../multiplayer/identity";
import type { Peer } from "../../../multiplayer/types";
import { Tooltip } from "../../Tooltip/Tooltip";

const MAX_AVATARS = 3;

interface Props {
  peers: Peer[];
}

export function PageTabAvatars({ peers }: Props) {
  if (peers.length === 0) {
    return null;
  }
  const visible = peers.slice(0, MAX_AVATARS);
  const overflow = peers.length - visible.length;

  return (
    <span className='page-tab-avatars' aria-hidden>
      {visible.map(p => (
        <Tooltip key={p.author} label={p.name} position='bottom'>
          <span className='page-tab-avatar' style={{ backgroundColor: p.color }}>
            {initialFromName(p.name)}
          </span>
        </Tooltip>
      ))}
      {overflow > 0 && <span className='page-tab-avatar overflow'>+{overflow}</span>}
    </span>
  );
}
