use wasm_bindgen::prelude::*;
use serde_json::json;
use once_cell::sync::OnceCell;
use std::sync::Mutex;
use serde_json::Value;
use wasm_bindgen_futures::future_to_promise;
use js_sys::Promise;
use web_sys::{window,HtmlElement};

mod filecontent;
mod sqlite_query;
mod render;
mod helper;


const TEMPLATE_MENU: &str = include_str!("../templates/_menu.tera");

const TEMPLATE_EXPLORE: &str = include_str!("../templates/explore.tera");
const TEMPLATE_OVERVIEW_YEAR: &str = include_str!("../templates/overview_year.tera");
const TEMPLATE_OVERVIEW_COUNTRY: &str = include_str!("../templates/overview_country.tera");
const TEMPLATE_OVERVIEW_PLAIN: &str = include_str!("../templates/overview_plain.tera");

const TEMPLATE_TRIP: &str = include_str!("../templates/trip.tera");
const TEMPLATE_IMAGES: &str = include_str!("../templates/images.tera");
const TEMPLATE_MAP: &str = include_str!("../templates/map.tera");

const TEMPLATE_STATISTICS_SUMMARY: &str = include_str!("../templates/statistics_summary.tera");
const TEMPLATE_STATISTICS_VISITS: &str = include_str!("../templates/statistics_visits.tera");
const TEMPLATE_STATISTICS_OVERNIGHTS: &str = include_str!("../templates/statistics_overnights.tera");
const TEMPLATE_STATISTICS_THEMES: &str = include_str!("../templates/statistics_themes.tera");

const TEMPLATE_DATASET: &str = include_str!("../templates/dataset.tera");
const TEMPLATE_SOURCE: &str = include_str!("../templates/source.tera");
const TEMPLATE_ABOUT: &str = include_str!("../templates/about.tera");
const TEMPLATE_SEARCH: &str = include_str!("../templates/search.tera");

const TEMPLATE_TOOLBOX_REPORT: &str = include_str!("../templates/toolbox/toolbox_report.tera");
const TEMPLATE_TOOLBOX_REPORT_OUTPUT: &str = include_str!("../templates/toolbox/toolbox_report_output.tera");
const TEMPLATE_TOOLBOX_INPUT: &str = include_str!("../templates/toolbox/toolbox_input.tera");


macro_rules! define_queries {
    ($($name:ident => $path:expr),+ $(,)?) => {
        $(
            pub const $name: &str = include_str!($path);
        )+

        pub const ALL_QUERIES: &[(&str, &str)] = &[
            $(
                (stringify!($name), $name),
            )+
        ];
    };
}

define_queries! {

    QUERY_EXPLORE => "../queries/explore.sql",

    QUERY_OVERVIEW_YEAR => "../queries/overview/overview_year.sql",
    QUERY_OVERVIEW_COUNTRY => "../queries/overview/overview_country.sql",
    QUERY_OVERVIEW_PLAIN => "../queries/overview/overview_plain.sql",

    QUERY_TRIP_BORDER_CROSSINGS => "../queries/trip/trip_border_crossings.sql",
    QUERY_TRIP_UNIQUE_COUNTRIES => "../queries/trip/trip_unique_countries.sql",
    QUERY_TRIP_MAP_PINS_ACCOMMODATION => "../queries/trip/trip_map_pins_accommodation.sql",
    QUERY_TRIP_MAP_PINS_OVERALL => "../queries/trip/trip_map_pins_overall.sql",
    QUERY_TRIP_ALL_TRIPS => "../queries/trip/trip_all_trips.sql",
    QUERY_TRIP_EVENTS => "../queries/trip/trip_events.sql",
    QUERY_TRIP_SUMMARY => "../queries/trip/trip_summary.sql",
    QUERY_TRIP_PREVIOUS => "../queries/trip/trip_previous.sql",
    QUERY_TRIP_NEXT => "../queries/trip/trip_next.sql",
    QUERY_TRIP_IMMICH_DESC_SEARCH => "../queries/trip/trip_immich_desc_search.sql",
    QUERY_TRIP_IMMICH_ALBUM_NAME => "../queries/trip/trip_immich_album_name.sql",

    QUERY_STATISTICS_VISITS => "../queries/statistics/statistics_visits.sql",
    QUERY_STATISTICS_OVERNIGHTS => "../queries/statistics/statistics_overnights.sql",
    QUERY_STATISTICS_PER_DOMAIN_YEAR => "../queries/statistics/statistics_per_domain_year.sql",
    QUERY_STATISTICS_THEME_COUNT => "../queries/statistics/statistics_theme_count.sql",
    QUERY_STATISTICS_TRIP_COUNT => "../queries/statistics/statistics_trip_count.sql",

    QUERY_COMMON_PARTICIPANT_GROUPS => "../queries/common_participant_groups.sql",
    QUERY_COMMON_TRIP_DOMAINS => "../queries/common_trip_domains.sql",

    QUERY_IMAGES_DATE_LIST => "../queries/images_date_list.sql",
    QUERY_IMAGES_PHOTO_TIME => "../queries/images_photo_time.sql",

    QUERY_MAP_CONTOUR => "../queries/map/map_contour.sql",
    QUERY_MAP_COUNTRY => "../queries/map/map_country.sql",
    QUERY_MAP_COUNTRY_LIST => "../queries/map/map_country_list.sql",
    QUERY_MAP_THEME => "../queries/map/map_theme.sql",

    QUERY_SEARCH_EVENT => "../queries/search_event.sql",
    QUERY_SEARCH_TRIP => "../queries/search_trip.sql",

}

static DB_BYTES: OnceCell<Vec<u8>> = OnceCell::new();
static RENDER_STRUCTURE: OnceCell<Mutex<Value>> = OnceCell::new();

// Other files
static CHART_JS: &str = include_str!("../bundle/chartjs/chart.js");
//static MAPLIBRE_JS: &str = include_str!("../bundle/maplibre-gl/maplibre-gl.js");
//static MAPLIBRE_CSS: &str = include_str!("../bundle/maplibre-gl/maplibre-gl.css");
//static BEWGUNG_CSS: &str = include_str!("../bewegung.css");

// -----------------------------------------------------------------------
// MAKE JAVASCRIPT FUNCTIONS AVAILABLE FOR RUST
// -----------------------------------------------------------------------
#[wasm_bindgen]
extern "C" {
    // Charts
    fn initializeChart();
    fn initializeChartOvernights();
    // Maps
    fn load_trip_map();
    fn load_contour_map();
    fn load_country_map();
    fn load_theme_map();
    fn load_code_editor();
    fn initiate_spreadsheet();
    fn custom_queries();
    //fn inject_css(css: &str);
    // Other
    fn initialize_theme_color();
    /*fn applyTripCoverPhotos(
        immich_api_url: &str,
        immich_api_key: &str,
    );*/
    fn check_immich_authorization();
    fn init_create_trip();

    fn load_filter_OPFS();

    #[wasm_bindgen(catch)]
    async fn get_filter_value_OPFS() -> Result<JsValue, JsValue>;
}

// -----------------------------------------------------------------------
// REAL WASM START
// -----------------------------------------------------------------------
#[wasm_bindgen(start)]
fn start() {

    wasm_bindgen_futures::spawn_local(async {
    
        let (db_bytes, render_structure) = session_load().await;

        DB_BYTES.set(db_bytes).expect("DB already initialized");
        RENDER_STRUCTURE
            .set(Mutex::new(render_structure))
            .expect("Render structure already initialized");

        page_load_internal().await;
    });
}

// -----------------------------------------------------------------------
// MAKE RUST FUNCTIONS AVAILABLE FOR JAVASCRIPT
// -----------------------------------------------------------------------
#[wasm_bindgen]
pub fn page_load() {
    wasm_bindgen_futures::spawn_local(async {
        page_load_internal().await;
    });
}
#[wasm_bindgen]
pub fn chart_js() -> String {
    CHART_JS.to_string()
}
/*#[wasm_bindgen]
pub fn maplibre_js() -> String {
    MAPLIBRE_JS.to_string()
}*/

#[wasm_bindgen]
pub fn get_predefined_query(name: &str) -> Option<String> {
    ALL_QUERIES
    .iter()
    .find(|(k, _)| *k == name)
    .map(|(_, v)| v.to_string())
}

#[wasm_bindgen]
pub fn user_run_sql(sql: String) -> Promise {
    // Wrap your async Rust code in a JS Promise
    future_to_promise(async move {
        helper::user_run_sql_internal(sql).await;
        // Return undefined (JS will see it as resolved)
        Ok(JsValue::undefined())
    })
}


// -----------------------------------------------------------------------
// INITIATE SESSION
// -----------------------------------------------------------------------
async fn session_load() -> (Vec<u8>, serde_json::Value) {

        //inject_css(MAPLIBRE_CSS);

    // -----------------------------------------------------------------------
    // First: Get sqlite database binary
    // -----------------------------------------------------------------------
    
        let db_bytes = filecontent::get_sqlite_binary().await;
        if !db_bytes.is_empty() {
            web_sys::console::log_1(&format!("DB size: {}", db_bytes.len()).into());
        } else {
            web_sys::console::log_1(&"No DB loaded.".into());
        }
    
    // -----------------------------------------------------------------------
    // Second: Handle query parameters
    // -----------------------------------------------------------------------
    
        //let query_params = query_params::get_query_params();
        
        let path = web_sys::window().expect("No window available").location().search().ok()
        .as_deref().and_then(|s| web_sys::UrlSearchParams::new_with_str(s).ok()).and_then(|params| params.get("path"));
    
        let page = path.as_deref().unwrap_or("explore");

        web_sys::console::log_1(&format!("Loading page: {}",page).into());
        
    // -----------------------------------------------------------------------
    // Third: Common data for all pages
    // -----------------------------------------------------------------------
    
        let mut render_structure = json!({});
        render_structure["all"]["query_params"]["path"] = path.into();
        render_structure["all"]["time"] = helper::build_time_json();
    
        // Get translation
        let translation_query = vec![(
            "translation_filename".to_string(),
                                      "SELECT Value FROM bewx_Settings
                                      WHERE AttributeGroup = 'Base'
        AND Attribute = 'LanguageFile';".to_string(),
        )];

        let translation_filename =
        sqlite_query::get_query_data(&db_bytes, translation_query).await;

        let json_obj = serde_json::to_value(&translation_filename).unwrap_or_default();

        let translation_content = if let Some(filename) = json_obj
        .get("translation_filename")
        .and_then(|v| v.get(0))
        .and_then(|v| v.get("Value"))
        .and_then(|v| v.as_str())
        {
            let path = format!("languages/{filename}");

            web_sys::console::log_1(&path.clone().into());

            filecontent::fetch_json(&path)
            .await
            .unwrap_or_default() // missing file -> empty json
        } else {
            // no row OR null OR not string
            serde_json::Value::Null
        };

        // Get all settings
        let settings_query = vec![
            ("settings".to_string(), "SELECT * FROM bewx_Settings;".to_string())
        ];

        let settings_response = sqlite_query::get_query_data(&db_bytes, settings_query).await;

        //crender_structure["all"]["settings"] = serde_json::to_value(&settings_response["settings"]).expect("ERROR");
        //web_sys::console::log_1(&serde_json::to_string(&settings_response["settings"]).expect("ERROR").into());
        render_structure["all"]["settings"] = helper::transform_settings(&settings_response["settings"].as_array().expect("ERROR"));
        //render_structure["all"]["translation"] = translation_content;//.expect("Error with translation data.");

        render_structure["all"]["translation"] = if translation_content.is_null() {
            serde_json::json!({})
        } else {
            translation_content
        };
        //web_sys::console::log_1(&serde_json::to_string(&render_structure["all"]["settings"]).expect("ERROR").into());

        // RENDER TO 'MENU'  -----------------------------------------------------------------------
        let common_data = vec![
            ("common_trip_domains".to_string(), QUERY_COMMON_TRIP_DOMAINS.to_string()),
            ("common_participant_groups".to_string(), QUERY_COMMON_PARTICIPANT_GROUPS.to_string())
        ];
        render_structure["all"]["common"] = sqlite_query::get_query_data(&db_bytes, common_data).await;

        //let _ = render::render2dom(TEMPLATE_MENU, &render_structure["all"], "menu", false);

        let rendered_menu = render::render2dom(TEMPLATE_MENU, &render_structure["all"], "menu", false);

        match &rendered_menu {
            Ok(content) => web_sys::console::log_1(&JsValue::from_str(&format!(
                "render2dom succeeded, content length: {}",
                content.len()
            ))),
            /*Err(e) => web_sys::console::log_1(&JsValue::from_str(&format!(
             " render2dom fail*ed: {}",
             e
             ))),*/
            Err(e) => {
                let msg = format!("render2dom failed: {}", e);

                web_sys::console::log_1(&JsValue::from_str(&msg));

                if let Some(document) = window().and_then(|w| w.document()) {
                    if let Some(el) = document.get_element_by_id("error_msg") {
                        if let Ok(html) = el.dyn_into::<HtmlElement>() {
                            html.set_inner_text(&msg); // safer than inner_html
                        }
                    }
                }
            }
        }

        let _ = rendered_menu;

        //web_sys::console::log_1(&serde_json::to_string(&render_structure["all"]).expect("ERROR").into());

        initialize_theme_color();

        (db_bytes, render_structure)

}

// -----------------------------------------------------------------------
// HOT RELOAD
// -----------------------------------------------------------------------
async fn page_load_internal() {


    //web_sys::console::log_1(&">>----------------------".into());

    let db_bytes = DB_BYTES.get().expect("DB not initialized");
    let render_structure_mutex = RENDER_STRUCTURE.get().expect("Render structure missing");
    let mut map_request = "";

    // Lock the Mutex to get a mutable reference
    let mut render_structure = render_structure_mutex.lock().expect("ERROR");

    let path = web_sys::window().expect("No window available").location().search().ok()
    .as_deref().and_then(|s| web_sys::UrlSearchParams::new_with_str(s).ok()).and_then(|params| params.get("path"));

    let page = path.as_deref().unwrap_or("explore");
   
    //web_sys::console::log_1(&format!("Loading page: {}",page).into());
   
    render_structure["all"]["query_params"]["path"] = path.clone().into();

    render_structure["all"]["time"] = helper::build_time_json();
    //web_sys::console::log_1(&serde_json::to_string(&render_structure["all"]).expect("ERROR").into());

    // READ APPLIED FILTERS  -----------------------------------------------------------------------

    let filter_values = get_filter_value_OPFS().await.unwrap();
    render_structure["all"]["filters"] = serde_wasm_bindgen::from_value(filter_values).unwrap();

    // Prepare filters
    let participant_group = if render_structure["all"]["filters"]["participantGroup"].as_array().map_or(true, |a| a.is_empty()) {
        "(ParticipantGroup)".to_string()
    } else {
        format!("({})", render_structure["all"]["filters"]["participantGroup"].as_array().expect("ERROR").iter().filter_map(|v| v.as_str()).map(|s| format!("'{}'", s)).collect::<Vec<_>>().join(","))
    };
    let trip_domain = if render_structure["all"]["filters"]["tripDomain"].as_array().map_or(true, |a| a.is_empty()) {
        "(TripDomain)".to_string()
    } else {
        format!("({})", render_structure["all"]["filters"]["tripDomain"].as_array().expect("ERROR").iter().filter_map(|v| v.as_str()).map(|s| format!("'{}'", s)).collect::<Vec<_>>().join(","))
    };

    use std::collections::HashMap;
    let cover_photos_list_opt = filecontent::cover_photos_list_from_opfs().await;
    let cover_photos_map: HashMap<String, String> = match cover_photos_list_opt {
        Some(json_str) => serde_json::from_str(&json_str).expect("Invalid JSON"),
        None => HashMap::new(),
    };


    // -----------------------------------------------------------------------
    // Fourth: Page specific data
    // -----------------------------------------------------------------------
        match page {
            "explore" => {
                render_structure["page"] = json!({
                    "title": render_structure.pointer("/all/translation/explore/title").and_then(|v| v.as_str()).unwrap_or("Explore"),
                    "template": TEMPLATE_EXPLORE,
                    "queries": [
                        ["explore", QUERY_EXPLORE.replace("/*","").replace("*/","")
                        .replace("(ParticipantGroup)", &participant_group)
                        .replace("(TripDomain)", &trip_domain)],
                    ]});
                render_structure["all"]["cover_photos_list"] = serde_json::to_value(&cover_photos_map).expect("Failed to convert map to Value");
            }
            "overview:year" => {
                render_structure["page"] = json!({
                    "title": render_structure.pointer("/all/translation/overview/year").and_then(|v| v.as_str()).unwrap_or("Overview: Year"),
                    "template": TEMPLATE_OVERVIEW_YEAR,
                    "queries": [
                        ["overviewYear", QUERY_OVERVIEW_YEAR.replace("/*","").replace("*/","")
                        .replace("(ParticipantGroup)", &participant_group)
                        .replace("(TripDomain)", &trip_domain)]
                    ]});
            }
            "overview:country" => {
                render_structure["page"] = json!({
                    "title": render_structure.pointer("/all/translation/overview/country").and_then(|v| v.as_str()).unwrap_or("Overview: Country"),
                    "template": TEMPLATE_OVERVIEW_COUNTRY,
                    "queries": [
                         // Replace "c.Continent = 'Europa'" in QUERY_OVERVIEW_COUNTRY with value from settings in future version
                         ["overviewCountry", QUERY_OVERVIEW_COUNTRY.to_string().replace("/*","").replace("*/","")
                        .replace("(ParticipantGroup)", &participant_group)
                        .replace("(TripDomain)", &trip_domain)]
                     ]});
            }
            "overview:plain" => {
                render_structure["page"] = json!({
                    "title": render_structure.pointer("/all/translation/overview/plain").and_then(|v| v.as_str()).unwrap_or("Overview: Plain"),
                    "template": TEMPLATE_OVERVIEW_PLAIN,
                    "queries": [
                        ["overviewYear", QUERY_OVERVIEW_PLAIN.to_string().replace("/*","").replace("*/","")
                        .replace("(ParticipantGroup)", &participant_group)
                        .replace("(TripDomain)", &trip_domain)],
                         // Replace "c.Continent = 'Europa'" in QUERY_OVERVIEW_COUNTRY with value from settings in future version
                        ["overviewCountry", QUERY_OVERVIEW_COUNTRY.to_string().replace("/*","").replace("*/","")
                        .replace("(ParticipantGroup)", &participant_group)
                        .replace("(TripDomain)", &trip_domain)]
                    ]});
            }
            "map" => {
                render_structure["page"] = json!({
                    "title": render_structure.pointer("/all/translation/map/title").and_then(|v| v.as_str()).unwrap_or("Map"),
                    "template": TEMPLATE_MAP,
                    "queries": [
                        ["map_country_list", QUERY_MAP_COUNTRY_LIST.replace("(ParticipantGroup)", &participant_group)
                        .replace("(TripDomain)", &trip_domain)],
                        ["map_data", QUERY_MAP_CONTOUR.replace("/*","").replace("*/","")
                        .replace("(ParticipantGroup)", &participant_group)
                        .replace("(TripDomain)", &trip_domain)], //contour
                        ["common_trip_domains", QUERY_COMMON_TRIP_DOMAINS.to_string()],
                    ]});
                map_request = "contour";
                // See later in code for special cases
            }
            "statistics:summary" => {
                render_structure["page"] = json!({
                    "title": render_structure.pointer("/all/translation/statistics/summary").and_then(|v| v.as_str()).unwrap_or("Statistics: Summary"),
                    "template": TEMPLATE_STATISTICS_SUMMARY,
                    "queries": [
                        ["statistics_visits", QUERY_STATISTICS_VISITS.replace("SELECT\n    Country,\n    OL,\n    SS,\n    VSS,\n    PS,\n    OLMQ,\n    SSMQ,\n    VSSMQ,\n    PSMQ\nFROM Aggregated\nORDER BY OL DESC;", "SELECT COUNT(DISTINCT Country) AS TripCount FROM Aggregated;").replace("/*","").replace("*/","")
                        .replace("(ParticipantGroup)", &participant_group)
                        .replace("(TripDomain)", &trip_domain)],
                        ["statistics_trip_count", QUERY_STATISTICS_TRIP_COUNT.replace("/*","").replace("*/","")
                        .replace("(ParticipantGroup)", &participant_group)
                        .replace("(TripDomain)", &trip_domain)],
                        ["statistics_per_domain_year", QUERY_STATISTICS_PER_DOMAIN_YEAR.replace("/*","").replace("*/","")
                        .replace("(ParticipantGroup)", &participant_group)
                        .replace("(TripDomain)", &trip_domain)],
                        ["common_trip_domains", QUERY_COMMON_TRIP_DOMAINS.to_string()],
                    ]});
            }
            "statistics:visits" => {
                render_structure["page"] = json!({
                    "title": render_structure.pointer("/all/translation/statistics/visits").and_then(|v| v.as_str()).unwrap_or("Statistics: Visits"),
                    "template": TEMPLATE_STATISTICS_VISITS,
                    "queries": [
                        ["statistics_visits", QUERY_STATISTICS_VISITS.replace("/*","").replace("*/","")
                        .replace("(ParticipantGroup)", &participant_group)
                        .replace("(TripDomain)", &trip_domain)]
                    ]});
            }
            "statistics:overnights" => {
                render_structure["page"] = json!({
                    "title": render_structure.pointer("/all/translation/statistics/overnights").and_then(|v| v.as_str()).unwrap_or("Statistics: Overnights"),
                    "template": TEMPLATE_STATISTICS_OVERNIGHTS,
                    "queries": [
                        ["statistics_overnights", QUERY_STATISTICS_OVERNIGHTS.replace("/*","").replace("*/","")
                        .replace("(ParticipantGroup)", &participant_group)
                        .replace("(TripDomain)", &trip_domain)],
                    ]});
            }
            "statistics:themes" => {
                render_structure["page"] = json!({
                    "title": render_structure.pointer("/all/settings/Plugin/Theme/translation").and_then(|v| v.as_str()).unwrap_or("Themes"),
                    "template": TEMPLATE_STATISTICS_THEMES,
                    "queries": [
                        ["statistics_theme_count", QUERY_STATISTICS_THEME_COUNT.replace("(ParticipantGroup)", &participant_group)
                        .replace("(TripDomain)", &trip_domain)]
                    ]});
            }
            "dataset" => {
                render_structure["page"] = json!({
                    "title": render_structure.pointer("/all/translation/dataset/title").and_then(|v| v.as_str()).unwrap_or("Dataset"),
                    "settings": render_structure["all"]["settings"],
                    "template": TEMPLATE_DATASET,
                    "queries": [
                        ["table_list", "SELECT name FROM sqlite_master WHERE type IN ('table', 'view') ORDER BY name;"],
                        ["stored_custom_queries", "SELECT ROWID, Name FROM com_CodeCollection WHERE Target = 'BewDataset';"],
                    ]});
                render_structure["all"]["query_templates"] = json!(ALL_QUERIES.iter().map(|(name, _)| name).collect::<Vec<_>>());
            }
            "more:source" => {
                render_structure["page"] = json!({
                    "title": render_structure.pointer("/all/translation/source/title").and_then(|v| v.as_str()).unwrap_or("Source"),
                    "template": TEMPLATE_SOURCE,
                    "queries": [
                        ["cover_photo_original_paths", "SELECT OuterId, CoverPhoto FROM bewa_Overview WHERE CoverPhoto IS NOT NULL;"],
                    ]});
                render_structure["all"]["db_loaded"] = json!(if !&db_bytes.is_empty() { "stored" } else { "missing" });
            }
            "more:about" => {
                // Lägg till versionskontroll
                render_structure["page"] = json!({
                    "title": render_structure.pointer("/all/translation/about/title").and_then(|v| v.as_str()).unwrap_or("About"),
                    "template": TEMPLATE_ABOUT,
                    });
                render_structure["all"]["current_version"] = filecontent::fetch_text("version").await.into();
                render_structure["all"]["latest_version"] = json!(helper::get_latest_version_number().await);
            }
            "toolbox:report" => {
                render_structure["page"] = json!({
                    "title": render_structure.pointer("/all/translation/toolbox/report").and_then(|v| v.as_str()).unwrap_or("Report"),
                        "settings": render_structure["all"]["settings"],
                        "template": TEMPLATE_TOOLBOX_REPORT,
                        });
            }
            "toolbox:input" => {
                render_structure["page"] = json!({
                    "title": render_structure.pointer("/all/translation/toolbox/input").and_then(|v| v.as_str()).unwrap_or("Input"),
                        "settings": render_structure["all"]["settings"],
                        "template": TEMPLATE_TOOLBOX_INPUT,
                        /*"queries": [
                            ["inner_id_max", "SELECT InnerId FROM bewa_Overview WHERE InnerId LIKE '$_INNER_ID_PREFIX_%' ORDER BY SUBSTR(InnerId, 2) + 0 DESC LIMIT 1;".replace("_INNER_ID_PREFIX_","")],
                            ["outer_id_max", "SELECT OuterId FROM bewa_Overview WHERE OuterId GLOB '_OUTER_ID_PREFIX_[0-9]*' ORDER BY CAST(substr(OuterId, length('_OUTER_ID_') + 1) AS INTEGER) DESC LIMIT 1;".replace("_OUTER_ID_PREFIX_","")]
                        ]*/});
                }
            _ => {
                web_sys::console::log_1(&"Second tier.".into());
                

                if let Some(rest) = page.strip_prefix("trip:") {
                    let mut parts = rest.splitn(2, ':');

                    let outer_id = parts.next().filter(|s| !s.is_empty());
                    let inner_id = parts.next().filter(|s| !s.is_empty());

                    match (outer_id, inner_id) {
                        // trip::yyy  → only inner
                        (None, Some(inner_id)) => {
                            render_structure["page"] = json!({
                                "title": inner_id,
                                "template": TEMPLATE_TRIP,
                                "queries": [
                                    ["trip_summary", QUERY_TRIP_SUMMARY.replace("= InnerId", &format!("= '{}'", inner_id))],
                                    ["trip_events", QUERY_TRIP_EVENTS.replace("= e.InnerId", &format!("= '{}'", inner_id))],
                                    ["trip_all_trips", QUERY_TRIP_ALL_TRIPS],
                                    ["common_trip_domains", QUERY_COMMON_TRIP_DOMAINS],
                                    // Lägg till filter
	                            ["trip_unique_countries", QUERY_TRIP_UNIQUE_COUNTRIES.replace("= InnerId", &format!("= '{}'", inner_id))],
                                    ["trip_border_crossings", QUERY_TRIP_BORDER_CROSSINGS.replace("= a.InnerId", &format!("= '{}'", inner_id))],
                                    ["trip_map_pins_overall", QUERY_TRIP_MAP_PINS_OVERALL.replace("= InnerId", &format!("= '{}'", inner_id))],
                                    ["trip_map_pins_accommodation", QUERY_TRIP_MAP_PINS_ACCOMMODATION.replace("= o.InnerId", &format!("= '{}'", inner_id))],
                                    ["trip_previous", QUERY_TRIP_PREVIOUS.replace("= InnerId", &format!("= '{}'", inner_id))
                                    .replace("(ParticipantGroup)", &participant_group)
                                    .replace("(TripDomain)", &trip_domain)],
                                    ["trip_next", QUERY_TRIP_NEXT.replace("= InnerId", &format!("= '{}'", inner_id))
                                    .replace("(ParticipantGroup)", &participant_group)
                                    .replace("(TripDomain)", &trip_domain)],
                                    ["trip_immich_desc_search", QUERY_TRIP_IMMICH_DESC_SEARCH.replace("= InnerId", &format!("= '{}'", inner_id))],
                                    ["trip_immich_album_name", QUERY_TRIP_IMMICH_ALBUM_NAME.replace("= InnerId", &format!("= '{}'", inner_id))],
                                ]});
                            render_structure["all"]["cover_photos_list"] = serde_json::to_value(&cover_photos_map).expect("Failed to convert map to Value");
                            map_request = "trip";
                        }

                        // trip:xxx or trip:xxx:yyy → outer exists
                        (Some(outer_id), _) => {

                        // Title med outer id + dagbok + pass
                        render_structure["page"] = json!({
                            "title": outer_id,
                            "template": TEMPLATE_TRIP,
                            "queries": [
                                ["trip_summary", QUERY_TRIP_SUMMARY.to_string().replace("= OuterId", &format!("= '{}'", outer_id))],
                                ["trip_events", QUERY_TRIP_EVENTS.to_string().replace("= o.OuterId", &format!("= '{}'", outer_id))],
                                ["trip_all_trips", QUERY_TRIP_ALL_TRIPS.to_string()],
                                ["common_trip_domains", QUERY_COMMON_TRIP_DOMAINS.to_string()],
                                // Lägg till filter
                                ["trip_unique_countries", QUERY_TRIP_UNIQUE_COUNTRIES.replace("= OuterId", &format!("= '{}'", outer_id))],
                                ["trip_border_crossings", QUERY_TRIP_BORDER_CROSSINGS.replace("= b.OuterId", &format!("= '{}'", outer_id))],
                                ["trip_map_pins_overall", QUERY_TRIP_MAP_PINS_OVERALL.replace("= OuterId", &format!("= '{}'", outer_id))],
                                ["trip_map_pins_accommodation", QUERY_TRIP_MAP_PINS_ACCOMMODATION.replace("= o.OuterId", &format!("= '{}'", outer_id))],
                                ["trip_previous", QUERY_TRIP_PREVIOUS.replace("= OuterId", &format!("= '{}'", outer_id))
                                    .replace("(ParticipantGroup)", &participant_group)
                                    .replace("(TripDomain)", &trip_domain)],
                                ["trip_next", QUERY_TRIP_NEXT.replace("= OuterId", &format!("= '{}'", outer_id))
                                    .replace("(ParticipantGroup)", &participant_group)
                                    .replace("(TripDomain)", &trip_domain)],
                                ["trip_immich_desc_search", QUERY_TRIP_IMMICH_DESC_SEARCH.replace("= OuterId", &format!("= '{}'", outer_id))],
                                ["trip_immich_album_name", QUERY_TRIP_IMMICH_ALBUM_NAME.replace("= OuterId", &format!("= '{}'", outer_id))],
                            ]});
                            render_structure["all"]["cover_photos_list"] = serde_json::to_value(&cover_photos_map).expect("Failed to convert map to Value");
                            map_request = "trip";

                        }
                        _ => {}
                    }
                }

                if let Some(suffix) = page.strip_prefix("images:") {

                    let mut parts = suffix.splitn(2, ':');

                    if let (Some(trip_id), Some(trip_date)) = (parts.next(), parts.next()) {
                        let trip_id = trip_id.to_string();
                        let trip_date = trip_date.to_string();

                        render_structure["page"] = json!({
                            "title": suffix,
                            "template": TEMPLATE_IMAGES,
                            "queries": [
                                ["images_date_list", QUERY_IMAGES_DATE_LIST.replace("/*_OUTER_ID_*/",&trip_id)],
                                ["common_trip_domains", QUERY_COMMON_TRIP_DOMAINS.to_string()],
                                ["images_photo_time", QUERY_IMAGES_PHOTO_TIME.replace("/*_OUTER_ID_*/",&trip_id)],
                        ]});
                        render_structure["all"]["trip_date"] = json!(trip_date);
                        render_structure["all"]["trip_id"] = json!(trip_id);
                    }
                }
                
                if let Some(suffix) = page.strip_prefix("map:") {
                
                    if let Some(country) = suffix.strip_prefix("country:") {
                    
                        // Title med outer id + dagbok + pass
                        render_structure["page"] = json!({
                            "title": render_structure.pointer("/all/translation/map/title").and_then(|v| v.as_str()).unwrap_or("Map"),
                            "template": TEMPLATE_MAP,
                            "queries": [
                                ["map_country_list", QUERY_MAP_COUNTRY_LIST.replace("(ParticipantGroup)", &participant_group)
                                .replace("(TripDomain)", &trip_domain)],
                                ["map_data", QUERY_MAP_COUNTRY.replace("_COUNTRY_",country).replace("(ParticipantGroup)", &participant_group)
                                .replace("(TripDomain)", &trip_domain)], //country
                                ["common_trip_domains", QUERY_COMMON_TRIP_DOMAINS.to_string()],
                            ]});
                        map_request = "country";
                    
                    } else if let Some(theme) = suffix.strip_prefix("theme:") {
                    
                        // Title med outer id + dagbok + pass
                        render_structure["page"] = json!({
                            "title": render_structure.pointer("/all/translation/map/title").and_then(|v| v.as_str()).unwrap_or("Map"),
                            "template": TEMPLATE_MAP,
                            "queries": [
                                ["map_country_list", QUERY_MAP_COUNTRY_LIST.replace("(ParticipantGroup)", &participant_group)
                                .replace("(TripDomain)", &trip_domain)],
                                ["map_data", QUERY_MAP_THEME.replace("_THEME_",theme).replace("(ParticipantGroup)", &participant_group)
                                .replace("(TripDomain)", &trip_domain)], //theme
                                ["common_trip_domains", QUERY_COMMON_TRIP_DOMAINS.to_string()],
                            ]});
                        map_request = "theme";
                    
                    }

                }
                
                if let Some(suffix) = page.strip_prefix("search:") {
                    // Title med outer id + dagbok + pass
                    render_structure["page"] = json!({
                        "title": suffix,
                        "template": TEMPLATE_SEARCH,
                        "settings": serde_json::to_value(&render_structure["all"]["settings"]).expect("ERROR"),
                        "queries": [
                            ["search_trip", QUERY_SEARCH_TRIP.to_string().replace("/*_STRING_*/", suffix).replace("(ParticipantGroup)", &participant_group)
                            .replace("(TripDomain)", &trip_domain)],
                            ["search_event", QUERY_SEARCH_EVENT.to_string().replace("/*_STRING_*/", suffix).replace("(ParticipantGroup)", &participant_group)
                            .replace("(TripDomain)", &trip_domain)],
                        ]});
                }

                if let Some(suffix) = page.strip_prefix("toolbox:report:output:") {

                    let mut parts = suffix.splitn(2, ':');

                    if let (Some(title_string), Some(backside_string)) = (parts.next(), parts.next()) {
                        let title_string = title_string.to_string();
                        let backside_string = backside_string.to_string();

                        render_structure["page"] = json!({
                            "title": suffix,
                            "template": TEMPLATE_TOOLBOX_REPORT_OUTPUT,
                            "queries": [
                                ["output", ""],
                            ]});
                        render_structure["all"]["title_string"] = json!(title_string);
                        render_structure["all"]["backside_string"] = json!(backside_string);
                    }
                }
                
            }
        }

    // -----------------------------------------------------------------------
    // Fifth: Render content
    // -----------------------------------------------------------------------

        //web_sys::console::log_1(&serde_json::to_string(&render_structure["page"]).expect("ERROR").into());
        
        // SET TITLE  -----------------------------------------------------------------------
    
        //web_sys::console::log_1(&"----------------------".into());

        let title = render_structure["page"]["title"].as_str().unwrap_or("Default Title");
        web_sys::window().expect("ERROR").document().expect("ERROR").set_title(&format!("{title} - Immer in Bewegung"));

        //web_sys::console::log_1(&serde_json::to_string(&render_structure["page"]["title"]).expect("ERROR").into());
    
        // RUN SQLITE QUERIES  -----------------------------------------------------------------------

        //web_sys::console::log_1(&"----------------------".into());
        let combined_query: Vec<(String, String)> = render_structure["page"]["queries"]
        .as_array().unwrap_or(&Vec::new()).iter().map(|row| {
            // Each row: [key, value]
            let k = row[0].as_str().unwrap_or("").to_string();
            let v = row[1].as_str().unwrap_or("").to_string();
            (k, v)
        })
        .collect();

        let query_response: serde_json::Value = sqlite_query::get_query_data(&db_bytes, combined_query).await;
        //web_sys::console::log_1(&serde_json::to_string(&query_response).expect("ERROR").into());
    
        let mut merged_structure = render_structure["all"].clone();

        // Merge if both are objects
        match (&mut merged_structure, query_response) {
            (serde_json::Value::Object(ref mut target), serde_json::Value::Object(source)) => {
                for (k, v) in source {
                    target.insert(k, v);
                }
            }
            (_, other) => {
                merged_structure = other;
            }
        }

        // RENDER TO 'APP'  -----------------------------------------------------------------------
        //let _ = render::render2dom(&render_structure["page"]["template"].as_str().expect("template must be a string"), &merged_structure, "app", true);

        let translate_iib_markdown_2link =!matches!(map_request, "trip" | "contour" | "country" | "theme");


        let rendered_result = render::render2dom(
            &render_structure["page"]["template"]
            .as_str()
            .expect("template must be a string"),
                &merged_structure,
                "app",
                translate_iib_markdown_2link,
        );

        match &rendered_result {
            Ok(content) => web_sys::console::log_1(&JsValue::from_str(&format!(
                "render2dom succeeded, content length: {}",
                content.len()
            ))),
            /*Err(e) => web_sys::console::log_1(&JsValue::from_str(&format!(
                "render2dom failed: {}",
                e
            ))),*/
            Err(e) => {
                let msg = format!("render2dom failed: {}", e);

                web_sys::console::log_1(&JsValue::from_str(&msg));

                if let Some(document) = window().and_then(|w| w.document()) {
                    if let Some(el) = document.get_element_by_id("error_msg") {
                        if let Ok(html) = el.dyn_into::<HtmlElement>() {
                            html.set_inner_text(&msg); // safer than inner_html
                        }
                    }
                }
            }
        }

        let _ = rendered_result;

        load_filter_OPFS();
        
        // POST CODE  -----------------------------------------------------------------------

        match map_request {
            "trip" => load_trip_map(),
            "contour" => load_contour_map(),
            "country" => load_country_map(),
            "theme" => load_theme_map(),
            _ => {}
        }

        match page {
            "trip" => {
                //applyTripCoverPhotos(&render_structure["all"]["settings"]["Feature"]["ImmichApiUrl"].to_string(),&render_structure["all"]["settings"]["Feature"]["ImmichApiKey"].to_string());
            }
            "dataset" => {
                load_code_editor();
                initiate_spreadsheet();
                //custom_queries(); // Need input value (e.g. get code editor content)
            }
            "statistics:summary" => {
                initializeChart();
            }
            "statistics:overnights" => {
                initializeChartOvernights();
            }
            "more:source" => check_immich_authorization(),
            "toolbox:input" => init_create_trip(),
            _ => {}
        }

}
