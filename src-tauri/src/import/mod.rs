pub mod csv;
mod test;

#[derive(Debug)]
pub struct FileImporter;

#[derive(Debug)]
pub enum ImportType {
    UUID(uuid::Uuid),
    Date(chrono::NaiveDate),
    DateTime(chrono::NaiveDateTime),
    Text(String),
    Number(isize),
    Float(f64),
    Boolean(bool),
}

#[derive(Debug)]
pub struct ImportedData {
    pub table_name: String,
    pub fields: Vec<Vec<(String, ImportType)>>,
}

#[derive(Debug)]
pub enum ImportError {
    FileNotFound,
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

pub fn normalize_table_name(path: &std::path::PathBuf) -> String {
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
