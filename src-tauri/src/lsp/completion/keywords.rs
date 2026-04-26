use lsp_types::{CompletionItem, CompletionItemKind};

/// Keywords offered when the cursor is at `StatementStart` (scenario 7).
pub const LEADING_KEYWORDS: &[&str] = &[
    "SELECT",
    "INSERT INTO",
    "UPDATE",
    "DELETE FROM",
    "WITH",
    "EXPLAIN",
];

#[must_use]
pub fn leading_keyword_items() -> Vec<CompletionItem> {
    LEADING_KEYWORDS
        .iter()
        .map(|kw| CompletionItem {
            label: (*kw).to_string(),
            kind: Some(CompletionItemKind::KEYWORD),
            insert_text: Some((*kw).to_string()),
            ..Default::default()
        })
        .collect()
}
