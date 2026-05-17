import { IconDots } from "@tabler/icons-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

export interface DotMenuItem {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
  kbd?: string;
}

interface DotMenuProps {
  items: (DotMenuItem | "divider")[];
  ariaLabel: string;
}

export const DotMenu = ({ items, ariaLabel }: DotMenuProps) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const handler = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className='picker-menu-container' onClick={event => event.stopPropagation()}>
      <button
        type='button'
        className='picker-iconbtn'
        data-active={open}
        aria-label={ariaLabel}
        onClick={event => {
          event.stopPropagation();
          setOpen(prev => !prev);
        }}
      >
        <IconDots size={13} />
      </button>
      {open && (
        <div className='picker-menu' role='menu'>
          {items.map((item, index) => {
            if (item === "divider") {
              return <div key={`sep-${index}`} className='picker-menu-sep' />;
            }
            return (
              <button
                key={item.label}
                type='button'
                role='menuitem'
                className='picker-menu-item'
                data-danger={item.danger ?? false}
                onClick={() => {
                  setOpen(false);
                  item.onClick();
                }}
              >
                <span className='icn'>{item.icon}</span>
                <span className='label'>{item.label}</span>
                {item.kbd && <span className='kbd'>{item.kbd}</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
