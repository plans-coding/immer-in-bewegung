use crate::sqlite_query;
use crate::DB_BYTES;
use crate::filecontent;

use chrono::Local;
use serde_json::{json, Value, Map};
use wasm_bindgen::JsCast;


pub fn build_time_json() -> Value {
    let now = Local::now();
    json!({
          "now_year": now.format("%Y").to_string(),
          "now_date": now.format("%Y-%m-%d").to_string(),
    })
}

pub async fn get_latest_version_number() -> String {
    let latest_version_number = filecontent::fetch_text(
        "https://raw.githubusercontent.com/plans-coding/immer-in-bewegung/refs/heads/main/version"
    ).await;

    latest_version_number.expect("No version number found")
}

pub fn transform_settings(settings_array: &[Value]) -> Value {
    let mut result = Map::new();

    for setting in settings_array {
        let attribute = setting["Attribute"].as_str().unwrap_or("unknown");
        let group = setting["AttributeGroup"].as_str().unwrap_or("unknown");

        // Just clone the value as-is, no JSON parsing
        let value = setting["Value"].clone();

        result
        .entry(group)
        .or_insert_with(|| Value::Object(Map::new()))
        .as_object_mut()
        .unwrap()
        .insert(attribute.to_string(), value);
    }

    Value::Object(result)
}

// JSON output

pub async fn user_run_sql_internal(sql: String) {
    let db_bytes = DB_BYTES.get().expect("DB not initialized");

    let combined_query = vec![
        ("user_sql".to_string(), sql.clone())
    ];

    let query_response: serde_json::Value = sqlite_query::get_query_data_preserve_order(&db_bytes, combined_query).await;

    // Extract the "user_sql" object with "columns" + "rows"
    let result = &query_response["user_sql"];

    // Serialize directly; columns are first, rows second
    let json = serde_json::to_string(result).expect("JSON serialization failed");

    let document = match web_sys::window().and_then(|w| w.document()) {
        Some(d) => d,
        None => return,
    };

    let element = match document.get_element_by_id("sql_output_data") {
        Some(e) => e,
        None => {
            web_sys::console::error_1(
                &"Element #sql_output_data not found".into()
            );
            return;
        }
    };

    let html_element: web_sys::HtmlElement = match element.dyn_into() {
        Ok(e) => e,
        Err(_) => return,
    };

    html_element.set_inner_text(&json);
}

