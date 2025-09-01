pub mod mysql;
pub mod postgres;

use async_trait::async_trait;
use serde_json::Value;
use std::collections::HashMap;

use crate::import::ImportedData;

/// Trait defining the interface for database operations
#[async_trait]
pub trait Database: Send + Sync {
    /// Execute a query and return results as JSON
    /// The format will be a vector of tuples, where the tuple is in the format of
    /// [column_name, value, column_type]
    async fn get_results(&mut self, query: &str) -> Result<Vec<Value>, String>;

    /// Execute an sql statement and return whatever the statement returns
    #[allow(unused)]
    async fn execute(&mut self, query: &str) -> Result<String, String>;

    /// Get the database schema information
    /// Returns a list of all tables and their columns as well as a list of all references
    /// from each column to each table.column as map, where the key is the column.
    async fn get_schema(
        &mut self,
    ) -> Result<
        (
            HashMap<String, Vec<(String, String)>>,
            HashMap<String, Vec<String>>,
        ),
        String,
    >;

    async fn import_data(&mut self, data: ImportedData) -> Result<(), String>;
}
