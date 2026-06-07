#[cfg(test)]
mod _dump_tree;
mod backend;
mod completion;
mod context;
mod diagnostics;
mod documents;
mod parser;
mod position;
mod query_info;
mod schema;
mod scope;

pub use backend::Backend;
pub use query_info::{QueryInfo, analyze as analyze_query};
pub use schema::SchemaIndex;
