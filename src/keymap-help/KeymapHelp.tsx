import "./KeymapHelp.css";
import { Fragment } from "react";
import { useAtom } from "jotai";
import { useClickOutside, useHotkeys } from "@mantine/hooks";
import { keymapHelpOpenAtom } from "../state";
import { useKeymap } from "../app/keymap";
import { KEYMAP_REFERENCE, formatCombo } from "./keymapActions";

export const KeymapHelp = () => {
  const [open, setOpen] = useAtom(keymapHelpOpenAtom);
  const keymap = useKeymap();
  const close = () => setOpen(false);
  const ref = useClickOutside(close);
  useHotkeys([["Escape", close]]);

  if (!open) {
    return null;
  }

  return (
    <div className='keymap-help' ref={ref}>
      <div className='keymap-help-header'>
        <h2 className='keymap-help-title'>Keyboard shortcuts</h2>
      </div>
      <div className='keymap-help-body'>
        {KEYMAP_REFERENCE.map(section => (
          <section className='keymap-help-section' key={section.title}>
            <h3 className='keymap-help-section-title'>{section.title}</h3>
            {section.entries.map(entry => {
              const combos = keymap[entry.action];
              return (
                <div className='keymap-help-row' key={entry.action}>
                  <span className='keymap-help-description'>{entry.description}</span>
                  <span className='keymap-help-keys'>
                    {combos.length === 0 ? (
                      <span className='keymap-help-unbound'>Unbound</span>
                    ) : (
                      combos.map((combo, comboIndex) => (
                        <Fragment key={combo}>
                          {comboIndex > 0 && <span className='keymap-help-or'>or</span>}
                          <span className='keymap-help-combo'>
                            {formatCombo(combo).map((token, tokenIndex) => (
                              <kbd className='keymap-help-key' key={tokenIndex}>
                                {token}
                              </kbd>
                            ))}
                          </span>
                        </Fragment>
                      ))
                    )}
                  </span>
                </div>
              );
            })}
          </section>
        ))}
      </div>
      <div className='keymap-help-footer'>
        <kbd className='keymap-help-key'>esc</kbd>
        <span>to close</span>
      </div>
    </div>
  );
};
