import { Menu } from "@mantine/core";
import {
  IconAt,
  IconCopy,
  IconDownload,
  IconFileTypeCsv,
  IconJson,
  IconTrash,
} from "@tabler/icons-react";
import type { ReactNode } from "react";
import { PortalAnchor } from "./PortalAnchor";
import type { CellMenuState } from "./useCellContextMenu";

function FormatSubmenu({
  label,
  icon,
  onSelect,
}: {
  label: string;
  icon: ReactNode;
  onSelect: (format: "csv" | "json") => void;
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
      </Menu.Sub.Dropdown>
    </Menu.Sub>
  );
}

export function CellContextMenu({
  cellMenu,
  selected,
  onClose,
  onUseAsVariable,
  onCopyValue,
  onCopyRow,
  onCopySelected,
  onExportRow,
  onExportSelected,
  onRequestDelete,
}: {
  cellMenu: CellMenuState | null;
  selected: ReadonlySet<number>;
  onClose: () => void;
  onUseAsVariable: () => void;
  onCopyValue: () => void;
  onCopyRow: (format: "csv" | "json") => void;
  onCopySelected: (format: "csv" | "json") => void;
  onExportRow: (format: "csv" | "json") => void;
  onExportSelected: (format: "csv" | "json") => void;
  onRequestDelete: () => void;
}) {
  if (!cellMenu) {
    return null;
  }

  const rowInSelection = selected.has(cellMenu.rowIndex);
  const selectionCount = selected.size;
  const showSelectionActions = rowInSelection && selectionCount >= 2;
  const showSingleRow = !showSelectionActions;
  const selectedRowsLabel = `${selectionCount} rows`;
  const deleteLabel = selectionCount >= 2 ? `Delete ${selectionCount} rows` : "Delete row";
  const copyIcon = <IconCopy size={14} />;
  const exportIcon = <IconDownload size={14} />;

  return (
    <Menu
      opened
      onClose={onClose}
      position='bottom-start'
      withinPortal
      width={280}
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
        {showSingleRow && (
          <Menu.Item leftSection={<IconAt size={14} />} onClick={onUseAsVariable}>
            Use as variable
          </Menu.Item>
        )}

        {showSingleRow && (
          <Menu.Item leftSection={copyIcon} onClick={onCopyValue}>
            Copy cell value
          </Menu.Item>
        )}
        {showSingleRow && <FormatSubmenu label='Copy row' icon={copyIcon} onSelect={onCopyRow} />}
        {showSelectionActions && (
          <FormatSubmenu
            label={`Copy ${selectedRowsLabel}`}
            icon={copyIcon}
            onSelect={onCopySelected}
          />
        )}

        {showSingleRow && (
          <FormatSubmenu label='Export row' icon={exportIcon} onSelect={onExportRow} />
        )}
        {showSelectionActions && (
          <FormatSubmenu
            label={`Export ${selectedRowsLabel}`}
            icon={exportIcon}
            onSelect={onExportSelected}
          />
        )}

        {rowInSelection && (
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
