use tree_sitter::{Language, Parser};
use tree_sitter_language::LanguageFn;

// Audited FFI boundary to the vendored tree-sitter SQL grammar compiled in
// build.rs. The symbol and its ABI are fixed by tree-sitter-language; the only
// `unsafe` in this crate.
#[allow(unsafe_code)]
unsafe extern "C" {
    fn tree_sitter_sql() -> *const ();
}

#[allow(unsafe_code)]
const LANGUAGE_FN: LanguageFn = unsafe { LanguageFn::from_raw(tree_sitter_sql) };

#[must_use]
pub(crate) fn sql_language() -> Language {
    Language::new(LANGUAGE_FN)
}

#[must_use]
pub(crate) fn new_parser() -> Parser {
    let mut parser = Parser::new();
    parser
        .set_language(&sql_language())
        .expect("tree-sitter-sql grammar ABI should match the tree-sitter crate");
    parser
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_a_select_statement() {
        let mut parser = new_parser();
        let tree = parser
            .parse("select * from users", None)
            .expect("parse should succeed");
        let root = tree.root_node();
        assert!(!root.has_error(), "tree should have no errors: {root:?}");
    }

    #[test]
    fn parses_with_join() {
        let mut parser = new_parser();
        let tree = parser
            .parse(
                "select u.id from users u inner join orders o on u.id = o.user_id",
                None,
            )
            .expect("parse should succeed");
        assert!(!tree.root_node().has_error());
    }

    #[test]
    fn parses_partial_input_with_error_nodes() {
        let mut parser = new_parser();
        let tree = parser.parse("select * from ", None).expect("parse");
        // partial parse should still produce a tree, even if it has errors
        assert!(tree.root_node().child_count() > 0);
    }
}
