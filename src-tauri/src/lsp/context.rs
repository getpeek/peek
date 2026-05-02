use tree_sitter::{Node, Tree, TreeCursor};

/// What the cursor is "looking at" — used by the completion module to pick a
/// strategy. This enum is the v1 surface; v2 adds CTE and subquery scopes.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum CursorContext {
    /// Cursor at the very start of the document (or after a `;` with no other
    /// tokens). Suggest leading SQL keywords.
    StatementStart,
    /// Cursor where a table name is expected (after `FROM`, `UPDATE`,
    /// `INSERT INTO`, `DELETE FROM`).
    Table,
    /// Cursor where a JOIN target is expected (after `INNER JOIN`, `LEFT JOIN`, etc.).
    TableForJoin,
    /// Cursor where a column is expected. If `qualifier` is set, the cursor is
    /// after `qualifier.` and only that relation's columns are valid.
    Column { qualifier: Option<String> },
    /// Cursor inside `UPDATE <table> SET <cur>` — column for the target table.
    UpdateSet { table: String },
    /// Cursor inside the `ON` predicate of a JOIN, at a position where an FK
    /// pair could be suggested.
    JoinOnPredicate,
    /// Cursor inside a `WHERE` clause — generic in-scope columns.
    WhereClause,
    /// Anywhere else — generic suggestions (tables + columns).
    General,
}

#[must_use]
pub fn analyze_cursor(tree: &Tree, source: &[u8], byte_offset: usize) -> CursorContext {
    if is_in_string_or_comment(tree.root_node(), byte_offset) {
        return CursorContext::General; // suppress completions in strings/comments
    }

    let preceding = preceding_text(source, byte_offset);

    if preceding.trim().is_empty() {
        return CursorContext::StatementStart;
    }

    if let Some(qualifier) = qualifier_before_dot(preceding) {
        return CursorContext::Column {
            qualifier: Some(qualifier),
        };
    }

    if let Some(ctx) = clause_keyword_before_cursor(preceding) {
        return ctx;
    }

    // A buffer holding only a partial identifier (e.g. `s`, `  sele`) is the
    // user mid-typing their first keyword — still effectively `StatementStart`,
    // and we want to surface SELECT/INSERT/UPDATE/etc. for prefix filtering.
    if is_only_partial_identifier(preceding) {
        return CursorContext::StatementStart;
    }

    let node = deepest_named_node_at(tree.root_node(), byte_offset);
    if let Some(ctx) = ancestor_context(node, source) {
        return ctx;
    }

    CursorContext::General
}

fn is_only_partial_identifier(preceding: &str) -> bool {
    let trimmed = preceding.trim();
    !trimmed.is_empty()
        && trimmed
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '_')
}

/// Look at the byte slice `..byte_offset` and return only the part on the same
/// statement (i.e. after the most recent `;`). This is the textual fallback
/// used to detect `FROM`, `JOIN`, `WHERE`, `ON`, and `UPDATE…SET` keywords
/// when the tree-sitter tree alone doesn't give us a clean answer (which is
/// the common case mid-typing).
fn preceding_text(source: &[u8], byte_offset: usize) -> &str {
    let prefix = std::str::from_utf8(&source[..byte_offset.min(source.len())]).unwrap_or("");
    if let Some(idx) = prefix.rfind(';') {
        &prefix[idx + 1..]
    } else {
        prefix
    }
}

/// `users u` followed by `.` — returns `"u"`. Empty alias returns None.
fn qualifier_before_dot(text: &str) -> Option<String> {
    let bytes = text.as_bytes();
    if !bytes.last().is_some_and(|b| *b == b'.') {
        return None;
    }
    let before_dot = &bytes[..bytes.len() - 1];
    let mut end = before_dot.len();
    while end > 0
        && (before_dot[end - 1].is_ascii_alphanumeric() || before_dot[end - 1] == b'_')
    {
        end -= 1;
    }
    if end == before_dot.len() {
        return None;
    }
    let ident = std::str::from_utf8(&before_dot[end..]).ok()?;
    if ident.is_empty() {
        None
    } else {
        Some(ident.to_string())
    }
}

/// Match leading-keyword patterns that strongly imply a context: `FROM <cur>`,
/// `JOIN <cur>`, `JOIN x ON <cur>`, `WHERE <cur>`, `UPDATE x SET <cur>`.
/// Returns the matched context, or `None` if no keyword pattern fits.
fn clause_keyword_before_cursor(preceding: &str) -> Option<CursorContext> {
    let trimmed = preceding.trim_end();
    let upper = trimmed.to_ascii_uppercase();

    if ends_with_keyword(&upper, "FROM") || ends_with_keyword(&upper, "INSERT INTO")
        || ends_with_keyword(&upper, "DELETE FROM")
        || ends_with_keyword(&upper, "UPDATE")
    {
        return Some(CursorContext::Table);
    }

    if ends_with_keyword(&upper, "JOIN") {
        return Some(CursorContext::TableForJoin);
    }

    if ends_with_keyword(&upper, "WHERE")
        || ends_with_keyword(&upper, "AND")
        || ends_with_keyword(&upper, "OR")
    {
        if has_keyword_after(trimmed, "WHERE") {
            return Some(CursorContext::WhereClause);
        }
        if has_keyword_after(trimmed, " ON ") {
            return Some(CursorContext::JoinOnPredicate);
        }
    }

    if ends_with_keyword(&upper, "ON") && has_keyword_after(trimmed, "JOIN") {
        return Some(CursorContext::JoinOnPredicate);
    }

    if let Some(table) = update_set_target(trimmed) {
        return Some(CursorContext::UpdateSet { table });
    }

    if ends_with_keyword(&upper, "SELECT") {
        return Some(CursorContext::Column { qualifier: None });
    }

    None
}

fn ends_with_keyword(upper: &str, keyword: &str) -> bool {
    if !upper.ends_with(keyword) {
        return false;
    }
    let before = &upper[..upper.len() - keyword.len()];
    if before.is_empty() {
        return true;
    }
    let last = before.bytes().next_back().unwrap_or(b' ');
    !last.is_ascii_alphanumeric() && last != b'_'
}

fn has_keyword_after(haystack: &str, needle: &str) -> bool {
    let upper_hay = haystack.to_ascii_uppercase();
    let upper_needle = needle.to_ascii_uppercase();
    upper_hay.contains(&upper_needle)
}

/// Returns Some(table) if `trimmed` matches `... UPDATE <table> [<alias>] SET`
/// up to the end of the string. The cursor is right after `SET`.
fn update_set_target(trimmed: &str) -> Option<String> {
    let upper = trimmed.to_ascii_uppercase();
    let set_idx = upper.rfind("SET")?;
    if !trimmed[set_idx + 3..].trim().is_empty() {
        return None;
    }
    let update_idx = upper[..set_idx].rfind("UPDATE")?;
    let after_update = &trimmed[update_idx + 6..set_idx];
    let table = after_update
        .split_whitespace()
        .find(|w| !w.eq_ignore_ascii_case("only"))?
        .to_string();
    if is_simple_identifier(&table) {
        Some(table)
    } else {
        None
    }
}

fn is_simple_identifier(s: &str) -> bool {
    let mut chars = s.chars();
    let Some(first) = chars.next() else {
        return false;
    };
    if !(first.is_ascii_alphabetic() || first == '_') {
        return false;
    }
    chars.all(|c| c.is_ascii_alphanumeric() || c == '_')
}

fn is_in_string_or_comment(root: Node<'_>, byte_offset: usize) -> bool {
    let mut current = root;
    loop {
        if matches!(current.kind(), "string" | "comment" | "marginalia")
            && current.start_byte() < byte_offset
            && byte_offset < current.end_byte()
        {
            return true;
        }
        let mut next = None;
        let mut walk = current.walk();
        for child in current.children(&mut walk) {
            if child.start_byte() <= byte_offset && byte_offset <= child.end_byte() {
                next = Some(child);
                break;
            }
        }
        match next {
            Some(child) => current = child,
            None => return false,
        }
    }
}

fn deepest_named_node_at(root: Node<'_>, byte_offset: usize) -> Node<'_> {
    let mut cursor = root.walk();
    descend(&mut cursor, byte_offset);
    cursor.node()
}

fn descend(cursor: &mut TreeCursor<'_>, byte_offset: usize) {
    loop {
        let node = cursor.node();
        if !cursor.goto_first_child() {
            return;
        }
        let mut found = false;
        loop {
            let child = cursor.node();
            if child.start_byte() <= byte_offset && byte_offset <= child.end_byte() {
                found = true;
                break;
            }
            if !cursor.goto_next_sibling() {
                break;
            }
        }
        if !found {
            cursor.goto_parent();
            // back to `node`
            let _ = node;
            return;
        }
    }
}

fn ancestor_context(node: Node<'_>, source: &[u8]) -> Option<CursorContext> {
    let mut current = Some(node);
    while let Some(n) = current {
        match n.kind() {
            "field" => {
                if let Some(qualifier) = field_qualifier(n, source) {
                    return Some(CursorContext::Column {
                        qualifier: Some(qualifier),
                    });
                }
                return Some(CursorContext::Column { qualifier: None });
            }
            "where" => return Some(CursorContext::WhereClause),
            "from" => return Some(CursorContext::Table),
            "join" => {
                if has_on_keyword(n) {
                    return Some(CursorContext::JoinOnPredicate);
                }
                return Some(CursorContext::TableForJoin);
            }
            "select_expression" | "select" => {
                return Some(CursorContext::Column { qualifier: None });
            }
            "set" | "assignment" => {
                if let Some(table) = update_target_for(n, source) {
                    return Some(CursorContext::UpdateSet { table });
                }
            }
            _ => {}
        }
        current = n.parent();
    }
    None
}

fn field_qualifier(field_node: Node<'_>, source: &[u8]) -> Option<String> {
    let qualifier = field_node
        .children(&mut field_node.walk())
        .find(|c| c.kind() == "object_reference")?;
    let name = qualifier.child_by_field_name("name")?;
    name.utf8_text(source).ok().map(str::to_string)
}

fn has_on_keyword(join_node: Node<'_>) -> bool {
    join_node
        .children(&mut join_node.walk())
        .any(|c| c.kind() == "keyword_on")
}

fn update_target_for(node: Node<'_>, source: &[u8]) -> Option<String> {
    // Walk up to the `update` statement, then find its `relation`'s table name.
    let mut current = Some(node);
    while let Some(n) = current {
        if n.kind() == "update" {
            let relation = n.children(&mut n.walk()).find(|c| c.kind() == "relation")?;
            let object_ref = relation
                .children(&mut relation.walk())
                .find(|c| c.kind() == "object_reference")?;
            let name = object_ref.child_by_field_name("name")?;
            return name.utf8_text(source).ok().map(str::to_string);
        }
        current = n.parent();
    }
    None
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::lsp::parser::new_parser;

    fn analyze(source: &str, byte_offset: usize) -> CursorContext {
        let mut parser = new_parser();
        let tree = parser.parse(source, None).expect("parse");
        analyze_cursor(&tree, source.as_bytes(), byte_offset)
    }

    #[test]
    fn empty_string_is_statement_start() {
        assert_eq!(analyze("", 0), CursorContext::StatementStart);
    }

    #[test]
    fn cursor_after_select_is_column() {
        let source = "select ";
        let ctx = analyze(source, source.len());
        assert!(matches!(ctx, CursorContext::Column { qualifier: None }));
    }

    #[test]
    fn cursor_after_from_is_table() {
        let source = "select * from ";
        assert_eq!(analyze(source, source.len()), CursorContext::Table);
    }

    #[test]
    fn cursor_after_join_is_table_for_join() {
        let source = "select * from users u inner join ";
        assert_eq!(analyze(source, source.len()), CursorContext::TableForJoin);
    }

    #[test]
    fn cursor_after_join_on_is_join_predicate() {
        let source = "select * from users u inner join organisations o on ";
        assert_eq!(
            analyze(source, source.len()),
            CursorContext::JoinOnPredicate
        );
    }

    #[test]
    fn cursor_after_where_is_where_clause() {
        let source = "select * from users where ";
        assert_eq!(analyze(source, source.len()), CursorContext::WhereClause);
    }

    #[test]
    fn cursor_after_dot_is_qualified_column() {
        let source = "select u. from users u";
        // cursor right after the dot
        let offset = source.find("u.").unwrap() + 2;
        assert_eq!(
            analyze(source, offset),
            CursorContext::Column {
                qualifier: Some("u".to_string())
            }
        );
    }

    #[test]
    fn cursor_after_update_set_is_update_set() {
        let source = "update users set ";
        assert_eq!(
            analyze(source, source.len()),
            CursorContext::UpdateSet {
                table: "users".to_string()
            }
        );
    }

    #[test]
    fn cursor_after_insert_into_is_table() {
        let source = "insert into ";
        assert_eq!(analyze(source, source.len()), CursorContext::Table);
    }

    #[test]
    fn cursor_after_delete_from_is_table() {
        let source = "delete from ";
        assert_eq!(analyze(source, source.len()), CursorContext::Table);
    }
}
