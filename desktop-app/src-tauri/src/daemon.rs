// ============================================================
// Opus8 Desktop — Background System Daemon Runner
//
// Manages automated multi-agent workflows using:
//   npx ruflo@latest daemon start
//
// The daemon runs in the background with proxy env vars
// injected, enabling persistent agentic automation.
// ============================================================

use std::collections::HashMap;
use std::process::{Child, Command};
use std::sync::Mutex;
use once_cell::sync::Lazy;

/// Global daemon process handle — only one daemon at a time.
static DAEMON_PROCESS: Lazy<Mutex<Option<Child>>> = Lazy::new(|| Mutex::new(None));

/// Start the Ruflo daemon with proxy environment variables.
pub async fn start_daemon(env_vars: HashMap<String, String>) -> Result<String, String> {
    let mut daemon = DAEMON_PROCESS.lock().map_err(|e| format!("Lock error: {}", e))?;

    // Kill any existing daemon
    if let Some(ref mut child) = *daemon {
        let _ = child.kill();
        let _ = child.wait();
    }

    // Build the command: npx ruflo@latest daemon start
    let mut cmd = Command::new("npx");
    cmd.arg("ruflo@latest");
    cmd.arg("daemon");
    cmd.arg("start");

    // Inject all proxy environment variables
    for (key, value) in &env_vars {
        cmd.env(key, value);
    }

    // Spawn the daemon
    let child = cmd.spawn().map_err(|e| format!("Failed to start daemon: {}", e))?;

    let pid = child.id();
    *daemon = Some(child);

    Ok(format!("Ruflo daemon started (PID: {})", pid))
}

/// Stop the running Ruflo daemon.
pub async fn stop_daemon() -> Result<String, String> {
    let mut daemon = DAEMON_PROCESS.lock().map_err(|e| format!("Lock error: {}", e))?;

    match daemon.take() {
        Some(mut child) => {
            let pid = child.id();
            let _ = child.kill();
            let _ = child.wait();
            Ok(format!("Ruflo daemon stopped (PID: {})", pid))
        }
        None => Ok("No daemon is currently running.".to_string()),
    }
}

/// Check if the daemon is currently running.
pub fn is_daemon_running() -> bool {
    DAEMON_PROCESS
        .lock()
        .map(|d| d.is_some())
        .unwrap_or(false)
}
