import { useAtomValue } from "jotai";
import { editorAtom } from "../../state";
import { IconSql } from "@tabler/icons-react";
import { QueryShape } from "../../shapes/Query/QueryShape";
import { Text } from "@mantine/core";

export const useGetQueryCommands = () => {
  const editor = useAtomValue(editorAtom);

  if (!editor) {
    return [];
  }

  return editor
    .getCurrentPageShapes()
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
