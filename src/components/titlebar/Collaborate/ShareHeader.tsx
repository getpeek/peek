import { IconBroadcast, IconUsers } from "@tabler/icons-react";

interface Props {
  live: boolean;
  heading: string;
  subhead: string;
}

export function ShareHeader({ live, heading, subhead }: Props) {
  return (
    <header className='collab-header'>
      <div className={`collab-header-icon ${live ? "is-live" : ""}`}>
        {live ? <IconBroadcast size={16} stroke={1.75} /> : <IconUsers size={16} stroke={1.75} />}
      </div>
      <div className='collab-header-text'>
        <h2>{heading}</h2>
        <p>{subhead}</p>
      </div>
    </header>
  );
}
