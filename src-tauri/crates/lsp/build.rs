fn main() {
    let grammar_dir = std::path::PathBuf::from("vendored/tree-sitter-sql/src");

    cc::Build::new()
        .include(&grammar_dir)
        .file(grammar_dir.join("parser.c"))
        .file(grammar_dir.join("scanner.c"))
        .flag_if_supported("-Wno-unused-but-set-variable")
        .flag_if_supported("-Wno-unused-parameter")
        .flag_if_supported("-Wno-trigraphs")
        .compile("tree_sitter_sql_grammar");

    println!("cargo:rerun-if-changed=vendored/tree-sitter-sql/src/parser.c");
    println!("cargo:rerun-if-changed=vendored/tree-sitter-sql/src/scanner.c");
}
