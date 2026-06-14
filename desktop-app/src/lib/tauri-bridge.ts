/**
 * Tauri Bridge — invoke() wrappers for all Rust commands.
 * Each function maps to a matching Tauri command in commands.rs.
 */
import { invoke } from '@tauri-apps/api/core';

// ---- Shell Commands ----

export async function runClaudeCLI(command: string, args: string[], apiKey: string, billingMode: string) {
  return invoke('execute_claude_cli', {
    request: { command, args, api_key: apiKey, billing_mode: billingMode },
  });
}

export async function runRufloCommand(args: string[], apiKey: string, billingMode: string) {
  return invoke('execute_ruflo_command', {
    request: { command: 'npx', args, api_key: apiKey, billing_mode: billingMode },
  });
}

// ---- Daemon Commands ----

export async function startRufloDaemon(apiKey: string, billingMode: string) {
  return invoke('start_ruflo_daemon', { apiKey, billingMode });
}

export async function stopRufloDaemon() {
  return invoke('stop_ruflo_daemon');
}

// ---- Balance & Auth ----

export async function checkBalance(apiKey: string) {
  const centralDomain = localStorage.getItem('opus8-central-domain') ?? 'https://yourcentraldomain.com';
  return invoke('check_balance', { apiKey, centralDomain });
}

export async function generateApiKey(userId: string) {
  const centralDomain = localStorage.getItem('opus8-central-domain') ?? 'https://yourcentraldomain.com';
  return invoke('generate_api_key', { userId, centralDomain });
}

// ---- Chat Export ----

export async function exportChatLog(messages: any[], filePath: string) {
  return invoke('export_chat_log', {
    messagesJson: JSON.stringify(messages),
    filePath,
  });
}

// ---- Vision Routing ----

export async function visionRouteImage(imageBase64: string, userPrompt: string, model: string) {
  return invoke('vision_route_image', {
    request: { image_base64: imageBase64, user_prompt: userPrompt, model },
  });
}

// ---- Environment ----

export async function getEnvOverrides(apiKey: string) {
  return invoke('get_env_overrides', { apiKey });
}
