// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod arxiv;
mod vector_store;

use std::sync::Arc;
use tokio::sync::Mutex;
use vector_store::VectorStoreState;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

// Only include devtools functionality in debug builds
#[cfg(debug_assertions)]
#[tauri::command]
async fn toggle_devtools(_window: tauri::Window) -> Result<(), String> {
    // In debug builds, try to open devtools
    // Note: devtools API may not be available in all Tauri versions
    // For now, we'll use a workaround approach
    println!("[Debug] DevTools toggle requested in debug build");

    // Try to use the window's native devtools functionality
    // This is a placeholder implementation - the exact API may vary
    match std::env::var("TAURI_ENV") {
        Ok(env) if env == "dev" => {
            println!("[Debug] Development environment detected, DevTools access allowed");
            // TODO: Implement actual devtools toggle when API is stable
            Ok(())
        }
        _ => {
            println!("[Debug] DevTools toggle not yet fully implemented");
            Err("DevTools functionality is not yet fully implemented".to_string())
        }
    }
}

// Stub implementation for release builds
#[cfg(not(debug_assertions))]
#[tauri::command]
async fn toggle_devtools(_window: tauri::Window) -> Result<(), String> {
    // In production builds, deny access to devtools for security
    println!("[Security] DevTools access denied in production build");
    Err("DevTools access is disabled in production builds for security reasons".to_string())
}
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let vector_store_state = Arc::new(Mutex::new(VectorStoreState::new()));

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_shell::init())
        .manage(vector_store_state)
        .invoke_handler(tauri::generate_handler![
            greet,
            toggle_devtools,
            vector_store::vector_store_initialize,
            vector_store::vector_store_add_chunks,
            vector_store::vector_store_search,
            vector_store::vector_store_has_document,
            vector_store::vector_store_delete_document,
            vector_store::vector_store_clear_all,
            vector_store::vector_store_get_count,
            arxiv::search_arxiv_papers,
            arxiv::get_papers_by_categories,
            arxiv::get_paper_by_id,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
