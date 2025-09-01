use serde::{Deserialize, Serialize};
use serde_json::json;

#[tauri::command]
pub fn get_workspaces() -> Result<String, String> {
    let Ok(home_dir) = std::env::var("HOME") else {
        return Ok(json!(PeekConfig::default()).to_string());
    };

    let Ok(config_file) = std::fs::read_to_string(format!("{home_dir}/.config/peek/config.toml"))
    else {
        return Ok(json!(PeekConfig::default()).to_string());
    };
    let config: PeekConfig =
        toml::from_str(&config_file).map_err(|e| format!("Can't parse config file {e:?}"))?;

    serde_json::to_string(&config).map_err(|_| "Can't serialize config".to_string())
}

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct PeekConfig {
    workspaces: Vec<Workspace>,
    ai: AIConfig,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AIConfig {
    model: String,
}

impl Default for AIConfig {
    fn default() -> Self {
        Self {
            model: "qwen-3:8b".to_string(),
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct Workspace {
    name: String,
    connections: Vec<DatabaseConnection>,
}

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct DatabaseConnection {
    name: String,
    color: String,
    url: String,
    ssh: Option<SSHConfig>,
}

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct SSHConfig {
    host: String,
    port: u16,
    username: String,
    password: Option<String>,
    ssh_key: Option<String>,
}
