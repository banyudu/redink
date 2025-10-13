// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod vector_store;

use std::sync::Arc;
use tokio::sync::Mutex;
use vector_store::VectorStoreState;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
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
            vector_store::vector_store_initialize,
            vector_store::vector_store_add_chunks,
            vector_store::vector_store_search,
            vector_store::vector_store_has_document,
            vector_store::vector_store_delete_document,
            vector_store::vector_store_clear_all,
            vector_store::vector_store_get_count,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
