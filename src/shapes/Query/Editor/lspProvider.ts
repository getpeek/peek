import { invoke } from "@tauri-apps/api/core";
import type { Monaco } from "@monaco-editor/react";
import { editor, languages, IDisposable } from "monaco-editor";
import { LspCompletionItem } from "./lspTypes";
import { isSnippet, lspKindToMonaco } from "./lspBridge";

export function createLspProvider(monaco: Monaco): IDisposable {
  return monaco.languages.registerCompletionItemProvider("sql", {
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

        const suggestions = items.map<languages.CompletionItem>((item) => {
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
            monacoItem.insertTextRules =
              languages.CompletionItemInsertTextRule.InsertAsSnippet;
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
  });
}

/**
 * Hook the editor's content-change event so the Rust backend's document cache
 * stays in sync. Returns disposables to wire into the editor's onDidDispose.
 */
export function attachLspDocumentSync(ed: editor.IStandaloneCodeEditor): IDisposable[] {
  const subscriptions: IDisposable[] = [];
  const model = ed.getModel();
  if (!model) return subscriptions;

  const uri = model.uri.toString();

  void invoke("lsp_did_change", { uri, text: model.getValue() }).catch((e) => {
    console.error("lsp_did_change (initial) failed", e);
  });

  let pending: number | null = null;
  const sub = ed.onDidChangeModelContent(() => {
    if (pending !== null) window.clearTimeout(pending);
    pending = window.setTimeout(() => {
      pending = null;
      void invoke("lsp_did_change", {
        uri,
        text: model.getValue(),
      }).catch((e) => {
        console.error("lsp_did_change failed", e);
      });
    }, 30);
  });
  subscriptions.push(sub);
  subscriptions.push({
    dispose: () => {
      if (pending !== null) window.clearTimeout(pending);
    },
  });
  return subscriptions;
}

