import { Menu } from "@mantine/core";
import { IconAt, IconDownload } from "@tabler/icons-react";
import { FormatSubmenu } from "./FormatSubmenu";
import { PortalAnchor } from "./PortalAnchor";
import type { ExportFormat } from "./export/serializeRows";

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
        <FormatSubmenu
          label='Export column'
          icon={<IconDownload size={14} />}
          onSelect={exportColumn}
        />
      </Menu.Dropdown>
    </Menu>
  );
}
