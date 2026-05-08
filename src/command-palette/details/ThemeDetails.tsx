import type { Theme } from "../../state";
import "./ThemeDetails.css";

const labels: Record<Theme, { name: string; tagline: string }> = {
  pine: { name: "Pine", tagline: "Purple-tinted dark" },
  midnight: { name: "Midnight", tagline: "Pure dark" },
  midday: { name: "Midday", tagline: "Light" },
};

export const ThemeDetails = ({ theme }: { theme: Theme }) => {
  const { name, tagline } = labels[theme];
  return (
    <div className={`details-theme pk-theme-${theme}`}>
      <div className='details-eyebrow'>Appearance · Theme</div>
      <div className='details-title'>{name}</div>
      <div className='details-subtitle'>{tagline}</div>
      <div className='details-theme-canvas'>
        <div className='details-theme-node'>
          <div className='details-theme-header'>
            <span className='details-theme-dot' />
            <span className='details-theme-bar details-theme-bar-title' />
          </div>
          <div className='details-theme-body'>
            <span className='details-theme-bar' />
            <span className='details-theme-bar details-theme-bar-short' />
            <span className='details-theme-bar' />
          </div>
        </div>
      </div>
      <div className='details-action-hint'>
        <kbd className='details-key'>↵</kbd>
        <span>Apply theme</span>
      </div>
    </div>
  );
};
