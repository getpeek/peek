use lsp_types::{CompletionItem, CompletionItemKind, InsertTextFormat};

use crate::lsp::schema::SchemaIndex;
use crate::lsp::scope::Relation;

/// For a JOIN predicate context like `JOIN organisations o ON <cur>`, find a
/// foreign-key pair between the right relation and any left relation. Returns
/// a snippet completion `<lalias>.<lcol> = <ralias>.<rcol>`.
#[must_use]
pub fn infer_join_predicate(
    left: &[Relation],
    right: &Relation,
    schema: &SchemaIndex,
) -> Option<CompletionItem> {
    for l in left {
        if let Some((left_col, right_col)) = schema.fk_between(&l.table, &right.table) {
            // determine which column belongs to which side
            // fk_between(left_table, right_table) returns (left_col, right_col) — already correct
            let l_owned: String = left_col;
            let r_owned: String = right_col;
            let snippet = format!("{}.{} = {}.{}", l.name(), l_owned, right.name(), r_owned);
            return Some(CompletionItem {
                label: snippet.clone(),
                kind: Some(CompletionItemKind::SNIPPET),
                insert_text: Some(snippet),
                insert_text_format: Some(InsertTextFormat::PLAIN_TEXT),
                detail: Some(format!(
                    "Foreign key: {}.{} = {}.{}",
                    l.table, l_owned, right.table, r_owned
                )),
                ..Default::default()
            });
        }
    }
    None
}
