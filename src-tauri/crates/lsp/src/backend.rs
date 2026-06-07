use std::sync::Arc;

use lsp_types::{CompletionItem, Diagnostic, Position, Uri};
use parking_lot::RwLock;

use super::completion::complete;
use super::context::analyze_cursor;
use super::diagnostics::diagnose;
use super::documents::DocumentStore;
use super::position::position_to_byte_offset;
use super::schema::SchemaIndex;
use super::scope::Scope;

#[derive(Debug)]
pub struct Backend {
    schema: Arc<RwLock<SchemaIndex>>,
    documents: DocumentStore,
}

impl Backend {
    #[must_use]
    pub fn new(schema: Arc<RwLock<SchemaIndex>>) -> Self {
        Self {
            schema,
            documents: DocumentStore::new(),
        }
    }

    /// Replace the document text for `uri` and reparse.
    pub fn did_change(&self, uri: Uri, text: String) {
        self.documents.upsert(uri, text);
    }

    #[allow(dead_code)] // wired up in a follow-up when Monaco model disposal is hooked
    pub fn did_close(&self, uri: &Uri) {
        self.documents.remove(uri);
    }

    /// Walk the cached parse tree and report unknown table / column references.
    /// Returns an empty list if the document isn't tracked or the schema is empty.
    #[must_use]
    pub fn diagnostics(&self, uri: &Uri) -> Vec<Diagnostic> {
        let schema = self.schema.read();
        self.documents
            .with(uri, |doc| {
                let source = doc.text.as_bytes();
                let scope = Scope::collect(&doc.tree, source);
                diagnose(&doc.tree, source, &scope, &schema)
            })
            .unwrap_or_default()
    }

    /// Compute completions at the given LSP position. Returns an empty list if
    /// the document isn't tracked yet (the frontend should call `did_change`
    /// first; we don't fall back to fetching DB schema — that's already cached).
    #[must_use]
    pub fn completion(&self, uri: &Uri, position: Position) -> Vec<CompletionItem> {
        let schema = self.schema.read();
        self.documents
            .with(uri, |doc| {
                let source = doc.text.as_bytes();
                let Some(byte_offset) = position_to_byte_offset(&doc.text, position) else {
                    return Vec::new();
                };
                let ctx = analyze_cursor(&doc.tree, source, byte_offset);
                let scope = Scope::collect(&doc.tree, source);
                complete(&ctx, &scope, &schema)
            })
            .unwrap_or_default()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;
    use std::str::FromStr;

    fn fixture_schema() -> SchemaIndex {
        let mut tables = HashMap::new();
        tables.insert(
            "users".to_string(),
            vec![
                ("id".to_string(), "uuid".to_string()),
                ("name".to_string(), "text".to_string()),
            ],
        );
        SchemaIndex::from_raw(tables, HashMap::new(), HashMap::new())
    }

    fn uri() -> Uri {
        Uri::from_str("peek://query/test").unwrap()
    }

    #[test]
    fn completion_after_from_offers_table() {
        let backend = Backend::new(Arc::new(RwLock::new(fixture_schema())));
        backend.did_change(uri(), "select * from ".to_string());
        let items = backend.completion(
            &uri(),
            Position {
                line: 0,
                character: 14,
            },
        );
        assert!(items.iter().any(|i| i.label == "users"));
    }

    #[test]
    fn completion_for_unknown_document_returns_empty() {
        let backend = Backend::new(Arc::new(RwLock::new(fixture_schema())));
        let items = backend.completion(
            &uri(),
            Position {
                line: 0,
                character: 0,
            },
        );
        assert!(items.is_empty());
    }

    #[test]
    fn schema_update_reflects_in_next_completion() {
        let schema = Arc::new(RwLock::new(SchemaIndex::default()));
        let backend = Backend::new(Arc::clone(&schema));
        backend.did_change(uri(), "select * from ".to_string());

        // initially empty schema: no `users` table suggested. Continuation
        // keywords may still appear; we only care that the schema update
        // surfaces the new table on the next call.
        let before = backend.completion(
            &uri(),
            Position {
                line: 0,
                character: 14,
            },
        );
        assert!(before.iter().all(|i| i.label != "users"));

        // schema arrives
        *schema.write() = fixture_schema();
        let after = backend.completion(
            &uri(),
            Position {
                line: 0,
                character: 14,
            },
        );
        assert!(after.iter().any(|i| i.label == "users"));
    }
}
