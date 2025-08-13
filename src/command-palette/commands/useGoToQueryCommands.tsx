import { useAtomValue } from "jotai";
import { editorAtom } from "../../state";
import { IconSql } from "@tabler/icons-react";
import { QueryShape } from "../../shapes/Query/QueryShape";
import { Text } from "@mantine/core";
import { useValue } from "tldraw";

export const useGoToQueryCommands = () => {
  const editor = useAtomValue(editorAtom);
  const shapes = useValue(
    "current page shapes for search",
    () => editor?.getCurrentPageShapes(),
    [editor?.getCurrentPageShapes()],
  );

  if (!editor) {
    return [];
  }

  return (shapes ?? [])
    .filter((shape) => shape.type === "query")
    .map((shape) => ({
      icon: <IconSql />,
      label: (
        <Text size="xs">
          {(shape as QueryShape).props.query
            .replace(/\s/g, " ")
            .substring(0, 60)
            .toString()}
        </Text>
      ),
      searchAgainst: (shape as QueryShape).props.query.toLowerCase(),
      onSelect: () => {
        editor.select(shape);
        editor.zoomToSelection({ animation: { duration: 200 } });
      },
    }));
};
