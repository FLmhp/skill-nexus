# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Workflow & process**: See [AGENTS.md](./AGENTS.md) for the standardized agent workflow, git safety rules, code review checklist, and release process.

## Release (Semantic Versioning)

```bash
npm run release:patch     # 0.1.0 → 0.1.1 (bug fixes)
npm run release:minor     # 0.1.0 → 0.2.0 (new features)
npm run release:major     # 0.1.0 → 1.0.0 (breaking changes)
npm run release:dry       # Preview what a release would do

# Release process:
# 1. Bumps version in package.json
# 2. Runs scripts/sync-version.mjs → updates Cargo.toml + tauri.conf.json
# 3. Generates/updates CHANGELOG.md from conventional commits
# 4. Creates git tag (vX.Y.Z) + commit + push
# 5. Creates GitHub Release (when GITHUB_TOKEN is set)
```

Or trigger manually via GitHub Actions: **Actions → Release → Run workflow** with bump type selector. This runs release-it, builds all three platforms, and attaches installers to the release.

## Build & Run Commands

```bash
# Development
npm run tauri dev        # Start Tauri app (frontend + backend)
npm run dev              # Start Vite dev server only (localhost:5173)

# Build
npm run build            # TypeScript check + Vite production build
npm run tauri build      # Full Tauri production build (platform installer)

# Lint
npm run lint             # ESLint on all .ts/.tsx files

# Backend only
cd src-tauri && cargo build             # Debug build
cd src-tauri && cargo build --release   # Release build
cd src-tauri && cargo clippy -- -D warnings  # Rust lint
```

## Architecture

**Tauri 2 desktop app** — React 19 frontend talking to a Rust backend via 41 typed IPC commands over Tauri's bridge.

### Data Flow

```
React Component → TanStack Query hook → src/services/ipc.ts → invoke("command") → Rust #[tauri::command] → SQLite / filesystem
```

Each Rust command handler lives in `src-tauri/src/commands/<domain>.rs`. Every command MUST be registered in `src-tauri/src/lib.rs` in the `generate_handler![]` macro, and SHOULD have a typed TypeScript wrapper in `src/services/ipc.ts`.

### Key Directories

| Path | Purpose |
|------|---------|
| `src/features/` | 11 feature modules — each is a self-contained page or view |
| `src/components/shared/` | Reusable components: MainLayout, AppSidebar, StatusBar, SkillCard |
| `src/hooks/` | TanStack Query hooks (useSkills, useDeployments, etc.) |
| `src/stores/` | Zustand stores (useAppStore, useUIStore) |
| `src/services/ipc.ts` | All Tauri `invoke()` wrappers + DTO interfaces |
| `src-tauri/src/commands/` | 10 modules of `#[tauri::command]` handlers |
| `src-tauri/src/modules/` | Pure business logic: hub, symlink, scanner, security, backup |
| `src-tauri/src/db/` | SQLite: connection pool (r2d2), migrations, model structs |

### State Architecture

- **Zustand** (`useAppStore`, `useUIStore`) — client-side UI state (theme, sidebar, modals, toasts)
- **TanStack Query** — server state from Rust backend (skills, tools, deployments, analytics). Cached with 30s stale time, auto-refetch with `refetchInterval`
- **Rust AppState** — `r2d2::Pool<SqliteConnectionManager>` + `RwLock<AppConfig>`. Managed by Tauri as `.manage(app_state)`. Every `#[tauri::command]` receives `State<'_, AppState>`

### Route Architecture

Eager-loaded core pages: Dashboard, Skills, SkillDetail, SkillEditor, Settings, Tools
Lazy-loaded heavy pages: SkillBuilder (dnd-kit), DependencyGraph (React Flow), TestingSandbox, Analytics (Recharts), Marketplace, Projects

Lazy components use `React.lazy(() => import("./features/.../Page").then(m => ({ default: m.Page })))` wrapped in `<Suspense fallback={<PageLoader />}>`.

## Database

SQLite with WAL mode, foreign keys, 64MB cache. Migrations are versioned in `src-tauri/src/db/migrations.rs` — a `MIGRATIONS: &[&str]` array with sequential version numbers.

**To add a migration**: append to the `MIGRATIONS` array. Never delete or reorder existing entries. The `_migrations` table tracks applied versions; `run_migrations()` runs any unapplied entries.

The `skills_fts` virtual table uses FTS5. When creating/updating/deleting skills, the FTS index must be maintained separately (FTS virtual tables don't respect foreign key cascades).

## Key Patterns

### @/ path alias

`@/` resolves to `src/` in both TypeScript (`tsconfig.app.json`) and Vite (`vite.config.ts`). Import shared utilities as `@/lib/cn`, components as `@/components/shared/SkillCard`, etc.

### cn() utility

`src/lib/cn.ts` combines `clsx` and `tailwind-merge`. Use for all conditional class names:
```tsx
className={cn("base-class", isActive && "active-class", className)}
```

### Theming

CSS variables in `src/styles/globals.css` define `--surface-*`, `--brand-*`, `--text-*`, `--status-*`, `--border-*`. Theme toggle adds/removes `dark` class on `<html>` via `useAppStore.theme` and a MutationObserver. Use CSS variables in components, never hardcoded colors.

### i18n

`src/i18n/locales/{en,zh}/common.json`. All user-facing strings go here. Use `const { t } = useTranslation()` in components. Keys organized by section: `nav.*`, `actions.*`, `status.*`, `skills.*`, `settings.*`.

### Adding a new IPC command

1. Write `#[tauri::command] pub async fn my_command(state: State<'_, AppState>, ...) -> Result<T, String>` in the appropriate `src-tauri/src/commands/<domain>.rs`
2. Register it in `src-tauri/src/lib.rs`'s `generate_handler![]` macro
3. Add a typed wrapper in `src/services/ipc.ts`: `export async function myCommand(...): Promise<T> { return invoke("my_command", { ... }) }`
4. Create a TanStack Query hook in `src/hooks/` if the command is a query or mutation

### Hub directory

`~/.skills-nexus/` stores skills as `.md` files in `hub/skills/`, metadata in `hub/metadata/`, SQLite DB in `database/`, backups in `backups/`, marketplace cache, and logs.

### Supported AI tools

15 tools are detected by scanning home directory for known config paths. The list is in `src-tauri/src/modules/scanner.rs` (TOOL_PATTERNS) and mirrored in `src/lib/constants.ts` (SUPPORTED_TOOLS).
