import { Menu } from "@mantine/core";
import {
  IconAt,
  IconCopy,
  IconCopyPlus,
  IconDownload,
  IconFileTypeCsv,
  IconFileTypeSql,
  IconJson,
  IconTrash,
} from "@tabler/icons-react";
import type { ReactNode } from "react";
import { PortalAnchor } from "./PortalAnchor";
import type { ExportFormat } from "./export/serializeRows";
import { stringifyValue } from "./stringify";
import type { CellMenuState } from "./hooks/useCellContextMenu";
import type { CellRect } from "./hooks/useCellSelection";

const MAX_COPY_VALUE_LENGTH = 13;

function FormatSubmenu({
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

export function CellContextMenu({
  cellMenu,
  selected,
  cellRect,
  canDuplicate,
  onClose,
  onUseAsVariable,
  onCopyValue,
  onCopyRow,
  onCopySelected,
  onExportRow,
  onExportSelected,
  onCopyCellSelection,
  onExportCellSelection,
  onUseSelectionAsVariable,
  onDuplicateRow,
  onDuplicateSelected,
  onRequestDelete,
}: {
  cellMenu: CellMenuState | null;
  selected: ReadonlySet<number>;
  cellRect: CellRect | null;
  canDuplicate: boolean;
  onClose: () => void;
  onUseAsVariable: () => void;
  onCopyValue: () => void;
  onCopyRow: (format: ExportFormat) => void;
  onCopySelected: (format: ExportFormat) => void;
  onExportRow: (format: ExportFormat) => void;
  onExportSelected: (format: ExportFormat) => void;
  onCopyCellSelection: (format: ExportFormat) => void;
  onExportCellSelection: (format: ExportFormat) => void;
  onUseSelectionAsVariable: () => void;
  onDuplicateRow: () => void;
  onDuplicateSelected: () => void;
  onRequestDelete: () => void;
}) {
  if (!cellMenu) {
    return null;
  }

  const inCellRect =
    cellRect !== null &&
    cellMenu.displayPos >= cellRect.top &&
    cellMenu.displayPos <= cellRect.bottom &&
    cellMenu.columnIdx >= cellRect.left &&
    cellMenu.columnIdx <= cellRect.right;
  const cellRectArea = cellRect
    ? (cellRect.bottom - cellRect.top + 1) * (cellRect.right - cellRect.left + 1)
    : 0;
  // A 1×1 rect falls through to the plain single-cell menu, mirroring the
  // `>= 2` rule row selections use below.
  const showCellSelectionActions = inCellRect && cellRectArea >= 2;
  const singleColumn = cellRect !== null && cellRect.left === cellRect.right;

  const rowInSelection = !showCellSelectionActions && selected.has(cellMenu.rowIndex);
  const selectionCount = selected.size;
  const showSelectionActions = rowInSelection && selectionCount >= 2;
  const showSingleRow = !showCellSelectionActions && !showSelectionActions;
  const selectedRowsLabel = `${selectionCount} rows`;
  const deleteLabel = selectionCount >= 2 ? `Delete ${selectionCount} rows` : "Delete row";
  const copyIcon = <IconCopy size={14} />;
  const exportIcon = <IconDownload size={14} />;
  const duplicateIcon = <IconCopyPlus size={14} />;
  const duplicateLabel = selectionCount >= 2 ? `Duplicate ${selectedRowsLabel}` : "Duplicate row";
  const cellValue = stringifyValue(cellMenu.value);
  const copyValueLabel =
    cellValue.length > MAX_COPY_VALUE_LENGTH
      ? `Copy "${cellValue.slice(0, MAX_COPY_VALUE_LENGTH)}…"`
      : `Copy "${cellValue}"`;

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
        {showCellSelectionActions && singleColumn && (
          <Menu.Item leftSection={<IconAt size={14} />} onClick={onUseSelectionAsVariable}>
            Use as variable
          </Menu.Item>
        )}
        {showCellSelectionActions && (
          <FormatSubmenu label='Copy selection' icon={copyIcon} onSelect={onCopyCellSelection} />
        )}
        {showCellSelectionActions && (
          <FormatSubmenu
            label='Export selection'
            icon={exportIcon}
            onSelect={onExportCellSelection}
          />
        )}

        {showSingleRow && (
          <Menu.Item leftSection={<IconAt size={14} />} onClick={onUseAsVariable}>
            Use as variable
          </Menu.Item>
        )}

        {showSingleRow && (
          <Menu.Item leftSection={copyIcon} onClick={onCopyValue}>
            {copyValueLabel}
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

        {canDuplicate && !showCellSelectionActions && (
          <Menu.Item
            leftSection={duplicateIcon}
            onClick={showSelectionActions ? onDuplicateSelected : onDuplicateRow}
          >
            {duplicateLabel}
          </Menu.Item>
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
