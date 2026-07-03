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
    <div className={`cp-strip pk-theme-${theme}`}>
      <span className='cp-strip-theme-swatch'>
        <span className='cp-strip-theme-dot' />
      </span>
      <span className='cp-strip-desc'>{tagline}</span>
      <span className='cp-strip-meta'>
        <span className='m-strong'>{name}</span>
      </span>
    </div>
  );
};
