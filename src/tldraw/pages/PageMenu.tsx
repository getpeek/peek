import { TLPage, useEditor, useValue } from "tldraw";
import "./PageMenu.css";
import {
  ActionIcon,
  Button,
  Group,
  Popover,
  Stack,
  Text,
  UnstyledButton,
} from "@mantine/core";
import { useHotkeys } from "@mantine/hooks";
import { useState } from "react";
import { IconDotsVertical, IconMenu, IconX } from "@tabler/icons-react";

export const PageMenu = () => {
  const editor = useEditor();
  const [showDropdown, setShowDropdown] = useState(false);
  const pages = useValue("pages", () => editor.getPages(), [editor.getPages()]);
  const activePage = useValue("active-page", () => editor.getCurrentPage(), [
    editor.getCurrentPage(),
  ]);
  useHotkeys([["p", () => setShowDropdown(true)]], ["INPUT", "TEXTAREA"]);

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
      offset={16}
      radius="lg"
      opened={showDropdown}
      onChange={setShowDropdown}
      closeOnClickOutside
    >
      <Popover.Target>
        <button className="page-menu" onClick={() => setShowDropdown(true)}>
          <Text size="xs">{activePage.name}</Text>
        </button>
      </Popover.Target>
      <Popover.Dropdown
        w={300}
        variant="unstyled"
        bg="hsla(247deg, 38%, 30%, 0.3)"
        bd="1px solid hsla(0deg, 0%, 100%, 0.05)"
        style={{ backdropFilter: "blur(10px)", transform: "translateX(20px)" }}
      >
        <Stack>
          {pages.map((page) => (
            <Group id={page.id} justify="space-between">
              <button
                data-active={page.id === activePage.id}
                onClick={() => selectPage(page)}
                className="page-name"
              >
                {page.name}
              </button>
              <Popover trapFocus>
                <Popover.Target>
                  <ActionIcon variant="transparent" c="var(--text-color)">
                    <IconDotsVertical />
                  </ActionIcon>
                </Popover.Target>
                <Popover.Dropdown bg="dark" bd="none">
                  <Stack>
                    <Button
                      variant="transparent"
                      c="#fff"
                      onClick={() => updatePage(page)}
                    >
                      Rename
                    </Button>
                    <Button
                      variant="transparent"
                      c="#fff"
                      onClick={() => removePage(page)}
                    >
                      <IconX /> Remove
                    </Button>
                  </Stack>
                </Popover.Dropdown>
              </Popover>
            </Group>
          ))}
          <UnstyledButton
            style={{ color: "var(--text-color)", fontSize: 12 }}
            size="xs"
            onClick={() => addPage("new page")}
          >
            Add Page
          </UnstyledButton>
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
};
