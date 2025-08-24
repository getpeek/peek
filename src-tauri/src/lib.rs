mod database;
mod database_commands;

use tauri::{async_runtime::Mutex, State};

#[derive(Debug)]
pub enum DatabaseType {
    PostgreSQL,
    MySQL,
    Unknown,
}

impl Default for DatabaseType {
    fn default() -> Self {
        DatabaseType::Unknown
    }
}

#[derive(Debug, Default)]
pub struct AppData {
    pub connection_string: String,
    pub database_type: DatabaseType,
}

#[tauri::command]
async fn set_connection(
    state: State<'_, Mutex<AppData>>,
    connection_string: String,
) -> Result<(), String> {
    let mut state = state.lock().await;

    // Detect database type from connection string
    let database_type = if connection_string.starts_with("postgres://")
        || connection_string.starts_with("postgresql://")
    {
        DatabaseType::PostgreSQL
    } else if connection_string.starts_with("mysql://")
        || connection_string.starts_with("mariadb://")
    {
        DatabaseType::MySQL
    } else {
        DatabaseType::Unknown
    };

    state.connection_string = connection_string;
    state.database_type = database_type;

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
            set_connection
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
