import { IconChevronLeft, IconEye, IconEyeOff, IconTrash, IconX } from "@tabler/icons-react";
import { Switch } from "@mantine/core";
import { getHotkeyHandler } from "@mantine/hooks";
import { useState } from "react";
import { CONNECTION_COLOR_PRESETS, ColorPicker } from "./ColorPicker";
import { SshTunnelFields } from "./SshTunnelFields";
import { parseConnectionUrl } from "./urlParts";
import type { Connection, SshTunnelConfig } from "./types";

interface ConnectionFormProps {
  mode: "add" | "edit";
  workspaceName: string;
  initialConnection?: Connection;
  onBack: () => void;
  onClose: () => void;
  onSave: (connection: Connection) => Promise<void>;
  onRemove?: () => Promise<void>;
}

const defaultTunnel = (): SshTunnelConfig => ({
  ssh_host: "",
  ssh_user: "",
  key_path: "",
  ssh_port: 22,
  local_port: 15432,
});

const emptyConnection = (): Connection => ({
  name: "",
  url: "",
  color: CONNECTION_COLOR_PRESETS[0],
});

export const ConnectionForm = ({
  mode,
  workspaceName,
  initialConnection,
  onBack,
  onClose,
  onSave,
  onRemove,
}: ConnectionFormProps) => {
  const seed = initialConnection ?? emptyConnection();
  const [name, setName] = useState(seed.name);
  const [color, setColor] = useState(seed.color);
  const [url, setUrl] = useState(seed.url);
  const [sshOn, setSshOn] = useState(Boolean(seed.ssh_tunnel));
  const [tunnel, setTunnel] = useState<SshTunnelConfig>(seed.ssh_tunnel ?? defaultTunnel());
  const [revealPassword, setRevealPassword] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [saving, setSaving] = useState(false);

  const parsed = parseConnectionUrl(url);
  const canSave = name.trim().length > 0 && url.trim().length > 0 && !saving;

  const buildConnection = (): Connection => {
    const next: Connection = { name: name.trim(), url: url.trim(), color };
    if (sshOn) {
      next.ssh_tunnel = {
        ...tunnel,
        ssh_port: tunnel.ssh_port ?? 22,
        local_port: tunnel.local_port ?? 15432,
      };
    }
    return next;
  };

  const handleSave = async () => {
    if (!canSave) {
      return;
    }
    setSaving(true);
    try {
      await onSave(buildConnection());
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!onRemove) {
      return;
    }
    setSaving(true);
    try {
      await onRemove();
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      onBack();
      return;
    }
    getHotkeyHandler([["mod+Enter", handleSave]])(event);
  };

  return (
    <div className='picker-push' onKeyDown={handleKeyDown}>
      <div className='picker-push-head'>
        <button type='button' className='picker-back' onClick={onBack}>
          <IconChevronLeft size={14} />
          <span>Workspaces</span>
        </button>
        <span className='picker-push-title' style={{ "--cdot": color } as React.CSSProperties}>
          <span className='cdot' />
          {mode === "edit" ? (
            <>
              <span>{initialConnection?.name}</span>
              <span className='sub'>· {workspaceName}</span>
            </>
          ) : (
            <>
              <span className='subtle'>New connection</span>
              <span className='sub'>· in {workspaceName}</span>
            </>
          )}
        </span>
        <button type='button' className='picker-iconbtn' onClick={onClose} aria-label='Close'>
          <IconX size={13} />
        </button>
      </div>

      <div className='picker-push-body'>
        <div className='picker-form'>
          <div className='picker-form-grid'>
            <div className='picker-field'>
              <label className='picker-field-label' htmlFor='conn-name'>
                Name
              </label>
              <input
                id='conn-name'
                className='picker-input'
                type='text'
                autoFocus
                placeholder='e.g. staging'
                value={name}
                onChange={event => setName(event.target.value)}
              />
            </div>
            <div className='picker-field'>
              <span className='picker-field-label'>Color</span>
              <ColorPicker value={color} onChange={setColor} />
            </div>
          </div>

          <div className='picker-field'>
            <label className='picker-field-label' htmlFor='conn-url'>
              Connection URL
              <span className='hint'>postgres://user:password@host:port/db</span>
            </label>
            <div className='picker-input-row'>
              <input
                id='conn-url'
                className='picker-input mono'
                type={revealPassword ? "text" : "password"}
                placeholder='postgres://username:password@host/database'
                value={url}
                onChange={event => setUrl(event.target.value)}
                spellCheck={false}
                autoCorrect='off'
                autoCapitalize='off'
              />
              <button
                type='button'
                className='picker-input-action'
                onClick={() => setRevealPassword(reveal => !reveal)}
                aria-label={revealPassword ? "Hide password" : "Show password"}
              >
                {revealPassword ? <IconEyeOff size={13} /> : <IconEye size={13} />}
              </button>
            </div>
            {parsed && (
              <div className='picker-url-preview'>
                <span className='scheme'>{parsed.scheme}://</span>
                <span className='user'>{parsed.user || "user"}</span>
                <span className='scheme'>@</span>
                <span className='host'>{parsed.host}</span>
                <span className='scheme'>/</span>
                <span className='db'>{parsed.database}</span>
              </div>
            )}
          </div>

          <div className='picker-section-head'>
            <Switch
              checked={sshOn}
              onChange={event => setSshOn(event.currentTarget.checked)}
              size='xs'
              label='SSH tunnel'
              classNames={{ label: "picker-switch-label" }}
            />
            {sshOn && tunnel.ssh_host && (
              <span className='picker-section-badge'>
                tunneling :{tunnel.local_port ?? 15432} → {tunnel.ssh_host}:{tunnel.ssh_port ?? 22}
              </span>
            )}
          </div>

          {sshOn && <SshTunnelFields tunnel={tunnel} onChange={setTunnel} />}

          {confirmingRemove && (
            <div className='picker-confirm'>
              <IconTrash size={13} className='icn' />
              <span>
                Remove <strong>{initialConnection?.name}</strong> from {workspaceName}?
                <span className='sub'>
                  This only deletes the connection config, not the database.
                </span>
              </span>
              <span className='right'>
                <button
                  type='button'
                  className='picker-btn ghost sm'
                  onClick={() => setConfirmingRemove(false)}
                >
                  Cancel
                </button>
                <button
                  type='button'
                  className='picker-btn danger sm'
                  onClick={handleRemove}
                  disabled={saving}
                >
                  Remove
                </button>
              </span>
            </div>
          )}
        </div>
      </div>

      <div className='picker-push-foot'>
        <span className='left'>
          {mode === "edit" && onRemove && !confirmingRemove && (
            <button
              type='button'
              className='picker-btn danger'
              onClick={() => setConfirmingRemove(true)}
            >
              <IconTrash size={13} />
              <span>Remove</span>
            </button>
          )}
        </span>
        <span className='right'>
          <button type='button' className='picker-btn ghost' onClick={onBack}>
            Cancel <span className='kbd'>esc</span>
          </button>
          <button
            type='button'
            className='picker-btn primary'
            onClick={handleSave}
            disabled={!canSave}
          >
            {mode === "edit" ? "Save" : "Add connection"} <span className='kbd'>⌘↵</span>
          </button>
        </span>
      </div>
    </div>
  );
};
