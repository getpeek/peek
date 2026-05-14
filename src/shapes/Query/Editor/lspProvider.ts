import { invoke } from "@tauri-apps/api/core";
import type { Monaco } from "@monaco-editor/react";
import { editor, languages, IDisposable, MarkerSeverity } from "monaco-editor";
import { LspCompletionItem, LspDiagnostic, LspDiagnosticSeverity } from "./lspTypes";
import { isSnippet, lspKindToMonaco } from "./lspBridge";

const MARKER_OWNER = "peek-sql";

function lspSeverityToMonaco(sev: number | undefined): MarkerSeverity {
  switch (sev) {
    case LspDiagnosticSeverity.Error:
      return MarkerSeverity.Error;
    case LspDiagnosticSeverity.Warning:
      return MarkerSeverity.Warning;
    case LspDiagnosticSeverity.Information:
      return MarkerSeverity.Info;
    case LspDiagnosticSeverity.Hint:
      return MarkerSeverity.Hint;
    default:
      return MarkerSeverity.Error;
  }
}

function applyDiagnostics(monaco: Monaco, model: editor.ITextModel, diagnostics: LspDiagnostic[]) {
  const markers: editor.IMarkerData[] = diagnostics.map(d => ({
    severity: lspSeverityToMonaco(d.severity),
    message: d.message,
    source: d.source,
    startLineNumber: d.range.start.line + 1,
    startColumn: d.range.start.character + 1,
    endLineNumber: d.range.end.line + 1,
    endColumn: d.range.end.character + 1,
  }));
  monaco.editor.setModelMarkers(model, MARKER_OWNER, markers);
}

export function createLspProvider(monaco: Monaco): IDisposable {
  const provider: languages.CompletionItemProvider = {
    triggerCharacters: [" ", ".", ",", "\n", "\t"],
    async provideCompletionItems(model, position, _ctx, token) {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      const args = {
        uri: model.uri.toString(),
        text: model.getValue(),
        line: position.lineNumber - 1,
        character: position.column - 1,
      };

      try {
        const items = await invoke<LspCompletionItem[]>("lsp_completion", args);
        if (token.isCancellationRequested) {
          return { suggestions: [], incomplete: true };
        }

        const suggestions = items.map<languages.CompletionItem>(item => {
          const insertText = item.insertText ?? item.label;
          const monacoItem: languages.CompletionItem = {
            label: item.label,
            kind: lspKindToMonaco(item.kind),
            insertText,
            range,
            detail: item.detail,
            documentation: item.documentation,
            sortText: item.sortText,
          };
          if (isSnippet(item.insertTextFormat)) {
            monacoItem.insertTextRules = languages.CompletionItemInsertTextRule.InsertAsSnippet;
          }
          return monacoItem;
        });

        // incomplete:true so Monaco re-queries on every keystroke instead of
        // filtering a cached list — the cursor context can change with every
        // character (alias.| → column.| → expression).
        return { suggestions, incomplete: true };
      } catch (e) {
        console.error("lsp_completion failed", e);
        return { suggestions: [], incomplete: true };
      }
    },
  };
  return monaco.languages.registerCompletionItemProvider("sql", provider);
}

/**
 * Hook the editor's content-change event so the Rust backend's document cache
 * stays in sync. The `lsp_did_change` response carries diagnostics, which are
 * pushed straight into Monaco's model markers. Returns disposables to wire
 * into the editor's onDidDispose.
 */
export function attachLspDocumentSync(
  monaco: Monaco,
  ed: editor.IStandaloneCodeEditor,
): IDisposable[] {
  const subscriptions: IDisposable[] = [];
  const model = ed.getModel();
  if (!model) {
    return subscriptions;
  }

  const uri = model.uri.toString();

  const sync = (text: string) =>
    invoke<LspDiagnostic[]>("lsp_did_change", { uri, text })
      .then(diagnostics => {
        if (model.isDisposed()) {
          return;
        }
        applyDiagnostics(monaco, model, diagnostics);
      })
      .catch(e => {
        console.error("lsp_did_change failed", e);
      });

  void sync(model.getValue());

  let pending: number | null = null;
  const sub = ed.onDidChangeModelContent(() => {
    if (pending !== null) {
      window.clearTimeout(pending);
    }
    pending = window.setTimeout(() => {
      pending = null;
      void sync(model.getValue());
    }, 30);
  });
  subscriptions.push(sub);
  subscriptions.push({
    dispose: () => {
      if (pending !== null) {
        window.clearTimeout(pending);
      }
      if (!model.isDisposed()) {
        monaco.editor.setModelMarkers(model, MARKER_OWNER, []);
      }
    },
  });
  return subscriptions;
}
