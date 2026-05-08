import {
  IconDatabase,
  IconKey,
  IconPlugConnected,
  IconServer,
  IconTerminal2,
  IconUser,
} from "@tabler/icons-react";
import type { Connection } from "../../Connection/types";
import "./ConnectionDetails.css";

interface ConnectionDetailsProps {
  workspaceName: string;
  connection: Connection;
}

export const ConnectionDetails = ({ workspaceName, connection }: ConnectionDetailsProps) => {
  const url = new URL(connection.url);
  const protocol = url.protocol.replace(/:$/, "");
  const host = url.hostname;
  const port = url.port || defaultPortForProtocol(protocol);
  const user = url.username;
  const database = url.pathname.replace(/^\//, "") || "—";
  const ssh = connection.ssh_tunnel;

  return (
    <div
      className='details-connection'
      style={{ "--pk-active-color": connection.color } as React.CSSProperties}
    >
      <div className='details-eyebrow'>Connection</div>
      <div className='details-title-row'>
        <span className='details-connection-dot' />
        <div className='details-title'>
          <span className='details-connection-workspace'>{workspaceName}</span>
          <span className='details-connection-separator'> / </span>
          {connection.name}
        </div>
      </div>

      <div className='details-connection-grid'>
        <section className='details-connection-card'>
          <header>
            <span className='details-connection-card-eyebrow'>Database</span>
            <span className='details-connection-card-title'>{protocol}</span>
          </header>
          <dl className='details-connection-card-body'>
            <div className='details-connection-row'>
              <IconServer size={13} />
              <dt>Host</dt>
              <dd>
                {host}
                {port ? <span className='details-connection-port'>:{port}</span> : null}
              </dd>
            </div>
            <div className='details-connection-row'>
              <IconUser size={13} />
              <dt>User</dt>
              <dd>{user || "—"}</dd>
            </div>
            <div className='details-connection-row'>
              <IconDatabase size={13} />
              <dt>Database</dt>
              <dd>{database}</dd>
            </div>
          </dl>
        </section>

        {ssh ? (
          <section className='details-connection-card details-connection-ssh'>
            <header>
              <span className='details-connection-card-eyebrow'>
                <IconTerminal2 size={12} /> SSH tunnel
              </span>
              <span className='details-connection-card-title'>
                {ssh.ssh_user}@{ssh.ssh_host}
                {ssh.ssh_port ? `:${ssh.ssh_port}` : ""}
              </span>
            </header>
            <dl className='details-connection-card-body'>
              <div className='details-connection-row'>
                <IconKey size={13} />
                <dt>Key</dt>
                <dd className='details-connection-key-path'>{ssh.key_path}</dd>
              </div>
              {ssh.local_port ? (
                <div className='details-connection-row'>
                  <IconPlugConnected size={13} />
                  <dt>Local port</dt>
                  <dd>{ssh.local_port}</dd>
                </div>
              ) : null}
            </dl>
          </section>
        ) : null}
      </div>

      <div className='details-action-hint'>
        <kbd className='details-key'>↵</kbd>
        <span>Activate connection</span>
      </div>
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
