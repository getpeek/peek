mod postgres;

use tauri::{async_runtime::Mutex, State};

#[derive(Debug, Default)]
struct AppData {
    connection_string: String,
}

#[tauri::command]
async fn set_connection(
    state: State<'_, Mutex<AppData>>,
    connection_string: String,
) -> Result<(), String> {
    let mut state = state.lock().await;

    state.connection_string = connection_string;

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
            postgres::get_results,
            postgres::get_schema,
            set_connection
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
