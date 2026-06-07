mod fk_inference;
mod keywords;
#[cfg(test)]
mod tests;

use lsp_types::{CompletionItem, CompletionItemKind};

use super::context::CursorContext;
use super::schema::{Column, SchemaIndex};
use super::scope::{Relation, Scope};

#[must_use]
pub(crate) fn complete(
    ctx: &CursorContext,
    scope: &Scope,
    schema: &SchemaIndex,
) -> Vec<CompletionItem> {
    match ctx {
        CursorContext::StatementStart => keywords::leading_keyword_items(),
        CursorContext::Table | CursorContext::TableForJoin => {
            let mut items = table_items(schema);
            // The cursor here sits where a table name is expected, but the
            // user may also be starting a continuation keyword (e.g. typing
            // "w" to begin "where" after `from users`). The editor filters
            // by prefix; tables and keywords coexist without conflict.
            items.extend(keywords::general_clause_keyword_items());
            items
        }
        CursorContext::Column { qualifier: Some(q) } => {
            let table = scope.resolve(q).map_or(q.as_str(), |r| r.table.as_str());
            column_items_for_table(table, schema)
        }
        CursorContext::Column { qualifier: None } => {
            let mut items = in_scope_items(scope, schema);
            items.extend(keywords::select_list_keyword_items());
            items.extend(keywords::general_clause_keyword_items());
            items
        }
        CursorContext::WhereClause => {
            let mut items = in_scope_items(scope, schema);
            items.extend(keywords::where_operator_items());
            items
        }
        CursorContext::UpdateSet { table } => column_items_for_table(table, schema),
        CursorContext::JoinOnPredicate => {
            let mut items = join_on_items(scope, schema);
            items.extend(keywords::join_on_operator_items());
            items
        }
        CursorContext::General => {
            let mut items = general_items(scope, schema);
            items.extend(keywords::general_clause_keyword_items());
            items
        }
    }
}

fn table_items(schema: &SchemaIndex) -> Vec<CompletionItem> {
    let mut items: Vec<CompletionItem> = schema
        .tables
        .keys()
        .map(|name| CompletionItem {
            label: name.clone(),
            kind: Some(CompletionItemKind::CLASS),
            insert_text: Some(name.clone()),
            detail: Some("table".to_string()),
            ..Default::default()
        })
        .collect();
    items.sort_by(|a, b| a.label.cmp(&b.label));
    items
}

fn column_items_for_table(table: &str, schema: &SchemaIndex) -> Vec<CompletionItem> {
    let Some(columns) = schema.columns_of(table) else {
        return Vec::new();
    };
    columns.iter().map(|c| column_to_item(table, c)).collect()
}

fn column_to_item(table: &str, col: &Column) -> CompletionItem {
    CompletionItem {
        label: col.name.clone(),
        kind: Some(CompletionItemKind::FIELD),
        insert_text: Some(col.name.clone()),
        detail: Some(format!("{}.{} : {}", table, col.name, col.data_type)),
        ..Default::default()
    }
}

fn in_scope_items(scope: &Scope, schema: &SchemaIndex) -> Vec<CompletionItem> {
    let mut items = Vec::new();
    let mut seen_columns = Vec::new();

    for relation in &scope.relations {
        if let Some(alias) = &relation.alias {
            items.push(CompletionItem {
                label: alias.clone(),
                kind: Some(CompletionItemKind::VARIABLE),
                insert_text: Some(alias.clone()),
                detail: Some(format!("alias for {}", relation.table)),
                ..Default::default()
            });
        }
        if let Some(columns) = schema.columns_of(&relation.table) {
            for col in columns {
                if !seen_columns.contains(&col.name) {
                    seen_columns.push(col.name.clone());
                    items.push(column_to_item(&relation.table, col));
                }
            }
        }
    }

    if scope.relations.is_empty() {
        // No relations resolved (e.g. typing in a fresh editor before FROM exists)
        // — fall back to all columns from all tables. Less useful, but better
        // than empty.
        for (table, columns) in &schema.tables {
            for col in columns {
                if !seen_columns.contains(&col.name) {
                    seen_columns.push(col.name.clone());
                    items.push(column_to_item(table, col));
                }
            }
        }
    }

    items
}

fn join_on_items(scope: &Scope, schema: &SchemaIndex) -> Vec<CompletionItem> {
    let mut items = Vec::new();

    if let Some((left, right)) = split_left_right(&scope.relations)
        && let Some(snippet) = fk_inference::infer_join_predicate(left, right, schema)
    {
        items.push(snippet);
    }

    items.extend(in_scope_items(scope, schema));
    items
}

fn split_left_right(relations: &[Relation]) -> Option<(&[Relation], &Relation)> {
    let (right, left) = relations.split_last()?;
    Some((left, right))
}

fn general_items(scope: &Scope, schema: &SchemaIndex) -> Vec<CompletionItem> {
    let mut items = table_items(schema);
    items.extend(in_scope_items(scope, schema));
    items
}
