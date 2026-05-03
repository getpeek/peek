use tree_sitter::{Node, Tree};

use super::parser::new_parser;

/// A relation in scope: a table with an optional alias.
/// `name` is the identifier the user can type to refer to the relation —
/// the alias if present, otherwise the table name.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Relation {
    pub table: String,
    pub alias: Option<String>,
}

impl Relation {
    #[must_use]
    pub fn name(&self) -> &str {
        self.alias.as_deref().unwrap_or(&self.table)
    }
}

#[derive(Debug, Clone, Default)]
pub struct Scope {
    pub relations: Vec<Relation>,
}

impl Scope {
    /// Collect every relation reachable from the root: anything inside
    /// `from`, `join`, `update`, or `delete (from ...)`. This is the v1 scope
    /// — flat across the whole document. CTEs and subqueries are deferred to v2.
    ///
    /// When the primary parse is broken near the cursor (common: `u.|`), tree-sitter
    /// can fail to produce any `relation` nodes. We retry once with a sentinel
    /// inserted at every dangling dot, which gives the parser something to chew on.
    #[must_use]
    pub fn collect(tree: &Tree, source: &[u8]) -> Self {
        let mut relations = Vec::new();
        walk(tree.root_node(), source, &mut relations);
        if relations.is_empty() {
            relations = collect_with_sentinel(source);
        }
        Self { relations }
    }

    #[must_use]
    pub fn resolve(&self, name: &str) -> Option<&Relation> {
        self.relations.iter().find(|r| r.name() == name)
    }
}

fn walk(node: Node<'_>, source: &[u8], out: &mut Vec<Relation>) {
    if node.kind() == "relation"
        && let Some(rel) = relation_from_node(node, source)
    {
        out.push(rel);
    }
    let mut cursor = node.walk();
    for child in node.children(&mut cursor) {
        walk(child, source, out);
    }
}

fn collect_with_sentinel(source: &[u8]) -> Vec<Relation> {
    let Ok(text) = std::str::from_utf8(source) else {
        return Vec::new();
    };
    // Replace any "<ident>." not followed by an identifier character with
    // "<ident>.X " so tree-sitter sees a complete dotted reference.
    let mut patched = String::with_capacity(text.len() + 8);
    let mut chars = text.char_indices().peekable();
    while let Some((_, c)) = chars.next() {
        patched.push(c);
        if c == '.' {
            let next_is_ident = chars
                .peek()
                .is_some_and(|(_, nc)| nc.is_ascii_alphanumeric() || *nc == '_');
            if !next_is_ident {
                patched.push_str("X ");
            }
        }
    }
    if patched == text {
        return Vec::new();
    }
    let mut parser = new_parser();
    let Some(tree) = parser.parse(&patched, None) else {
        return Vec::new();
    };
    let mut relations = Vec::new();
    walk(tree.root_node(), patched.as_bytes(), &mut relations);
    relations
}

fn relation_from_node(node: Node<'_>, source: &[u8]) -> Option<Relation> {
    let object_ref = node
        .children(&mut node.walk())
        .find(|c| c.kind() == "object_reference")?;
    let name_node = object_ref.child_by_field_name("name")?;
    let table = name_node.utf8_text(source).ok()?.to_string();

    let alias = node
        .child_by_field_name("alias")
        .and_then(|n| n.utf8_text(source).ok())
        .map(str::to_string);

    Some(Relation { table, alias })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::lsp::parser::new_parser;

    fn scope_for(source: &str) -> Scope {
        let mut parser = new_parser();
        let tree = parser.parse(source, None).expect("parse");
        Scope::collect(&tree, source.as_bytes())
    }

    #[test]
    fn empty_query_has_no_relations() {
        assert!(scope_for("").relations.is_empty());
    }

    #[test]
    fn from_with_alias() {
        let scope = scope_for("select * from users u");
        assert_eq!(
            scope.relations,
            vec![Relation {
                table: "users".to_string(),
                alias: Some("u".to_string())
            }]
        );
    }

    #[test]
    fn from_without_alias() {
        let scope = scope_for("select * from users");
        assert_eq!(
            scope.relations,
            vec![Relation {
                table: "users".to_string(),
                alias: None
            }]
        );
    }

    #[test]
    fn from_and_join_with_aliases() {
        let scope = scope_for(
            "select * from users u inner join organisations o on u.organisation_id = o.id",
        );
        assert_eq!(scope.relations.len(), 2);
        assert_eq!(scope.relations[0].table, "users");
        assert_eq!(scope.relations[0].alias, Some("u".to_string()));
        assert_eq!(scope.relations[1].table, "organisations");
        assert_eq!(scope.relations[1].alias, Some("o".to_string()));
    }

    #[test]
    fn update_target_is_in_scope() {
        let scope = scope_for("update users set name = 'foo'");
        assert_eq!(scope.relations.len(), 1);
        assert_eq!(scope.relations[0].table, "users");
    }

    #[test]
    fn resolve_alias_returns_relation() {
        let scope = scope_for("select * from users u");
        let r = scope.resolve("u").expect("u resolves");
        assert_eq!(r.table, "users");
    }

    #[test]
    fn resolve_unaliased_table_by_name() {
        let scope = scope_for("select * from users");
        let r = scope.resolve("users").expect("users resolves");
        assert_eq!(r.table, "users");
        assert!(r.alias.is_none());
    }
}
