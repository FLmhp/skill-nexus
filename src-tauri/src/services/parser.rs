use std::collections::BTreeMap;
use yaml_rust::{Yaml, YamlLoader};

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct SkillManifest {
    pub name: String,
    pub description: String,
    pub author: Option<String>,
    pub version: Option<String>,
    pub license: Option<String>,
    pub relations: Vec<SkillRelationTarget>,
    pub metadata_json: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SkillRelationTarget {
    pub relation_type: String,
    pub target: String,
}

pub fn parse_skill_md(
    content: &str,
) -> Result<(String, String, Option<String>, Option<String>), String> {
    let manifest = parse_skill_manifest(content)?;
    Ok((
        manifest.name,
        manifest.description,
        manifest.author,
        manifest.version,
    ))
}

pub fn parse_skill_manifest(content: &str) -> Result<SkillManifest, String> {
    let Some(frontmatter) = extract_frontmatter(content)? else {
        return Ok(fallback_manifest(content));
    };

    if frontmatter.trim().is_empty() {
        return Ok(fallback_manifest(content));
    }

    let docs = YamlLoader::load_from_str(frontmatter).map_err(|e| e.to_string())?;
    let Some(doc) = docs.first() else {
        return Ok(fallback_manifest(content));
    };

    let mut manifest = SkillManifest {
        name: first_string(doc, &["name", "title"]).unwrap_or_else(|| "unnamed".to_string()),
        description: first_string(doc, &["description", "desc", "summary"]).unwrap_or_default(),
        author: first_string(doc, &["author", "maintainer"]),
        version: first_string(doc, &["version", "rev", "release"]),
        license: first_string(doc, &["license"]),
        relations: relation_targets(doc),
        metadata_json: metadata_json(doc),
    };

    if manifest.name.trim().is_empty() {
        manifest.name = "unnamed".to_string();
    }

    Ok(manifest)
}

fn extract_frontmatter(content: &str) -> Result<Option<&str>, String> {
    let start = if content.starts_with("---\r\n") {
        "---\r\n".len()
    } else if content.starts_with("---\n") {
        "---\n".len()
    } else {
        return Ok(None);
    };

    let remainder = &content[start..];
    let mut offset = 0;
    for line in remainder.split_inclusive('\n') {
        let normalized_line = line.trim_end_matches(&['\r', '\n'][..]);
        if normalized_line.trim() == "---" {
            let frontmatter = remainder[..offset].trim_end_matches(&['\r', '\n'][..]);
            return Ok(Some(frontmatter));
        }
        offset += line.len();
    }

    if remainder.trim() == "---" {
        return Ok(Some(""));
    }

    Err("Unclosed YAML frontmatter (missing closing ---)".to_string())
}

fn fallback_manifest(content: &str) -> SkillManifest {
    let first_meaningful = content
        .lines()
        .map(str::trim)
        .find(|line| !line.is_empty())
        .unwrap_or("");

    let name = first_meaningful
        .strip_prefix('#')
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .unwrap_or("unnamed")
        .to_string();

    SkillManifest {
        name,
        description: if first_meaningful.starts_with('#') {
            String::new()
        } else {
            first_meaningful.to_string()
        },
        ..SkillManifest::default()
    }
}

fn first_string(doc: &Yaml, keys: &[&str]) -> Option<String> {
    keys.iter()
        .filter_map(|key| yaml_scalar_to_string(&doc[*key]))
        .map(|value| value.trim().to_string())
        .find(|value| !value.is_empty())
}

fn yaml_scalar_to_string(value: &Yaml) -> Option<String> {
    match value {
        Yaml::String(value) => Some(value.clone()),
        Yaml::Integer(value) => Some(value.to_string()),
        Yaml::Real(value) => Some(value.clone()),
        Yaml::Boolean(value) => Some(value.to_string()),
        _ => None,
    }
}

fn relation_targets(doc: &Yaml) -> Vec<SkillRelationTarget> {
    let mut relations = Vec::new();
    for (key, relation_type) in [
        ("depends", "depends"),
        ("dependencies", "depends"),
        ("references", "references"),
        ("reference", "references"),
        ("extends", "extends"),
    ] {
        collect_relation_values(&doc[key], relation_type, &mut relations);
    }
    relations
}

fn collect_relation_values(
    value: &Yaml,
    relation_type: &str,
    relations: &mut Vec<SkillRelationTarget>,
) {
    match value {
        Yaml::Array(items) => {
            for item in items {
                collect_relation_values(item, relation_type, relations);
            }
        }
        Yaml::String(target) => {
            let target = target.trim();
            if !target.is_empty() {
                relations.push(SkillRelationTarget {
                    relation_type: relation_type.to_string(),
                    target: target.to_string(),
                });
            }
        }
        _ => {}
    }
}

fn metadata_json(doc: &Yaml) -> Option<String> {
    let mut metadata = BTreeMap::new();
    for key in [
        "depends",
        "dependencies",
        "references",
        "reference",
        "extends",
    ] {
        let values = relation_values(&doc[key]);
        if !values.is_empty() {
            metadata.insert(key, values);
        }
    }
    if metadata.is_empty() {
        None
    } else {
        serde_json::to_string(&metadata).ok()
    }
}

fn relation_values(value: &Yaml) -> Vec<String> {
    let mut values = Vec::new();
    collect_plain_values(value, &mut values);
    values
}

fn collect_plain_values(value: &Yaml, values: &mut Vec<String>) {
    match value {
        Yaml::Array(items) => {
            for item in items {
                collect_plain_values(item, values);
            }
        }
        Yaml::String(target) => {
            let target = target.trim();
            if !target.is_empty() {
                values.push(target.to_string());
            }
        }
        _ => {}
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_yaml_frontmatter_and_relations() {
        let manifest = parse_skill_manifest(
            "---
name: Research
description: Finds sources
author: Solo
version: 1.2.0
license: MIT
depends:
  - Browser
references: docs
---
# Body",
        )
        .expect("manifest should parse");

        assert_eq!(manifest.name, "Research");
        assert_eq!(manifest.description, "Finds sources");
        assert_eq!(manifest.author.as_deref(), Some("Solo"));
        assert_eq!(manifest.version.as_deref(), Some("1.2.0"));
        assert_eq!(manifest.license.as_deref(), Some("MIT"));
        assert_eq!(manifest.relations.len(), 2);
    }

    #[test]
    fn falls_back_without_frontmatter() {
        let manifest = parse_skill_manifest("# Plain Skill\nBody").expect("fallback should parse");
        assert_eq!(manifest.name, "Plain Skill");
        assert_eq!(manifest.description, "");
    }

    #[test]
    fn parses_crlf_frontmatter() {
        let manifest =
            parse_skill_manifest("---\r\nname: Windows Skill\r\nversion: 2\r\n---\r\nBody")
                .expect("manifest should parse");

        assert_eq!(manifest.name, "Windows Skill");
        assert_eq!(manifest.version.as_deref(), Some("2"));
    }
}
