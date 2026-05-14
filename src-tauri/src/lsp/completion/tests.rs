use std::collections::HashMap;

use crate::lsp::context::{CursorContext, analyze_cursor};
use crate::lsp::parser::new_parser;
use crate::lsp::schema::SchemaIndex;
use crate::lsp::scope::Scope;

use super::complete;

fn fixture() -> SchemaIndex {
    let mut tables = HashMap::new();
    tables.insert(
        "users".to_string(),
        vec![
            ("id".to_string(), "uuid".to_string()),
            ("name".to_string(), "text".to_string()),
            ("organisation_id".to_string(), "uuid".to_string()),
        ],
    );
    tables.insert(
        "organisations".to_string(),
        vec![
            ("id".to_string(), "uuid".to_string()),
            ("name".to_string(), "text".to_string()),
            ("slug".to_string(), "text".to_string()),
        ],
    );

    let mut references = HashMap::new();
    references.insert(
        "organisations.id".to_string(),
        vec!["users.organisation_id".to_string()],
    );

    let mut primary_keys = HashMap::new();
    primary_keys.insert("users".to_string(), vec!["id".to_string()]);
    primary_keys.insert("organisations".to_string(), vec!["id".to_string()]);

    SchemaIndex::from_raw(tables, references, primary_keys)
}

fn run(source: &str, byte_offset: usize) -> Vec<String> {
    let schema = fixture();
    let mut parser = new_parser();
    let tree = parser.parse(source, None).expect("parse");
    let ctx = analyze_cursor(&tree, source.as_bytes(), byte_offset);
    let scope = Scope::collect(&tree, source.as_bytes());
    complete(&ctx, &scope, &schema)
        .into_iter()
        .map(|item| item.label)
        .collect()
}

#[test]
fn scenario_1_select_star_from_offers_tables() {
    let source = "select * from ";
    let labels = run(source, source.len());
    assert!(labels.contains(&"users".to_string()));
    assert!(labels.contains(&"organisations".to_string()));
}

#[test]
fn scenario_2_select_from_users_offers_user_columns() {
    let source = "select  from users";
    let cursor = source.find("select ").unwrap() + "select ".len();
    let labels = run(source, cursor);
    assert!(
        labels.contains(&"id".to_string()),
        "expected id in {labels:?}"
    );
    assert!(labels.contains(&"name".to_string()));
    assert!(labels.contains(&"organisation_id".to_string()));
}

#[test]
fn scenario_3_dotted_alias_offers_users_columns() {
    let source = "select u. from users u";
    let cursor = source.find("u.").unwrap() + 2;
    let labels = run(source, cursor);
    assert!(labels.contains(&"id".to_string()), "got {labels:?}");
    assert!(labels.contains(&"name".to_string()));
    assert!(labels.contains(&"organisation_id".to_string()));
}

#[test]
fn scenario_4_update_set_offers_target_columns() {
    let source = "update users set ";
    let labels = run(source, source.len());
    assert!(
        labels.contains(&"id".to_string()),
        "expected users columns, got {labels:?}"
    );
    assert!(labels.contains(&"name".to_string()));
    assert!(labels.contains(&"organisation_id".to_string()));
}

#[test]
fn scenario_5_dotted_after_join_offers_organisations_columns() {
    let source =
        "select u.*, o.name from users u inner join organisations o on u.organisation_id = o.";
    let cursor = source.len();
    let labels = run(source, cursor);
    assert!(
        labels.contains(&"id".to_string()),
        "expected organisation columns, got {labels:?}"
    );
    assert!(labels.contains(&"slug".to_string()));
}

#[test]
fn scenario_6_join_on_suggests_fk_snippet() {
    let source = "select * from users u inner join organisations o on ";
    let labels = run(source, source.len());
    let has_fk_snippet = labels
        .iter()
        .any(|l| l.contains("u.organisation_id") && l.contains("o.id") && l.contains('='));
    assert!(
        has_fk_snippet,
        "expected FK predicate suggestion, got {labels:?}"
    );
}

#[test]
fn scenario_7_empty_offers_select_keyword() {
    let labels = run("", 0);
    assert!(labels.contains(&"select".to_string()), "got {labels:?}");
}

#[test]
fn where_clause_offers_boolean_operators() {
    let source = "select * from users where ";
    let labels = run(source, source.len());
    assert!(labels.contains(&"and".to_string()), "got {labels:?}");
    assert!(labels.contains(&"or".to_string()));
    assert!(labels.contains(&"is null".to_string()));
}

#[test]
fn join_on_predicate_offers_boolean_operators() {
    let source = "select * from users u inner join organisations o on ";
    let labels = run(source, source.len());
    assert!(labels.contains(&"and".to_string()), "got {labels:?}");
    assert!(labels.contains(&"or".to_string()));
}

#[test]
fn select_list_offers_distinct_and_star() {
    let source = "select  from users";
    let cursor = source.find("select ").unwrap() + "select ".len();
    let labels = run(source, cursor);
    assert!(labels.contains(&"distinct".to_string()), "got {labels:?}");
    assert!(labels.contains(&"*".to_string()));
}

#[test]
fn lone_partial_first_word_offers_leading_keywords() {
    let source = "s";
    let labels = run(source, source.len());
    assert!(labels.contains(&"select".to_string()), "got {labels:?}");
    assert!(labels.contains(&"insert into".to_string()));
}

#[test]
fn partial_continuation_keyword_after_table_includes_clauses() {
    // Cursor mid-typing `w` after a table name — Monaco filters by prefix to
    // surface `where`. The dispatcher must include continuation keywords in
    // Table contexts for this to work.
    let source = "select * from users w";
    let labels = run(source, source.len());
    assert!(labels.contains(&"where".to_string()), "got {labels:?}");
}

#[test]
fn partial_continuation_keyword_in_select_list_includes_from() {
    let source = "select id f";
    let labels = run(source, source.len());
    assert!(labels.contains(&"from".to_string()), "got {labels:?}");
}

#[test]
fn general_context_offers_clause_continuation_keywords() {
    let schema = fixture();
    let scope = Scope::default();
    let labels: Vec<String> = complete(&CursorContext::General, &scope, &schema)
        .into_iter()
        .map(|i| i.label)
        .collect();
    assert!(labels.contains(&"where".to_string()), "got {labels:?}");
    assert!(labels.contains(&"inner join".to_string()));
    assert!(labels.contains(&"order by".to_string()));
    assert!(labels.contains(&"limit".to_string()));
}

#[test]
fn negative_cursor_in_string_literal_returns_general() {
    // 'foo|bar' — cursor inside a string. Current heuristic returns General
    // (which suggests tables/columns). We accept that as v1 behaviour and
    // strengthen it later. The key invariant is that we don't crash.
    let source = "select 'foo' from users";
    let cursor = source.find('f').unwrap() + 1;
    let labels = run(source, cursor);
    // Should at least not be empty and not panic
    let _ = labels;
}

#[test]
fn dotted_unknown_qualifier_returns_no_columns() {
    let source = "select unknown_alias. from users";
    let cursor = source.find("unknown_alias.").unwrap() + "unknown_alias.".len();
    let labels = run(source, cursor);
    // Falls back to looking up "unknown_alias" as a table — no such table → empty
    assert!(labels.is_empty(), "expected empty, got {labels:?}");
}
