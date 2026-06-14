// ============================================================
// Opus8 Desktop — Library Entry Point
// Registers all Tauri commands and plugins
// ============================================================

mod commands;
mod proxy;
mod daemon;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .setup(|app| {
            // Set app title
            let window = app.get_webview_window("main").unwrap();
            let _ = window.set_title("Opus8 — AI Coding Platform");

            #[cfg(debug_assertions)]
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::execute_claude_cli,
            commands::execute_ruflo_command,
            commands::start_ruflo_daemon,
            commands::stop_ruflo_daemon,
            commands::get_env_overrides,
            commands::check_balance,
            commands::generate_api_key,
            commands::export_chat_log,
            commands::vision_route_image,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Opus8 application");
}
