import { Menu } from "@mantine/core";
import { IconAt, IconFileTypeCsv, IconFileTypeSql, IconJson } from "@tabler/icons-react";
import { PortalAnchor } from "./PortalAnchor";
import type { ExportFormat } from "./serializeRows";

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
  onUseAsVariable,
}: {
  state: HeaderMenuState | null;
  onClose: () => void;
  onExportColumn: (columnIdx: number, header: string, format: ExportFormat) => void;
  onUseAsVariable: (columnIdx: number, header: string) => void;
}) {
  if (!state) {
    return null;
  }
  const exportColumn = (format: ExportFormat) => {
    const { columnIdx, header } = state;
    onClose();
    onExportColumn(columnIdx, header, format);
  };
  const useAsVariable = () => {
    const { columnIdx, header } = state;
    onClose();
    onUseAsVariable(columnIdx, header);
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
        <Menu.Item leftSection={<IconAt size={14} />} onClick={useAsVariable}>
          Use as variable
        </Menu.Item>
        <Menu.Item leftSection={<IconFileTypeCsv size={14} />} onClick={() => exportColumn("csv")}>
          Export column as CSV
        </Menu.Item>
        <Menu.Item leftSection={<IconJson size={14} />} onClick={() => exportColumn("json")}>
          Export column as JSON
        </Menu.Item>
        <Menu.Item leftSection={<IconFileTypeSql size={14} />} onClick={() => exportColumn("sql")}>
          Export column as SQL
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
