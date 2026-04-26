use dashmap::DashMap;
use lsp_types::Uri;
use tree_sitter::Tree;

use super::parser::new_parser;

#[derive(Debug)]
pub struct DocumentEntry {
    pub text: String,
    pub tree: Tree,
}

#[derive(Debug, Default)]
pub struct DocumentStore {
    docs: DashMap<Uri, DocumentEntry>,
}

impl DocumentStore {
    #[must_use]
    pub fn new() -> Self {
        Self::default()
    }

    /// Replace the document text and reparse from scratch.
    /// (Phase 1: full reparse on every change. Incremental reparse can be added
    /// later by passing the prior `Tree` and `InputEdit` info to `Parser::parse`.)
    pub fn upsert(&self, uri: Uri, text: String) {
        let mut parser = new_parser();
        let Some(tree) = parser.parse(&text, None) else {
            return;
        };
        self.docs.insert(uri, DocumentEntry { text, tree });
    }

    pub fn with<R>(&self, uri: &Uri, f: impl FnOnce(&DocumentEntry) -> R) -> Option<R> {
        self.docs.get(uri).map(|entry| f(entry.value()))
    }

    #[allow(dead_code)] // wired up via Backend::did_close in a follow-up
    pub fn remove(&self, uri: &Uri) {
        self.docs.remove(uri);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn uri() -> Uri {
        use std::str::FromStr;
        Uri::from_str("peek://query/test").expect("valid uri")
    }

    #[test]
    fn upsert_then_read_back() {
        let store = DocumentStore::new();
        store.upsert(uri(), "select * from users".to_string());
        let root_kind = store
            .with(&uri(), |entry| entry.tree.root_node().kind().to_string())
            .expect("doc exists");
        assert_eq!(root_kind, "program");
    }

    #[test]
    fn upsert_replaces_prior_document() {
        let store = DocumentStore::new();
        store.upsert(uri(), "select 1".to_string());
        store.upsert(uri(), "select 2".to_string());
        let text = store
            .with(&uri(), |entry| entry.text.clone())
            .expect("doc exists");
        assert_eq!(text, "select 2");
    }

    #[test]
    fn remove_deletes() {
        let store = DocumentStore::new();
        store.upsert(uri(), "select 1".to_string());
        store.remove(&uri());
        assert!(store.with(&uri(), |_| ()).is_none());
    }
}
