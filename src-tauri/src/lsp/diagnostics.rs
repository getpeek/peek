use std::collections::HashSet;

use lsp_types::{Diagnostic, DiagnosticSeverity, Position, Range};
use tree_sitter::{Node, Tree};

use super::schema::SchemaIndex;
use super::scope::Scope;

/// Walk the tree and report unknown table / column references against `schema`.
/// Returns an empty vec when the schema is empty (still loading) so the user
/// doesn't see a sea of red on first connect.
#[must_use]
pub fn diagnose(
    tree: &Tree,
    source: &[u8],
    scope: &Scope,
    schema: &SchemaIndex,
) -> Vec<Diagnostic> {
    if schema.tables.is_empty() {
        return Vec::new();
    }
    let aliases = collect_select_aliases(tree.root_node(), source);
    let mut out = Vec::new();
    walk(tree.root_node(), source, scope, schema, &aliases, &mut out);
    out
}

fn walk(
    node: Node<'_>,
    source: &[u8],
    scope: &Scope,
    schema: &SchemaIndex,
    aliases: &HashSet<String>,
    out: &mut Vec<Diagnostic>,
) {
    if matches!(node.kind(), "string" | "comment" | "marginalia") {
        return;
    }
    // ERROR / missing nodes mean the parser couldn't make sense of this region;
    // anything inferred from it would be noisy.
    if node.is_error() || node.is_missing() {
        return;
    }

    match node.kind() {
        "relation" => check_relation(node, source, schema, out),
        "field" => check_field(node, source, scope, schema, aliases, out),
        _ => {}
    }

    let mut cursor = node.walk();
    for child in node.children(&mut cursor) {
        walk(child, source, scope, schema, aliases, out);
    }
}

fn check_relation(
    relation: Node<'_>,
    source: &[u8],
    schema: &SchemaIndex,
    out: &mut Vec<Diagnostic>,
) {
    let Some(name_node) = relation_name_node(relation) else {
        return;
    };
    let name = node_text(name_node, source);
    if name.is_empty() || schema.has_table(name) {
        return;
    }
    out.push(make_diag(name_node, format!("Unknown table '{name}'")));
}

fn check_field(
    field: Node<'_>,
    source: &[u8],
    scope: &Scope,
    schema: &SchemaIndex,
    aliases: &HashSet<String>,
    out: &mut Vec<Diagnostic>,
) {
    let Some(name_node) = field.child_by_field_name("name") else {
        return;
    };
    let column = node_text(name_node, source);
    if column.is_empty() || column == "*" {
        return;
    }
    // `@name` is a Peek variable, not a column — handled by the variable provider.
    if column.starts_with('@') {
        return;
    }

    let qualifier_ref = field
        .children(&mut field.walk())
        .find(|c| c.kind() == "object_reference");
    if let Some(qual_ref) = qualifier_ref {
        check_qualified_field(qual_ref, name_node, column, source, scope, schema, out);
    } else {
        check_unqualified_field(field, name_node, column, scope, schema, aliases, out);
    }
}

fn check_qualified_field(
    qual_ref: Node<'_>,
    name_node: Node<'_>,
    column: &str,
    source: &[u8],
    scope: &Scope,
    schema: &SchemaIndex,
    out: &mut Vec<Diagnostic>,
) {
    let Some(qual_name_node) = qual_ref.child_by_field_name("name") else {
        return;
    };
    let qual = node_text(qual_name_node, source);
    if qual.is_empty() {
        return;
    }

    let Some(rel) = scope.resolve(qual) else {
        out.push(make_diag(
            qual_name_node,
            format!("Unknown alias or table '{qual}'"),
        ));
        return;
    };

    // If the resolved table is unknown to the schema, the relation-level
    // diagnostic already flags it — don't double up here.
    let Some(cols) = schema.columns_of(&rel.table) else {
        return;
    };
    if !cols.iter().any(|c| c.name == column) {
        out.push(make_diag(
            name_node,
            format!("Unknown column '{column}' on {}", rel.table),
        ));
    }
}

fn check_unqualified_field(
    field: Node<'_>,
    name_node: Node<'_>,
    column: &str,
    scope: &Scope,
    schema: &SchemaIndex,
    aliases: &HashSet<String>,
    out: &mut Vec<Diagnostic>,
) {
    if scope.relations.is_empty() {
        return;
    }
    let mut any_known_table = false;
    for rel in &scope.relations {
        let Some(cols) = schema.columns_of(&rel.table) else {
            continue;
        };
        any_known_table = true;
        if cols.iter().any(|c| c.name == column) {
            return;
        }
    }
    if !any_known_table {
        return;
    }
    // SELECT-list aliases are valid references in GROUP BY / ORDER BY / HAVING.
    if aliases.contains(column) && in_alias_clause(field) {
        return;
    }
    out.push(make_diag(name_node, format!("Unknown column '{column}'")));
}

fn in_alias_clause(node: Node<'_>) -> bool {
    let mut current = node.parent();
    while let Some(n) = current {
        if matches!(n.kind(), "order_by" | "group_by" | "having") {
            return true;
        }
        current = n.parent();
    }
    false
}

fn collect_select_aliases(root: Node<'_>, source: &[u8]) -> HashSet<String> {
    let mut out = HashSet::new();
    walk_aliases(root, source, &mut out);
    out
}

fn walk_aliases(node: Node<'_>, source: &[u8], out: &mut HashSet<String>) {
    if node.kind() == "term"
        && let Some(alias_node) = node.child_by_field_name("alias")
    {
        let alias = node_text(alias_node, source);
        if !alias.is_empty() {
            out.insert(alias.to_string());
        }
    }
    let mut cursor = node.walk();
    for child in node.children(&mut cursor) {
        walk_aliases(child, source, out);
    }
}

fn relation_name_node(relation: Node<'_>) -> Option<Node<'_>> {
    let object_ref = relation
        .children(&mut relation.walk())
        .find(|c| c.kind() == "object_reference")?;
    object_ref.child_by_field_name("name")
}

fn node_text<'a>(node: Node<'_>, source: &'a [u8]) -> &'a str {
    node.utf8_text(source).unwrap_or("")
}

fn make_diag(node: Node<'_>, message: String) -> Diagnostic {
    let start = node.start_position();
    let end = node.end_position();
    Diagnostic {
        range: Range {
            start: Position {
                line: u32::try_from(start.row).unwrap_or(u32::MAX),
                character: u32::try_from(start.column).unwrap_or(u32::MAX),
            },
            end: Position {
                line: u32::try_from(end.row).unwrap_or(u32::MAX),
                character: u32::try_from(end.column).unwrap_or(u32::MAX),
            },
        },
        severity: Some(DiagnosticSeverity::ERROR),
        source: Some("peek-sql".to_string()),
        message,
        ..Default::default()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::lsp::parser::new_parser;
    use std::collections::HashMap;

    fn fixture_schema() -> SchemaIndex {
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
            "orders".to_string(),
            vec![
                ("id".to_string(), "uuid".to_string()),
                ("user_id".to_string(), "uuid".to_string()),
                ("total".to_string(), "numeric".to_string()),
            ],
        );
        SchemaIndex::from_raw(tables, HashMap::new(), HashMap::new())
    }

    fn diagnose_for(source: &str, schema: &SchemaIndex) -> Vec<Diagnostic> {
        let mut parser = new_parser();
        let tree = parser.parse(source, None).expect("parse");
        let scope = Scope::collect(&tree, source.as_bytes());
        diagnose(&tree, source.as_bytes(), &scope, schema)
    }

    #[test]
    fn empty_schema_short_circuits() {
        let schema = SchemaIndex::default();
        let diags = diagnose_for("select * from foosers", &schema);
        assert!(diags.is_empty());
    }

    #[test]
    fn unknown_table_in_from_is_flagged() {
        let schema = fixture_schema();
        let diags = diagnose_for("select * from foosers", &schema);
        assert_eq!(diags.len(), 1);
        assert!(diags[0].message.contains("foosers"));
        assert_eq!(diags[0].severity, Some(DiagnosticSeverity::ERROR));
        // Range should cover just "foosers" — chars 14..21
        assert_eq!(diags[0].range.start.character, 14);
        assert_eq!(diags[0].range.end.character, 21);
    }

    #[test]
    fn known_table_yields_no_diagnostics() {
        let schema = fixture_schema();
        let diags = diagnose_for("select id, name from users", &schema);
        assert!(diags.is_empty(), "expected none, got {diags:?}");
    }

    #[test]
    fn unknown_qualified_column_is_flagged() {
        let schema = fixture_schema();
        let diags = diagnose_for("select u.naem from users u", &schema);
        assert_eq!(diags.len(), 1);
        assert!(diags[0].message.contains("naem"));
        assert!(diags[0].message.contains("users"));
    }

    #[test]
    fn unknown_qualifier_is_flagged() {
        let schema = fixture_schema();
        let diags = diagnose_for("select x.id from users u", &schema);
        assert_eq!(diags.len(), 1);
        assert!(diags[0].message.contains("'x'"));
    }

    #[test]
    fn unknown_unqualified_column_is_flagged() {
        let schema = fixture_schema();
        let diags = diagnose_for("select naem from users", &schema);
        assert_eq!(diags.len(), 1);
        assert!(diags[0].message.contains("naem"));
    }

    #[test]
    fn unqualified_column_present_on_one_of_multiple_in_scope_is_ok() {
        let schema = fixture_schema();
        // `total` is on orders, `id` is on both — both unqualified, both legit.
        let diags = diagnose_for(
            "select id, total from users u inner join orders o on u.id = o.user_id",
            &schema,
        );
        assert!(diags.is_empty(), "expected none, got {diags:?}");
    }

    #[test]
    fn string_literal_is_not_flagged() {
        let schema = fixture_schema();
        let diags = diagnose_for("select 'foosers' from users", &schema);
        assert!(diags.is_empty(), "expected none, got {diags:?}");
    }

    #[test]
    fn comment_is_not_flagged() {
        let schema = fixture_schema();
        let diags = diagnose_for("-- foosers naem\nselect id from users", &schema);
        assert!(diags.is_empty(), "expected none, got {diags:?}");
    }

    #[test]
    fn star_is_not_flagged() {
        let schema = fixture_schema();
        let diags = diagnose_for("select u.* from users u", &schema);
        assert!(diags.is_empty(), "expected none, got {diags:?}");
    }

    #[test]
    fn unqualified_with_no_from_is_not_flagged() {
        let schema = fixture_schema();
        // No FROM means nothing to compare against — silent rather than noisy.
        let diags = diagnose_for("select naem", &schema);
        assert!(diags.is_empty(), "expected none, got {diags:?}");
    }

    #[test]
    fn unqualified_when_only_unknown_table_in_scope_is_not_flagged() {
        let schema = fixture_schema();
        // foosers isn't in schema; the table-level diagnostic fires, but the
        // column shouldn't double-up since we don't know what it has.
        let diags = diagnose_for("select naem from foosers", &schema);
        assert_eq!(diags.len(), 1);
        assert!(diags[0].message.contains("foosers"));
    }

    #[test]
    fn update_set_unknown_column_is_flagged() {
        let schema = fixture_schema();
        let diags = diagnose_for("update users set naem = 'x'", &schema);
        assert_eq!(diags.len(), 1);
        assert!(diags[0].message.contains("naem"));
    }

    #[test]
    fn peek_variable_reference_is_not_flagged() {
        let schema = fixture_schema();
        let diags = diagnose_for("select * from users where id = @foo", &schema);
        assert!(diags.is_empty(), "expected none, got {diags:?}");
    }

    #[test]
    fn peek_variable_in_select_is_not_flagged() {
        let schema = fixture_schema();
        let diags = diagnose_for("select @foo from users", &schema);
        assert!(diags.is_empty(), "expected none, got {diags:?}");
    }

    #[test]
    fn select_alias_in_order_by_is_allowed() {
        let schema = fixture_schema();
        let diags = diagnose_for(
            "select name as full_name from users order by full_name",
            &schema,
        );
        assert!(diags.is_empty(), "expected none, got {diags:?}");
    }

    #[test]
    fn select_alias_in_group_by_is_allowed() {
        let schema = fixture_schema();
        let diags = diagnose_for(
            "select name as full_name, count(*) from users group by full_name",
            &schema,
        );
        assert!(diags.is_empty(), "expected none, got {diags:?}");
    }

    #[test]
    fn unknown_column_in_order_by_is_still_flagged() {
        let schema = fixture_schema();
        let diags = diagnose_for("select id from users order by naem", &schema);
        assert_eq!(diags.len(), 1);
        assert!(diags[0].message.contains("naem"));
    }

    #[test]
    fn alias_outside_alias_clause_is_still_flagged() {
        let schema = fixture_schema();
        // Aliases aren't valid in WHERE in standard SQL — keep flagging them.
        let diags = diagnose_for(
            "select name as full_name from users where full_name = 'x'",
            &schema,
        );
        assert_eq!(diags.len(), 1);
        assert!(diags[0].message.contains("full_name"));
    }

    #[test]
    fn join_unknown_table_is_flagged() {
        let schema = fixture_schema();
        let diags = diagnose_for(
            "select * from users u inner join foozers o on u.id = o.user_id",
            &schema,
        );
        assert!(diags.iter().any(|d| d.message.contains("foozers")));
    }
}
