use std::str::FromStr;
use std::sync::Arc;

use lsp_types::{CompletionItem, Diagnostic, Position, Uri};
use tauri::State;

use crate::lsp::Backend;

#[tauri::command]
pub fn lsp_did_change(
    backend: State<'_, Arc<Backend>>,
    uri: String,
    text: String,
) -> Result<Vec<Diagnostic>, String> {
    let parsed = Uri::from_str(&uri).map_err(|e| e.to_string())?;
    backend.did_change(parsed.clone(), text);
    Ok(backend.diagnostics(&parsed))
}

#[tauri::command]
pub fn lsp_completion(
    backend: State<'_, Arc<Backend>>,
    uri: String,
    text: Option<String>,
    line: u32,
    character: u32,
) -> Result<Vec<CompletionItem>, String> {
    let parsed = Uri::from_str(&uri).map_err(|e| e.to_string())?;
    if let Some(text) = text {
        backend.did_change(parsed.clone(), text);
    }
    let position = Position { line, character };
    Ok(backend.completion(&parsed, position))
}
