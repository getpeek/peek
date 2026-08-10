import { Menu } from "@mantine/core";
import { IconFileTypeCsv, IconFileTypeSql, IconJson } from "@tabler/icons-react";
import type { ReactNode } from "react";
import type { ExportFormat } from "./export/serializeRows";

/** A copy/export entry that fans out into the serializable formats. */
export function FormatSubmenu({
  label,
  icon,
  onSelect,
}: {
  label: string;
  icon: ReactNode;
  onSelect: (format: ExportFormat) => void;
}) {
  return (
    <Menu.Sub>
      <Menu.Sub.Target>
        <Menu.Sub.Item leftSection={icon}>{label}</Menu.Sub.Item>
      </Menu.Sub.Target>
      <Menu.Sub.Dropdown>
        <Menu.Item leftSection={<IconJson size={14} />} onClick={() => onSelect("json")}>
          JSON
        </Menu.Item>
        <Menu.Item leftSection={<IconFileTypeCsv size={14} />} onClick={() => onSelect("csv")}>
          CSV
        </Menu.Item>
        <Menu.Item leftSection={<IconFileTypeSql size={14} />} onClick={() => onSelect("sql")}>
          SQL
        </Menu.Item>
      </Menu.Sub.Dropdown>
    </Menu.Sub>
  );
}
