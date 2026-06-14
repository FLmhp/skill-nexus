pub fn parse_skill_md(
    content: &str,
) -> Result<(String, String, Option<String>, Option<String>), String> {
    let lines: Vec<&str> = content.lines().collect();

    if lines.len() < 2 {
        return Err("Content too short to contain frontmatter".to_string());
    }

    let first_line = lines[0].trim();
    if first_line != "---" {
        let name = extract_filename_style(std::path::Path::new("unknown"))
            .unwrap_or_else(|| "unnamed".to_string());
        return Ok((name, content.lines().next().unwrap_or("").to_string(), None, None));
    }

    let end_marker = lines[1..]
        .iter()
        .position(|&line| line.trim() == "---")
        .map(|p| p + 1);

    let end_idx = match end_marker {
        Some(idx) => idx,
        None => {
            return Err("Unclosed YAML frontmatter (missing closing ---)".to_string());
        }
    };

    let mut name = String::new();
    let mut description = String::new();
    let mut author: Option<String> = None;
    let mut version: Option<String> = None;

    for line in &lines[1..end_idx] {
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.starts_with('#') {
            continue;
        }
        if let Some((key, value)) = trimmed.split_once(':') {
            let key = key.trim().to_lowercase();
            let value = value.trim().trim_matches('"').trim_matches('\'').to_string();
            if value.is_empty() {
                continue;
            }
            match key.as_str() {
                "name" | "title" => name = value,
                "description" | "desc" | "summary" => description = value,
                "author" | "maintainer" => author = Some(value),
                "version" | "rev" | "release" => version = Some(value),
                _ => {}
            }
        }
    }

    if name.is_empty() {
        name = "unnamed".to_string();
    }

    Ok((name, description, author, version))
}

fn extract_filename_style(_path: &std::path::Path) -> Option<String> {
    None
}
