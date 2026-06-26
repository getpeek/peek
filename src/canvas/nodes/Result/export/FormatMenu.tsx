import { Menu } from "@mantine/core";
import { IconFileTypeCsv, IconFileTypeSql, IconJson } from "@tabler/icons-react";
import type { ReactNode } from "react";
import type { ExportFormat } from "./serializeRows";

export function FormatMenu({
  icon,
  title,
  verb,
  disabled,
  onSelect,
}: {
  icon: ReactNode;
  title: string;
  verb: string;
  disabled: boolean;
  onSelect: (format: ExportFormat) => void;
}) {
  return (
    <Menu
      position='bottom-end'
      offset={4}
      radius='md'
      width={180}
      withinPortal
      classNames={{
        dropdown: "column-menu-dropdown",
        item: "column-menu-item",
        label: "column-menu-label",
        itemSection: "column-menu-item-section",
      }}
    >
      <Menu.Target>
        <button className='icon-btn' title={title} disabled={disabled}>
          {icon}
        </button>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item leftSection={<IconJson size={14} />} onClick={() => onSelect("json")}>
          {verb} as JSON
        </Menu.Item>
        <Menu.Item leftSection={<IconFileTypeCsv size={14} />} onClick={() => onSelect("csv")}>
          {verb} as CSV
        </Menu.Item>
        <Menu.Item leftSection={<IconFileTypeSql size={14} />} onClick={() => onSelect("sql")}>
          {verb} as SQL
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
