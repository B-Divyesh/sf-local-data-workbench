pub mod engine;

#[cfg(feature = "desktop")]
use engine::{DatasetSummary, ExportRequest, ExportResult, RecipeStep, TableData};

#[cfg(feature = "desktop")]
#[tauri::command]
async fn analyze_file(path: String) -> Result<DatasetSummary, String> {
    tauri::async_runtime::spawn_blocking(move || engine::analyze_file(&path))
        .await
        .map_err(|error| format!("Local worker stopped: {error}"))?
}

#[cfg(feature = "desktop")]
#[tauri::command]
async fn preview_recipe(path: String, steps: Vec<RecipeStep>) -> Result<TableData, String> {
    tauri::async_runtime::spawn_blocking(move || engine::preview_recipe(&path, &steps))
        .await
        .map_err(|error| format!("Local worker stopped: {error}"))?
}

#[cfg(feature = "desktop")]
#[tauri::command]
async fn export_result(request: ExportRequest) -> Result<ExportResult, String> {
    tauri::async_runtime::spawn_blocking(move || engine::export_result(&request))
        .await
        .map_err(|error| format!("Local worker stopped: {error}"))?
}

#[cfg(feature = "desktop")]
#[tauri::command]
fn read_text_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(path).map_err(|error| format!("Could not read recipe: {error}"))
}

#[cfg(feature = "desktop")]
#[tauri::command]
fn write_text_file(path: String, contents: String) -> Result<(), String> {
    std::fs::write(path, contents).map_err(|error| format!("Could not write recipe: {error}"))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
#[cfg(feature = "desktop")]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            analyze_file,
            preview_recipe,
            export_result,
            read_text_file,
            write_text_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running Local Data Workbench");
}
