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

/// Append one checkpoint line to the version-history log
/// (`<connection>.history.jsonl`). The file is created on first use; the
/// frontend owns the delta format, the host only appends opaque lines.
#[tauri::command]
pub(crate) async fn append_history(
    workspace: String,
    connection_name: String,
    line: String,
) -> Result<(), String> {
    use std::io::Write;

    let path = std::path::absolute(std::env::var("HOME").unwrap()).unwrap();
    let folder = path.join("peek").join(workspace.to_lowercase());
    let file_path = folder.join(format!("{}.history.jsonl", connection_name.to_lowercase()));

    std::fs::create_dir_all(&folder).map_err(|e| e.to_string())?;

    let mut file = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(&file_path)
        .map_err(|e| e.to_string())?;
    writeln!(file, "{}", line).map_err(|e| e.to_string())
}

/// Load the version-history log. Returns `""` when the log is absent.
#[tauri::command]
pub(crate) async fn load_history(
    workspace: String,
    connection_name: String,
) -> Result<String, String> {
    let path = std::path::absolute(std::env::var("HOME").unwrap()).unwrap();
    let folder = path.join("peek").join(workspace.to_lowercase());
    let file_path = folder.join(format!("{}.history.jsonl", connection_name.to_lowercase()));

    std::fs::create_dir_all(&folder).map_err(|e| e.to_string())?;

    if let Ok(false) = std::fs::exists(&file_path) {
        return Ok("".to_string());
    }
    std::fs::read_to_string(&file_path).map_err(|e| e.to_string())
}

/// Rewrite the version-history log wholesale — used by frontend compaction.
#[tauri::command]
pub(crate) async fn save_history(
    workspace: String,
    connection_name: String,
    contents: String,
) -> Result<(), String> {
    let path = std::path::absolute(std::env::var("HOME").unwrap()).unwrap();
    let folder = path.join("peek").join(workspace.to_lowercase());
    let file_path = folder.join(format!("{}.history.jsonl", connection_name.to_lowercase()));

    std::fs::create_dir_all(&folder).map_err(|e| e.to_string())?;
    std::fs::write(&file_path, contents).map_err(|e| e.to_string())
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
