use wasm_bindgen::JsCast;
use wasm_bindgen_futures::JsFuture;
use web_sys::{window, Response};
//use opfs::persistent::{DirectoryHandle, app_specific_dir};
use opfs::persistent::app_specific_dir;
use opfs::{GetFileHandleOptions, CreateWritableOptions};
use opfs::{DirectoryHandle as _, FileHandle as _, WritableFileStream as _}; // traits

// Fetch plain text from URL
pub async fn fetch_text(url: &str) -> Option<String> {
    let window = window()?;
    let response = JsFuture::from(window.fetch_with_str(url)).await.ok()?;
    let response: Response = response.dyn_into().ok()?;
    JsFuture::from(response.text().ok()?).await.ok()?.as_string()
}

// Fetch json from URL
pub async fn fetch_json(url: &str) -> Option<serde_json::Value> {
    // Get the window object
    let window = window()?;

    // Fetch the URL
    let resp_value = JsFuture::from(window.fetch_with_str(url)).await.ok()?;

    // Convert to Response
    let response: Response = resp_value.dyn_into().ok()?;

    // Get the text content
    let text = JsFuture::from(response.text().ok()?).await.ok()?;
    let text_str = text.as_string()?;

    // Parse JSON
    serde_json::from_str(&text_str).ok()
}

// Fetch bytes from URL
async fn fetch_bytes(url: &str) -> Option<Vec<u8>> {
    let window = window()?;
    let response = JsFuture::from(window.fetch_with_str(url)).await.ok()?;
    let response: Response = response.dyn_into().ok()?;
    let array_buffer = JsFuture::from(response.array_buffer().ok()?).await.ok()?;
    let u8_array = js_sys::Uint8Array::new(&array_buffer);
    Some(u8_array.to_vec())
}

// Get SQLite database as bytes
pub async fn get_sqlite_binary() -> Vec<u8> {
    let dir = match app_specific_dir().await {
        Ok(d) => d,
        Err(e) => {
            web_sys::console::log_1(&format!("Failed to access OPFS dir: {:?}", e).into());
            return Vec::new();
        }
    };

    // 1) Check if file exists in OPFS
    if let Ok(file) = dir.get_file_handle_with_options(
        "chronik.db",
        &GetFileHandleOptions { create: false }
    ).await {
        web_sys::console::log_1(&"Found chronik.db in OPFS".into());
        return file.read().await.unwrap_or_default();
    }

    web_sys::console::log_1(&"No chronik.db → checking server fallback...".into());

    // 2) Load server_db_path.txt
    let server_path = match fetch_text("server_db_path.txt").await {
        Some(path) if !path.trim().is_empty() => path.trim().to_string(),
        _ => {
            web_sys::console::log_1(&"server_db_path.txt missing or empty".into());
            return Vec::new();
        }
    };

    web_sys::console::log_1(&format!("Server path: {}", server_path).into());

    // Download actual DB file
    let db_bytes = match fetch_bytes(&server_path).await {
        Some(bytes) => bytes,
        None => {
            web_sys::console::log_1(&"Failed to fetch DB bytes".into());
            return Vec::new();
        }
    };

    // Save to OPFS
    match dir.get_file_handle_with_options(
        "chronik.db",
        &GetFileHandleOptions { create: true }
    ).await {
        Ok(mut file) => {
            let write_options = CreateWritableOptions { keep_existing_data: false };
            match file.create_writable_with_options(&write_options).await {
                Ok(mut writer) => {
                    if writer.write_at_cursor_pos(db_bytes.clone()).await.is_ok() {
                        let _ = writer.close().await;
                        web_sys::console::log_1(&"Saved DB to OPFS".into());
                        return db_bytes;
                    }
                }
                Err(e) => {
                    web_sys::console::log_1(&format!("Failed to create writable stream: {:?}", e).into());
                }
            }
        }
        Err(e) => {
            web_sys::console::log_1(&format!("Failed to get file handle: {:?}", e).into());
        }
    }

    Vec::new()
}

pub async fn cover_photos_list_from_opfs() -> Option<String> {
    // Get app-specific directory
    let dir = match app_specific_dir().await {
        Ok(d) => d,
        Err(e) => {
            web_sys::console::log_1(&format!("Failed to access OPFS dir: {:?}", e).into());
            return None;
        }
    };

    // Try to get the file handle
    let file = match dir
    .get_file_handle_with_options("cover_photos.json", &GetFileHandleOptions { create: false })
    .await
    {
        Ok(f) => f,
        Err(_) => {
            web_sys::console::log_1(&"cover_photos.json not found in OPFS".into());
            return None;
        }
    };

    // Read file content
    match file.read().await {
        Ok(bytes) => match String::from_utf8(bytes) {
            Ok(content) => Some(content),
            Err(e) => {
                web_sys::console::log_1(&format!("File is not valid UTF-8: {:?}", e).into());
                None
            }
        },
        Err(e) => {
            web_sys::console::log_1(&format!("Failed to read file: {:?}", e).into());
            None
        }
    }
}
