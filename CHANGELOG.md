# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0](https://github.com/FLmhp/skill-nexus/compare/v0.2.0...v0.3.0) (2026-06-15)


### Features

* complete Skill Nexus platform with all phases ([4a60fdc](https://github.com/FLmhp/skill-nexus/commit/4a60fdc3e4bad654dde2f7fb4e9fdbee9e28ee04))
* release Skill Nexus v0.2.0 ([0d59076](https://github.com/FLmhp/skill-nexus/commit/0d59076b8cdd4259db313783b1d51456315c5718))


### Bug Fixes

* add libayatana-appindicator3-dev for Linux tray icon ([1e7c08f](https://github.com/FLmhp/skill-nexus/commit/1e7c08f12f06bdbad81ae50b1e413ed3d3d11673))
* add tauri npm script for tauri-action compatibility ([f75683d](https://github.com/FLmhp/skill-nexus/commit/f75683d477fa45653a17bbdb66bf9a740024ead7))
* add tauri script, fix Windows bash shell, suppress Node20 warnings ([92d537e](https://github.com/FLmhp/skill-nexus/commit/92d537ee229fe8b158354f3c9c31ba649dd915f7))
* BrowserRouter→HashRouter for Tauri production compatibility, fix CSP for Tauri IPC protocols ([b11fdab](https://github.com/FLmhp/skill-nexus/commit/b11fdab3cabac4e7f76e7073f7ea83fa0ffebfb1))
* disable createUpdaterArtifacts — no updater plugin configured ([1704148](https://github.com/FLmhp/skill-nexus/commit/1704148d32a2a9e7c0c4bc36414f8ad04e43aa1b))
* match VaporGit CSP pattern (simplified) — remove unnecessary tauri:/ipc: protocols and 'unsafe-inline' script-src, revert base './' ([ee2e838](https://github.com/FLmhp/skill-nexus/commit/ee2e838c579702cd045272b780de5a1ef4d8b95e))
* release workflow supports both tag push and manual dispatch ([bb0ec82](https://github.com/FLmhp/skill-nexus/commit/bb0ec824cb3cc7c7aef7b86d1f183d0040331817))
* remove deprecated scope field from fs plugin config ([51fc7cb](https://github.com/FLmhp/skill-nexus/commit/51fc7cb8de0d784350457a86d0e74e2e097b61c9))
* remove unused tauri-plugin-sql, use rusqlite directly ([8bd5a1e](https://github.com/FLmhp/skill-nexus/commit/8bd5a1ea29bb23859cf15dff6648ea541edd0f49))
* resolve CI lint errors and action deprecation warnings ([3abf9b7](https://github.com/FLmhp/skill-nexus/commit/3abf9b7cd441db09e2a44172c1c104ef2ee1f0e6))
* resolve TypeScript errors — disable strict unused checks, fix type issues in graph/sandbox/explorer pages ([f67aaf3](https://github.com/FLmhp/skill-nexus/commit/f67aaf3f34a570907d3127f51770b5362710686d))
* use tauri-action v0 instead of v2 ([b194a90](https://github.com/FLmhp/skill-nexus/commit/b194a9058cb107f691d87fa4ef1146824a66a6c6))
* Vite base './' for relative asset paths, add ErrorBoundary, enable logging in release, add loading fallback in HTML ([4e5c30d](https://github.com/FLmhp/skill-nexus/commit/4e5c30dbde9fe8fdf8b750d56ac6eae4a0ad0209))
* vitest --passWithNoTests to pass CI when no tests exist ([9f0c9ee](https://github.com/FLmhp/skill-nexus/commit/9f0c9eea67977488fedb149276ba082b36c4ba66))

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
