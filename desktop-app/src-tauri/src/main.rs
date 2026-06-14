// ============================================================
// Opus8 Desktop — Tauri Entry Point
// ============================================================

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    opus8_lib::run();
}
