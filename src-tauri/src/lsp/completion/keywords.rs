use lsp_types::{CompletionItem, CompletionItemKind};

/// Top-level statement kickoff keywords offered when the cursor is at
/// `StatementStart` (empty buffer or just after `;`).
pub const LEADING_KEYWORDS: &[&str] = &[
    "select",
    "insert into",
    "update",
    "delete from",
    "with",
    "explain",
];

/// Offered alongside in-scope columns inside a SELECT projection list.
pub const SELECT_LIST_KEYWORDS: &[&str] = &["distinct", "*", "as"];

/// Boolean operators offered inside a WHERE clause.
pub const WHERE_OPERATORS: &[&str] = &[
    "and",
    "or",
    "not",
    "is null",
    "is not null",
    "in",
    "not in",
    "like",
    "not like",
    "between",
    "exists",
];

/// Boolean operators offered inside a `JOIN ... ON` predicate.
pub const JOIN_ON_OPERATORS: &[&str] = &["and", "or"];

/// Continuation keywords offered at `General` positions and merged into
/// other contexts (Table, TableForJoin, Column-without-qualifier) so the
/// editor's prefix filter can pick them up while the user is mid-typing
/// e.g. `where` after a table name or `from` after the select list.
pub const GENERAL_CLAUSE_KEYWORDS: &[&str] = &[
    "from",
    "where",
    "inner join",
    "left join",
    "right join",
    "full outer join",
    "cross join",
    "join",
    "on",
    "as",
    "group by",
    "order by",
    "having",
    "limit",
    "offset",
    "union",
    "union all",
    "intersect",
    "except",
];

#[must_use]
pub fn leading_keyword_items() -> Vec<CompletionItem> {
    keyword_items(LEADING_KEYWORDS)
}

#[must_use]
pub fn select_list_keyword_items() -> Vec<CompletionItem> {
    keyword_items(SELECT_LIST_KEYWORDS)
}

#[must_use]
pub fn where_operator_items() -> Vec<CompletionItem> {
    keyword_items(WHERE_OPERATORS)
}

#[must_use]
pub fn join_on_operator_items() -> Vec<CompletionItem> {
    keyword_items(JOIN_ON_OPERATORS)
}

#[must_use]
pub fn general_clause_keyword_items() -> Vec<CompletionItem> {
    keyword_items(GENERAL_CLAUSE_KEYWORDS)
}

fn keyword_items(slice: &[&str]) -> Vec<CompletionItem> {
    slice
        .iter()
        .map(|kw| CompletionItem {
            label: (*kw).to_string(),
            kind: Some(CompletionItemKind::KEYWORD),
            insert_text: Some((*kw).to_string()),
            ..Default::default()
        })
        .collect()
}
