use std::path::{Path, PathBuf};

use crate::config::PeekConfig;

/// Resolve a workspace's document directory, silently migrating the pre-3.x
/// flat layout (`~/peek/{workspace}`) into `~/peek/workspaces/{workspace}` the
/// first time it is accessed. Once existing installs have migrated this shim
/// can be deleted, leaving only the `workspaces/` join.
fn ensure_workspace_dir(workspace: &str) -> Result<PathBuf, String> {
    migrate_workspace_dir(&PeekConfig::config_dir()?, &workspace.to_lowercase())
}

fn migrate_workspace_dir(base: &Path, workspace: &str) -> Result<PathBuf, String> {
    let new_dir = base.join("workspaces").join(workspace);
    if std::fs::exists(&new_dir).unwrap_or(false) {
        return Ok(new_dir);
    }

    let legacy_dir = base.join(workspace);
    // Guard the one colliding name: a workspace literally called "workspaces"
    // maps its legacy dir onto the new container itself — never move that.
    let is_container = new_dir.parent() == Some(legacy_dir.as_path());
    if !is_container && std::fs::exists(&legacy_dir).unwrap_or(false) {
        let container = new_dir.parent().ok_or("workspaces dir has no parent")?;
        std::fs::create_dir_all(container).map_err(|e| e.to_string())?;
        std::fs::rename(&legacy_dir, &new_dir).map_err(|e| e.to_string())?;
        return Ok(new_dir);
    }

    std::fs::create_dir_all(&new_dir).map_err(|e| e.to_string())?;
    Ok(new_dir)
}

/// Load the canvas document for a connection. Returns `"{}"` when the file is
/// absent; the frontend (`useLoadDocument`) creates an empty document in that
/// case. The host never authors documents — `emptyDocument()` mints `nanoid`
/// page ids that can't be replicated here.
#[tauri::command]
pub(crate) async fn load(workspace: String, connection_name: String) -> Result<String, String> {
    let file_path =
        ensure_workspace_dir(&workspace)?.join(format!("{}.json", connection_name.to_lowercase()));

    if std::fs::exists(&file_path).unwrap_or(false) {
        return std::fs::read_to_string(&file_path).map_err(|e| e.to_string());
    }
    Ok("{}".to_string())
}

#[tauri::command]
pub(crate) async fn save(
    workspace: String,
    connection_name: String,
    contents: String,
) -> Result<String, String> {
    let file_path =
        ensure_workspace_dir(&workspace)?.join(format!("{}.json", connection_name.to_lowercase()));

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
    let file_path = ensure_workspace_dir(&workspace)?
        .join(format!("{}.results.json", connection_name.to_lowercase()));

    if std::fs::exists(&file_path).unwrap_or(false) {
        return std::fs::read_to_string(&file_path).map_err(|e| e.to_string());
    }
    Ok("{}".to_string())
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
    writeln!(file, "{line}").map_err(|e| e.to_string())
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
        return Ok(String::new());
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
    let file_path = ensure_workspace_dir(&workspace)?
        .join(format!("{}.results.json", connection_name.to_lowercase()));

    std::fs::write(file_path, contents).map_err(|e| e.to_string())?;

    Ok("Results saved".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn scratch(tag: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("peek-migrate-{tag}"));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn migrates_legacy_dir_and_preserves_files() {
        let base = scratch("legacy").join("peek");
        let legacy = base.join("prod");
        std::fs::create_dir_all(&legacy).unwrap();
        std::fs::write(legacy.join("maindb.json"), "{\"doc\":1}").unwrap();
        std::fs::write(legacy.join("maindb.results.json"), "{\"rows\":1}").unwrap();

        let resolved = migrate_workspace_dir(&base, "prod").unwrap();

        assert_eq!(resolved, base.join("workspaces").join("prod"));
        assert!(
            !legacy.exists(),
            "legacy dir should be moved, not left behind"
        );
        assert_eq!(
            std::fs::read_to_string(resolved.join("maindb.json")).unwrap(),
            "{\"doc\":1}"
        );
        assert_eq!(
            std::fs::read_to_string(resolved.join("maindb.results.json")).unwrap(),
            "{\"rows\":1}"
        );
    }

    #[test]
    fn keeps_new_dir_and_ignores_stale_legacy() {
        let base = scratch("already").join("peek");
        let new = base.join("workspaces").join("prod");
        std::fs::create_dir_all(&new).unwrap();
        std::fs::write(new.join("maindb.json"), "new").unwrap();
        let legacy = base.join("prod");
        std::fs::create_dir_all(&legacy).unwrap();
        std::fs::write(legacy.join("maindb.json"), "stale").unwrap();

        let resolved = migrate_workspace_dir(&base, "prod").unwrap();

        assert_eq!(resolved, new);
        assert_eq!(
            std::fs::read_to_string(new.join("maindb.json")).unwrap(),
            "new"
        );
    }

    #[test]
    fn creates_fresh_dir_when_nothing_exists() {
        let base = scratch("fresh").join("peek");
        let resolved = migrate_workspace_dir(&base, "brandnew").unwrap();
        assert_eq!(resolved, base.join("workspaces").join("brandnew"));
        assert!(resolved.is_dir());
    }

    #[test]
    fn does_not_clobber_container_for_workspace_named_workspaces() {
        let base = scratch("collide").join("peek");
        let container = base.join("workspaces");
        std::fs::create_dir_all(&container).unwrap();
        std::fs::write(container.join("other.json"), "sibling").unwrap();

        let resolved = migrate_workspace_dir(&base, "workspaces").unwrap();

        assert_eq!(resolved, container.join("workspaces"));
        assert_eq!(
            std::fs::read_to_string(container.join("other.json")).unwrap(),
            "sibling"
        );
    }
}
