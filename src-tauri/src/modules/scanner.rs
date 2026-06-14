#![allow(dead_code)]
use std::path::PathBuf;

/// Represents a detected AI tool installation
#[derive(Debug, Clone)]
pub struct DetectedTool {
    pub name: String,
    pub display_name: String,
    pub install_path: PathBuf,
    pub config_dir: String,
}

/// Tool detection patterns — maps known AI tools to their config directories
/// Full implementation in Phase 3
const TOOL_PATTERNS: &[(&str, &str, &str)] = &[
    ("cursor", "Cursor", ".cursor/rules"),
    ("windsurf", "Windsurf", ".codeium/windsurf"),
    ("claude-code", "Claude Code", ".claude/skills"),
    ("cline", "Cline", ".cline"),
    ("github-copilot", "GitHub Copilot", ".github/prompts"),
    ("continue", "Continue", ".continue"),
    ("aider", "Aider", ".aider"),
    ("codex", "Codex CLI", ".codex/skills"),
    ("opencode", "OpenCode", ".opencode/skills"),
    ("trae", "Trae IDE", ".trae/skills"),
    ("roo-code", "Roo Code", ".roo/skills"),
    ("gemini-cli", "Gemini CLI", ".gemini/skills"),
    ("kilo-code", "Kilo Code", ".kilo/skills"),
    ("goose", "Goose", ".goose/skills"),
    ("qwen", "Qwen CLI", ".qwen/skills"),
];

/// Scan the home directory for installed AI tools
pub fn scan_for_tools(home_dir: &PathBuf) -> Vec<DetectedTool> {
    let mut found = Vec::new();

    for (name, display_name, config_dir) in TOOL_PATTERNS {
        // Check if the config directory exists in the home directory
        let full_path = home_dir.join(config_dir);
        if full_path.exists() {
            found.push(DetectedTool {
                name: name.to_string(),
                display_name: display_name.to_string(),
                install_path: home_dir.clone(),
                config_dir: config_dir.to_string(),
            });
        }
    }

    found
}

/// Get the home directory
pub fn get_home_dir() -> Option<PathBuf> {
    #[cfg(target_os = "windows")]
    {
        std::env::var("USERPROFILE").ok().map(PathBuf::from)
    }
    #[cfg(not(target_os = "windows"))]
    {
        std::env::var("HOME").ok().map(PathBuf::from)
    }
}
