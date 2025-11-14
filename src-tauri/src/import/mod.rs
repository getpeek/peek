use serde_json::Value;

pub mod csv;
pub mod json;
mod test;

#[derive(Debug)]
pub struct FileImporter;

#[derive(Debug)]
pub enum ImportType {
    #[allow(unused)]
    Uuid(uuid::Uuid),
    Date(chrono::NaiveDate),
    DateTime(chrono::NaiveDateTime),
    Text(String),
    Number(isize),
    Float(f64),
    Boolean(bool),
    Null,
    Json(Value),
}

#[derive(Debug)]
pub struct ImportedData {
    pub table_name: String,
    pub fields: Vec<Vec<(String, ImportType)>>,
}

#[derive(Debug)]
pub enum ImportError {
    FileNotFound,
    #[allow(unused)]
    UnknownFormat,
    BadData,
}

pub fn normalize_column_name(name: impl std::fmt::Display) -> String {
    name.to_string()
        .to_ascii_lowercase()
        .replace(" ", "_")
        .chars()
        .filter(|c| c.is_ascii_lowercase() || c == &'_')
        .collect()
}

pub fn normalize_table_name(path: &std::path::Path) -> String {
    path.file_stem()
        .and_then(|name| name.to_str())
        .unwrap_or("table_name")
        .to_ascii_lowercase()
        .replace(" ", "_")
        .replace("-", "_")
        .chars()
        .filter(|c| c.is_ascii_lowercase() || c == &'_')
        .collect()
}
