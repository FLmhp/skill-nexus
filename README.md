# Skills Nexus

<div align="center">

**Cross-platform Desktop Skills Visual Manager for AI Coding Assistants**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Tauri](https://img.shields.io/badge/Tauri-2.0-FFC131?logo=tauri)](https://tauri.app)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![Rust](https://img.shields.io/badge/Rust-1.77+-000000?logo=rust)](https://rust-lang.org)

</div>

## Overview

Skills Nexus is a desktop application that serves as a central hub for creating, managing, deploying, and visualizing AI skill prompts across all major AI coding tools. Write once, deploy everywhere.

### Why Skills Nexus?

Developers use multiple AI coding assistants (Cursor, Windsurf, Claude Code, Cline, etc.) — each with its own skills directory. Skills Nexus eliminates fragmentation:

- **One source of truth** — manage all skills in a central hub
- **Deploy anywhere** — symlink or copy to 15+ AI tools with one click
- **Visual tools** — dependency graph, drag-drop builder, testing sandbox
- **Stay in control** — version history, analytics, security scanning

## Features

### Core
- **Skill CRUD** — Create, read, update, delete with Markdown/Monaco editor
- **FTS5 Full-Text Search** — Instant search across all skill names, descriptions, and content
- **Version History** — Full audit trail with diff comparison and rollback
- **Import/Export** — Markdown (with YAML frontmatter), JSON, YAML
- **Internationalization** — Chinese + English from day one
- **Dark/Light Theme** — System-aware with manual override

### Tool Integration
- **Auto-Detection** — Scans home directory for 15+ AI tools
  - Cursor, Windsurf, Claude Code, Cline, GitHub Copilot, Continue, Aider
  - Codex, OpenCode, Trae, Roo Code, Gemini CLI, Kilo Code, Goose, Qwen
- **Dual Deployment** — Symlink (live sync) or Copy (independent)
- **Bulk Operations** — Deploy all active skills to any tool at once
- **Custom Tools** — Add any tool with arbitrary paths

### Visual Features
- **Dependency Graph** — Interactive React Flow graph with dagre auto-layout
  - Color-coded edges: imports, extends, requires, conflicts
  - Circular dependency detection + impact analysis
- **Visual Skill Builder** — Drag-and-drop block composer
  - 6 block types: Prompt, Context, Condition, Output Format, Reference, Example
  - Real-time Markdown preview generation
- **Testing Sandbox** — Test skills against real LLMs side-by-side
  - Supports: Anthropic (Claude), OpenAI (GPT), Ollama (local)
  - Heuristic scoring with auto-saved test cases

### Advanced
- **Marketplace** — Multi-source skill discovery
  - Sources: GitHub (awesome-claude-skills), skills.sh, skillsmp.com, npmskills.sh
  - 13 categories, search, one-click install
- **AI Recommendations** — Context-aware skill suggestions + NL→Skill generation + Skill optimization
- **Analytics** — Usage dashboards with Recharts (pie chart, bar chart)
- **Backup & Restore** — Full database backup with restore + legacy import

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop Shell | Tauri 2.x |
| Frontend | React 19 + TypeScript + Vite 8 |
| Styling | Tailwind CSS v4 + shadcn/ui (Radix) |
| State | Zustand + TanStack Query v5 |
| Editor | Monaco Editor (lazy loaded) |
| Graph | React Flow + dagre |
| Drag/Drop | @dnd-kit |
| Charts | Recharts |
| i18n | i18next + react-i18next |
| Backend | Rust (tokio async) |
| Database | SQLite (WAL mode, FTS5) |
| LLM | Anthropic / OpenAI / Ollama |
| Package | .msi / .dmg / .AppImage |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [Rust](https://rustup.rs/) >= 1.77
- [Tauri prerequisites](https://tauri.app/start/prerequisites/) for your OS

### Development

```bash
git clone https://github.com/skills-nexus/skills-nexus.git
cd skills-nexus
npm install
npm run tauri dev
```

### Build

```bash
npm run tauri build
# Installer in src-tauri/target/release/bundle/
```

### Environment Variables

| Variable | Purpose |
|----------|---------|
| `ANTHROPIC_API_KEY` | Claude API for testing sandbox + AI features |
| `OPENAI_API_KEY` | GPT API for testing sandbox |

## Architecture

```
┌─────────────────────────────────────────────────┐
│                React Frontend                    │
│  Dashboard │ Skills │ Editor │ Builder │ Graph   │
│  Sandbox │ Analytics │ Marketplace │ Settings   │
├─────────────────────────────────────────────────┤
│           Tauri 2.0 IPC Bridge (44 commands)     │
├─────────────────────────────────────────────────┤
│               Rust Backend                       │
│  Skills │ Tools │ Deployments │ Dependencies    │
│  Testing │ Marketplace │ AI │ Backup/Restore    │
├─────────────────────────────────────────────────┤
│         SQLite (WAL + FTS5) + Hub Filesystem     │
└─────────────────────────────────────────────────┘
```

## Project Structure

```
skills-nexus/
├── src/                    # React Frontend (11 feature modules)
├── src-tauri/src/          # Rust Backend (44 IPC commands)
│   ├── commands/           # IPC handlers (10 modules)
│   ├── modules/            # Business logic (hub, symlink, scanner, etc.)
│   └── db/                 # SQLite (connection, migrations, models)
├── .github/workflows/      # CI/CD (cross-platform builds)
└── docs/                   # Architecture & user docs
```

## Acknowledgments

Inspired by: [Skills-Manager](https://github.com/jiweiyeah/Skills-Manager), [skills-desktop](https://github.com/Harries/skills-desktop), [Skiller](https://github.com/AFunc-OPC/Skiller), [oh-my-skills](https://github.com/Almost42/oh-my-skills), [skill-hub](https://github.com/Backtthefuture/huangshu)

Data sources: [awesome-claude-skills](https://github.com/ComposioHQ/awesome-claude-skills), [skills.sh](https://www.skills.sh/), [skillsmp.com](https://skillsmp.com/)

## License

MIT
