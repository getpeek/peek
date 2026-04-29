import { Menu } from "@mantine/core";
import { IconAt, IconCopy } from "@tabler/icons-react";
import { PortalAnchor } from "./PortalAnchor";
import type { CellMenuState } from "./useCellContextMenu";

export function CellContextMenu({
  cellMenu,
  onClose,
  onUseAsVariable,
  onCopyValue,
}: {
  cellMenu: CellMenuState | null;
  onClose: () => void;
  onUseAsVariable: () => void;
  onCopyValue: () => void;
}) {
  if (!cellMenu) {
    return null;
  }

  return (
    <Menu
      opened
      onClose={onClose}
      position='bottom-start'
      withinPortal
      width={200}
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
        <PortalAnchor x={cellMenu.x} y={cellMenu.y} />
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item leftSection={<IconCopy size={14} />} onClick={onCopyValue}>
          Copy value
        </Menu.Item>
        <Menu.Item leftSection={<IconAt size={14} />} onClick={onUseAsVariable}>
          Use as variable
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
