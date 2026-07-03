import type { Connection } from "../../Connection/types";
import "./ConnectionDetails.css";

interface ConnectionDetailsProps {
  workspaceName: string;
  connection: Connection;
}

export const ConnectionDetails = ({ workspaceName, connection }: ConnectionDetailsProps) => {
  const url = new URL(connection.url);
  const protocol = url.protocol.replace(/:$/u, "");
  const host = url.hostname;
  const port = url.port || defaultPortForProtocol(protocol);
  const user = url.username;
  const database = url.pathname.replace(/^\//u, "") || "—";
  const ssh = connection.ssh_tunnel;
  const color = connection.color;

  return (
    <div className='cp-strip'>
      <span
        className='cp-strip-env'
        style={{ color, borderColor: `${color}55`, background: `${color}22` }}
      >
        {protocol}
      </span>
      <span className='cp-strip-conn'>
        {host}
        {port ? `:${port}` : ""}
      </span>
      <span className='cp-strip-meta'>
        <span className='m-dim'>{workspaceName}</span>
        <span className='m-sep'>·</span>
        <span className='m-dim'>user</span>
        <span className='m-strong'>{user || "—"}</span>
        <span className='m-sep'>·</span>
        <span className='m-dim'>db</span>
        <span className='m-strong'>{database}</span>
      </span>
      {ssh ? (
        <span className='cp-strip-tunnel'>
          <span className='cp-strip-tunnel-dot' />
          ssh {ssh.ssh_host}
        </span>
      ) : null}
    </div>
  );
};

const defaultPortForProtocol = (protocol: string): string => {
  switch (protocol) {
    case "postgres":
    case "postgresql":
      return "5432";
    case "mysql":
      return "3306";
    case "mariadb":
      return "3306";
    case "mongodb":
      return "27017";
    case "redis":
      return "6379";
    default:
      return "";
  }
};
