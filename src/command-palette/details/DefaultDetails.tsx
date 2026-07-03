import { ACTION_GLYPH, type CommandPaletteResult } from "../commands";

export const DefaultDetails = ({ command }: { command: CommandPaletteResult }) => {
  const hasKeybinding = command.keybinding && command.keybinding.length > 0;

  return (
    <div className='cp-strip'>
      {command.action ? (
        <span className='cp-strip-tag cp-strip-tag--quiet'>
          {ACTION_GLYPH[command.action].label}
        </span>
      ) : null}
      <span className='cp-strip-desc'>{command.description ?? command.label}</span>
      <span className='cp-strip-meta'>
        {hasKeybinding ? (
          command.keybinding!.map((key, i) => (
            <kbd key={i} className='details-key'>
              {key}
            </kbd>
          ))
        ) : (
          <>
            <kbd className='details-key'>↵</kbd>
            <span className='m-dim'>select</span>
          </>
        )}
      </span>
    </div>
  );
};
