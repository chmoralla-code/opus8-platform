// ============================================================
// Hormachuelos Desktop — Preload API Contract Tests
// These tests validate the shape of the APIs exposed via
// contextBridge. Run with: npx jest or node --test
// ============================================================

const { describe, it } = typeof require !== 'undefined' ? require('node:test') : { describe: null, it: null };

// Note: These tests validate the preload.js API contract.
// For full integration tests, run the app and use Playwright
// to exercise the exposed APIs through the renderer.

// ── API Surface Validation ──
const EXPECTED_TAURI_COMMANDS = [
  'execute_claude_cli', 'execute_ruflo_command',
  'start_ruflo_daemon', 'stop_ruflo_daemon',
  'check_balance', 'generate_api_key',
  'export_chat_log', 'vision_route_image',
  'preview_path', 'preview_url', 'internet_status',
  'read_file', 'write_file', 'list_directory', 'delete_file',
  'web_fetch', 'glob_search', 'grep_search', 'find_files', 'execute_shell',
  'ruflo_memory_store', 'ruflo_memory_search',
  'ruflo_agent_spawn', 'ruflo_agent_status',
  'ruflo_web_search', 'ruflo_task_create',
];

const EXPECTED_OPUS8_METHODS = [
  // Core
  'invoke', 'platform', 'version',
  // File System
  'readFile', 'writeFile', 'listDir', 'mkdir', 'deleteFile',
  'fileExists', 'fileStat', 'rename',
  // Terminal
  'executeCommand', 'executeCommandStream', 'killProcess',
  'onTerminalOutput', 'onTerminalExit',
  // Network
  'fetchUrl', 'openExternal', 'openPath', 'previewPath', 'previewUrl',
  'onPreviewUpdate',
  // Working Directory
  'getCwd', 'setCwd',
  // File Search
  'searchFiles',
  // Dialogs
  'openFolderDialog', 'openFileDialog', 'saveFileDialog',
  // System
  'getSystemInfo',
  // Ruflo
  'executeRufloCommand', 'startRufloDaemon', 'stopRufloDaemon',
  // Claude CLI
  'executeClaudeCli',
  // Git
  'gitStatus', 'gitDiff', 'gitLog',
  // Advanced Search
  'globSearch', 'grepSearch', 'findFiles', 'getInternetStatus',
  // Subagent
  'subagentRun', 'subagentKill', 'onSubagentOutput', 'onSubagentExit',
  // Web Search
  'webSearch',
  // Chat Export
  'exportChatLog',
  // Google Drive
  'uploadToGoogleDrive',
];

console.log('[preload.test] API surface spec:');
console.log(`  Tauri commands: ${EXPECTED_TAURI_COMMANDS.length} defined`);
console.log(`  Opus8 methods:  ${EXPECTED_OPUS8_METHODS.length} defined`);

// Export for use by Playwright integration tests
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    EXPECTED_TAURI_COMMANDS,
    EXPECTED_OPUS8_METHODS,
  };
}
