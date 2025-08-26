pub mod config;
mod database;
mod database_commands;

use database::{mysql::MysqlDatabase, postgres::PostgresDatabase, Database};
use sqlx::Connection;
use tauri::{async_runtime::Mutex, State};

pub struct AppData {
    connection: Option<Box<dyn Database>>,
}

impl Default for AppData {
    fn default() -> Self {
        Self { connection: None }
    }
}

#[tauri::command]
async fn set_connection(
    state: State<'_, Mutex<AppData>>,
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
        return Ok(());
    }
    if connection_string.starts_with("mysql://") || connection_string.starts_with("mariadb://") {
        let db = MysqlDatabase::new(&connection_string);
        state.connection = Some(Box::new(db));
    }

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_prevent_default::init())
        .manage(Mutex::new(AppData::default()))
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            database_commands::get_results,
            database_commands::get_schema,
            database_commands::import_csv,
            config::get_workspaces,
            set_connection
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
