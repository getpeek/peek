use std::collections::HashMap;
use std::str::FromStr;
use std::sync::Arc;

use lsp_types::{CompletionItem, Diagnostic, Position, Uri};
use tauri::State;

use crate::lsp::{Backend, SchemaIndex};
use crate::SchemaCache;

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

/// Replace the LSP's schema cache from a pre-built payload, without touching
/// any DB connection. Used by joiners in a multiplayer session: they have no
/// local DB to introspect, so the host pushes its `schema/index` over the
/// iroh-doc and the JS sync bridge calls this to feed the LSP backend the
/// same `SchemaIndex` shape that `database_commands::get_schema` would have
/// produced. The payload shape mirrors the JSON returned by `get_schema`
/// (`primaryKeys` camelCase from the JS side maps to `primary_keys` here via
/// Tauri's default arg renaming).
#[tauri::command]
pub fn lsp_set_schema_cache(
    schema_cache: State<'_, SchemaCache>,
    tables: HashMap<String, Vec<(String, String)>>,
    references: HashMap<String, Vec<String>>,
    primary_keys: HashMap<String, Vec<String>>,
) -> Result<(), String> {
    *schema_cache.write() = SchemaIndex::from_raw(tables, references, primary_keys);
    Ok(())
}

/// Drop the LSP's schema cache. Called by joiners on session end so stale
/// host-schema entries don't keep firing diagnostics against tables that
/// don't exist in the joiner's local DB (or no DB at all).
#[tauri::command]
pub fn lsp_clear_schema_cache(schema_cache: State<'_, SchemaCache>) -> Result<(), String> {
    *schema_cache.write() = SchemaIndex::default();
    Ok(())
}
