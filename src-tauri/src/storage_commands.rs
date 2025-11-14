use crate::config::PeekConfig;

#[tauri::command]
pub async fn load(file: String) -> Result<String, String> {
    let _config = PeekConfig::get_or_default();

    Err(format!("Not implemented {file}"))
}

#[tauri::command]
pub async fn save(
    workspace: String,
    connection_name: String,
    contents: String,
) -> Result<String, String> {
    let mut path = std::path::absolute(std::env::var("HOME").unwrap()).unwrap();

    std::fs::create_dir_all(path.join("peek").join(&workspace).join(&connection_name)).unwrap();
    path.push(format!("{}.json", contents));

    std::fs::File::create(path).map_err(|e| e.to_string())?;

    Ok("File saved".to_string())
}
