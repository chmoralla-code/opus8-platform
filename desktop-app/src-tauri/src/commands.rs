// ============================================================
// Opus8 Desktop — Tauri Commands (Shell Bridge)
//
// These commands bridge the React frontend with the host's
// terminal: Claude CLI, Ruflo framework, and daemon management.
// Environment variables are injected per proxy.rs before execution.
// ============================================================

use crate::proxy;
use crate::daemon;
use serde::{Deserialize, Serialize};
use tauri::command;
use std::process::Command;

// ---- Request / Response Types ----

#[derive(Debug, Serialize, Deserialize)]
pub struct ShellRequest {
    pub command: String,       // e.g. "claude", "npx ruflo@latest"
    pub args: Vec<String>,    // e.g. ["-p", "Write a function"]
    pub api_key: String,      // User's platform API key or BYOK key
    pub billing_mode: String, // "platform" or "byok"
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ShellResponse {
    pub success: bool,
    pub stdout: String,
    pub stderr: String,
    pub exit_code: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct VisionRouteRequest {
    pub image_base64: String,
    pub user_prompt: String,
    pub model: String, // "pro" or "flash" — determines routing
}

#[derive(Debug, Serialize, Deserialize)]
pub struct VisionRouteResponse {
    pub success: bool,
    pub image_analysis: String,
    pub combined_prompt: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BalanceResponse {
    pub wallet_balance: f64,
    pub last_deposit_amount: f64,
    pub percentage: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ApiKeyResponse {
    pub api_key: String,
    pub key_prefix: String,
}

// ============================================================
// COMMAND: Execute Claude CLI
// ============================================================

#[command]
pub async fn execute_claude_cli(request: ShellRequest) -> Result<ShellResponse, String> {
    // Build environment variables with proxy routing
    let env_vars = proxy::build_env_overrides(&request.api_key, &request.billing_mode);

    let mut cmd = Command::new(&request.command);
    cmd.args(&request.args);

    // Inject proxy environment variables
    for (key, value) in &env_vars {
        cmd.env(key, value);
    }

    // Execute
    let output = cmd.output().map_err(|e| format!("Failed to execute command: {}", e))?;

    Ok(ShellResponse {
        success: output.status.success(),
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
        exit_code: output.status.code(),
    })
}

// ============================================================
// COMMAND: Execute Ruflo Framework Command
// ============================================================

#[command]
pub async fn execute_ruflo_command(request: ShellRequest) -> Result<ShellResponse, String> {
    let env_vars = proxy::build_env_overrides(&request.api_key, &request.billing_mode);

    // Ruflo commands are always `npx ruflo@latest <args>`
    let mut cmd = Command::new("npx");
    cmd.arg("ruflo@latest");
    for arg in &request.args {
        cmd.arg(arg);
    }

    for (key, value) in &env_vars {
        cmd.env(key, value);
    }

    let output = cmd.output().map_err(|e| format!("Failed to execute ruflo: {}", e))?;

    Ok(ShellResponse {
        success: output.status.success(),
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
        exit_code: output.status.code(),
    })
}

// ============================================================
// COMMAND: Start Ruflo Background Daemon
// ============================================================

#[command]
pub async fn start_ruflo_daemon(api_key: String, billing_mode: String) -> Result<String, String> {
    let env_vars = proxy::build_env_overrides(&api_key, &billing_mode);
    daemon::start_daemon(env_vars).await
}

// ============================================================
// COMMAND: Stop Ruflo Background Daemon
// ============================================================

#[command]
pub async fn stop_ruflo_daemon() -> Result<String, String> {
    daemon::stop_daemon().await
}

// ============================================================
// COMMAND: Get Current Environment Overrides
// ============================================================

#[command]
pub fn get_env_overrides(api_key: String) -> Vec<(String, String)> {
    let overrides = proxy::build_env_overrides(&api_key, "platform");
    overrides.into_iter().collect()
}

// ============================================================
// COMMAND: Check Balance from Central Server
// ============================================================

#[command]
pub async fn check_balance(api_key: String, central_domain: String) -> Result<BalanceResponse, String> {
    let url = format!("{}/api/billing/balance?api_key={}", central_domain, api_key);

    let client = reqwest::Client::new();
    let resp = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Failed to check balance: {}", e))?;

    if !resp.status().is_success() {
        let error = resp.text().await.unwrap_or_default();
        return Err(format!("Balance check failed: {}", error));
    }

    let data: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse balance: {}", e))?;

    Ok(BalanceResponse {
        wallet_balance: data["wallet_balance"].as_f64().unwrap_or(0.0),
        last_deposit_amount: data["last_deposit_amount"].as_f64().unwrap_or(0.0),
        percentage: data["percentage"].as_f64().unwrap_or(0.0),
    })
}

// ============================================================
// COMMAND: Generate API Key (Proxied to Web App)
// ============================================================

#[command]
pub async fn generate_api_key(user_id: String, central_domain: String) -> Result<ApiKeyResponse, String> {
    let url = format!("{}/api/api-keys/generate", central_domain);

    let client = reqwest::Client::new();
    let payload = serde_json::json!({
        "user_id": user_id,
        "label": "Opus8 Desktop App",
    });

    let resp = client
        .post(&url)
        .json(&payload)
        .send()
        .await
        .map_err(|e| format!("Failed to generate key: {}", e))?;

    if !resp.status().is_success() {
        let error = resp.text().await.unwrap_or_default();
        return Err(format!("Key generation failed: {}", error));
    }

    let data: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse response: {}", e))?;

    Ok(ApiKeyResponse {
        api_key: data["api_key"].as_str().unwrap_or("").to_string(),
        key_prefix: data["key_prefix"].as_str().unwrap_or("").to_string(),
    })
}

// ============================================================
// COMMAND: Export Chat Log to Markdown File
// ============================================================

#[command]
pub async fn export_chat_log(messages_json: String, file_path: String) -> Result<String, String> {
    use std::fs;

    let messages: Vec<serde_json::Value> = serde_json::from_str(&messages_json)
        .map_err(|e| format!("Failed to parse messages: {}", e))?;

    let mut markdown = String::new();
    markdown.push_str("# Opus8 Chat Log\n");
    markdown.push_str(&format!(
        "**Exported:** {}\n",
        chrono::Utc::now().format("%Y-%m-%d %H:%M:%S UTC")
    ));
    markdown.push_str("**Model:** Claude Opus 8\n\n---\n\n");

    for msg in &messages {
        let role = msg["role"].as_str().unwrap_or("unknown");
        let content = msg["content"].as_str().unwrap_or("");
        let timestamp = msg["timestamp"].as_u64().unwrap_or(0);

        markdown.push_str(&format!(
            "## {} — {}\n\n{}\n\n",
            role.to_uppercase(),
            format_timestamp(timestamp),
            content,
        ));

        // Include thinking blocks if present
        if let Some(thinking) = msg["thinking"].as_array() {
            markdown.push_str("<details>\n<summary>Thinking Process</summary>\n\n");
            for block in thinking {
                markdown.push_str(&format!("- {}\n", block["content"].as_str().unwrap_or("")));
            }
            markdown.push_str("\n</details>\n\n");
        }
    }

    fs::write(&file_path, markdown)
        .map_err(|e| format!("Failed to write file: {}", e))?;

    Ok(format!("Chat log exported to {}", file_path))
}

// ============================================================
// COMMAND: Silent Vision Routing (Spec 4)
// ============================================================

#[command]
pub async fn vision_route_image(request: VisionRouteRequest) -> Result<VisionRouteResponse, String> {
    let client = reqwest::Client::new();

    // Send to Pollinations Vision API
    let pollinations_payload = serde_json::json!({
        "image": request.image_base64,
        "prompt": request.user_prompt,
        "model": "vision-free",
    });

    let vision_resp = client
        .post("https://pollinations.ai/api/vision")
        .json(&pollinations_payload)
        .send()
        .await
        .map_err(|e| format!("Vision API error: {}", e))?;

    if !vision_resp.status().is_success() {
        return Err(format!("Vision API returned status: {}", vision_resp.status()));
    }

    let vision_data: serde_json::Value = vision_resp
        .json()
        .await
        .map_err(|e| format!("Failed to parse vision response: {}", e))?;

    let image_analysis = vision_data["analysis"]
        .as_str()
        .unwrap_or("Image analysis unavailable")
        .to_string();

    // Build combined prompt: analysis + original prompt
    let combined_prompt = format!(
        "[System: Image uploaded. Vision analysis: {}] {}",
        image_analysis, request.user_prompt
    );

    Ok(VisionRouteResponse {
        success: true,
        image_analysis,
        combined_prompt,
    })
}

// ---- Helpers ----

fn format_timestamp(ts: u64) -> String {
    use std::time::{Duration, UNIX_EPOCH};
    if let Ok(system_time) = UNIX_EPOCH.checked_add(Duration::from_secs(ts)) {
        // Simple format without chrono dependency
        format!("{}", system_time.duration_since(UNIX_EPOCH).unwrap_or_default().as_secs())
    } else {
        format!("{}", ts)
    }
}
