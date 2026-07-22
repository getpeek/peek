/// How to spawn an ACP agent subprocess. Per-session concerns (cwd, MCP servers)
/// are passed to [`crate::AcpConnection::new_session`] instead, since one
/// connection hosts many sessions.
#[derive(Debug, Clone, Default)]
pub struct AcpSpawnConfig {
    /// Executable that launches the ACP agent (e.g. `npx`).
    pub command: String,
    /// Arguments passed to `command` (e.g. the Claude Code adapter package).
    pub args: Vec<String>,
    /// Extra environment variables for the child process. The agent owns its own
    /// auth, so this is where credentials it expects (e.g. `ANTHROPIC_API_KEY`)
    /// are passed through.
    pub env: Vec<(String, String)>,
}
