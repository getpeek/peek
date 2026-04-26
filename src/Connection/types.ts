export interface Workspace {
  name: string;
  connections: Connection[];
}

export interface SshTunnelConfig {
  ssh_host: string;
  ssh_user: string;
  key_path: string;
  ssh_port?: number;
  local_port?: number;
}

export interface Connection {
  name: string;
  url: string;
  color: string;
  ssh_tunnel?: SshTunnelConfig;
}
