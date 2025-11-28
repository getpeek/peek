use crate::config::PeekConfig;

#[tauri::command]
pub async fn load(workspace: String, connection_name: String) -> Result<String, String> {
    let _config = PeekConfig::get_or_default();

    let path = std::path::absolute(std::env::var("HOME").unwrap()).unwrap();
    let folder = path.join("peek").join(workspace.to_lowercase());

    let mut load_path = folder.join(connection_name.to_lowercase());
    load_path.set_extension("json");

    std::fs::create_dir_all(folder).map_err(|e| e.to_string())?;

    if let Ok(false) = std::fs::exists(load_path.clone()) {
        std::fs::write(
            load_path.clone(),
            r#"{
          "document": {
            "store": {
              "page:page": {
                "meta": {},
                "id": "page:page",
                "name": "Page 1",
                "index": "a1",
                "typeName": "page"
              },
              "document:document": {
                "gridSize": 10,
                "name": "",
                "meta": {},
                "id": "document:document",
                "typeName": "document"
              }
            },
            "schema": {
              "schemaVersion": 2,
              "sequences": {
                "com.tldraw.store": 5,
                "com.tldraw.asset": 1,
                "com.tldraw.camera": 1,
                "com.tldraw.document": 2,
                "com.tldraw.instance": 25,
                "com.tldraw.instance_page_state": 5,
                "com.tldraw.page": 1,
                "com.tldraw.instance_presence": 6,
                "com.tldraw.pointer": 1,
                "com.tldraw.shape": 4,
                "com.tldraw.asset.bookmark": 2,
                "com.tldraw.asset.image": 5,
                "com.tldraw.asset.video": 5,
                "com.tldraw.shape.group": 0,
                "com.tldraw.shape.text": 3,
                "com.tldraw.shape.bookmark": 2,
                "com.tldraw.shape.draw": 2,
                "com.tldraw.shape.geo": 10,
                "com.tldraw.shape.note": 9,
                "com.tldraw.shape.line": 5,
                "com.tldraw.shape.frame": 1,
                "com.tldraw.shape.arrow": 7,
                "com.tldraw.shape.highlight": 1,
                "com.tldraw.shape.embed": 4,
                "com.tldraw.shape.image": 5,
                "com.tldraw.shape.video": 4,
                "com.tldraw.shape.query": 0,
                "com.tldraw.shape.result": 0,
                "com.tldraw.shape.ai-prompt": 0,
                "com.tldraw.shape.barchart": 0,
                "com.tldraw.shape.query-error": 0,
                "com.tldraw.shape.chat": 0,
                "com.tldraw.binding.arrow": 1
              }
            }
          },
          "session": {
            "version": 0,
            "currentPageId": "page:page",
            "exportBackground": true,
            "isFocusMode": false,
            "isDebugMode": false,
            "isToolLocked": false,
            "isGridMode": true,
            "pageStates": [
              {
                "pageId": "page:page",
                "camera": {
                  "x": -1580,
                  "y": -520,
                  "z": 1
                },
                "selectedShapeIds": [],
                "focusedGroupId": null
              }
            ]
          }
        }"#,
        )
        .map_err(|e| e.to_string())?;
    }

    std::fs::read_to_string(&load_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn save(
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
