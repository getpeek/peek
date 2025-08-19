import { TLPage, useEditor, useValue } from "tldraw";
import "./PageMenu.css";
import { Box, Popover, Stack, Text } from "@mantine/core";
import { getHotkeyHandler, useHotkeys } from "@mantine/hooks";
import { useState } from "react";
import { IconPencil, IconTrash } from "@tabler/icons-react";

export const PageMenu = () => {
  const editor = useEditor();
  const [showDropdown, setShowDropdown] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number>();
  const pages = useValue("pages", () => editor.getPages(), [editor.getPages()]);
  const activePage = useValue("active-page", () => editor.getCurrentPage(), [
    editor.getCurrentPage(),
  ]);
  const [index, setIndex] = useState(
    pages.findIndex((page) => page.id === activePage.id),
  );
  const hideDropdown = () => {
    setEditingIndex(undefined);
    setShowDropdown(false);
  };

  useHotkeys([["p", () => setShowDropdown(true)]], ["INPUT", "TEXTAREA"]);
  useHotkeys([["Escape", hideDropdown]], ["INPUT", "TEXTAREA"]);
  useHotkeys([
    [
      "Enter",
      () => {
        if (!showDropdown) {
          return;
        }
        const newPage = pages[index];
        if (newPage) {
          selectPage(newPage);
        }
      },
    ],
  ]);
  useHotkeys(
    [
      [
        "ArrowDown",
        () => {
          if (!showDropdown) {
            return;
          }
          setIndex((old) => (old + 1) % pages.length);
        },
      ],
    ],
    ["INPUT", "TEXTAREA"],
  );
  useHotkeys(
    [
      [
        "ArrowUp",
        () => {
          if (!showDropdown) {
            return;
          }
          setIndex((old) => (old - 1 + pages.length) % pages.length);
        },
      ],
    ],
    ["INPUT", "TEXTAREA"],
  );

  const selectPage = (page: TLPage) => {
    editor.setCurrentPage(page);
    setShowDropdown(false);
  };

  const removePage = (page: TLPage) => {
    editor.deletePage(page);
    if (pages.length === 0) {
      editor.createPage({ name: "Page 1" });
    }
  };

  const updatePage = (page: TLPage) => {
    editor.updatePage(page);
  };

  const addPage = (name: string) => {
    editor.createPage({ name });
  };

  return (
    <Popover
      trapFocus
      variant="unstyled"
      position="bottom"
      offset={8}
      radius="lg"
      opened={showDropdown}
      onChange={setShowDropdown}
      closeOnClickOutside
      onClose={hideDropdown}
    >
      <Popover.Target>
        <button className="page-menu" onClick={() => setShowDropdown(true)}>
          <Text size="xs">{activePage.name}</Text>
        </button>
      </Popover.Target>
      <Popover.Dropdown
        w={300}
        variant="unstyled"
        bg="var(--ui-glass-background)"
        bd="1px solid hsla(0deg, 0%, 100%, 0.05)"
        px={8}
        py={16}
        style={{ backdropFilter: "blur(10px)", transform: "translateX(15px)" }}
      >
        <Stack gap={8}>
          {pages.map((page, i) => (
            <div className="page-wrapper" key={page.id}>
              {editingIndex === i ? (
                <>
                  <input
                    type="text"
                    autoFocus
                    value={page.name}
                    className="page-name-input"
                    onKeyDown={getHotkeyHandler([
                      ["Escape", () => setEditingIndex(undefined)],
                      ["Enter", () => setEditingIndex(undefined)],
                    ])}
                    onChange={(e) =>
                      updatePage({ ...page, name: e.currentTarget.value })
                    }
                  />
                  <IconTrash
                    size={16}
                    color={"var(--remove-color)"}
                    onClick={() => {
                      removePage(page);
                      setEditingIndex(undefined);
                    }}
                  />
                </>
              ) : (
                <>
                  <div
                    data-active={i === index}
                    onClick={() => {
                      setIndex(i);
                      selectPage(page);
                    }}
                    className="page-name"
                  >
                    {page.name}
                  </div>
                  <div
                    onClick={() => setEditingIndex(i)}
                    style={{ width: 20 }}
                    className="edit-page-button"
                  >
                    <IconPencil size={16} color="var(--text-color-subtle)" />
                  </div>
                </>
              )}
            </div>
          ))}

          <Box
            pt={16}
            px={8}
            style={{
              color: "var(--text-color)",
              fontSize: 12,
              cursor: "pointer",
            }}
            size="xs"
            onClick={() => addPage("new page")}
          >
            Add Page
          </Box>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
};
