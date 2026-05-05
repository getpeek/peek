import type { CommandPaletteResult } from "../commands";

export const DefaultDetails = ({ command }: { command: CommandPaletteResult }) => {
  return (
    <div className='details-default'>
      {command.icon && <div className='details-default-icon'>{command.icon}</div>}
      <div className='details-default-label'>{command.label}</div>
      {command.description && (
        <div className='details-default-description'>{command.description}</div>
      )}
      {command.keybinding && command.keybinding.length > 0 && (
        <div className='details-default-keybinding'>
          {command.keybinding.map((key, i) => (
            <kbd key={i} className='details-key'>
              {key}
            </kbd>
          ))}
        </div>
      )}
    </div>
  );
};
