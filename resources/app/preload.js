// ============================================================
// Opus8 Desktop — Electron Preload Script
// Exposes a Tauri-compatible API via contextBridge so the
// existing React frontend works without code changes.
// ============================================================

const { contextBridge, ipcRenderer, shell } = require('electron');

contextBridge.exposeInMainWorld('__TAURI__', {
  core: {
    invoke: async (cmd, args) => {
      // Map Tauri command names to Electron IPC handlers
      const cmdMap = {
        // Claude/Ruflo commands
        execute_claude_cli: 'execute_claude_cli',
        execute_ruflo_command: 'execute_ruflo_command',
        start_ruflo_daemon: 'start_ruflo_daemon',
        stop_ruflo_daemon: 'stop_ruflo_daemon',
        check_balance: 'check_balance',
        generate_api_key: 'generate_api_key',
        export_chat_log: 'export_chat_log',
        vision_route_image: 'vision_route_image',
        preview_path: 'preview_path',
        preview_url: 'preview_url',
        internet_status: 'internet_status',
        // Agentic tool commands (Tauri-style → Electron IPC)
        read_file: 'fs_read_file',
        write_file: 'fs_write_file',
        list_directory: 'fs_list_dir',
        delete_file: 'fs_delete',
        web_fetch: 'fetch_url',
        glob_search: 'glob_search',
        grep_search: 'grep_search',
        find_files: 'search_files',
        execute_shell: 'terminal_execute',
        // Ruflo MCP tool commands
        ruflo_memory_store: 'ruflo_memory_store',
        ruflo_memory_search: 'ruflo_memory_search',
        ruflo_agent_spawn: 'ruflo_agent_spawn',
        ruflo_agent_status: 'ruflo_agent_status',
        ruflo_web_search: 'ruflo_web_search',
        ruflo_task_create: 'ruflo_task_create',
      };

      const mappedCmd = cmdMap[cmd] || cmd;

      try {
        // Convert args object to positional arguments for IPC
        if (typeof args === 'object' && args !== null && !Array.isArray(args)) {
          // Ruflo MCP tool commands - pass args object directly
          if (cmd === 'ruflo_memory_store' || cmd === 'ruflo_memory_search' ||
              cmd === 'ruflo_agent_spawn' || cmd === 'ruflo_web_search' ||
              cmd === 'ruflo_task_create') {
            return await ipcRenderer.invoke(mappedCmd, args);
          } else if (cmd === 'ruflo_agent_status') {
            return await ipcRenderer.invoke(mappedCmd, args.agent_id);
          }
          // Claude/Ruflo commands
          else if (cmd === 'execute_claude_cli' || cmd === 'execute_ruflo_command') {
            return await ipcRenderer.invoke(mappedCmd, args);
          } else if (cmd === 'check_balance') {
            return await ipcRenderer.invoke(mappedCmd, args.api_key, args.central_domain);
          } else if (cmd === 'generate_api_key') {
            return await ipcRenderer.invoke(mappedCmd, args.user_id, args.central_domain);
          } else if (cmd === 'export_chat_log') {
            return await ipcRenderer.invoke(mappedCmd, args.messages_json, args.file_path);
          } else if (cmd === 'vision_route_image') {
            return await ipcRenderer.invoke(mappedCmd, args);
          }
          // Agentic tool commands - extract arguments
          else if (cmd === 'read_file') {
            const result = await ipcRenderer.invoke(mappedCmd, args.path);
            return result.success ? result.content : Promise.reject(new Error(result.error));
          } else if (cmd === 'write_file') {
            const result = await ipcRenderer.invoke(mappedCmd, args.path, args.content);
            return result.success ? 'File written successfully' : Promise.reject(new Error(result.error));
          } else if (cmd === 'list_directory') {
            const result = await ipcRenderer.invoke(mappedCmd, args.path);
            return result.success ? result.entries : Promise.reject(new Error(result.error));
          } else if (cmd === 'delete_file') {
            const result = await ipcRenderer.invoke(mappedCmd, args.path);
            return result.success ? 'File deleted' : Promise.reject(new Error(result.error));
          } else if (cmd === 'web_fetch') {
            const result = await ipcRenderer.invoke(mappedCmd, args.url, args.options || {});
            return result.success ? result.body : Promise.reject(new Error(result.error || `HTTP ${result.status}`));
          } else if (cmd === 'glob_search') {
            const result = await ipcRenderer.invoke(mappedCmd, args.pattern, args.dir || args.basePath);
            return result.success ? result.matches : Promise.reject(new Error(result.error));
          } else if (cmd === 'grep_search') {
            const result = await ipcRenderer.invoke(mappedCmd, args);
            return result.success ? result.matches : Promise.reject(new Error(result.error));
          } else if (cmd === 'find_files') {
            const result = await ipcRenderer.invoke(mappedCmd, args.query || args.name || args.pattern, args.searchPath || args.basePath || args.path, { ...(args.options || {}), nameOnly: true });
            return result.success ? result.matches : Promise.reject(new Error(result.error));
          } else if (cmd === 'execute_shell') {
            const result = await ipcRenderer.invoke(mappedCmd, args.command, args.cwd);
            return result;
          } else if (cmd === 'preview_path') {
            return await ipcRenderer.invoke(mappedCmd, args.path || args.filePath || args.targetPath);
          } else if (cmd === 'preview_url') {
            return await ipcRenderer.invoke(mappedCmd, args.url || args.href || args.targetUrl);
          } else if (cmd === 'open_external_url') {
            return await ipcRenderer.invoke(mappedCmd, args.url || args.href || args.targetUrl);
          } else if (cmd === 'open_path') {
            return await ipcRenderer.invoke(mappedCmd, args.path || args.filePath || args.targetPath);
          } else if (cmd === 'internet_status') {
            return await ipcRenderer.invoke(mappedCmd, args);
          }
        }
        return await ipcRenderer.invoke(mappedCmd, args);
      } catch (e) {
        throw new Error(e.message || String(e));
      }
    },
  },
  app: {
    getVersion: async () => '1.0.0',
    getName: async () => 'Hormachuelos',
  },
  shell: {
    open: async (url) => {
      await shell.openExternal(url);
    },
  },
  dialog: {
    open: async () => {
      return await ipcRenderer.invoke('dialog_open');
    },
  },
});

// Also expose a simpler API for direct use
contextBridge.exposeInMainWorld('opus8', {
  invoke: (cmd, args) => ipcRenderer.invoke(cmd, args),
  platform: 'electron',
  version: '1.0.0',

  // File System
  readFile: (filePath) => ipcRenderer.invoke('fs_read_file', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('fs_write_file', filePath, content),
  listDir: (dirPath) => ipcRenderer.invoke('fs_list_dir', dirPath),
  mkdir: (dirPath) => ipcRenderer.invoke('fs_mkdir', dirPath),
  deleteFile: (filePath) => ipcRenderer.invoke('fs_delete', filePath),
  fileExists: (filePath) => ipcRenderer.invoke('fs_exists', filePath),
  fileStat: (filePath) => ipcRenderer.invoke('fs_stat', filePath),
  rename: (oldPath, newPath) => ipcRenderer.invoke('fs_rename', oldPath, newPath),

  // Terminal
  executeCommand: (command, cwd) => ipcRenderer.invoke('terminal_execute', command, cwd),
  executeCommandStream: (command, cwd) => ipcRenderer.invoke('terminal_execute_stream', command, cwd),
  killProcess: (pid) => ipcRenderer.invoke('terminal_kill', pid),
  onTerminalOutput: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on('terminal-output', listener);
    return () => ipcRenderer.removeListener('terminal-output', listener);
  },
  onTerminalExit: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on('terminal-exit', listener);
    return () => ipcRenderer.removeListener('terminal-exit', listener);
  },

  // Network
  fetchUrl: (url, options) => ipcRenderer.invoke('fetch_url', url, options),
  openExternal: (url) => ipcRenderer.invoke('open_external_url', url),
  openPath: (targetPath) => ipcRenderer.invoke('open_path', targetPath),
  previewPath: (targetPath) => ipcRenderer.invoke('preview_path', targetPath),
  previewUrl: (url) => ipcRenderer.invoke('preview_url', url),
  onPreviewUpdate: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on('preview-updated', listener);
    return () => ipcRenderer.removeListener('preview-updated', listener);
  },

  // Working Directory
  getCwd: () => ipcRenderer.invoke('get_cwd'),
  setCwd: (dirPath) => ipcRenderer.invoke('set_cwd', dirPath),

  // File Search
  searchFiles: (query, searchPath, options) => ipcRenderer.invoke('search_files', query, searchPath, options),

  // Dialogs
  openFolderDialog: () => ipcRenderer.invoke('dialog_open_folder'),
  openFileDialog: (filters) => ipcRenderer.invoke('dialog_open_file', filters),
  saveFileDialog: (defaultName) => ipcRenderer.invoke('dialog_save_file', defaultName),

  // System Info
  getSystemInfo: () => ipcRenderer.invoke('get_system_info'),

  // Ruflo
  executeRufloCommand: (args) => ipcRenderer.invoke('execute_ruflo_command', { args }),
  startRufloDaemon: () => ipcRenderer.invoke('start_ruflo_daemon'),
  stopRufloDaemon: () => ipcRenderer.invoke('stop_ruflo_daemon'),

  // Claude CLI
  executeClaudeCli: (command, args, cwd) => ipcRenderer.invoke('execute_claude_cli', { command, args, cwd }),

  // Git
  gitStatus: (repoPath) => ipcRenderer.invoke('git_status', repoPath),
  gitDiff: (options) => ipcRenderer.invoke('git_diff', options),
  gitLog: (options) => ipcRenderer.invoke('git_log', options),

  // Advanced Search
  globSearch: (pattern, basePath) => ipcRenderer.invoke('glob_search', pattern, basePath),
  grepSearch: (options) => ipcRenderer.invoke('grep_search', options),
  findFiles: (query, searchPath, options) => ipcRenderer.invoke('search_files', query, searchPath, { ...(options || {}), nameOnly: true }),
  getInternetStatus: (timeoutMs) => ipcRenderer.invoke('internet_status', { timeoutMs }),

  // Subagent
  subagentRun: (options) => ipcRenderer.invoke('subagent_run', options),
  subagentKill: (pid) => ipcRenderer.invoke('subagent_kill', pid),
  onSubagentOutput: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on('subagent-output', listener);
    return () => ipcRenderer.removeListener('subagent-output', listener);
  },
  onSubagentExit: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on('subagent-exit', listener);
    return () => ipcRenderer.removeListener('subagent-exit', listener);
  },

  // Web Search
  webSearch: (query, maxResults) => ipcRenderer.invoke('web_search', query, maxResults),

  // Chat Export
  exportChatLog: (messagesJson, filePath) => ipcRenderer.invoke('export_chat_log', messagesJson, filePath),

  // Google Drive
  uploadToGoogleDrive: (projectPath, fbName, fbLink) => ipcRenderer.invoke('upload_to_google_drive', projectPath, fbName, fbLink),
});
