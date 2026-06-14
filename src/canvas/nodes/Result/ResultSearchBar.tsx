import { getHotkeyHandler } from "@mantine/hooks";
import { IconSearch, IconX } from "@tabler/icons-react";
import { Tooltip } from "../../../components/Tooltip/Tooltip";

export function ResultSearchBar({
  query,
  matchCount,
  onChange,
  onClose,
}: {
  query: string;
  matchCount: number;
  onChange: (value: string) => void;
  onClose: () => void;
}) {
  return (
    <div className='result-search-bar'>
      <IconSearch size={14} className='result-search-icon' />
      <input
        autoFocus
        className='result-search-input'
        type='text'
        autoComplete='off'
        autoCorrect='off'
        spellCheck={false}
        placeholder='Search results…'
        value={query}
        onChange={event => onChange(event.currentTarget.value)}
        // stopPropagation so Escape closes search instead of bubbling to the
        // global hotkey / row-selection handlers on window.
        onKeyDown={getHotkeyHandler([
          [
            "Escape",
            event => {
              event.stopPropagation();
              onClose();
            },
          ],
        ])}
      />
      {query.trim() && (
        <span className='result-search-count'>
          {matchCount} {matchCount === 1 ? "match" : "matches"}
        </span>
      )}
      <Tooltip label='Close search'>
        <button className='icon-btn' onClick={onClose}>
          <IconX size={14} />
        </button>
      </Tooltip>
    </div>
  );
}
