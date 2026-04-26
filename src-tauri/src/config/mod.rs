use std::path::PathBuf;

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
            model: "gemma4:e2b".to_string(),
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
    pub name: String,
    pub color: String,
    pub url: String,
    #[serde(default)]
    pub ssh_tunnel: Option<SshTunnelConfig>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SshTunnelConfig {
    /// SSH bastion host (e.g. `13.60.11.197`)
    pub ssh_host: String,

    /// SSH username
    pub ssh_user: String,

    /// Path to the SSH private key (`.pem` file)
    pub key_path: PathBuf,

    /// SSH port (defaults to 22)
    #[serde(default = "SshTunnelConfig::default_ssh_port")]
    pub ssh_port: u16,

    /// Local port for the tunnel (defaults to 15432). Set to 0 to let the OS pick a free port.
    #[serde(default = "SshTunnelConfig::default_local_port")]
    pub local_port: u16,
}

impl SshTunnelConfig {
    fn default_ssh_port() -> u16 {
        22
    }

    fn default_local_port() -> u16 {
        15432
    }
}
