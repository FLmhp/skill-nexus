export const APP_NAME = "Skills Nexus"
export const APP_VERSION = "0.1.0"
export const HUB_DIR = ".skills-nexus"

// Supported AI tools for detection and deployment
export const SUPPORTED_TOOLS = [
  { slug: "cursor", displayName: "Cursor", configDir: ".cursor/rules" },
  { slug: "windsurf", displayName: "Windsurf", configDir: ".codeium/windsurf" },
  { slug: "claude-code", displayName: "Claude Code", configDir: ".claude/skills" },
  { slug: "cline", displayName: "Cline", configDir: ".cline" },
  { slug: "github-copilot", displayName: "GitHub Copilot", configDir: ".github/prompts" },
  { slug: "continue", displayName: "Continue", configDir: ".continue" },
  { slug: "aider", displayName: "Aider", configDir: ".aider" },
  { slug: "codex", displayName: "Codex CLI", configDir: ".codex/skills" },
  { slug: "opencode", displayName: "OpenCode", configDir: ".opencode/skills" },
  { slug: "trae", displayName: "Trae IDE", configDir: ".trae/skills" },
  { slug: "roo-code", displayName: "Roo Code", configDir: ".roo/skills" },
  { slug: "gemini-cli", displayName: "Gemini CLI", configDir: ".gemini/skills" },
  { slug: "kilo-code", displayName: "Kilo Code", configDir: ".kilo/skills" },
  { slug: "goose", displayName: "Goose", configDir: ".goose/skills" },
  { slug: "qwen", displayName: "Qwen CLI", configDir: ".qwen/skills" },
] as const

export type ToolSlug = (typeof SUPPORTED_TOOLS)[number]["slug"]

// Marketplace sources
export const MARKETPLACE_SOURCES = [
  { name: "awesome-claude-skills", url: "https://github.com/ComposioHQ/awesome-claude-skills" },
  { name: "skills.sh", url: "https://www.skills.sh/" },
  { name: "skillsmp.com", url: "https://skillsmp.com/" },
  { name: "npmskills.sh", url: "https://npmskills.sh/" },
] as const

// Skill types
export const SKILL_TYPES = ["custom", "system", "marketplace", "template"] as const
export type SkillType = (typeof SKILL_TYPES)[number]

// Dependency types
export const DEPENDENCY_TYPES = ["imports", "extends", "requires", "conflicts"] as const
export type DependencyType = (typeof DEPENDENCY_TYPES)[number]

// Deployment statuses
export const DEPLOY_STATUSES = ["pending", "active", "syncing", "error", "outdated"] as const

// Route paths
export const ROUTES = {
  DASHBOARD: "/",
  SKILLS: "/skills",
  SKILL_DETAIL: "/skills/:id",
  EDITOR: "/editor/:id?",
  BUILDER: "/builder",
  GRAPH: "/graph",
  SANDBOX: "/sandbox",
  ANALYTICS: "/analytics",
  MARKETPLACE: "/marketplace",
  TOOLS: "/tools",
  SETTINGS: "/settings",
  PROJECTS: "/projects",
} as const
