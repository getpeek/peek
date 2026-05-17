import { IconChevronLeft, IconTrash, IconX } from "@tabler/icons-react";
import { getHotkeyHandler } from "@mantine/hooks";
import { useState } from "react";

interface WorkspaceFormProps {
  mode: "add" | "edit";
  initialName?: string;
  connectionCount?: number;
  onBack: () => void;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
  onRemove?: () => Promise<void>;
}

export const WorkspaceForm = ({
  mode,
  initialName = "",
  connectionCount = 0,
  onBack,
  onClose,
  onSave,
  onRemove,
}: WorkspaceFormProps) => {
  const [name, setName] = useState(initialName);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [saving, setSaving] = useState(false);

  const trimmed = name.trim();
  const canSave = trimmed.length > 0 && trimmed !== initialName && !saving;
  const mascot = trimmed.charAt(0).toUpperCase() || "·";

  const handleSave = async () => {
    if (trimmed.length === 0 || saving) {
      return;
    }
    setSaving(true);
    try {
      await onSave(trimmed);
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
        <span className='picker-push-title'>
          <span className='subtle'>{mode === "edit" ? "Edit workspace" : "New workspace"}</span>
        </span>
        <button type='button' className='picker-iconbtn' onClick={onClose} aria-label='Close'>
          <IconX size={13} />
        </button>
      </div>

      <div className='picker-push-body'>
        <div className='picker-form'>
          <div className='picker-ws-form-head'>
            <div className='picker-ws-form-mascot'>{mascot}</div>
            <div className='picker-ws-form-name'>
              <label className='picker-field-label' htmlFor='ws-name'>
                Workspace name
              </label>
              <input
                id='ws-name'
                className='picker-input'
                autoFocus
                placeholder='e.g. Orchard'
                value={name}
                onChange={event => setName(event.target.value)}
              />
            </div>
          </div>

          {mode === "add" && (
            <div className='picker-hint-box'>
              You'll add connections to{" "}
              <span className='picker-hint-strong'>{trimmed || "this workspace"}</span> after
              saving.
            </div>
          )}

          {mode === "edit" && connectionCount > 0 && (
            <div className='picker-hint-box'>
              {connectionCount} connection{connectionCount === 1 ? "" : "s"} in this workspace.
            </div>
          )}

          {confirmingRemove && (
            <div className='picker-confirm'>
              <IconTrash size={13} className='icn' />
              <span>
                Remove <strong>{initialName}</strong>?
                <span className='sub'>
                  All {connectionCount} connection{connectionCount === 1 ? "" : "s"} will be removed
                  from this workspace.
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
            {mode === "edit" ? "Save" : "Create workspace"} <span className='kbd'>⌘↵</span>
          </button>
        </span>
      </div>
    </div>
  );
};
