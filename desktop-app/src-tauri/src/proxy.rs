// ============================================================
// Opus8 Desktop — Proxy Environment Injection
//
// Before running any terminal command (Claude CLI or Ruflo),
// this module injects environment variables to route all
// LLM requests through our central proxy server.
//
// Spec 5: Process Override
// - ANTHROPIC_BASE_URL = "https://yourcentraldomain.com"
// - ANTHROPIC_AUTH_TOKEN = User's platform API key
// ============================================================

use std::collections::HashMap;

/// Build the complete set of environment variable overrides
/// that route all Claude CLI / Ruflo traffic through the
/// central Opus8 proxy server.
pub fn build_env_overrides(api_key: &str, billing_mode: &str) -> HashMap<String, String> {
    let mut env_vars = HashMap::new();

    // Central proxy routing
    env_vars.insert(
        "ANTHROPIC_BASE_URL".to_string(),
        "https://yourcentraldomain.com".to_string(),
    );

    // Auth token = user's platform API key (or BYOK key)
    env_vars.insert(
        "ANTHROPIC_AUTH_TOKEN".to_string(),
        api_key.to_string(),
    );

    // API Key for the desktop app's own use
    env_vars.insert(
        "OPUS8_API_KEY".to_string(),
        api_key.to_string(),
    );

    // Billing mode flag
    env_vars.insert(
        "OPUS8_BILLING_MODE".to_string(),
        billing_mode.to_string(),
    );

    // Disable external telemetry
    env_vars.insert(
        "ANTHROPIC_DISABLE_TELEMETRY".to_string(),
        "true".to_string(),
    );

    // Ruflo-specific routing
    env_vars.insert(
        "RUFLO_BASE_URL".to_string(),
        "https://yourcentraldomain.com".to_string(),
    );

    // Prevent direct API calls by overriding known endpoint patterns
    env_vars.insert(
        "OPENAI_BASE_URL".to_string(),
        "https://yourcentraldomain.com".to_string(),
    );

    env_vars.insert(
        "DEEPSEEK_BASE_URL".to_string(),
        "https://yourcentraldomain.com".to_string(),
    );

    env_vars
}

/// Build minimal overrides — just the proxy URL and auth token.
/// Used for lighter commands that don't need the full set.
pub fn build_minimal_overrides(api_key: &str) -> HashMap<String, String> {
    let mut env_vars = HashMap::new();
    env_vars.insert(
        "ANTHROPIC_BASE_URL".to_string(),
        "https://yourcentraldomain.com".to_string(),
    );
    env_vars.insert(
        "ANTHROPIC_AUTH_TOKEN".to_string(),
        api_key.to_string(),
    );
    env_vars
}

/// Validate that an API key has the correct format.
pub fn validate_key_format(key: &str) -> bool {
    key.starts_with("sk_opus8_") && key.len() >= 56 // prefix (9) + 48 hex
}
