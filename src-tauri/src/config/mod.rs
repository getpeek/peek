use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

const SETTINGS_SCHEMA: &str = include_str!("./settings.schema.json");

fn default_schema_ref() -> String {
    "./settings.schema.json".to_string()
}

#[tauri::command]
pub fn get_config() -> Result<String, String> {
    let config = PeekConfig::get_or_default();

    serde_json::to_string(&config).map_err(|_| "Can't serialize config".to_string())
}

#[tauri::command]
pub fn set_theme(theme: Theme) -> Result<(), String> {
    let mut config = PeekConfig::get_or_default();
    config.theme = theme;
    config.save_to_disk()
}

#[tauri::command]
pub fn set_workspaces(workspaces: Vec<Workspace>) -> Result<(), String> {
    let mut config = PeekConfig::get_or_default();
    config.workspaces = workspaces;
    config.save_to_disk()
}

#[derive(Debug, Default, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Theme {
    #[default]
    Pine,
    Midnight,
    Midday,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PeekConfig {
    #[serde(rename = "$schema", default = "default_schema_ref")]
    schema: String,
    #[serde(default)]
    workspaces: Vec<Workspace>,
    #[serde(default)]
    pub ai: AIConfig,
    #[serde(default)]
    name: Option<String>,
    #[serde(default)]
    theme: Theme,
}

impl Default for PeekConfig {
    fn default() -> Self {
        Self {
            schema: default_schema_ref(),
            workspaces: Vec::new(),
            ai: AIConfig::default(),
            name: None,
            theme: Theme::default(),
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct McpConfig {
    /// Run the MCP server at startup. Changing this takes effect on restart.
    #[serde(default)]
    pub enable: bool,
    #[serde(default = "McpConfig::default_port")]
    pub port: u16,
}

impl McpConfig {
    fn default_port() -> u16 {
        13315
    }
}

impl Default for McpConfig {
    fn default() -> Self {
        Self {
            enable: false,
            port: Self::default_port(),
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AIConfig {
    model: String,
    url: String,
    #[serde(default)]
    pub mcp: McpConfig,
}

impl Default for AIConfig {
    fn default() -> Self {
        Self {
            model: "gemma4:e2b".to_string(),
            url: "http://localhost:11434".to_string(),
            mcp: McpConfig::default(),
        }
    }
}

impl PeekConfig {
    pub fn get_or_default() -> Self {
        let mut config = Self::load_from_disk();
        if config.name.is_none() {
            config.name = Some(
                std::env::var("USER")
                    .or_else(|_| std::env::var("USERNAME"))
                    .unwrap_or_else(|_| "Anonymous".to_string()),
            );
        }
        config
    }

    /// Ensures `~/peek/` exists, that `settings.schema.json` is up to date,
    /// and that `settings.json` exists (creating it with defaults if not).
    /// Called once at app startup so editors can resolve the `$schema`
    /// reference and first-run users get a discoverable settings file.
    pub fn ensure_initialized_on_disk() -> Result<(), String> {
        let dir = Self::config_dir()?;
        std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;

        // Always overwrite the schema so it stays in sync with the binary.
        std::fs::write(dir.join("settings.schema.json"), SETTINGS_SCHEMA)
            .map_err(|e| e.to_string())?;

        let settings_path = dir.join("settings.json");
        if !settings_path.exists() {
            let default_config = PeekConfig::default();
            let serialized =
                serde_json::to_string_pretty(&default_config).map_err(|e| e.to_string())?;
            std::fs::write(&settings_path, serialized).map_err(|e| e.to_string())?;
        }

        Ok(())
    }

    fn config_dir() -> Result<PathBuf, String> {
        let home_dir = std::env::var("HOME").map_err(|e| e.to_string())?;
        Ok(Path::new(&home_dir).join("peek"))
    }

    fn settings_path() -> Result<PathBuf, String> {
        Ok(Self::config_dir()?.join("settings.json"))
    }

    fn load_from_disk() -> Self {
        let Ok(path) = Self::settings_path() else {
            return PeekConfig::default();
        };
        let Ok(contents) = std::fs::read_to_string(&path) else {
            return PeekConfig::default();
        };
        serde_json::from_str(&contents).unwrap_or_else(|_| PeekConfig::default())
    }

    fn save_to_disk(&self) -> Result<(), String> {
        let dir = Self::config_dir()?;
        std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;

        let serialized = serde_json::to_string_pretty(self).map_err(|e| e.to_string())?;
        std::fs::write(dir.join("settings.json"), serialized).map_err(|e| e.to_string())
    }
}

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct Workspace {
    pub name: String,
    pub connections: Vec<DatabaseConnection>,
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
