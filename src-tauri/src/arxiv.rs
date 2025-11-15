use quick_xml::events::Event;
use quick_xml::Reader;
use reqwest;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::error::Error;
use tauri;

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

fn get_category_map() -> HashMap<&'static str, &'static str> {
    let mut map = HashMap::new();

    // Computer Science
    map.insert("cs.AI", "Artificial Intelligence");
    map.insert("cs.AR", "Hardware Architecture");
    map.insert("cs.CC", "Computational Complexity");
    map.insert("cs.CE", "Computational Engineering, Finance, and Science");
    map.insert("cs.CG", "Computational Geometry");
    map.insert("cs.CL", "Computation and Language");
    map.insert("cs.CR", "Cryptography and Security");
    map.insert("cs.CV", "Computer Vision and Pattern Recognition");
    map.insert("cs.CY", "Computers and Society");
    map.insert("cs.DB", "Databases");
    map.insert("cs.DC", "Distributed, Parallel, and Cluster Computing");
    map.insert("cs.DL", "Digital Libraries");
    map.insert("cs.DM", "Discrete Mathematics");
    map.insert("cs.DS", "Data Structures and Algorithms");
    map.insert("cs.ET", "Emerging Technologies");
    map.insert("cs.FL", "Formal Languages and Automata Theory");
    map.insert("cs.GL", "General Literature");
    map.insert("cs.GR", "Graphics");
    map.insert("cs.GT", "Computer Science and Game Theory");
    map.insert("cs.HC", "Human-Computer Interaction");
    map.insert("cs.IR", "Information Retrieval");
    map.insert("cs.IT", "Information Theory");
    map.insert("cs.LG", "Machine Learning");
    map.insert("cs.LO", "Logic in Computer Science");
    map.insert("cs.MA", "Multiagent Systems");
    map.insert("cs.MM", "Multimedia");
    map.insert("cs.MS", "Mathematical Software");
    map.insert("cs.NA", "Numerical Analysis");
    map.insert("cs.NE", "Neural and Evolutionary Computing");
    map.insert("cs.NI", "Networking and Internet Architecture");
    map.insert("cs.OH", "Other Computer Science");
    map.insert("cs.OS", "Operating Systems");
    map.insert("cs.PF", "Performance");
    map.insert("cs.PL", "Programming Languages");
    map.insert("cs.RO", "Robotics");
    map.insert("cs.SC", "Symbolic Computation");
    map.insert("cs.SD", "Sound");
    map.insert("cs.SE", "Software Engineering");
    map.insert("cs.SI", "Social and Information Networks");
    map.insert("cs.SY", "Systems and Control");

    // Economics
    map.insert("econ.EM", "Econometrics");
    map.insert("econ.GN", "General Economics");
    map.insert("econ.TH", "Theoretical Economics");

    // Electrical Engineering and Systems Science
    map.insert("eess.AS", "Audio and Speech Processing");
    map.insert("eess.IV", "Image and Video Processing");
    map.insert("eess.SP", "Signal Processing");
    map.insert("eess.SY", "Systems and Control");

    // Mathematics
    map.insert("math.AC", "Commutative Algebra");
    map.insert("math.AG", "Algebraic Geometry");
    map.insert("math.AP", "Analysis of PDEs");
    map.insert("math.AT", "Algebraic Topology");
    map.insert("math.CA", "Classical Analysis and ODEs");
    map.insert("math.CO", "Combinatorics");
    map.insert("math.CT", "Category Theory");
    map.insert("math.CV", "Complex Variables");
    map.insert("math.DG", "Differential Geometry");
    map.insert("math.DS", "Dynamical Systems");
    map.insert("math.FA", "Functional Analysis");
    map.insert("math.GM", "General Mathematics");
    map.insert("math.GN", "General Topology");
    map.insert("math.GR", "Group Theory");
    map.insert("math.GT", "Geometric Topology");
    map.insert("math.HO", "History and Overview");
    map.insert("math.IT", "Information Theory");
    map.insert("math.KT", "K-Theory and Homology");
    map.insert("math.LO", "Logic");
    map.insert("math.MG", "Metric Geometry");
    map.insert("math.MP", "Mathematical Physics");
    map.insert("math.NA", "Numerical Analysis");
    map.insert("math.NT", "Number Theory");
    map.insert("math.OA", "Operator Algebras");
    map.insert("math.OC", "Optimization and Control");
    map.insert("math.PR", "Probability");
    map.insert("math.QA", "Quantum Algebra");
    map.insert("math.RA", "Rings and Algebras");
    map.insert("math.RT", "Representation Theory");
    map.insert("math.SG", "Symplectic Geometry");
    map.insert("math.SP", "Spectral Theory");
    map.insert("math.ST", "Statistics Theory");

    // Physics - Astrophysics
    map.insert("astro-ph.CO", "Cosmology and Nongalactic Astrophysics");
    map.insert("astro-ph.EP", "Earth and Planetary Astrophysics");
    map.insert("astro-ph.GA", "Astrophysics of Galaxies");
    map.insert("astro-ph.HE", "High Energy Astrophysical Phenomena");
    map.insert(
        "astro-ph.IM",
        "Instrumentation and Methods for Astrophysics",
    );
    map.insert("astro-ph.SR", "Solar and Stellar Astrophysics");

    // Physics - Condensed Matter
    map.insert("cond-mat.dis-nn", "Disordered Systems and Neural Networks");
    map.insert("cond-mat.mes-hall", "Mesoscale and Nanoscale Physics");
    map.insert("cond-mat.mtrl-sci", "Materials Science");
    map.insert("cond-mat.other", "Other Condensed Matter");
    map.insert("cond-mat.quant-gas", "Quantum Gases");
    map.insert("cond-mat.soft", "Soft Condensed Matter");
    map.insert("cond-mat.stat-mech", "Statistical Mechanics");
    map.insert("cond-mat.str-el", "Strongly Correlated Electrons");
    map.insert("cond-mat.supr-con", "Superconductivity");

    // Physics - General Relativity and Quantum Cosmology
    map.insert("gr-qc", "General Relativity and Quantum Cosmology");

    // Physics - High Energy Physics
    map.insert("hep-ex", "High Energy Physics - Experiment");
    map.insert("hep-lat", "High Energy Physics - Lattice");
    map.insert("hep-ph", "High Energy Physics - Phenomenology");
    map.insert("hep-th", "High Energy Physics - Theory");

    // Physics - Nuclear
    map.insert("nucl-ex", "Nuclear Experiment");
    map.insert("nucl-th", "Nuclear Theory");

    // Physics - Other
    map.insert("physics.acc-ph", "Accelerator Physics");
    map.insert("physics.ao-ph", "Atmospheric and Oceanic Physics");
    map.insert("physics.app-ph", "Applied Physics");
    map.insert("physics.atm-clus", "Atomic and Molecular Clusters");
    map.insert("physics.atom-ph", "Atomic Physics");
    map.insert("physics.bio-ph", "Biological Physics");
    map.insert("physics.chem-ph", "Chemical Physics");
    map.insert("physics.class-ph", "Classical Physics");
    map.insert("physics.comp-ph", "Computational Physics");
    map.insert(
        "physics.data-an",
        "Data Analysis, Statistics and Probability",
    );
    map.insert("physics.ed-ph", "Physics Education");
    map.insert("physics.flu-dyn", "Fluid Dynamics");
    map.insert("physics.gen-ph", "General Physics");
    map.insert("physics.geo-ph", "Geophysics");
    map.insert("physics.hist-ph", "History and Philosophy of Physics");
    map.insert("physics.ins-det", "Instrumentation and Detectors");
    map.insert("physics.med-ph", "Medical Physics");
    map.insert("physics.optics", "Optics");
    map.insert("physics.plasm-ph", "Plasma Physics");
    map.insert("physics.pop-ph", "Popular Physics");
    map.insert("physics.soc-ph", "Physics and Society");
    map.insert("physics.space-ph", "Space Physics");

    // Physics - Quantum Physics
    map.insert("quant-ph", "Quantum Physics");

    // Nonlinear Sciences
    map.insert("nlin.AO", "Adaptation and Self-Organizing Systems");
    map.insert("nlin.CD", "Chaotic Dynamics");
    map.insert("nlin.CG", "Cellular Automata and Lattice Gases");
    map.insert("nlin.PS", "Pattern Formation and Solitons");
    map.insert("nlin.SI", "Exactly Solvable and Integrable Systems");

    // Quantitative Biology
    map.insert("q-bio.BM", "Biomolecules");
    map.insert("q-bio.CB", "Cell Behavior");
    map.insert("q-bio.GN", "Genomics");
    map.insert("q-bio.MN", "Molecular Networks");
    map.insert("q-bio.NC", "Neurons and Cognition");
    map.insert("q-bio.OT", "Other Quantitative Biology");
    map.insert("q-bio.PE", "Populations and Evolution");
    map.insert("q-bio.QM", "Quantitative Methods");
    map.insert("q-bio.SC", "Subcellular Processes");
    map.insert("q-bio.TO", "Tissues and Organs");

    // Quantitative Finance
    map.insert("q-fin.CP", "Computational Finance");
    map.insert("q-fin.EC", "Economics");
    map.insert("q-fin.GN", "General Finance");
    map.insert("q-fin.MF", "Mathematical Finance");
    map.insert("q-fin.PM", "Portfolio Management");
    map.insert("q-fin.PR", "Pricing of Securities");
    map.insert("q-fin.RM", "Risk Management");
    map.insert("q-fin.ST", "Statistical Finance");
    map.insert("q-fin.TR", "Trading and Market Microstructure");

    // Statistics
    map.insert("stat.AP", "Applications");
    map.insert("stat.CO", "Computation");
    map.insert("stat.ME", "Methodology");
    map.insert("stat.ML", "Machine Learning");
    map.insert("stat.OT", "Other Statistics");
    map.insert("stat.TH", "Statistics Theory");

    map
}

fn format_category(category: &str) -> String {
    let category_map = get_category_map();
    category_map
        .get(category)
        .map(|&name| name.to_string())
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

    let client = reqwest::Client::new();
    let response = client.get(&url).send().await?;

    if !response.status().is_success() {
        return Err(format!("ArXiv API error: {}", response.status()).into());
    }

    let xml_content = response.text().await?;
    println!("[ArXiv Rust] Received XML, length: {}", xml_content.len());

    let papers = parse_arxiv_xml(&xml_content)?;
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
            println!("[ArXiv Rust] Error fetching papers: {}", e);
            Err(e.to_string())
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

    #[test]
    fn test_parse_arxiv_xml_with_sample() {
        let sample_xml = r#"<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>ArXiv Query: search_query=all:deep learning&amp;id_list=&amp;start=0&amp;max_results=2</title>
  <id>http://arxiv.org/api/query</id>
  <updated>2024-01-15T00:00:00-05:00</updated>
  <opensearch:totalResults xmlns:opensearch="http://a9.com/-/spec/opensearch/1.1/">1234</opensearch:totalResults>
  <opensearch:startIndex xmlns:opensearch="http://a9.com/-/spec/opensearch/1.1/">0</opensearch:startIndex>
  <opensearch:itemsPerPage xmlns:opensearch="http://a9.com/-/spec/opensearch/1.1/">2</opensearch:itemsPerPage>
  <entry>
    <id>http://arxiv.org/abs/2311.18775v2</id>
    <updated>2024-01-10T14:30:45Z</updated>
    <published>2023-11-30T18:59:59Z</published>
    <title>GPT-4 Vision Technical Report</title>
    <summary>We present GPT-4V(ision), a multimodal model that combines text and vision capabilities. This technical report describes the model architecture and training methodology.</summary>
    <author>
      <name>OpenAI Team</name>
    </author>
    <author>
      <name>Research Scientist</name>
    </author>
    <arxiv:doi xmlns:arxiv="http://arxiv.org/schemas/atom">10.1234/example</arxiv:doi>
    <link title="doi" href="http://dx.doi.org/10.1234/example" rel="related"/>
    <arxiv:primary_category xmlns:arxiv="http://arxiv.org/schemas/atom" term="cs.CL" scheme="http://arxiv.org/schemas/atom"/>
    <category term="cs.CL" scheme="http://arxiv.org/schemas/atom"/>
    <category term="cs.AI" scheme="http://arxiv.org/schemas/atom"/>
    <category term="cs.LG" scheme="http://arxiv.org/schemas/atom"/>
    <link href="http://arxiv.org/abs/2311.18775v2" rel="alternate" type="text/html"/>
    <link title="pdf" href="http://arxiv.org/pdf/2311.18775v2.pdf" rel="related" type="application/pdf"/>
  </entry>
  <entry>
    <id>http://arxiv.org/abs/2401.12345v1</id>
    <updated>2024-01-15T09:15:30Z</updated>
    <published>2024-01-15T09:15:30Z</published>
    <title>Deep Learning for Computer Vision: A Comprehensive Survey</title>
    <summary>This paper provides a comprehensive survey of deep learning techniques applied to computer vision tasks, covering recent advances and future directions.</summary>
    <author>
      <name>John Doe</name>
    </author>
    <author>
      <name>Jane Smith</name>
    </author>
    <arxiv:primary_category xmlns:arxiv="http://arxiv.org/schemas/atom" term="cs.CV" scheme="http://arxiv.org/schemas/atom"/>
    <category term="cs.CV" scheme="http://arxiv.org/schemas/atom"/>
    <category term="cs.LG" scheme="http://arxiv.org/schemas/atom"/>
    <link href="http://arxiv.org/abs/2401.12345v1" rel="alternate" type="text/html"/>
    <link title="pdf" href="http://arxiv.org/pdf/2401.12345v1.pdf" rel="related" type="application/pdf"/>
  </entry>
</feed>"#;

        let result = parse_arxiv_xml(sample_xml);
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
