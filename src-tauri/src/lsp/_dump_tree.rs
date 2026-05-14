#![cfg(test)]

use super::parser::new_parser;

fn dump(source: &str) {
    let mut parser = new_parser();
    let tree = parser.parse(source, None).unwrap();
    println!("---- {source}");
    print_node(tree.root_node(), source.as_bytes(), 0);
}

fn print_node(node: tree_sitter::Node, source: &[u8], depth: usize) {
    let indent = "  ".repeat(depth);
    let text = node
        .utf8_text(source)
        .unwrap_or("?")
        .lines()
        .next()
        .unwrap_or("");
    let truncated = if text.len() > 30 {
        format!("{}…", &text[..30])
    } else {
        text.to_string()
    };
    println!(
        "{indent}{kind} [{r0}:{c0}-{r1}:{c1}] {truncated:?}",
        kind = node.kind(),
        r0 = node.start_position().row,
        c0 = node.start_position().column,
        r1 = node.end_position().row,
        c1 = node.end_position().column,
    );
    let mut cursor = node.walk();
    for (i, child) in node.children(&mut cursor).enumerate() {
        let field_name = node
            .field_name_for_child(i.try_into().unwrap())
            .unwrap_or("");
        if !field_name.is_empty() {
            println!("{indent}  (field={field_name})");
        }
        print_node(child, source, depth + 1);
    }
}

#[test]
fn dump_select_with_alias() {
    dump("select u.id from users u");
}

#[test]
fn dump_join_with_aliases() {
    dump("select * from users u inner join organisations o on u.organisation_id = o.id");
}

#[test]
fn dump_update_set() {
    dump("update users set name = 'foo'");
}

#[test]
fn dump_partial_select_after_from() {
    dump("select * from ");
}

#[test]
fn dump_partial_dot() {
    dump("select u. from users u");
}

#[test]
fn dump_join_on_partial() {
    dump("select * from users u inner join organisations o on ");
}
