import { Menu } from "@mantine/core";
import { IconAt, IconCopy, IconFileTypeCsv, IconJson, IconTrash } from "@tabler/icons-react";
import { PortalAnchor } from "./PortalAnchor";
import type { CellMenuState } from "./useCellContextMenu";

export function CellContextMenu({
  cellMenu,
  selected,
  onClose,
  onUseAsVariable,
  onCopyValue,
  onExportRow,
  onExportSelected,
  onRequestDelete,
}: {
  cellMenu: CellMenuState | null;
  selected: ReadonlySet<number>;
  onClose: () => void;
  onUseAsVariable: () => void;
  onCopyValue: () => void;
  onExportRow: (format: "csv" | "json") => void;
  onExportSelected: (format: "csv" | "json") => void;
  onRequestDelete: () => void;
}) {
  if (!cellMenu) {
    return null;
  }

  const rowInSelection = selected.has(cellMenu.rowIndex);
  const selectionCount = selected.size;
  const showSelectionExport = rowInSelection && selectionCount >= 2;
  const showDelete = rowInSelection && selectionCount >= 1;
  const deleteLabel = selectionCount >= 2 ? `Delete ${selectionCount} selected rows` : "Delete row";

  return (
    <Menu
      opened
      onClose={onClose}
      position='bottom-start'
      withinPortal
      width={240}
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
        <Menu.Divider />
        <Menu.Item leftSection={<IconFileTypeCsv size={14} />} onClick={() => onExportRow("csv")}>
          Export row as CSV
        </Menu.Item>
        <Menu.Item leftSection={<IconJson size={14} />} onClick={() => onExportRow("json")}>
          Export row as JSON
        </Menu.Item>
        {showSelectionExport && (
          <>
            <Menu.Divider />
            <Menu.Item
              leftSection={<IconFileTypeCsv size={14} />}
              onClick={() => onExportSelected("csv")}
            >
              Export {selectionCount} selected rows as CSV
            </Menu.Item>
            <Menu.Item
              leftSection={<IconJson size={14} />}
              onClick={() => onExportSelected("json")}
            >
              Export {selectionCount} selected rows as JSON
            </Menu.Item>
          </>
        )}
        {showDelete && (
          <>
            <Menu.Divider />
            <Menu.Item color='red' leftSection={<IconTrash size={14} />} onClick={onRequestDelete}>
              {deleteLabel}
            </Menu.Item>
          </>
        )}
      </Menu.Dropdown>
    </Menu>
  );
}
