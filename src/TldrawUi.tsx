import { TLComponents, TLUiOverrides, useTools } from "tldraw";
import { CustomContextualToolbarComponent } from "./tools/CustomToolbar";
import { CustomContextMenu } from "./tools/CustomContextMenu";
import { TlDrawToolbar } from "./tldraw/toolbar/Toolbar";
import { ZoomIndicator } from "./tldraw/zoom/ZoomIndicator";
import { BackToContent } from "./tldraw/back-to-content/BackToContent";

export const customUiOverrides: TLUiOverrides = {
  tools(editor, tools) {
    tools["query"] = {
      id: "query",
      label: "Query editor",
      icon: "code",
      kbd: "q",
      onSelect: () => {
        editor.setCurrentTool("query");
      },
    };

    tools["ai-prompt"] = {
      id: "ai-prompt",
      label: "Ai Prompt",
      icon: "comment",
      kbd: "a",
      onSelect: () => {
        editor.setCurrentTool("ai-prompt");
      },
    };

    return tools;
  },
  actions(editor, actions) {
    delete actions["send-to-front"];
    delete actions["bring-to-front"];

    actions["select-next-query"] = {
      id: "select-next-query",
      label: "Select next query",
      readonlyOk: true,
      kbd: "cmd+],ctrl+]",
      onSelect() {
        let current = editor.getOnlySelectedShape();

        if (!current || current.type !== "query") {
          current =
            editor
              .getCurrentPageShapes()
              .find((shape) => shape.type === "query") ?? null;
        }

        if (!current) {
          return;
        }

        const queryShapes = editor
          .getCurrentPageShapes()
          .filter((shape) => shape.type === "query");

        const currentShapeIndex = queryShapes.findIndex(
          (shape) => shape.id.toString() === current.id.toString(),
        );

        editor.select(
          queryShapes[(currentShapeIndex + 1) % queryShapes.length].id,
        );
        editor.zoomToSelection({ animation: { duration: 300 } });
      },
    };

    actions["select-previous-query"] = {
      id: "select-previous-query",
      label: "Select previous query",
      readonlyOk: true,
      kbd: "cmd+[,ctrl+[",
      onSelect() {
        let current = editor.getOnlySelectedShape();

        if (!current || current.type !== "query") {
          current =
            editor
              .getCurrentPageShapes()
              .find((shape) => shape.type === "query") ?? null;
        }

        if (!current) {
          return;
        }
        const queryShapes = editor
          .getCurrentPageShapes()
          .filter((shape) => shape.type === "query");

        const currentShapeIndex = queryShapes.findIndex(
          (shape) => shape.id.toString() === current.id.toString(),
        );

        editor.select(
          queryShapes[
            (currentShapeIndex - 1 + queryShapes.length) % queryShapes.length
          ].id,
        );
        editor.zoomToSelection({ animation: { duration: 300 } });
      },
    };

    actions["query"] = {
      id: "query-actions",
      label: "Create a new Query",
      readonlyOk: true,
      kbd: "q",
      onSelect() {
        editor.setCurrentTool("query");
      },
    };

    actions["ai-prompt"] = {
      id: "prompt-actions",
      label: "Create a new AI Prompt",
      readonlyOk: true,
      kbd: "a",
      onSelect() {
        editor.setCurrentTool("ai-prompt");
      },
    };

    actions["reset-zoom"] = {
      id: "reset-zoom",
      label: "Reset Zoom",
      readonlyOk: true,
      kbd: "0",
      onSelect() {
        editor.zoomToSelection();
        editor.resetZoom();
      },
    };
    return actions;
  },
};

export const customComponents: TLComponents = {
  Toolbar: () => {
    const tools = useTools();

    delete tools["rectangle"];
    delete tools["arrow"];
    delete tools["line"];
    delete tools["ellipse"];

    return <TlDrawToolbar />;
  },
  SharePanel: null,
  ActionsMenu: null,
  HelpMenu: null,
  Minimap: null,
  ZoomMenu: ZoomIndicator,
  PageMenu: null,
  SnapIndicator: null,
  MainMenu: null,
  StylePanel: null,
  HelperButtons: BackToContent,
  QuickActions: null,
  ContextMenu: CustomContextMenu,
  InFrontOfTheCanvas: CustomContextualToolbarComponent,
  KeyboardShortcutsDialog: null,
};
