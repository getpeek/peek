use serde::{Deserialize, Serialize};

#[tauri::command]
pub fn get_config() -> Result<String, String> {
    let config = PeekConfig::get_or_default();

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
    url: String,
}

impl Default for AIConfig {
    fn default() -> Self {
        Self {
            model: "qwen3:8b".to_string(),
            url: "http://localhost:11434".to_string(),
        }
    }
}

impl PeekConfig {
    pub fn get_or_default() -> Self {
        let Ok(home_dir) = std::env::var("HOME") else {
            return PeekConfig::default();
        };

        let Ok(config_file) =
            std::fs::read_to_string(format!("{home_dir}/.config/peek/config.toml"))
        else {
            return PeekConfig::default();
        };
        toml::from_str(&config_file).unwrap_or(PeekConfig::default())
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
