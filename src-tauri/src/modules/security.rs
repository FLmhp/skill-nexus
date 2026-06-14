#![allow(dead_code)]
/// Security scan result for a skill
#[derive(Debug, Clone)]
pub struct SecurityScanResult {
    pub is_safe: bool,
    pub score: f64, // 0.0 (most dangerous) to 1.0 (perfectly safe)
    pub warnings: Vec<String>,
    pub details: Vec<SecurityFinding>,
}

#[derive(Debug, Clone)]
pub struct SecurityFinding {
    pub severity: Severity,
    pub category: String,
    pub description: String,
    pub line: Option<usize>,
}

#[derive(Debug, Clone, PartialEq)]
pub enum Severity {
    Info,
    Low,
    Medium,
    High,
    Critical,
}

/// Scan skill content for potential security issues
/// Full implementation in Phase 5
pub fn scan_skill_content(content: &str) -> SecurityScanResult {
    let mut warnings = Vec::new();
    let mut details = Vec::new();

    // Check for shell execution patterns
    if content.contains("rm -rf") || content.contains("sudo rm") {
        details.push(SecurityFinding {
            severity: Severity::Critical,
            category: "Shell Execution".to_string(),
            description: "Contains potentially destructive shell commands".to_string(),
            line: None,
        });
        warnings.push("Potentially destructive shell commands detected".to_string());
    }

    if content.contains("curl") && content.contains("| sh") {
        details.push(SecurityFinding {
            severity: Severity::High,
            category: "Shell Execution".to_string(),
            description: "Contains curl-pipe-sh pattern".to_string(),
            line: None,
        });
        warnings.push("Curl-pipe-sh pattern detected".to_string());
    }

    if content.contains("eval(") || content.contains("exec(") {
        details.push(SecurityFinding {
            severity: Severity::Medium,
            category: "Code Execution".to_string(),
            description: "Contains eval/exec calls".to_string(),
            line: None,
        });
    }

    // Calculate score
    let has_critical = details.iter().any(|d| d.severity == Severity::Critical);
    let has_high = details.iter().any(|d| d.severity == Severity::High);

    let score = if has_critical {
        0.3
    } else if has_high {
        0.5
    } else if !details.is_empty() {
        0.8
    } else {
        1.0
    };

    SecurityScanResult {
        is_safe: !has_critical && !has_high,
        score,
        warnings,
        details,
    }
}
