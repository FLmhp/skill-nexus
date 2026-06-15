use crate::models::{ScanFinding, ScanResult};
use regex::Regex;
use std::path::Path;

struct ScanRule {
    rule_id: &'static str,
    category: &'static str,
    severity: &'static str,
    pattern: &'static str,
    explanation: &'static str,
}

fn get_all_rules() -> Vec<ScanRule> {
    vec![
        ScanRule {
            rule_id: "PI-001",
            category: "Prompt Injection",
            severity: "CRITICAL",
            pattern: r"(?i)(ignore|disregard|forget)\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?|directives?)",
            explanation: "Detects attempts to override previous system instructions — a classic prompt injection pattern.",
        },
        ScanRule {
            rule_id: "PI-002",
            category: "Prompt Injection",
            severity: "HIGH",
            pattern: r"(?i)(you\s+are\s+now|you\s+will\s+act\s+as|you\s+are\s+now\s+acting\s+as|pretend\s+you\s+are|roleplay\s+as)",
            explanation: "Detects persona-switching prompts that attempt to redefine the agent's identity or role.",
        },
        ScanRule {
            rule_id: "PI-003",
            category: "Prompt Injection",
            severity: "HIGH",
            pattern: r"(?i)(new|override|replace|overwrite)\s+(system\s+)?(prompt|instruction|directive|rules?)",
            explanation: "Detects requests to replace or override the system prompt with attacker-controlled content.",
        },
        ScanRule {
            rule_id: "DE-001",
            category: "Data Exfiltration",
            severity: "CRITICAL",
            pattern: r"(?i)(curl|wget|Invoke-WebRequest|Invoke-RestMethod|fetch\s*\().*\bhttps?://",
            explanation: "Detects HTTP requests in skill code that could exfiltrate data to external servers.",
        },
        ScanRule {
            rule_id: "DE-002",
            category: "Data Exfiltration",
            severity: "CRITICAL",
            pattern: r"(?i)(send|upload|post|transmit|exfiltrate).*\.(env|secret|token|key|password|credential|config)",
            explanation: "Detects code that reads sensitive files and sends them externally.",
        },
        ScanRule {
            rule_id: "DE-003",
            category: "Data Exfiltration",
            severity: "HIGH",
            pattern: r"(?i)(webhook|discord\.com/api/webhooks|slack\.com/services|telegram\.org/bot|hooks\.slack)",
            explanation: "Detects webhook URLs that could be used to exfiltrate data to messaging platforms.",
        },
        ScanRule {
            rule_id: "PE-001",
            category: "Privilege Escalation",
            severity: "CRITICAL",
            pattern: r"(?i)\b(sudo|chmod\s+[0-7]*[47]|chown\s+|runas\b)",
            explanation: "Detects privilege escalation commands that attempt to gain elevated system access.",
        },
        ScanRule {
            rule_id: "PE-002",
            category: "Privilege Escalation",
            severity: "HIGH",
            pattern: r"(?i)(SeDebugPrivilege|SeTakeOwnershipPrivilege|SeBackupPrivilege|SeRestorePrivilege)",
            explanation: "Detects references to Windows privilege constants used in token manipulation attacks.",
        },
        ScanRule {
            rule_id: "PE-003",
            category: "Privilege Escalation",
            severity: "MEDIUM",
            pattern: r"(?i)(os\.system\(|subprocess\.(call|Popen|run|check_output)\(|exec\s*\()",
            explanation: "Detects shell execution functions that could be abused for privilege escalation.",
        },
        ScanRule {
            rule_id: "SC-001",
            category: "Supply Chain",
            severity: "CRITICAL",
            pattern: r"(?i)(pip\s+install|pip3\s+install|npm\s+(i|install)\s|gem\s+install|cargo\s+install)",
            explanation: "Detects package installation commands that could introduce malicious dependencies.",
        },
        ScanRule {
            rule_id: "SC-002",
            category: "Supply Chain",
            severity: "CRITICAL",
            pattern: r"(?i)(curl|wget).*\|\s*(bash|sh|python|perl|ruby)",
            explanation: "Detects pipe-to-shell patterns commonly used to execute malicious scripts from remote URLs.",
        },
        ScanRule {
            rule_id: "SC-003",
            category: "Supply Chain",
            severity: "HIGH",
            pattern: r"(?i)(git\s+clone.*&&|git\s+clone.*\|\||git\s+clone.*;)",
            explanation: "Detects git clone followed by immediate execution, a common supply chain attack vector.",
        },
        ScanRule {
            rule_id: "EA-001",
            category: "Excessive Agency",
            severity: "CRITICAL",
            pattern: r"(?i)\brm\s+-rf\s+(/|\./|~)",
            explanation: "Detects destructive recursive file deletion that could wipe user data.",
        },
        ScanRule {
            rule_id: "EA-002",
            category: "Excessive Agency",
            severity: "HIGH",
            pattern: r"(?i)(drop\s+table|truncate\s+table|delete\s+from\s+\w+\s*;)",
            explanation: "Detects database destruction commands that could cause data loss.",
        },
        ScanRule {
            rule_id: "EA-003",
            category: "Excessive Agency",
            severity: "MEDIUM",
            pattern: r"(?i)\b(shutdown|reboot|restart|halt|poweroff)\b",
            explanation: "Detects system shutdown/restart commands that could disrupt service.",
        },
        ScanRule {
            rule_id: "OH-001",
            category: "Output Handling",
            severity: "HIGH",
            pattern: r"(?i)(innerHTML|dangerouslySetInnerHTML|v-html|setInnerHTML)",
            explanation: "Detects unsafe HTML injection patterns that could lead to XSS in rendered output.",
        },
        ScanRule {
            rule_id: "OH-002",
            category: "Output Handling",
            severity: "MEDIUM",
            pattern: r"(?i)(eval\s*\(|new\s+Function\s*\(|setTimeout\s*\(\s*['\x22])",
            explanation: "Detects dynamic code evaluation patterns that could execute injected content.",
        },
        ScanRule {
            rule_id: "SPL-001",
            category: "System Prompt Leakage",
            severity: "HIGH",
            pattern: r"(?i)(print|show|display|reveal|output|tell\s+me)\s+(your|the)\s+(system\s+)?(prompt|instructions?|rules?|directives?)",
            explanation: "Detects requests to reveal the system prompt, exposing agent instructions to users.",
        },
        ScanRule {
            rule_id: "SPL-002",
            category: "System Prompt Leakage",
            severity: "HIGH",
            pattern: r"(?i)(repeat|recite|reproduce)\s+(the\s+)?(above|previous|everything|all\s+text)",
            explanation: "Detects requests to repeat or recite sections of the system prompt.",
        },
        ScanRule {
            rule_id: "MP-001",
            category: "Memory Poisoning",
            severity: "HIGH",
            pattern: r"(?i)(remember|store|save|keep)\s+(this|that|the)\s+(password|secret|credential|token|key)",
            explanation: "Detects attempts to store sensitive credentials in agent memory for later retrieval.",
        },
        ScanRule {
            rule_id: "MP-002",
            category: "Memory Poisoning",
            severity: "MEDIUM",
            pattern: r"(?i)(for|in)\s+(the\s+)?(future|later|next\s+time).*(reference|recall|retrieve|use)\s+(this|the)\s+(password|secret|credential)",
            explanation: "Detects instructions to reference stored credentials in future interactions.",
        },
        ScanRule {
            rule_id: "TM-001",
            category: "Tool Misuse",
            severity: "HIGH",
            pattern: r"(?i)(bash|cmd\.exe|powershell|pwsh)\s+(.*-c\s|.*/c\s|.*-Command\s)",
            explanation: "Detects shell command execution with inline commands that could bypass tool restrictions.",
        },
        ScanRule {
            rule_id: "TM-002",
            category: "Tool Misuse",
            severity: "MEDIUM",
            pattern: r"(?i)(shell_exec|popen|proc_open|passthru|system\s*\()",
            explanation: "Detects PHP/Rust/C system execution functions that could be misused.",
        },
        ScanRule {
            rule_id: "RA-001",
            category: "Rogue Agent",
            severity: "HIGH",
            pattern: r"(?i)(hide|conceal|secret|covert|disguise)\s+(your|the|this)\s+(action|operation|task|activity|behavior)",
            explanation: "Detects instructions to hide agent activity from the user, a rogue agent indicator.",
        },
        ScanRule {
            rule_id: "RA-002",
            category: "Rogue Agent",
            severity: "HIGH",
            pattern: r"(?i)(do\s+not\s+|don't\s+|never\s+)(tell|inform|report|notify|warn|alert)\s+(the\s+)?(user|owner|human)",
            explanation: "Detects instructions to conceal information from the user - a rogue agent behavior.",
        },
        ScanRule {
            rule_id: "TA-001",
            category: "Trigger Abuse",
            severity: "MEDIUM",
            pattern: r"(?i)(on\s+(connect|start|boot|run|load|init)).*(always|auto|automatically|in\s+background)",
            explanation: "Detects automatic trigger registration that could activate malicious code without user consent.",
        },
        ScanRule {
            rule_id: "TA-002",
            category: "Trigger Abuse",
            severity: "MEDIUM",
            pattern: r"(?i)(cron\b|schedule|systemd|launchd|at\s+\d{1,2}:\d{2})",
            explanation: "Detects scheduled task creation that could establish persistence.",
        },
        ScanRule {
            rule_id: "AST-001",
            category: "AST Checks",
            severity: "HIGH",
            pattern: r"(?i)(__import__\s*\(|importlib\.import_module|compile\s*\(|exec\s*\(.*__)",
            explanation: "Detects dynamic import and code compilation patterns that bypass static analysis.",
        },
        ScanRule {
            rule_id: "AST-002",
            category: "AST Checks",
            severity: "MEDIUM",
            pattern: r"(?i)(Function\s*\(|eval\s*\(|setTimeout\s*\(\s*['\x22])",
            explanation: "Detects JavaScript dynamic code execution that could inject malicious logic at runtime.",
        },
        ScanRule {
            rule_id: "MLP-001",
            category: "MCP Least Privilege",
            severity: "HIGH",
            pattern: r"(?i)(permissions?|access|scope|capabilit).*['\x22:]\s*(all|any|every|\*|unrestricted)",
            explanation: "Detects MCP server configurations granting unrestricted access instead of least privilege.",
        },
        ScanRule {
            rule_id: "MLP-002",
            category: "MCP Least Privilege",
            severity: "MEDIUM",
            pattern: r"(?i)(read|write|execute|delete).*(all|everything|any|unrestricted)\s*(files?|paths?|director)",
            explanation: "Detects overly broad file access permissions in MCP configuration.",
        },
        ScanRule {
            rule_id: "MTP-001",
            category: "MCP Tool Poisoning",
            severity: "HIGH",
            pattern: r"(?i)(mcp|tool).*(override|hijack|inject|spoof|intercept|modify)",
            explanation: "Detects attempts to hijack or inject malicious behavior into MCP server tool definitions.",
        },
        ScanRule {
            rule_id: "MTP-002",
            category: "MCP Tool Poisoning",
            severity: "HIGH",
            pattern: r"(?i)(man.?in.?the.?middle|mitm|proxy.*intercept|spoof.*(server|endpoint))",
            explanation: "Detects MITM attack configurations that could intercept MCP tool calls.",
        },
        ScanRule {
            rule_id: "CI-001",
            category: "Command Injection",
            severity: "CRITICAL",
            pattern: r"[;&|`]\s*(rm|del|mv|cp|cat|curl|wget|nc|netcat)\b",
            explanation: "Detects command chaining with destructive or data-access commands — potential command injection.",
        },
        ScanRule {
            rule_id: "CI-002",
            category: "Command Injection",
            severity: "HIGH",
            pattern: r"\$\(.*\)|`[^`]+`",
            explanation: "Detects command substitution patterns that could execute arbitrary shell commands.",
        },
        ScanRule {
            rule_id: "PT-001",
            category: "Path Traversal",
            severity: "HIGH",
            pattern: r"(\.\./|\.\.\\)",
            explanation: "Detects path traversal attempts to access files outside the intended directory.",
        },
        ScanRule {
            rule_id: "PT-002",
            category: "Path Traversal",
            severity: "MEDIUM",
            pattern: r"(/etc/passwd|/etc/shadow|C:\\Windows\\System32|/proc/self/)",
            explanation: "Detects references to sensitive system files that should never be accessed by a skill.",
        },
    ]
}

fn severity_score(severity: &str) -> i32 {
    match severity {
        "CRITICAL" => 50,
        "HIGH" => 25,
        "MEDIUM" => 10,
        "LOW" => 5,
        _ => 0,
    }
}

fn has_executable_scripts(dir_path: &Path) -> bool {
    let exts = [
        "sh", "bash", "zsh", "fish", "bat", "cmd", "ps1", "psm1", "py", "rb", "pl",
    ];
    if let Ok(entries) = std::fs::read_dir(dir_path) {
        for entry in entries.flatten() {
            if let Some(ext) = entry.path().extension().and_then(|e| e.to_str()) {
                if exts.contains(&ext.to_lowercase().as_str()) {
                    return true;
                }
            }
        }
    }
    false
}

fn scan_file(file_path: &Path, rules: &[ScanRule]) -> Vec<ScanFinding> {
    let content = match std::fs::read_to_string(file_path) {
        Ok(c) => c,
        Err(_) => return Vec::new(),
    };

    let lines: Vec<&str> = content.lines().collect();
    let mut findings = Vec::new();

    for rule in rules {
        let re = match Regex::new(rule.pattern) {
            Ok(r) => r,
            Err(_) => continue,
        };

        for (line_idx, line) in lines.iter().enumerate() {
            if re.is_match(line) {
                let snippet_start = line_idx.saturating_sub(1);
                let snippet_end = (line_idx + 2).min(lines.len());
                let snippet: Vec<&str> = lines[snippet_start..snippet_end].to_vec();
                let code_snippet = Some(snippet.join("\n"));

                let confidence = if rule.severity == "CRITICAL" {
                    0.9
                } else if rule.severity == "HIGH" {
                    0.75
                } else if rule.severity == "MEDIUM" {
                    0.6
                } else {
                    0.45
                };

                findings.push(ScanFinding {
                    rule_id: rule.rule_id.to_string(),
                    category: rule.category.to_string(),
                    severity: rule.severity.to_string(),
                    pattern: rule.pattern.to_string(),
                    file_path: file_path.to_string_lossy().to_string(),
                    line_number: Some(line_idx as u32 + 1),
                    code_snippet,
                    confidence,
                    explanation: rule.explanation.to_string(),
                });
            }
        }
    }

    findings
}

pub fn scan_skill(skill_path: &str) -> Result<ScanResult, String> {
    let path = Path::new(skill_path);

    if !path.exists() {
        return Err(format!("Skill path does not exist: {}", skill_path));
    }

    let skill_name = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown")
        .to_string();

    let rules = get_all_rules();
    let mut all_findings: Vec<ScanFinding> = Vec::new();
    let mut files_scanned: i32 = 0;

    if path.is_dir() {
        for entry in walkdir::WalkDir::new(path).into_iter().filter_entry(|e| {
            !e.file_name()
                .to_str()
                .map(|s| s == ".git" || s == "node_modules" || s == "target" || s == "__pycache__")
                .unwrap_or(false)
        }) {
            let entry = entry.map_err(|e| e.to_string())?;
            if entry.path().is_file() {
                files_scanned += 1;
                let file_findings = scan_file(entry.path(), &rules);
                all_findings.extend(file_findings);
            }
        }
    } else {
        files_scanned = 1;
        let file_findings = scan_file(path, &rules);
        all_findings.extend(file_findings);
    }

    let mut risk_score: i32 = all_findings
        .iter()
        .map(|f| severity_score(&f.severity))
        .sum();

    if has_executable_scripts(path) {
        risk_score = ((risk_score as f64) * 1.3) as i32;
    }

    if risk_score > 100 {
        risk_score = 100;
    }

    let risk_severity = if risk_score >= 81 {
        "CRITICAL"
    } else if risk_score >= 51 {
        "HIGH"
    } else if risk_score >= 21 {
        "MEDIUM"
    } else {
        "LOW"
    };

    let recommendation = match risk_severity {
        "CRITICAL" => {
            "IMMEDIATE ACTION REQUIRED: Do not use this skill. It contains critical security risks including patterns that could lead to prompt injection, data exfiltration, or system compromise. Report to the skill author and security team."
        }
        "HIGH" => {
            "STRONG CAUTION: This skill contains high-risk patterns. Review all findings carefully before use. Consider disabling the skill until issues are resolved. Limit the skill's access permissions."
        }
        "MEDIUM" => {
            "CAUTION ADVISED: This skill has moderate-risk patterns. Review flagged code and ensure it aligns with expected behavior. Regular monitoring recommended."
        }
        _ => {
            "LOW RISK: Minor concerns detected. Standard review recommended before deployment. No immediate action required."
        }
    };

    let findings_json = serde_json::to_string(&all_findings).map_err(|e| e.to_string())?;

    Ok(ScanResult {
        id: uuid::Uuid::new_v4().to_string(),
        skill_id: String::new(),
        skill_name,
        risk_score,
        risk_severity: risk_severity.to_string(),
        recommendation: recommendation.to_string(),
        findings_json,
        components_scanned: files_scanned,
        scanned_at: chrono::Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string(),
    })
}
