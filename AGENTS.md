# Skill Nexus - Agent Workflow Reference

本文档是 SkillNexus 仓库中 AI Agent 的工作规范。所有结论、计划和实现必须来自本仓库当前文件，不得套用其他仓库或旧项目的结构、命令、i18n、UI、发布流程或历史经验。

## 0. 项目边界

- 唯一项目根目录：`C:\Users\SoloEternity\Documents\Code\SkillNexus`
- 如果搜索、索引或 codegraph 结果明显来自其他仓库，必须丢弃该结果，并使用更精确的 SkillNexus 路径重新查询。
- `logo.png` 是本项目的 logo 源图。应用图标、侧边栏品牌和关于信息应优先从它派生。
- `src/i18n/en.ts`、`src/i18n/zh.ts` 和 `src/i18n/index.ts` 构成当前轻量 i18n 入口。
- 当前测试基线仍较薄。新增行为应补充聚焦的 Vitest 或 Cargo 测试，不得用构建通过替代测试结论。
- Windows release 构建使用 GUI subsystem，运行应用不应出现额外控制台黑框。
- 项目许可证为 MIT，根目录 `LICENSE`、`package.json` 与 `src-tauri/Cargo.toml` 必须保持一致。

## 1. 启动检查

开始任何任务前先读取或确认：

- `AGENTS.md`
- `package.json`
- `src-tauri/Cargo.toml`
- `src-tauri/tauri.conf.json`
- 与任务相关的 `src/`、`src-tauri/src/` 文件
- `git status --short`

优先使用 `rtk` 前缀执行 shell 命令，例如：

```powershell
rtk npm run lint
rtk npm run typecheck
rtk cargo check --manifest-path src-tauri/Cargo.toml
```

如果 `rtk rg` 在 Windows 上拒绝访问，可使用 `rtk proxy powershell -NoProfile -Command "<read-only command>"` 降级探索，并在结果中说明。

## 2. 当前技术栈

| 层面 | 技术 |
| --- | --- |
| 桌面框架 | Tauri 2 |
| 后端 | Rust 2021 |
| 数据库 | SQLite via `rusqlite`，WAL 模式 |
| 前端 | React 19 + TypeScript |
| 路由 | React Router v7 |
| 状态管理 | Zustand 5 |
| 样式 | Tailwind CSS v3 + CSS variables |
| UI 基础 | Radix UI + lucide-react |
| 图谱 | Cytoscape.js |
| 构建 | Vite + Cargo |
| 测试 | Vitest、Cargo tests |

## 3. 实际目录结构

### 3.1 Rust / Tauri

```text
src-tauri/src/
├── commands/
│   ├── agents.rs
│   ├── marketplace.rs
│   ├── mcp.rs
│   ├── mod.rs
│   ├── scan.rs
│   ├── settings.rs
│   └── skills.rs
├── db/
│   ├── agents.rs
│   ├── config.rs
│   ├── mcp.rs
│   ├── mod.rs
│   ├── scans.rs
│   └── skills.rs
├── models/
│   └── mod.rs
├── services/
│   ├── marketplace.rs
│   ├── mod.rs
│   ├── parser.rs
│   ├── scanner.rs
│   ├── security.rs
│   ├── syncer.rs
│   └── watcher.rs
├── lib.rs
└── main.rs
```

约定：

- `commands/` 只做 Tauri IPC 参数处理、权限/边界校验和结果序列化。
- `services/` 放业务逻辑，例如扫描、解析、安全检测、同步和市场集成。
- `db/` 封装 SQLite 访问。SQL 必须使用参数化查询。
- `models/` 定义 Rust 和前端共享语义的数据结构。

### 3.2 React / TypeScript

```text
src/
├── api/
│   ├── agents.ts
│   ├── marketplace.ts
│   ├── mcp.ts
│   ├── scan.ts
│   └── skills.ts
├── components/
│   ├── agents/
│   ├── graph/
│   ├── layout/
│   ├── marketplace/
│   ├── mcp/
│   ├── security/
│   └── skills/
├── hooks/
├── i18n/
│   ├── en.ts
│   ├── index.ts
│   └── zh.ts
├── pages/
├── stores/
├── types/
├── lib/
├── App.tsx
├── main.tsx
└── index.css
```

约定：

- 所有 Tauri `invoke` 调用必须封装在 `src/api/`，组件不得直接调用 `invoke`。
- 跨页面共享状态放 Zustand store，单页面 UI 状态优先使用 React state。
- 数据驱动页面必须处理 loading、empty、error、retry 或可恢复动作。
- 图谱相关 UI 修改必须验证 Cytoscape 实例生命周期和大图性能。

## 4. 当前业务事实

后续 Agent 必须按以下 SkillNexus 当前实现继续推进：

- `logo.png` 是唯一 logo 源图，已用于应用品牌、Tauri 图标派生和 Windows installer/shortcut 图标；新增品牌入口应继续复用它。
- Settings 已通过 SQLite 持久化 `language`、`extra_scan_paths`、`auto_watch_enabled`，清库后会恢复默认 agents。
- 自动监听技能目录是可选能力，默认关闭；启用后监听 enabled agent paths 和 extra scan paths，并防抖触发重扫。
- 默认 agents 初始化时只启用当前计算机实际存在的 skills 目录；不存在的 agent 默认 disabled。
- `src/i18n/index.ts` 是当前轻量 i18n 入口；新增主 UI 文案应补齐 `en.ts` 与 `zh.ts`。
- `scan_and_import` 返回 `ScanImportResult`，包含真实 `skills` 和扫描摘要；前端不得自行猜测导入/更新状态。
- `scan_and_import` 使用 enabled agents + extra scan paths，重新扫描时按 path 或逻辑 skill 名称更新已有 skill，并清理同名本地重复项。
- `scan_and_import` 从 frontmatter metadata 和 SKILL.md 正文提及中推断关系后写入 `skill_relations`。
- SKILL.md frontmatter 使用 `yaml-rust` 结构化解析，并保留 malformed/missing frontmatter fallback。
- Security 风险分数统一为 0-100；Dashboard、SkillDetail、Security card 等 UI 必须按 0-100 展示。
- Security 静态扫描规则参考 NVIDIA SkillSpector 的类别模型，包括 prompt injection、data exfiltration、privilege escalation、supply chain、excessive agency、output handling、system prompt leakage、memory poisoning、tool misuse、rogue agent、trigger abuse、dangerous code/AST、taint tracking、YARA-like indicators、MCP least privilege 和 MCP tool poisoning。
- Marketplace 查询来源为 SkillsMP `https://skillsmp.com/api/v1/skills/search` 和 MCPMarket `https://mcpmarket.cn/api/servers`。
- `skills.sh` 作为目录网页来源：解析首页公开 GitHub 仓库链接并按查询词过滤；不得继续调用旧的 `https://www.skills.sh/api/skills`。
- Marketplace UI 不显示跨来源 rating/stars 作为统一评分；不同平台指标只能作为来源特定信息处理。
- Marketplace 安装只允许安全 URL，并限制写入 app data 下的 sanitize 安装目录。
- MCP 新增/更新返回保存后的 `McpServer`；`test_mcp_server` 只做 stdio command/字段验证和 HTTP 可达性诊断，不管理常驻进程生命周期。
- Agent 同步返回 `AgentSyncResult`；单 agent 同步、全量同步和单 skill 同步都必须保留 canonical path guard。
- React 路由已使用 `React.lazy`/`Suspense` 拆分重页面；图谱修改必须继续关注 Cytoscape 生命周期和大图性能。
- 测试基线已有 Vitest 与 Cargo tests，但仍应随新增业务行为补充聚焦测试。

## 5. 安全规则

### 路径和文件操作

- 所有来自用户、设置、数据库或外部接口的路径都视为不可信。
- 文件读写、删除、复制、软链前必须 canonicalize。
- 目标路径必须位于允许根目录内，例如 app data、已启用 agent skills root 或用户显式配置的 extra scan path。
- 禁止访问系统敏感目录，例如 `C:\Windows\System32`、`/etc`、`/proc`。
- 删除目录前必须再次验证 canonical target 在预期根目录内。

### Marketplace / URL

- 只允许 `https://` URL。
- 下载 SKILL.md 或安装远程 skill 时必须限制写入 app data 下的安装目录。
- 目录名必须 sanitize，不能直接使用远程 name 作为路径。
- 错误信息给用户可读，但不要泄露内部堆栈或敏感路径细节。

### Rust

- Tauri commands 和 services 返回 `Result<T, String>`。
- 禁止在业务路径中使用 `unwrap()` 或 `expect()`。
- 同步文件扫描、复制、安全扫描等重 I/O 应考虑 `spawn_blocking`，避免阻塞 async runtime。
- SQLite 使用 WAL 和 `foreign_keys=ON`，写操作保持短事务。

### TypeScript / UI

- 不使用 `dangerouslySetInnerHTML` 渲染外部内容。
- catch 块必须设置 error state 或记录可诊断信息。
- 破坏性操作必须有明确确认流程。
- 图标按钮必须有 `title` 或 `aria-label`。

## 6. 开发流程

推荐顺序：

```text
需求边界确认 -> 只读探索 -> 小步实现 -> 自测验证 -> 安全复核 -> Git 提交/Push -> 询问发布
```

实施规则：

- 先修改规范/契约，再实现依赖该规范的代码。
- 多文件任务按可验证切片推进，不要一次性混入无关重构。
- 不要修复与当前任务无关的问题；可在最终说明中列出 noticed but not touched。
- 遇到用户已有未跟踪或未提交文件时，不得删除或回滚，除非用户明确要求。

## 7. 常用命令

| 命令 | 用途 |
| --- | --- |
| `npm run dev` | 启动 Vite 开发服务器 |
| `npm run tauri:dev` | 启动 Tauri 开发模式 |
| `npm run build` | TypeScript 检查 + 前端构建 |
| `npm run lint` | ESLint 检查 |
| `npm run typecheck` | TypeScript 类型检查 |
| `npm run test` | Vitest 测试 |
| `npm run test:watch` | Vitest 监听模式 |
| `npm run format` | Prettier 格式化 `src/**/*.{ts,tsx,css}` |
| `npm run release:check` | 校验 release-please manifest、版本文件和本地 tag 基线一致 |
| `cargo check --manifest-path src-tauri/Cargo.toml` | Rust 类型检查 |
| `cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings` | Rust lint |
| `cargo test --manifest-path src-tauri/Cargo.toml` | Rust 测试 |

## 8. Push 前检查

提交或 Push 前至少执行：

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
- `cargo check --manifest-path src-tauri/Cargo.toml`
- `cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings`
- `cargo test --manifest-path src-tauri/Cargo.toml`

如果当前环境缺少 Rust 工具链或 `cargo` 不在 PATH，必须在最终说明中明确记录，不能声称 Rust 验证通过。

## 9. Git 规则

- 开始提交前运行 `git status --short`。
- 不在 `main` 上直接提交功能变更，除非用户明确要求。
- 禁止 `git push --force`、`git reset --hard`、`git clean -fd`、删除分支或重写已推送历史。
- 需要确认的操作：`git rebase`、`git revert`、`git push --delete`、`git reset --soft`。
- 提交格式：

```text
<type>: <description>
```

常用 type：`feat`、`fix`、`security`、`refactor`、`perf`、`i18n`、`test`、`chore`、`docs`。

## 10. 发布流程

发布由 release-please 驱动，不再手动运行版本 bump 脚本或手动创建发布 tag。

当前闭环：

1. 按 Conventional Commits 提交变更到 `main`。
2. `.github/workflows/release.yml` 在 `main` 推送后运行 release-please。
3. release-please 根据提交语义自动判断 semver，更新 `CHANGELOG.md`、`package.json`、`package-lock.json`、`src-tauri/Cargo.toml`、`src-tauri/tauri.conf.json` 和 `.release-please-manifest.json`，并创建 Release PR。
4. 合并 Release PR 后，release-please 创建 GitHub tag 和 Release。
5. 同一 workflow 的 Tauri matrix build 使用该 tag 构建 Windows、macOS、Linux 安装包并上传到 Release。

发布前检查：

- `npm run release:check` 必须通过，确保 manifest、版本文件和本地 tag 基线一致。
- 不要手动创建 `v*` tag，除非开发者明确要求执行紧急发布修复。
- 不要使用旧的手动 bump/tag 流程；如发现 `scripts/bump-version.mjs` 或类似脚本被重新引入，应优先移除或隔离。

## 11. 文档维护

- `AGENTS.md` 应随项目真实结构更新。
- 新增公开 Tauri command、共享 model、数据库表或关键安全策略时，同步更新本文件。
- 若未来引入 `src/i18n/index.ts`、README、ADR 或测试目录，更新对应索引。
