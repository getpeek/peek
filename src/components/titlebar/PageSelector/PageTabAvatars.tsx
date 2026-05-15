import { initialFromName } from "../../../multiplayer/identity";
import type { Peer } from "../../../multiplayer/types";

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
        <span
          key={p.author}
          className='page-tab-avatar'
          style={{ backgroundColor: p.color }}
          title={p.name}
        >
          {initialFromName(p.name)}
        </span>
      ))}
      {overflow > 0 && <span className='page-tab-avatar overflow'>+{overflow}</span>}
    </span>
  );
}
