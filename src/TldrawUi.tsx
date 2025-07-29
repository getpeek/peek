import {
  DefaultKeyboardShortcutsDialog,
  DefaultKeyboardShortcutsDialogContent,
  DefaultToolbar,
  TLComponents,
  TLUiOverrides,
  TldrawUiMenuItem,
  useTools,
} from "tldraw";
import { CustomContextualToolbarComponent } from "./tools/CustomToolbar";
import { ConnectionPanel } from "./Connection/ConnectionPanel";
import { CustomContextMenu } from "./tools/CustomContextMenu";

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
  Toolbar: (props) => {
    const tools = useTools();

    delete tools["rectangle"];
    delete tools["arrow"];
    delete tools["line"];

    return (
      <DefaultToolbar {...props}>
        <TldrawUiMenuItem {...tools["select"]} />
        <TldrawUiMenuItem {...tools["query"]} />
        <TldrawUiMenuItem {...tools["ai-prompt"]} />
        <TldrawUiMenuItem {...tools["draw"]} />
        <TldrawUiMenuItem {...tools["hand"]} />
        <TldrawUiMenuItem {...tools["text"]} />
      </DefaultToolbar>
    );
  },
  SharePanel: ConnectionPanel,
  ActionsMenu: null,
  HelpMenu: null,
  StylePanel: null,
  QuickActions: null,
  ContextMenu: CustomContextMenu,
  InFrontOfTheCanvas: CustomContextualToolbarComponent,
  KeyboardShortcutsDialog: (props) => {
    return (
      <DefaultKeyboardShortcutsDialog {...props}>
        <DefaultKeyboardShortcutsDialogContent />
        <div
          style={{
            display: "flex",
            gridColumn: "1 / -1",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <div style={{ fontWeight: "bold" }}>Query editor</div>
          <div
            style={{
              display: "flex",
              gap: "8px",
              alignItems: "center",
            }}
          >
            <kbd>Q</kbd>
            <span>Query editor</span>
          </div>
        </div>
      </DefaultKeyboardShortcutsDialog>
    );
  },
};
