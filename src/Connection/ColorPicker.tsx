export const CONNECTION_COLOR_PRESETS = [
  "#5584E8",
  "hsl(60deg, 70%, 55%)",
  "hsl(20deg, 80%, 60%)",
  "#9FD68A",
  "#C58AE8",
  "#E5736A",
] as const;

const HEX = /^#[0-9a-f]{6}$/iu;

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

export const ColorPicker = ({ value, onChange }: ColorPickerProps) => {
  const isCustom = !(CONNECTION_COLOR_PRESETS as readonly string[]).includes(value);
  const nativeValue = HEX.test(value) ? value : "#5584E8";

  return (
    <div className='picker-colors'>
      {CONNECTION_COLOR_PRESETS.map(color => (
        <button
          key={color}
          type='button'
          className='picker-color'
          data-active={value === color}
          style={{ background: color }}
          onClick={() => onChange(color)}
          aria-label={`Color ${color}`}
        />
      ))}
      <label
        className='picker-color picker-color-custom'
        data-active={isCustom}
        style={isCustom ? { background: value } : undefined}
        title='Custom color'
        aria-label='Custom color'
      >
        <input type='color' value={nativeValue} onChange={event => onChange(event.target.value)} />
      </label>
    </div>
  );
};
