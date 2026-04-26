import { languages } from "monaco-editor";
import {
  LspCompletionItemKind,
  LspCompletionItemKindValue,
  LspInsertTextFormat,
} from "./lspTypes";

const KIND_MAP: Record<LspCompletionItemKindValue, languages.CompletionItemKind> = {
  [LspCompletionItemKind.Text]: languages.CompletionItemKind.Text,
  [LspCompletionItemKind.Method]: languages.CompletionItemKind.Method,
  [LspCompletionItemKind.Function]: languages.CompletionItemKind.Function,
  [LspCompletionItemKind.Constructor]: languages.CompletionItemKind.Constructor,
  [LspCompletionItemKind.Field]: languages.CompletionItemKind.Field,
  [LspCompletionItemKind.Variable]: languages.CompletionItemKind.Variable,
  [LspCompletionItemKind.Class]: languages.CompletionItemKind.Class,
  [LspCompletionItemKind.Interface]: languages.CompletionItemKind.Interface,
  [LspCompletionItemKind.Module]: languages.CompletionItemKind.Module,
  [LspCompletionItemKind.Property]: languages.CompletionItemKind.Property,
  [LspCompletionItemKind.Unit]: languages.CompletionItemKind.Unit,
  [LspCompletionItemKind.Value]: languages.CompletionItemKind.Value,
  [LspCompletionItemKind.Enum]: languages.CompletionItemKind.Enum,
  [LspCompletionItemKind.Keyword]: languages.CompletionItemKind.Keyword,
  [LspCompletionItemKind.Snippet]: languages.CompletionItemKind.Snippet,
  [LspCompletionItemKind.Color]: languages.CompletionItemKind.Color,
  [LspCompletionItemKind.File]: languages.CompletionItemKind.File,
  [LspCompletionItemKind.Reference]: languages.CompletionItemKind.Reference,
  [LspCompletionItemKind.Folder]: languages.CompletionItemKind.Folder,
  [LspCompletionItemKind.EnumMember]: languages.CompletionItemKind.EnumMember,
  [LspCompletionItemKind.Constant]: languages.CompletionItemKind.Constant,
  [LspCompletionItemKind.Struct]: languages.CompletionItemKind.Struct,
  [LspCompletionItemKind.Event]: languages.CompletionItemKind.Event,
  [LspCompletionItemKind.Operator]: languages.CompletionItemKind.Operator,
  [LspCompletionItemKind.TypeParameter]: languages.CompletionItemKind.TypeParameter,
};

export function lspKindToMonaco(
  kind: LspCompletionItemKindValue | undefined,
): languages.CompletionItemKind {
  if (kind === undefined) return languages.CompletionItemKind.Text;
  return KIND_MAP[kind] ?? languages.CompletionItemKind.Text;
}

export function isSnippet(format: number | undefined): boolean {
  return format === LspInsertTextFormat.Snippet;
}
