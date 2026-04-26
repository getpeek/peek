pub mod config;
mod database;
mod database_commands;
mod import;
mod lsp;
mod lsp_commands;
mod storage_commands;

use std::sync::Arc;

use database::{mysql::MysqlDatabase, postgres::PostgresDatabase, Database};
use lsp::{Backend, SchemaIndex};
use parking_lot::RwLock;
use sqlx::Connection;
use tauri::{async_runtime::Mutex, State};

#[derive(Default)]
pub struct AppData {
    connection: Option<Box<dyn Database>>,
}

pub type SchemaCache = Arc<RwLock<SchemaIndex>>;

#[tauri::command]
async fn set_connection(
    state: State<'_, Mutex<AppData>>,
    schema_cache: State<'_, SchemaCache>,
    connection_string: String,
) -> Result<(), String> {
    let mut state = state.lock().await;

    if connection_string.starts_with("postgres://")
        || connection_string.starts_with("postgresql://")
    {
        let connection = sqlx::PgConnection::connect(&connection_string)
            .await
            .map_err(|e| e.to_string())?;
        let db = PostgresDatabase::new(connection);
        state.connection = Some(Box::new(db));
        *schema_cache.write() = SchemaIndex::default();
        return Ok(());
    }
    if connection_string.starts_with("mysql://") || connection_string.starts_with("mariadb://") {
        let db = MysqlDatabase::new(&connection_string);
        state.connection = Some(Box::new(db));
        *schema_cache.write() = SchemaIndex::default();
    }

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let schema_cache: SchemaCache = Arc::new(RwLock::new(SchemaIndex::default()));
    let backend = Arc::new(Backend::new(Arc::clone(&schema_cache)));

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_prevent_default::init())
        .manage(Mutex::new(AppData::default()))
        .manage(schema_cache)
        .manage(backend)
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            database_commands::get_results,
            database_commands::get_schema,
            database_commands::execute_statement,
            database_commands::import_file,
            storage_commands::load,
            storage_commands::save,
            config::get_config,
            lsp_commands::lsp_did_change,
            lsp_commands::lsp_completion,
            set_connection
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
