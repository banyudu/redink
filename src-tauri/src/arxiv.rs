use lazy_static::lazy_static;
use quick_xml::events::Event;
use quick_xml::Reader;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::error::Error;

lazy_static! {
    static ref CATEGORY_MAP: HashMap<String, String> = {
        let categories_json = include_str!("categories.json");
        serde_json::from_str(categories_json).expect("Failed to parse categories.json")
    };
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArxivPaper {
    pub id: String,
    pub title: String,
    pub authors: String,
    pub category: String,
    pub published_date: String,
    pub abstract_text: String,
    pub download_url: String,
    pub pdf_url: String,
    pub categories: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArxivSearchOptions {
    pub max_results: Option<u32>,
    pub sort_by: Option<String>,
    pub sort_order: Option<String>,
}

impl Default for ArxivSearchOptions {
    fn default() -> Self {
        Self {
            max_results: Some(20),
            sort_by: Some("relevance".to_string()),
            sort_order: Some("descending".to_string()),
        }
    }
}

const ARXIV_API_BASE: &str = "https://export.arxiv.org/api/query";

fn get_category_map() -> &'static HashMap<String, String> {
    &CATEGORY_MAP
}

fn format_category(category: &str) -> String {
    let category_map = get_category_map();
    category_map
        .get(category)
        .map(|name| name.to_string())
        .unwrap_or_else(|| {
            category
                .split('.')
                .next()
                .unwrap_or(category)
                .to_uppercase()
        })
}

fn parse_arxiv_xml(xml_content: &str) -> Result<Vec<ArxivPaper>, Box<dyn Error>> {
    let mut reader = Reader::from_str(xml_content);
    let mut buf = Vec::new();
    let mut papers = Vec::new();
    let mut current_paper: Option<ArxivPaper> = None;
    let mut current_text = String::new();
    let mut in_entry = false;
    let mut authors = Vec::new();
    let mut categories = Vec::new();
    let mut primary_category = String::new();
    let mut pdf_url = String::new();

    loop {
        match reader.read_event_into(&mut buf)? {
            Event::Start(ref e) => {
                let element_name = String::from_utf8_lossy(e.name().as_ref()).to_string();
                current_text.clear();

                match element_name.as_str() {
                    "entry" => {
                        in_entry = true;
                        current_paper = Some(ArxivPaper {
                            id: String::new(),
                            title: String::new(),
                            authors: String::new(),
                            category: String::new(),
                            published_date: String::new(),
                            abstract_text: String::new(),
                            download_url: String::new(),
                            pdf_url: String::new(),
                            categories: Vec::new(),
                        });
                        authors.clear();
                        categories.clear();
                        primary_category.clear();
                        pdf_url.clear();
                    }
                    _ => {}
                }
            }
            Event::Empty(ref e) => {
                let element_name = String::from_utf8_lossy(e.name().as_ref()).to_string();

                match element_name.as_str() {
                    "category" => {
                        if let Ok(Some(term)) = e.try_get_attribute("term") {
                            let term_str = String::from_utf8_lossy(&term.value).to_string();
                            categories.push(term_str);
                        }
                    }
                    name if name.ends_with("primary_category") => {
                        if let Ok(Some(term)) = e.try_get_attribute("term") {
                            primary_category = String::from_utf8_lossy(&term.value).to_string();
                        }
                    }
                    "link" => {
                        if let Ok(Some(title)) = e.try_get_attribute("title") {
                            let title_str = String::from_utf8_lossy(&title.value);
                            if title_str == "pdf" {
                                if let Ok(Some(href)) = e.try_get_attribute("href") {
                                    pdf_url = String::from_utf8_lossy(&href.value).to_string();
                                }
                            }
                        }
                    }
                    _ => {}
                }
            }
            Event::Text(ref e) => {
                let text = e.unescape()?.to_string();
                current_text.push_str(&text);
            }
            Event::End(ref e) => {
                let element_name = String::from_utf8_lossy(e.name().as_ref()).to_string();

                if in_entry && current_paper.is_some() {
                    let paper = current_paper.as_mut().unwrap();

                    match element_name.as_str() {
                        "id" => {
                            // Extract arXiv ID from URL
                            if let Some(id_part) = current_text.split("/abs/").nth(1) {
                                paper.id = id_part.split('v').next().unwrap_or(id_part).to_string();
                            }
                        }
                        "title" => {
                            paper.title = current_text.trim().replace('\n', " ").replace("  ", " ");
                        }
                        "summary" => {
                            paper.abstract_text =
                                current_text.trim().replace('\n', " ").replace("  ", " ");
                        }
                        "published" => {
                            paper.published_date = current_text
                                .split('T')
                                .next()
                                .unwrap_or(&current_text)
                                .to_string();
                        }
                        "name" => {
                            // This is an author name inside an author element
                            authors.push(current_text.trim().to_string());
                        }
                        "entry" => {
                            // Finalize the paper
                            paper.authors = authors.join(", ");
                            if paper.authors.is_empty() {
                                paper.authors = "Unknown".to_string();
                            }

                            let main_category = if !primary_category.is_empty() {
                                primary_category.clone()
                            } else if !categories.is_empty() {
                                categories[0].clone()
                            } else {
                                "Unknown".to_string()
                            };

                            paper.category = format_category(&main_category);
                            paper.categories = categories.clone();

                            // Set PDF URL
                            if !pdf_url.is_empty() {
                                paper.pdf_url = pdf_url.clone();
                                paper.download_url = pdf_url.clone();
                            } else {
                                let pdf_url_fallback =
                                    format!("https://arxiv.org/pdf/{}.pdf", paper.id);
                                paper.pdf_url = pdf_url_fallback.clone();
                                paper.download_url = pdf_url_fallback;
                            }

                            papers.push(paper.clone());
                            current_paper = None;
                            in_entry = false;
                        }
                        _ => {}
                    }
                }
                current_text.clear();
            }
            Event::Eof => break,
            _ => {}
        }
        buf.clear();
    }

    Ok(papers)
}

async fn fetch_arxiv_papers(
    query: &str,
    options: &ArxivSearchOptions,
) -> Result<Vec<ArxivPaper>, Box<dyn Error>> {
    let max_results = options.max_results.unwrap_or(20);
    let sort_by = options.sort_by.as_deref().unwrap_or("relevance");
    let sort_order = options.sort_order.as_deref().unwrap_or("descending");

    // Handle empty query - fetch featured papers instead
    let actual_query = if query.trim().is_empty() {
        "cat:cs.AI+OR+cat:cs.LG+OR+cat:cs.CL+OR+cat:cs.CV"
    } else {
        query
    };

    let encoded_query = actual_query.replace(' ', "+");

    let url = format!(
        "{}?search_query={}&start=0&max_results={}&sortBy={}&sortOrder={}",
        ARXIV_API_BASE, encoded_query, max_results, sort_by, sort_order
    );

    println!("[ArXiv Rust] Fetching from URL: {}", url);

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    let response = client.get(&url).send().await.map_err(|e| {
        if e.is_timeout() {
            "Request timed out. Please check your internet connection and try again.".to_string()
        } else if e.is_connect() {
            "Failed to connect to ArXiv. Please check your internet connection.".to_string()
        } else {
            format!("Network error: {}", e)
        }
    })?;

    if !response.status().is_success() {
        let status = response.status();
        let error_msg = match status.as_u16() {
            429 => "Too many requests to ArXiv. Please wait a moment and try again.".to_string(),
            500..=599 => {
                "ArXiv service is temporarily unavailable. Please try again later.".to_string()
            }
            _ => format!(
                "ArXiv API error: {} ({})",
                status.canonical_reason().unwrap_or("Unknown"),
                status
            ),
        };
        return Err(error_msg.into());
    }

    let xml_content = response
        .text()
        .await
        .map_err(|e| format!("Failed to read response from ArXiv: {}", e))?;
    println!("[ArXiv Rust] Received XML, length: {}", xml_content.len());

    if xml_content.is_empty() {
        return Err("Received empty response from ArXiv. Please try again.".into());
    }

    let papers = parse_arxiv_xml(&xml_content)
        .map_err(|e| format!("Failed to parse ArXiv response: {}", e))?;
    println!("[ArXiv Rust] Parsed {} papers", papers.len());

    Ok(papers)
}

#[tauri::command]
pub async fn search_arxiv_papers(
    query: String,
    options: Option<ArxivSearchOptions>,
) -> Result<Vec<ArxivPaper>, String> {
    let search_options = options.unwrap_or_default();

    println!("[ArXiv Rust] Searching papers with query: '{}'", query);
    println!("[ArXiv Rust] Options: {:?}", search_options);

    match fetch_arxiv_papers(&query, &search_options).await {
        Ok(papers) => {
            println!("[ArXiv Rust] Successfully fetched {} papers", papers.len());
            Ok(papers)
        }
        Err(e) => {
            let error_msg = e.to_string();
            println!("[ArXiv Rust] Error fetching papers: {}", error_msg);

            // Provide more user-friendly error messages
            let user_error = if error_msg.contains("timeout") {
                "Request timed out. Please check your internet connection and try again."
                    .to_string()
            } else if error_msg.contains("connect") {
                "Unable to connect to ArXiv. Please check your internet connection.".to_string()
            } else if error_msg.contains("DNS") {
                "DNS resolution failed. Please check your network settings.".to_string()
            } else {
                error_msg
            };

            Err(user_error)
        }
    }
}

#[tauri::command]
pub async fn get_papers_by_categories(
    categories: Vec<String>,
    max_results: Option<u32>,
) -> Result<Vec<ArxivPaper>, String> {
    let max_results = max_results.unwrap_or(20);

    if categories.is_empty() {
        // Return featured papers if no categories specified
        return search_arxiv_papers(
            String::new(),
            Some(ArxivSearchOptions {
                max_results: Some(max_results),
                sort_by: Some("submittedDate".to_string()),
                sort_order: Some("descending".to_string()),
            }),
        )
        .await;
    }

    // Build query for multiple categories
    let query = categories
        .iter()
        .map(|cat| format!("cat:{}", cat))
        .collect::<Vec<_>>()
        .join("+OR+");

    println!("[ArXiv Rust] Searching by categories: {:?}", categories);
    println!("[ArXiv Rust] Generated query: {}", query);

    search_arxiv_papers(
        query,
        Some(ArxivSearchOptions {
            max_results: Some(max_results),
            sort_by: Some("submittedDate".to_string()),
            sort_order: Some("descending".to_string()),
        }),
    )
    .await
}

#[tauri::command]
pub async fn get_paper_by_id(arxiv_id: String) -> Result<Option<ArxivPaper>, String> {
    let query = format!("id:{}", arxiv_id);

    match search_arxiv_papers(
        query,
        Some(ArxivSearchOptions {
            max_results: Some(1),
            sort_by: Some("relevance".to_string()),
            sort_order: Some("descending".to_string()),
        }),
    )
    .await
    {
        Ok(mut papers) => {
            if papers.is_empty() {
                Ok(None)
            } else {
                Ok(Some(papers.remove(0)))
            }
        }
        Err(e) => {
            println!("[ArXiv Rust] Error getting paper by ID: {}", e);
            Err(e)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn test_parse_arxiv_xml_with_sample() {
        let sample_xml = fs::read_to_string(concat!(
            env!("CARGO_MANIFEST_DIR"),
            "/mock/data/sample_arxiv.xml"
        ))
        .expect("Failed to read sample_arxiv.xml");

        let result = parse_arxiv_xml(&sample_xml);
        assert!(result.is_ok(), "XML parsing should succeed");

        let papers = result.unwrap();
        assert_eq!(papers.len(), 2, "Should parse 2 papers");

        // Test first paper
        let first_paper = &papers[0];
        assert_eq!(first_paper.id, "2311.18775");
        assert_eq!(first_paper.title, "GPT-4 Vision Technical Report");
        assert_eq!(first_paper.authors, "OpenAI Team, Research Scientist");
        assert_eq!(first_paper.category, "Computation and Language");
        assert_eq!(first_paper.published_date, "2023-11-30");
        assert!(first_paper.abstract_text.contains("GPT-4V(ision)"));
        assert_eq!(first_paper.pdf_url, "http://arxiv.org/pdf/2311.18775v2.pdf");
        assert_eq!(first_paper.categories.len(), 3);
        assert!(first_paper.categories.contains(&"cs.CL".to_string()));
        assert!(first_paper.categories.contains(&"cs.AI".to_string()));
        assert!(first_paper.categories.contains(&"cs.LG".to_string()));

        // Test second paper
        let second_paper = &papers[1];
        assert_eq!(second_paper.id, "2401.12345");
        assert_eq!(
            second_paper.title,
            "Deep Learning for Computer Vision: A Comprehensive Survey"
        );
        assert_eq!(second_paper.authors, "John Doe, Jane Smith");
        assert_eq!(
            second_paper.category,
            "Computer Vision and Pattern Recognition"
        );
        assert_eq!(second_paper.published_date, "2024-01-15");
        assert!(second_paper.abstract_text.contains("comprehensive survey"));
        assert_eq!(
            second_paper.pdf_url,
            "http://arxiv.org/pdf/2401.12345v1.pdf"
        );
        assert_eq!(second_paper.categories.len(), 2);
        assert!(second_paper.categories.contains(&"cs.CV".to_string()));
        assert!(second_paper.categories.contains(&"cs.LG".to_string()));
    }

    #[test]
    fn test_category_formatting() {
        assert_eq!(format_category("cs.AI"), "Artificial Intelligence");
        assert_eq!(format_category("cs.CL"), "Computation and Language");
        assert_eq!(
            format_category("cs.CV"),
            "Computer Vision and Pattern Recognition"
        );
        assert_eq!(format_category("cs.LG"), "Machine Learning");
        assert_eq!(format_category("math.CO"), "Combinatorics");
        assert_eq!(
            format_category("physics.data-an"),
            "Data Analysis, Statistics and Probability"
        );
        assert_eq!(format_category("quant-ph"), "Quantum Physics");
        assert_eq!(format_category("stat.ML"), "Machine Learning");
        assert_eq!(format_category("q-bio.NC"), "Neurons and Cognition");
        assert_eq!(
            format_category("astro-ph.CO"),
            "Cosmology and Nongalactic Astrophysics"
        );
        assert_eq!(format_category("cond-mat.supr-con"), "Superconductivity");
        assert_eq!(format_category("hep-th"), "High Energy Physics - Theory");
        assert_eq!(format_category("unknown.category"), "UNKNOWN");
        assert_eq!(format_category(""), "");
    }

    #[test]
    fn test_parse_empty_xml() {
        let empty_xml = r#"<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>ArXiv Query: no results</title>
</feed>"#;

        let result = parse_arxiv_xml(empty_xml);
        assert!(result.is_ok());

        let papers = result.unwrap();
        assert_eq!(papers.len(), 0);
    }
}
