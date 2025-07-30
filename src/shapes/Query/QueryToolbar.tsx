import {
  Box,
  createShapeId,
  TldrawUiButton,
  TldrawUiContextualToolbar,
  toRichText,
  track,
  useEditor,
} from "tldraw";
import { useExecuteQueries } from "../../tools/useExecuteQuery";
import { QueryShapeUtil } from "./QueryShape";
import { format } from "sql-formatter";
import { useExecutePrompt } from "../Ai/useExecutePrompt";
import { useAtomValue } from "jotai";
import { schemaAtom } from "../../state";
import {
  IconIndentIncrease,
  IconPlayerPlay,
  IconWand,
} from "@tabler/icons-react";
import { Divider, Group } from "@mantine/core";

export const QueryContextualToolbarComponent = track(() => {
  const editor = useEditor();
  const shape = editor
    .getSelectedShapes()
    .find((shape) => shape.type === "query")!;

  const executeQuery = useExecuteQueries();
  const schema = useAtomValue(schemaAtom);
  const getExplanation =
    useExecutePrompt(`You are an expert data engineer. Your job is to take sql queries sent to a database and the semantic meaning of the query. i.e.
      what question is the query trying to answer. Provide at most one or two sentences.
      It's important that you describe the semantics of the query, not just provide a technical description of the query.
      Don't mention what columns are selected, the focus is what the query means.

      Example:
      \`\`\`
    SELECT
      ads.title, organisations.name, COUNT(applications.id) AS application_count
    FROM
      ads
      JOIN organisations ON ads.organisation_id = organisations.id
      JOIN applications ON ads.id = applications.ad_id
    GROUP BY
      ads.id,
      organisations.id
    ORDER BY
      application_count DESC
    LIMIT
      50
      \`\`\`

    should give a description that looks like this: "List the top 50 ads by how popular they are".

    The most important part is that the description is short. DO NOT provide a breakdown of the description, ONLY provide a one or two sentence description.

    This is the database schema: ${JSON.stringify(schema)}`);

  const getSelectionBounds = () => {
    const fullBounds = editor.getSelectionRotatedScreenBounds();
    if (!fullBounds) {
      return undefined;
    }
    return new Box(fullBounds.x, fullBounds.y, fullBounds.width, 0);
  };

  const runExecuteQuery = async () => {
    const query = (shape.props as ReturnType<QueryShapeUtil["getDefaultProps"]>)
      .query;

    executeQuery(shape, [query]);
  };

  const formatQuery = () => {
    const query = (shape.props as ReturnType<QueryShapeUtil["getDefaultProps"]>)
      .query;

    const formatted = format(query, {
      keywordCase: "upper",
      functionCase: "upper",
      language: "postgresql",
    });

    editor.updateShape({
      id: shape.id,
      type: shape.type,
      props: {
        query: formatted,
      },
    });
  };

  const explainQuery = async () => {
    const query = (shape.props as ReturnType<QueryShapeUtil["getDefaultProps"]>)
      .query;

    if (query.trim().length === 0) {
      return;
    }

    const outputNodeId = createShapeId(shape.id + "-explanation");
    let output = editor.getShape(outputNodeId);

    if (!output) {
      editor.createShape({
        type: "text",
        id: outputNodeId,
        x: shape.x,
        y: shape.y - 50,
        props: {
          richText: toRichText(""),
        },
      });

      output = editor.getShape(outputNodeId)!;
    }

    const response = await getExplanation(
      `Describe the meaning of this query: ${query}`,
    );

    let explanation = "";

    for await (const word of response) {
      explanation += word.text;
      editor.updateShape({
        ...output,
        props: { richText: toRichText(explanation), size: "s" },
      });
    }
  };

  return (
    <TldrawUiContextualToolbar
      getSelectionBounds={getSelectionBounds}
      label="Sizes"
    >
      <TldrawUiButton title="Format query" type="normal" onClick={formatQuery}>
        <Group gap={8} align="center">
          <IconIndentIncrease size={16} />
          Format
        </Group>
      </TldrawUiButton>
      <Divider orientation="vertical" color="dark" />
      <TldrawUiButton
        title="Describe query"
        type="normal"
        onClick={explainQuery}
      >
        <Group gap={8} align="center">
          <IconWand size="16" />
          Describe
        </Group>
      </TldrawUiButton>
      <Divider orientation="vertical" color="dark" />
      <TldrawUiButton
        title="Execute query"
        type="normal"
        onClick={runExecuteQuery}
      >
        <Group gap={8} align="center">
          <IconPlayerPlay size={16} /> Execute
        </Group>
      </TldrawUiButton>
    </TldrawUiContextualToolbar>
  );
});
