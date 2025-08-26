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
    let mut reader = csv::Reader::from_reader(csv.as_bytes());

    let columns = reader
        .headers()
        .map_err(|_| String::from("could not parse csv"))?
        .iter()
        .map(|header| format!("{header} TEXT"))
        .collect::<Vec<_>>()
        .join(",");

    let values = reader
        .records()
        .into_iter()
        .filter_map(|record| {
            if let Ok(record) = record {
                let values = record
                    .iter()
                    .map(|value| format!("'{value}'"))
                    .collect::<Vec<_>>()
                    .join(",");
                Some(format!("({values})"))
            } else {
                None
            }
        })
        .collect::<Vec<_>>()
        .join(",");

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
