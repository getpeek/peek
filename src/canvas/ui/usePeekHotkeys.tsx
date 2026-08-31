import { useAtomValue, useSetAtom, useAtom } from "jotai";
import { exit } from "@tauri-apps/plugin-process";
import { useCanvas } from "../hooks/useCanvas";
import { usePageActions } from "../hooks/usePageActions";
import { uiVisibilityAtom, keymapHelpOpenAtom } from "../../state";
import {
  placeModeAtom,
  selectionToolAtom,
  clipboardAtom,
  nodesAtom,
  resultsAtom,
  cameraLockedAtom,
} from "../state";
import { historyPreviewAtom } from "../history/state";
import { jumpModeAtom } from "../jump/state";
import { regionsMenuOpenAtom } from "../wayfinding/state";
import { useGroupSelection } from "../wayfinding/useGroupSelection";
import { useUngroupSelection } from "../wayfinding/useUngroupSelection";
import { useRegionsEnabled } from "../wayfinding/useRegionsEnabled";
import { pagesMenuOpenAtom } from "../../components/titlebar/PageSelector/state";
import { usePageDisplayMode } from "../../components/titlebar/PageSelector/usePageDisplayMode";
import { useUndoHistory } from "./useUndoHistory";
import { useHotkey } from "../../app/useHotkey";
import { useKeymap } from "../../app/keymap";
import { newIdForType } from "./KeyboardShortcuts";
import { showRunningQueries } from "../nodes/Activity/showRunningQueries";
import { useFocusQueryOnEnter } from "./useFocusQueryOnEnter";
import { pasteTranslation } from "./pasteTranslation";
import { togglePivot } from "../nodes/Result/togglePivot";
import { AppNode, AppNodeType, ResultNode } from "../types";

export const usePeekHotkeys = () => {
  const canvas = useCanvas();
  const setPlaceMode = useSetAtom(placeModeAtom);
  const setSelectionTool = useSetAtom(selectionToolAtom);
  const [clipboard, setClipboard] = useAtom(clipboardAtom);
  const setNodes = useSetAtom(nodesAtom);
  const setUiVisible = useSetAtom(uiVisibilityAtom);
  const setKeymapHelpOpen = useSetAtom(keymapHelpOpenAtom);
  const setCameraLocked = useSetAtom(cameraLockedAtom);
  const results = useAtomValue(resultsAtom);
  const historyPreview = useAtomValue(historyPreviewAtom);
  const pageActions = usePageActions();
  const { undo, redo } = useUndoHistory();
  const groupSelection = useGroupSelection();
  const ungroupSelection = useUngroupSelection();
  const regionsEnabled = useRegionsEnabled();
  const setRegionsMenuOpen = useSetAtom(regionsMenuOpenAtom);
  const setPagesMenuOpen = useSetAtom(pagesMenuOpenAtom);
  const pageDisplayMode = usePageDisplayMode();
  const setJumpMode = useSetAtom(jumpModeAtom);
  const keymap = useKeymap();

  // While a history preview is on screen the visible board is not the real
  // document — anything that would mutate it must be inert.
  const unlessPreviewing = (fn: () => void) => () => {
    if (historyPreview === null) {
      fn();
    }
  };

  useHotkey(keymap["App::Quit"], () => {
    exit(0);
  });

  useHotkey(
    keymap["Edit::Cut"],
    unlessPreviewing(() => {
      const selected = canvas.getSelectedNodes();
      if (selected.length === 0) {
        return;
      }
      setClipboard(selected);
      selected.forEach(node => canvas.deleteNode(node.id));
    }),
  );

  useHotkey(keymap["Edit::Copy"], () => {
    const selected = canvas.getSelectedNodes();
    if (selected.length > 0) {
      setClipboard(selected);
    }
  });

  useHotkey(
    keymap["Edit::Paste"],
    unlessPreviewing(() => {
      if (clipboard.length === 0) {
        return;
      }
      const translation = pasteTranslation(clipboard, canvas.screenToFlowPosition);
      const copies: AppNode[] = clipboard.map(node => ({
        ...node,
        id: newIdForType(node.type as AppNodeType),
        position: {
          x: node.position.x + translation.x,
          y: node.position.y + translation.y,
        },
        selected: true,
      }));
      setNodes(prev => [...prev.map(n => ({ ...n, selected: false })), ...copies]);
      canvas.selectOnly(copies.map(n => n.id));
    }),
  );
  useHotkey(
    keymap["View::ShowRunningQueries"],
    unlessPreviewing(() => {
      showRunningQueries(canvas);
    }),
  );

  useHotkey(keymap["History::Undo"], unlessPreviewing(undo));
  useHotkey(keymap["History::Redo"], unlessPreviewing(redo));

  useHotkey(
    keymap["Edit::SelectAll"],
    unlessPreviewing(() => {
      const nodeIds = canvas.getNodes().map(n => n.id);
      canvas.selectOnly(nodeIds);
    }),
  );

  useHotkey(
    keymap["Edit::DeleteSelection"],
    unlessPreviewing(() => {
      canvas.getSelectedNodes().forEach(node => canvas.deleteNode(node.id));
    }),
  );

  useHotkey(keymap["Zoom::Reset"], () => {
    canvas.resetZoom();
  });

  useHotkey(keymap["Zoom::FitView"], () => {
    canvas.fitView();
  });

  useHotkey(
    keymap["Page::New"],
    unlessPreviewing(() => {
      pageActions.newPage();
    }),
  );
  useHotkey(
    keymap["Page::Close"],
    unlessPreviewing(() => {
      pageActions.closeActivePage();
    }),
  );
  useHotkey(keymap["Page::Previous"], () => {
    pageActions.previousPage();
  });
  useHotkey(keymap["Page::Next"], () => {
    pageActions.nextPage();
  });

  useHotkey(keymap["Page::OpenPicker"], () => {
    if (pageDisplayMode === "list") {
      setPagesMenuOpen(v => !v);
    }
  });

  useHotkey(keymap["Page::SelectPreviousQuery"], () => {
    pageActions.previousQueryNodeOnPage();
  });
  useHotkey(keymap["Page::SelectNextQuery"], () => {
    pageActions.nextQueryNodeOnPage();
  });

  useHotkey(keymap["Page::SelectNodeRight"], () => {
    pageActions.nodeInDirection("right");
  });
  useHotkey(keymap["Page::SelectNodeLeft"], () => {
    pageActions.nodeInDirection("left");
  });
  useHotkey(keymap["Page::SelectNodeUp"], () => {
    pageActions.nodeInDirection("up");
  });
  useHotkey(keymap["Page::SelectNodeDown"], () => {
    pageActions.nodeInDirection("down");
  });

  useHotkey(
    keymap["Page::GoToNode"],
    unlessPreviewing(() => {
      setJumpMode(true);
    }),
  );

  useFocusQueryOnEnter();

  useHotkey(keymap["Tool::Select"], () => {
    const active = document.activeElement;
    if (active instanceof HTMLElement) {
      active.blur();
    }
    setPlaceMode(null);
    setSelectionTool("default");
    canvas.deselectAll();
  });
  useHotkey(
    keymap["Tool::LassoSelect"],
    unlessPreviewing(() => {
      setSelectionTool("lasso");
      setPlaceMode(null);
    }),
  );

  useHotkey(
    keymap["Tool::Query"],
    unlessPreviewing(() => setPlaceMode("query")),
  );

  useHotkey(
    keymap["Tool::Agent"],
    unlessPreviewing(() => setPlaceMode("agent")),
  );

  useHotkey(
    keymap["Tool::Text"],
    unlessPreviewing(() => setPlaceMode("text")),
  );

  useHotkey(
    keymap["Tool::Draw"],
    unlessPreviewing(() => setPlaceMode("draw")),
  );

  useHotkey(
    keymap["Tool::Variable"],
    unlessPreviewing(() => setPlaceMode("variable")),
  );

  // Pivot all selected result nodes. The default `shift-p` stays clear of `p` for the
  // connection picker and meta-p for the command palette.
  useHotkey(
    keymap["Result::Pivot"],
    unlessPreviewing(() => {
      const selected = canvas
        .getSelectedNodes()
        .filter((n): n is ResultNode => n.type === "result");
      for (const node of selected) {
        togglePivot(canvas, node.id, results[node.id]?.[0]?.length ?? 0);
      }
      // A lone pivoted node is usually parked off-screen; recenter so it isn't
      // lost. With several selected the camera can't follow them all, so skip it.
      if (selected.length === 1) {
        canvas.zoomToNode(selected[0].id, { duration: 200 });
      }
    }),
  );

  useHotkey(
    keymap["Region::GroupSelection"],
    unlessPreviewing(() => {
      groupSelection?.run();
    }),
  );

  useHotkey(
    keymap["Region::UngroupSelection"],
    unlessPreviewing(() => {
      ungroupSelection?.();
    }),
  );

  useHotkey(keymap["Region::OpenPicker"], () => {
    if (regionsEnabled) {
      setRegionsMenuOpen(v => !v);
    }
  });

  useHotkey(keymap["View::ToggleUi"], () => {
    setUiVisible(v => !v);
  });

  useHotkey(keymap["View::ToggleCameraLock"], () => {
    setCameraLocked(v => !v);
  });

  useHotkey(keymap["Help::Keymap"], () => {
    setKeymapHelpOpen(true);
  });
};
