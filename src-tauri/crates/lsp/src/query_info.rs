use serde::Serialize;
use tree_sitter::Node;

use super::parser::new_parser;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum StatementType {
    Select,
    Insert,
    Update,
    Delete,
    Other,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TableRef {
    pub name: String,
    pub alias: Option<String>,
    pub is_joined: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct QueryInfo {
    pub statement_type: StatementType,
    pub tables: Vec<TableRef>,
}

impl QueryInfo {
    fn empty() -> Self {
        Self {
            statement_type: StatementType::Other,
            tables: Vec::new(),
        }
    }
}

#[must_use]
pub fn analyze(query: &str) -> QueryInfo {
    let mut parser = new_parser();
    let Some(tree) = parser.parse(query, None) else {
        return QueryInfo::empty();
    };
    let source = query.as_bytes();
    let root = tree.root_node();
    let statement_type = detect_statement_type(root);
    let mut tables = Vec::new();
    collect_tables(root, source, &mut tables);
    QueryInfo {
        statement_type,
        tables,
    }
}

fn first_statement(node: Node<'_>) -> Option<Node<'_>> {
    if node.kind() == "statement" {
        return Some(node);
    }
    let mut cursor = node.walk();
    for child in node.children(&mut cursor) {
        if let Some(found) = first_statement(child) {
            return Some(found);
        }
    }
    None
}

fn detect_statement_type(root: Node<'_>) -> StatementType {
    let Some(stmt) = first_statement(root) else {
        return StatementType::Other;
    };
    let mut cursor = stmt.walk();
    for child in stmt.children(&mut cursor) {
        match child.kind() {
            "select" => return StatementType::Select,
            "insert" => return StatementType::Insert,
            "update" => return StatementType::Update,
            "delete" => return StatementType::Delete,
            _ => {}
        }
    }
    StatementType::Other
}

fn collect_tables(node: Node<'_>, source: &[u8], out: &mut Vec<TableRef>) {
    match node.kind() {
        "relation" => {
            if let Some(rel) = table_ref_from_relation(node, source) {
                out.push(rel);
            }
        }
        // The grammar wraps SELECT/UPDATE table refs in a `relation` node, but
        // `DELETE FROM users` places the `object_reference` directly under `from`
        // with no wrapper. Catch the bare case so DELETE statements report their
        // target table.
        "object_reference" => {
            if let Some(parent) = node.parent()
                && parent.kind() == "from"
                && let Some(rel) = table_ref_from_object_reference(node, source)
            {
                out.push(rel);
            }
        }
        _ => {}
    }
    let mut cursor = node.walk();
    for child in node.children(&mut cursor) {
        collect_tables(child, source, out);
    }
}

fn table_ref_from_relation(node: Node<'_>, source: &[u8]) -> Option<TableRef> {
    let object_ref = node
        .children(&mut node.walk())
        .find(|c| c.kind() == "object_reference")?;
    let name_node = object_ref.child_by_field_name("name")?;
    let name = name_node.utf8_text(source).ok()?.to_string();
    let alias = node
        .child_by_field_name("alias")
        .and_then(|n| n.utf8_text(source).ok())
        .map(str::to_string);
    let is_joined = has_join_ancestor(node);
    Some(TableRef {
        name,
        alias,
        is_joined,
    })
}

fn table_ref_from_object_reference(node: Node<'_>, source: &[u8]) -> Option<TableRef> {
    let name_node = node.child_by_field_name("name")?;
    let name = name_node.utf8_text(source).ok()?.to_string();
    Some(TableRef {
        name,
        alias: None,
        is_joined: has_join_ancestor(node),
    })
}

fn has_join_ancestor(node: Node<'_>) -> bool {
    let mut current = node.parent();
    while let Some(parent) = current {
        if parent.kind() == "join" {
            return true;
        }
        current = parent.parent();
    }
    false
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn empty_query_is_other_with_no_tables() {
        let info = analyze("");
        assert_eq!(info.statement_type, StatementType::Other);
        assert!(info.tables.is_empty());
    }

    #[test]
    fn simple_select_one_table() {
        let info = analyze("select * from users");
        assert_eq!(info.statement_type, StatementType::Select);
        assert_eq!(info.tables.len(), 1);
        assert_eq!(info.tables[0].name, "users");
        assert_eq!(info.tables[0].alias, None);
        assert!(!info.tables[0].is_joined);
    }

    #[test]
    fn select_with_alias() {
        let info = analyze("select * from users u");
        assert_eq!(info.statement_type, StatementType::Select);
        assert_eq!(info.tables[0].alias.as_deref(), Some("u"));
        assert!(!info.tables[0].is_joined);
    }

    #[test]
    fn select_with_join_marks_second_table_joined() {
        let info =
            analyze("select * from users u inner join organisations o on u.organisation_id = o.id");
        assert_eq!(info.statement_type, StatementType::Select);
        assert_eq!(info.tables.len(), 2);
        assert_eq!(info.tables[0].name, "users");
        assert!(!info.tables[0].is_joined);
        assert_eq!(info.tables[1].name, "organisations");
        assert!(info.tables[1].is_joined);
    }

    #[test]
    fn update_statement() {
        let info = analyze("update users set name = 'foo'");
        assert_eq!(info.statement_type, StatementType::Update);
        assert_eq!(info.tables.len(), 1);
        assert_eq!(info.tables[0].name, "users");
        assert!(!info.tables[0].is_joined);
    }

    #[test]
    fn delete_statement() {
        let info = analyze("delete from users where id = 1");
        assert_eq!(info.statement_type, StatementType::Delete);
        assert_eq!(info.tables.len(), 1);
        assert_eq!(info.tables[0].name, "users");
    }

    #[test]
    fn insert_statement() {
        let info = analyze("insert into users (name) values ('a')");
        assert_eq!(info.statement_type, StatementType::Insert);
    }

    #[test]
    fn malformed_query_returns_partial_info() {
        let info = analyze("select * from ");
        assert_eq!(info.statement_type, StatementType::Select);
        assert!(info.tables.is_empty());
    }

    #[test]
    fn serializes_with_camel_case() {
        let info = QueryInfo {
            statement_type: StatementType::Select,
            tables: vec![TableRef {
                name: "users".to_string(),
                alias: Some("u".to_string()),
                is_joined: false,
            }],
        };
        let json = serde_json::to_string(&info).expect("serialize");
        assert!(json.contains("\"statementType\":\"select\""));
        assert!(json.contains("\"isJoined\":false"));
    }
}
