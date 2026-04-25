use crate::{import::FileImporter, AppData};
use tauri::{async_runtime::Mutex, State};

#[tauri::command]
pub async fn get_schema(state: State<'_, Mutex<AppData>>) -> Result<String, String> {
    let mut state = state.lock().await;

    let Some(connection) = state.connection.as_mut() else {
        return Err("error getting connection".to_string());
    };

    let (tables, references, primary_keys) = connection.get_schema().await?;

    let full_schema = serde_json::json!({
        "tables": tables,
        "references": references,
        "primaryKeys": primary_keys,
    });

    serde_json::to_string(&full_schema).map_err(|_| "JSON serialization failed".to_string())
}

#[tauri::command]
pub async fn execute_statement(
    state: State<'_, Mutex<AppData>>,
    query: String,
) -> Result<String, String> {
    let mut state = state.lock().await;

    let Some(connection) = state.connection.as_mut() else {
        return Err("error getting connection".to_string());
    };

    connection.execute(&query).await
}

#[tauri::command]
pub async fn get_results(
    state: State<'_, Mutex<AppData>>,
    query: String,
) -> Result<String, String> {
    let mut state = state.lock().await;

    let Some(connection) = state.connection.as_mut() else {
        return Err("error getting connection".to_string());
    };

    let results = connection.get_results(&query).await?;

    serde_json::to_string(&results).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn import_file(state: State<'_, Mutex<AppData>>, path: String) -> Result<String, String> {
    let mut state = state.lock().await;

    let file_path = std::path::Path::new(&path);
    let extension = file_path
        .extension()
        .and_then(|p| p.to_str())
        .unwrap_or("unknown");

    let Ok(imported_data) = (match extension {
        "csv" => FileImporter::csv(file_path.to_path_buf()),
        "json" => FileImporter::json(file_path.to_path_buf()),
        _ => return Err(format!("Unknown file format {extension}")),
    }) else {
        return Err("could not parse input data".to_string());
    };

    let Some(connection) = state.connection.as_mut() else {
        return Err("error getting connection".to_string());
    };

    let table_name = imported_data.table_name.clone();

    connection.import_data(imported_data).await.ok();
    Ok(table_name)
}
