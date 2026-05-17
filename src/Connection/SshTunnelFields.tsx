import { IconFolderOpen, IconKey } from "@tabler/icons-react";
import { open } from "@tauri-apps/plugin-dialog";
import type { SshTunnelConfig } from "./types";

interface SshTunnelFieldsProps {
  tunnel: SshTunnelConfig;
  onChange: (next: SshTunnelConfig) => void;
}

export const SshTunnelFields = ({ tunnel, onChange }: SshTunnelFieldsProps) => {
  const update = (patch: Partial<SshTunnelConfig>) => onChange({ ...tunnel, ...patch });

  const pickKeyPath = async () => {
    const path = await open({ multiple: false, directory: false });
    if (typeof path === "string") {
      update({ key_path: path });
    }
  };

  return (
    <div className='picker-form-grid'>
      <div className='picker-field'>
        <label className='picker-field-label' htmlFor='ssh-host'>
          SSH host
        </label>
        <input
          id='ssh-host'
          className='picker-input mono'
          placeholder='13.10.11.12'
          value={tunnel.ssh_host}
          onChange={event => update({ ssh_host: event.target.value })}
        />
      </div>
      <div className='picker-field'>
        <label className='picker-field-label' htmlFor='ssh-user'>
          SSH user
        </label>
        <input
          id='ssh-user'
          className='picker-input mono'
          placeholder='ubuntu'
          value={tunnel.ssh_user}
          onChange={event => update({ ssh_user: event.target.value })}
        />
      </div>
      <div className='picker-field full'>
        <span className='picker-field-label'>
          Identity key
          <button type='button' className='hint hint-button' onClick={pickKeyPath}>
            <IconFolderOpen size={11} />
            <span>Browse…</span>
          </button>
        </span>
        <div className='picker-input-row'>
          <IconKey size={13} className='picker-input-icon' />
          <input
            className='picker-input mono'
            placeholder='/Users/you/.ssh/key.pem'
            value={tunnel.key_path}
            onChange={event => update({ key_path: event.target.value })}
          />
        </div>
      </div>
      <div className='picker-field'>
        <label className='picker-field-label' htmlFor='ssh-port'>
          SSH port
        </label>
        <input
          id='ssh-port'
          className='picker-input mono'
          type='number'
          value={tunnel.ssh_port ?? 22}
          onChange={event => update({ ssh_port: Number(event.target.value) || undefined })}
        />
      </div>
      <div className='picker-field'>
        <label className='picker-field-label' htmlFor='local-port'>
          Local port
        </label>
        <input
          id='local-port'
          className='picker-input mono'
          type='number'
          value={tunnel.local_port ?? 15432}
          onChange={event => update({ local_port: Number(event.target.value) || undefined })}
        />
      </div>
    </div>
  );
};
