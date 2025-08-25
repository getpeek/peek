use tauri::{async_runtime::Mutex, State};

use crate::AppData;

#[tauri::command]
pub async fn get_schema(state: State<'_, Mutex<AppData>>) -> Result<String, String> {
    let mut state = state.lock().await;

    let Some(connection) = state.connection.as_mut() else {
        return Err("error getting connection".to_string());
    };

    let (tables, references) = connection.get_schema().await?;

    let full_schema = serde_json::json!({
        "tables": tables,
        "references": references,
    });

    serde_json::to_string(&full_schema).map_err(|_| "JSON serialization failed".to_string())
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
pub async fn import_csv(
    state: State<'_, Mutex<AppData>>,
    table_name: String,
    csv: String,
) -> Result<String, String> {
    let columns = csv
        .lines()
        .nth(0)
        .unwrap_or_default()
        .split(",")
        .map(|col| format!("{col} TEXT"))
        .collect::<Vec<_>>()
        .join(", ");

    let values = csv
        .lines()
        .skip(1)
        .filter(|line| !line.is_empty())
        .map(|line| {
            let row = line
                .split(",")
                .map(|cell| format!("'{}'", cell.trim()))
                .collect::<Vec<_>>()
                .join(",");

            format!("({row})")
        })
        .collect::<Vec<String>>()
        .join(", ");

    let mut state = state.lock().await;

    let Some(connection) = state.connection.as_mut() else {
        return Err("error getting connection".to_string());
    };

    connection
        .execute(format!("CREATE TEMP TABLE IF NOT EXISTS {table_name} ({columns})").as_str())
        .await?;
    connection
        .execute(format!("INSERT INTO {table_name} VALUES {values}").as_str())
        .await?;

    Ok(format!("data imported into {table_name}"))
}
