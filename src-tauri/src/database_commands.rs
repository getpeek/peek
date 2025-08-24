use tauri::{async_runtime::Mutex, State};

use crate::database::{mysql::MysqlDatabase, postgres::PostgresDatabase, Database};
use crate::{AppData, DatabaseType};

#[tauri::command]
pub async fn get_schema(state: State<'_, Mutex<AppData>>) -> Result<String, String> {
    let state = state.lock().await;

    let (tables, references) = match state.database_type {
        DatabaseType::PostgreSQL => {
            let db = PostgresDatabase::new(&state.connection_string);
            db.get_schema().await?
        }
        DatabaseType::MySQL => {
            let db = MysqlDatabase::new(&state.connection_string);
            db.get_schema().await?
        }
        DatabaseType::Unknown => {
            return Err("Unknown database type. Please set a valid connection string.".to_string())
        }
    };

    let full_schema = serde_json::json!({
        "tables": tables,
        "references": references,
    });

    serde_json::to_string(&full_schema).map_err(|_| "JSON serialization failed".to_string())
}

#[tauri::command]
pub async fn import_csv(
    state: State<'_, Mutex<AppData>>,
    table_name: String,
    csv: String,
) -> Result<String, String> {
    let state = state.lock().await;

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

    println!("CREATE TEMP TABLE {table_name} ({columns})");

    match state.database_type {
        DatabaseType::PostgreSQL => {
            let db = PostgresDatabase::new(&state.connection_string);
            db.execute(format!("CREATE TEMP TABLE {table_name} ({columns})").as_str())
                .await
                .unwrap();

            db.execute(format!("INSERT INTO {table_name} VALUES {values}").as_str())
                .await
                .unwrap();
        }
        DatabaseType::MySQL => {
            // let db = PostgresDatabase::new(&state.connection_string);
        }
        DatabaseType::Unknown => {
            // let db = PostgresDatabase::new(&state.connection_string);
        }
    }

    Ok(String::from(""))
}

#[tauri::command]
pub async fn get_results(
    state: State<'_, Mutex<AppData>>,
    query: String,
) -> Result<String, String> {
    let state = state.lock().await;

    let results = match state.database_type {
        DatabaseType::PostgreSQL => {
            let db = PostgresDatabase::new(&state.connection_string);
            db.get_results(&query).await?
        }
        DatabaseType::MySQL => {
            let db = MysqlDatabase::new(&state.connection_string);
            db.get_results(&query).await?
        }
        DatabaseType::Unknown => {
            return Err("Unknown database type. Please set a valid connection string.".to_string())
        }
    };

    serde_json::to_string(&results).map_err(|e| e.to_string())
}
