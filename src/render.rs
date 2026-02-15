use tera::{Value, Context, Tera};
use regex::Regex;

/*
pub fn render2dom(
    template_content: &str,
    json_object: &Value,
    element_id: &str,
    include_wrapper: bool,
) -> Result<String, String> {

    let context = Context::from_serialize(json_object)
        .map_err(|e| format!("Context error: {e:?}"))?;

    let _rendered = Tera::one_off(template_content, &context, true)
        .map_err(|e| format!("Tera render error: {e:?}"))?;
        
    
    // Convert text to link
    if include_wrapper == true {
        let external_map_provider = json_object
        .get("settings")
        .and_then(|s| s.get("Base"))
        .and_then(|b| b.get("ExternalMapProvider"))
        .and_then(|v| v.as_str())
        .ok_or("Missing ExternalMapProvider")?;

        let re = Regex::new(r"\{([^}]*)\}\(([^)]*)\)\[([^\]]*)\]")
            .map_err(|e| format!("Regex error: {e:?}"))?;

        let _rendered = re
            .replace_all(&_rendered, |caps: &regex::Captures| {
                format!("<a target=\"_blank\" class=\"theme-link\" href=\"{}{}\">{}</a>", &external_map_provider, &caps[2], &caps[1])
            })
            .into_owned();
    }
        
    let window = web_sys::window()
        .ok_or("No window available")?;

    let document = window
        .document()
        .ok_or("No document available")?;

    let element = document
        .get_element_by_id(element_id)
        .ok_or(format!("Element #{element_id} not found"))?;

    element.set_inner_html(&_rendered);

    Ok(_rendered)
}*/

pub fn render2dom(
    template_content: &str,
    json_object: &Value,
    element_id: &str,
    include_wrapper: bool,
) -> Result<String, String> {

    let context = Context::from_serialize(json_object)
    .map_err(|e| format!("Context error: {e:?}"))?;

    // Make rendered mutable
    let mut rendered = Tera::one_off(template_content, &context, true)
    .map_err(|e| format!("Tera render error: {e:?}"))?;

    // Convert text to link if requested
    if include_wrapper {
        let external_map_provider = json_object
        .get("settings")
        .and_then(|s| s.get("Other"))
        .and_then(|b| b.get("ExternalMapProvider"))
        .and_then(|v| v.as_str())
        .ok_or("Missing ExternalMapProvider")?;

        let re = Regex::new(r"\{([^}]*)\}\(([^)]*)\)\[([^\]]*)\]")
        .map_err(|e| format!("Regex error: {e:?}"))?;

        rendered = re
        .replace_all(&rendered, |caps: &regex::Captures| {
            format!(
                "<a target=\"_blank\" class=\"theme-link\" href=\"{}{}\">{}</a>",
                external_map_provider, &caps[2], &caps[1]
            )
        })
        .into_owned();
    }

    let window = web_sys::window()
    .ok_or("No window available")?;

    let document = window
    .document()
    .ok_or("No document available")?;

    let element = document
    .get_element_by_id(element_id)
    .ok_or(format!("Element #{element_id} not found"))?;

    element.set_inner_html(&rendered);

    Ok(rendered)
}

