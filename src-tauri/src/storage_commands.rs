/// Load the canvas document for a connection. Returns `"{}"` when the file is
/// absent; the frontend (`useLoadDocument`) creates an empty document in that
/// case. The host never authors documents — `emptyDocument()` mints `nanoid`
/// page ids that can't be replicated here.
#[tauri::command]
pub(crate) async fn load(workspace: String, connection_name: String) -> Result<String, String> {
    let path = std::path::absolute(std::env::var("HOME").unwrap()).unwrap();
    let folder = path.join("peek").join(workspace.to_lowercase());
    let file_path = folder.join(format!("{}.json", connection_name.to_lowercase()));

    std::fs::create_dir_all(&folder).map_err(|e| e.to_string())?;

    if let Ok(false) = std::fs::exists(&file_path) {
        return Ok("{}".to_string());
    }
    std::fs::read_to_string(&file_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub(crate) async fn save(
    workspace: String,
    connection_name: String,
    contents: String,
) -> Result<String, String> {
    let path = std::path::absolute(std::env::var("HOME").unwrap()).unwrap();
    let save_path = path.join("peek").join(workspace.to_lowercase());
    let mut file_path = save_path.clone().join(connection_name);

    file_path.set_extension("json");

    std::fs::create_dir_all(save_path).unwrap();
    std::fs::write(file_path, contents).map_err(|e| e.to_string())?;

    Ok("File saved".to_string())
}

/// Load the results sidecar that stores per-result-node rows out-of-band from
/// the canvas document. Returns `"{}"` when the sidecar is absent.
#[tauri::command]
pub(crate) async fn load_results(
    workspace: String,
    connection_name: String,
) -> Result<String, String> {
    let path = std::path::absolute(std::env::var("HOME").unwrap()).unwrap();
    let folder = path.join("peek").join(workspace.to_lowercase());
    let file_path = folder.join(format!("{}.results.json", connection_name.to_lowercase()));

    std::fs::create_dir_all(&folder).map_err(|e| e.to_string())?;

    if let Ok(false) = std::fs::exists(&file_path) {
        return Ok("{}".to_string());
    }
    std::fs::read_to_string(&file_path).map_err(|e| e.to_string())
}

/// Save the results sidecar (`<connection>.results.json`).
#[tauri::command]
pub(crate) async fn save_results(
    workspace: String,
    connection_name: String,
    contents: String,
) -> Result<String, String> {
    let path = std::path::absolute(std::env::var("HOME").unwrap()).unwrap();
    let save_path = path.join("peek").join(workspace.to_lowercase());
    let file_path = save_path
        .clone()
        .join(format!("{}.results.json", connection_name.to_lowercase()));

    std::fs::create_dir_all(save_path).map_err(|e| e.to_string())?;
    std::fs::write(file_path, contents).map_err(|e| e.to_string())?;

    Ok("Results saved".to_string())
}
