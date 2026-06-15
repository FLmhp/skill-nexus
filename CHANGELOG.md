# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.1] - 2026-06-15

### Changed
- Marketplace cards no longer display cross-source star/rating values as a unified score.
- Security scanning now follows the SkillSpector static-analysis category model more closely, including taint tracking, hidden instruction, trigger abuse, MCP poisoning, Unicode deception, and malware-indicator checks.
- Agent defaults now enable only agents whose skills directory exists on the current machine.
- Local skill metadata now preserves real install time, uses SKILL.md file modification time for updates, and fills source/author from frontmatter, file URL, or detected agent context.

### Fixed
- Windows release builds no longer open a console window behind the desktop app.
- Windows installer/shortcut icon configuration now points at the logo-derived app icon.
- Sidebar version text now comes from the package version instead of a hard-coded stale value.
- Scan/import de-duplicates same-named local skills across multiple scan roots, including duplicate `agent-reach` copies.
- Graph relations now include inferred references from SKILL.md body mentions in addition to explicit frontmatter dependency metadata.
- `skills.sh` directory search now parses public directory-page GitHub links instead of calling the old 404 API endpoint.

## [0.2.0] - 2026-06-15

### Added
- SQLite-backed app settings for language, extra scan paths, automatic skill directory watching, and clear database flows.
- Real Marketplace adapters for SkillsMP and MCPMarket, with source filtering and local install-state synchronization.
- Structured scan/import summaries including scanned paths, imported, updated, skipped, and error counts.
- MCP server validation and connectivity testing for stdio and HTTP transports.
- Structured agent sync results for single-agent, single-skill, and full sync operations.
- Lightweight i18n wiring for the main app surfaces.
- Route-level lazy loading and Cytoscape lifecycle optimizations for large graph views.
- release-please configuration for semantic version automation and GitHub Release publishing.
- Project-local actionlint runner backed by the official rhysd/actionlint binary.

### Changed
- Scan and import now uses enabled agent paths plus persisted extra scan paths and updates existing skills on rescan.
- SKILL.md frontmatter parsing now uses structured YAML parsing with fallback for malformed or missing frontmatter.
- Security risk scores are consistently displayed on a 0-100 scale across Dashboard, Skill Detail, and Security views.
- Marketplace installs and agent sync operations now perform stricter URL/path validation before writing files.
- AGENTS.md now documents the current SkillNexus-only project facts and release process.

### Fixed
- Graph store errors are surfaced to the UI with retry support instead of being swallowed.
- Replaced the broken `skills.sh` API lookup with verified public SkillsMP and MCPMarket sources.
- Removed stale local release tags from the release baseline and aligned all version files on v0.2.0.

## [0.1.0] - 2026-06-14

### Added
- Initial project scaffold: Tauri 2 + React 19 + TypeScript + Rust
- Skill scanner engine with multi-directory support
- SKILL.md parser with frontmatter extraction
- Skill list, detail, and basic management UI
- Visualization graph (Cytoscape.js force-directed layout)
- Multi-agent sync engine (Claude Code, Codex, OpenCode, Cursor, Gemini CLI, etc.)
- Security scanner with 30+ vulnerability patterns across 16 categories
- MCP Server configuration management
- Online marketplace via skills.sh API
- Dark theme with CSS variables
- Chinese and English i18n support
- CI/CD pipeline (lint, typecheck, test, build)
- Automated cross-platform release via GitHub Actions
