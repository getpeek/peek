import { Menu } from "@mantine/core";
import { IconFileTypeCsv, IconJson } from "@tabler/icons-react";
import { PortalAnchor } from "./PortalAnchor";

export type HeaderMenuState = {
  x: number;
  y: number;
  columnIdx: number;
  header: string;
};

export function ResultHeaderMenu({
  state,
  onClose,
  onExportColumn,
}: {
  state: HeaderMenuState | null;
  onClose: () => void;
  onExportColumn: (columnIdx: number, header: string, format: "csv" | "json") => void;
}) {
  if (!state) {
    return null;
  }
  const run = (format: "csv" | "json") => {
    const { columnIdx, header } = state;
    onClose();
    onExportColumn(columnIdx, header, format);
  };
  return (
    <Menu
      opened
      onClose={onClose}
      position='bottom-start'
      withinPortal
      width={220}
      offset={4}
      radius='md'
      classNames={{
        dropdown: "column-menu-dropdown",
        item: "column-menu-item",
        label: "column-menu-label",
        itemSection: "column-menu-item-section",
      }}
    >
      <Menu.Target>
        <PortalAnchor x={state.x} y={state.y} />
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>{state.header}</Menu.Label>
        <Menu.Item leftSection={<IconFileTypeCsv size={14} />} onClick={() => run("csv")}>
          Export column as CSV
        </Menu.Item>
        <Menu.Item leftSection={<IconJson size={14} />} onClick={() => run("json")}>
          Export column as JSON
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
