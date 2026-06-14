# Changelog

## [0.1.3](https://github.com/FLmhp/skill-nexus/compare/v0.1.2...v0.1.3) (2026-06-14)


### Bug Fixes

* match VaporGit CSP pattern (simplified) — remove unnecessary tauri:/ipc: protocols and 'unsafe-inline' script-src, revert base './' ([ee2e838](https://github.com/FLmhp/skill-nexus/commit/ee2e838c579702cd045272b780de5a1ef4d8b95e))

## [0.1.2](https://github.com/FLmhp/skill-nexus/compare/v0.1.1...v0.1.2) (2026-06-14)


### Bug Fixes

* Vite base './' for relative asset paths, add ErrorBoundary, enable logging in release, add loading fallback in HTML ([4e5c30d](https://github.com/FLmhp/skill-nexus/commit/4e5c30dbde9fe8fdf8b750d56ac6eae4a0ad0209))

## [0.1.1](https://github.com/FLmhp/skill-nexus/compare/v0.1.0...v0.1.1) (2026-06-14)


### Bug Fixes

* BrowserRouter→HashRouter for Tauri production compatibility, fix CSP for Tauri IPC protocols ([b11fdab](https://github.com/FLmhp/skill-nexus/commit/b11fdab3cabac4e7f76e7073f7ea83fa0ffebfb1))

## [0.1.0] - 2026-06-14

### Added
- Cross-platform desktop app (Tauri 2 + React 19 + Rust + SQLite)
- Skill CRUD with FTS5 full-text search and version history
- Monaco Editor integration for skill editing
- Import/Export in Markdown, JSON, and YAML formats
- Internationalization (Chinese + English) with dark/light theme
- Auto-detection of 15+ AI coding tools (Cursor, Windsurf, Claude Code, Codex, OpenCode, etc.)
- Symlink and copy-based deployment to target AI tools
- Bulk deploy and deploy-all-active operations
- Dependency graph visualization (React Flow + dagre auto-layout)
- Visual skill builder with drag-and-drop blocks (6 block types)
- Testing sandbox with LLM backend support (Anthropic, OpenAI, Ollama)
- Multi-source marketplace (GitHub, skills.sh, skillsmp.com, npmskills.sh)
- AI-powered skill recommendations, generation, and optimization
- Analytics dashboard with Recharts (pie chart, bar chart)
- Backup and restore with legacy import from Skills-Manager, Skills-Desktop, Oh-My-Skills, Skiller
- Semantic versioning via release-it with automated CI/CD release pipeline
