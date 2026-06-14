# Skills Nexus — Agent Workflow Reference

> 本文档为 AI Agent（Claude Code 等）在此项目中的工作流程提供标准化指引。
> 目标：确保 Agent 按照固定边界和流程处理任务，减少遗漏和偏差。

---

## 工作流程总览

```
需求边界确定 → 工程代码编写 → 代码安全性审查 → Git提交与Push → 询问版本发布
```

---

## 一、需求边界确定

### 1.1 收到需求后第一步

- 阅读 `AGENTS.md`（本文件）了解流程
- 阅读 `CLAUDE.md` 了解项目结构、命令、架构约定
- 阅读 `package.json` 和 `src-tauri/Cargo.toml` 了解当前版本号
- 如涉及具体代码，先确认当前分支和工作区状态

### 1.2 需求分类

| 类别 | 示例 | 处理方式 |
|------|------|---------|
| **Bug 修复** | 数据丢失、部署失败、IPC 错误 | 复现 → 定位根因 → 最小修复 |
| **功能开发** | 新UI页面、新工具支持、新IPC命令 | 架构设计 → 逐步实现 |
| **代码审查** | 安全审计、质量审查 | 按审查清单逐项检查 |
| **重构/优化** | 性能优化、代码清理、bundle 缩减 | 确定范围 → 逐步更改 |
| **配置/构建** | CI/CD、打包、版本发布 | 按构建流程处理 |

### 1.3 边界确认

在开始编码前必须确认：

- [ ] 需求是否明确？模糊处是否已提问澄清？
- [ ] 是否已理解该需求对 Rust 后端 / React 前端 / SQLite 数据库的影响范围？
- [ ] 是否有现成的 IPC 命令、TanStack Query hook、Zustand store 可以复用？
- [ ] 是否需要新增数据库迁移？是否影响 FTS5 索引？
- [ ] 改动是否会破坏现有功能？

### 1.4 复杂任务的处理原则

将多步骤任务拆分为可独立验证的子任务。每完成一个子任务后同步进展。

---

## 二、工程代码编写

### 2.1 技术栈

| 层面 | 技术 |
|------|------|
| 前端框架 | React 19 + TypeScript（**不是** SolidJS） |
| 路由 | `react-router-dom` v7 |
| 状态管理（客户端） | Zustand v5（`useAppStore`, `useUIStore`） |
| 状态管理（服务端） | TanStack Query v5（缓存、重取、乐观更新） |
| 样式 | Tailwind CSS v4 + CSS variables 主题系统 |
| 组件库 | shadcn/ui（Radix primitives） |
| 代码编辑器 | Monaco Editor（lazy loaded） |
| 图可视化 | React Flow + dagre |
| 拖拽 | @dnd-kit |
| 图表 | Recharts |
| 国际化 | i18next + react-i18next（zh + en） |
| 桌面框架 | Tauri 2 |
| 后端语言 | Rust（edition 2021） |
| 数据库 | SQLite（WAL 模式，FTS5 全文搜索） |
| 连接池 | r2d2 + r2d2_sqlite |
| HTTP 客户端 | reqwest |
| 文件监听 | notify crate |
| 构建 | Vite 8（前端）+ Cargo（后端） |
| 版本发布 | release-it + GitHub Actions |

### 2.2 架构约定

**后端模块结构（`src-tauri/src/`）：**
```
commands/      Tauri 命令桥接层（system, skills, tools, deployments, projects,
               dependencies, testing, analytics, marketplace, recommendations）
modules/       核心业务逻辑（hub, symlink, scanner, security, backup）
db/            数据库层（connection, migrations, models）
config.rs      应用配置（hub_path, db_path, theme, language）
state.rs       AppState（db pool + RwLock<AppConfig>）
```

**前端模块结构（`src/`）：**
```
features/      11 个功能模块，每个模块一个页面（dashboard, skills, editor,
               builder, graph, sandbox, analytics, marketplace, tools,
               settings, projects）
components/    可复用组件（shared/ 下：MainLayout, AppSidebar, StatusBar,
               SkillCard）
hooks/         TanStack Query hooks（useSkills, useDeployments...）
stores/        Zustand stores（useAppStore, useUIStore）
services/      IPC 抽象层（ipc.ts — 所有 Tauri invoke 包装 + DTO 类型）
lib/           工具函数（cn.ts, constants.ts）
i18n/          国际化翻译文件（locales/en/, locales/zh/）
```

### 2.3 编码规则

#### Rust 后端

- **错误处理**：所有 Tauri 命令返回 `Result<T, String>`，错误消息使用**英文**（与现有代码风格一致）
- **Tauri 命令**：在 `commands/` 对应模块中添加，在 `lib.rs` 的 `generate_handler![]` 中注册
- **数据库操作**：使用 `state.db.clone()` 获取连接池，`conn = db.get()?` 获取连接
- **SQLite 迁移**：在 `db/migrations.rs` 的 `MIGRATIONS` 数组末尾追加，**绝不删除或重排已有条目**
- **FTS5 索引**：创建/更新/删除 skill 时必须同步维护 `skills_fts` 虚拟表（不支持外键级联）
- **State 引用**：跨 `await` 边界的 Tauri 命令中，数据库查询必须在独立的同步块中完成（rusqlite `Connection` 不是 `Send`）
- **内容哈希**：新建或更新 skill 内容时必须计算 SHA-256 哈希

#### TypeScript 前端

- **状态管理**：客户端 UI 状态用 Zustand，服务端数据用 TanStack Query
- **IPC 调用**：全部通过 `src/services/ipc.ts` 封装，不直接 `invoke()`
- **i18n**：用户可见文本使用 `useTranslation()` 的 `t('section.key')`，新增文本在 `locales/en/common.json` 和 `locales/zh/common.json` 中同步添加
- **主题**：使用 CSS variables（`--surface-*`, `--brand-*`, `--text-*`），不硬编码颜色值；支持通过 `.dark` class 切换
- **class 合并**：使用 `cn()` 工具函数（`src/lib/cn.ts`），结合 `clsx` 和 `tailwind-merge`
- **懒加载**：重型页面（Builder, Graph, Sandbox, Analytics, Marketplace, Projects）使用 `React.lazy()` + `<Suspense>`
- **组件状态覆盖**：每个数据展示组件必须覆盖 loading、empty、error、正常四种状态

### 2.4 常见陷阱

- **数据库连接不是 Send**：含 `stmt` 或 `conn` 的代码块必须在 `.await` 前结束（用 `{}` 包裹），否则编译报错
- **FTS5 虚拟表不支持级联删除**：删除 skill 时必须手动 `DELETE FROM skills_fts WHERE rowid = ...`
- **Windows symlink 需要 Developer Mode**：部署时自动检测并回退到 copy 模式
- **release-it 需要在 git repo 中运行**：确保项目已 `git init` 并关联 remote
- **Tauri State 不可跨命令传递**：用共享辅助函数（`do_*` 模式）而非调用其他 `#[tauri::command]`
- **版本号三处同步**：`package.json`, `Cargo.toml`, `tauri.conf.json` 必须保持一致（由 `scripts/sync-version.mjs` 自动处理）

---

## 三、代码安全性审查

每次提交前必须执行以下安全检查：

### 3.1 审查清单

#### 文件系统与路径
- [ ] 文件写入是否在 `~/.skills-nexus/` 范围内？
- [ ] 部署目标路径是否限制在已知 AI tool 配置目录中（`tauri.conf.json` 的 FS scope）？
- [ ] 用户提供的文件名是否经过 `sanitize_filename()` 处理？

#### 用户输入
- [ ] Skill 名称和内容是否验证非空？
- [ ] import 的文件路径是否验证存在？
- [ ] FTS5 搜索查询是否防止了注入（使用参数化查询 `?`）？

#### API 密钥与凭据
- [ ] `ANTHROPIC_API_KEY` 和 `OPENAI_API_KEY` 是否仅从环境变量读取？
- [ ] 是否有 API key 被日志打印或返回到前端？
- [ ] `.env` 和 `.env.local` 是否在 `.gitignore` 中？

#### CSP
- [ ] 新功能是否引入外部资源（CDN 脚本、字体、connect-src）？如有，需更新 `tauri.conf.json` 的 CSP
- [ ] CSP 中 `script-src` 是否保持 `'self'`？

#### 错误处理
- [ ] 所有 Tauri 命令的错误是否被前端 `onError` 处理（Toast 通知）？
- [ ] `catch` 块是否至少 `console.error`？

#### 数据库
- [ ] 新增查询是否使用参数化 SQL（`?1, ?2`）而非字符串拼接？
- [ ] 是否考虑了 SQLite 的并发访问（WAL 模式下的读写并发）？

### 3.2 审查后动作

- 发现安全问题 → 修复后再提交
- 发现严重问题（路径遍历、密钥泄露、SQL 注入）→ 立即报告开发者

---

## 四、Git 提交与 Push

### 4.1 分支策略

- 工作流程：
  ```bash
  git checkout -b feature/xxx   # 新功能分支
  git checkout -b fix/xxx       # 修复分支
  ```

### 4.2 🔴 Git 操作禁令（严格遵守）

| 禁止的操作 | 原因 | 安全替代方案 |
|-----------|------|------------|
| `git push --force` / `git push -f` | 覆盖远程历史 | 用 `git revert` |
| `git push --force-with-lease` | 同上 | 同上 |
| `git reset --hard HEAD~n` | 永久丢弃提交 | 用 `git reset --soft` |
| `git commit --amend`（已推送分支） | 历史分歧 | 用新提交 |
| `git checkout -- .` | 批量丢弃工作区 | 逐个文件恢复 |
| `git clean -fd` / `git clean -fdx` | 不可恢复 | 逐个文件确认 |
| `git branch -D`（大写 D） | 强制删除未合并分支 | 用 `git branch -d` |
| `git rebase` 在共享分支上 | 改写已推送历史 | 仅私有/本地分支可使用 |

### 4.3 提交规范

格式：`<type>: <简短描述>`

| type | 适用场景 |
|------|---------|
| feat | 新功能 |
| fix | Bug 修复 |
| security | 安全修复 |
| refactor | 重构 |
| perf | 性能优化 |
| i18n | 国际化相关 |
| style | UI/样式调整 |
| docs | 文档更新 |
| chore | 构建/配置/版本 |

### 4.4 Push 前检查

- [ ] `cargo build`（或 `cargo check`）通过（Rust 后端）
- [ ] `npx vite build` 通过（前端构建）
- [ ] 安全性审查清单已检查
- [ ] **确认不包含上述禁止操作**
- [ ] 版本号三处一致（如有版本变更）

### 4.5 Push

```bash
git add <files>
git commit -m "<type>: <message>"
git push origin <branch>
```

---

## 五、版本发布流程

### 5.1 版本号规范

遵循语义化版本 `MAJOR.MINOR.PATCH`，三处文件同步更新：
- `package.json` → `version`
- `src-tauri/Cargo.toml` → `package.version`
- `src-tauri/tauri.conf.json` → `version`

### 5.2 发布命令

```bash
npm run release:patch     # 0.1.0 → 0.1.1（bug 修复）
npm run release:minor     # 0.1.0 → 0.2.0（新功能）
npm run release:major     # 0.1.0 → 1.0.0（破坏性变更）
npm run release:dry       # 预览（不执行）
```

### 5.3 发布流程

完成开发工作后：

1. **询问开发者**：`是否需要发布新版本？`

2. **如果确认发布**：

   a. **确定版本号**：询问开发者或根据 commits 推算

   b. **运行 release**：
      ```bash
      npm run release:patch   #（或其他 bump 类型）
      ```
      自动执行：
      - 更新 `CHANGELOG.md`（从 conventional commits 生成）
      - 升级三处版本号（`package.json` → `Cargo.toml` → `tauri.conf.json`）
      - 创建 git tag `vX.Y.Z`
      - 推送到 GitHub 并创建 Release

   c. **手动触发全平台构建**（如需安装器）：
      GitHub Actions → **Release** workflow → `workflow_dispatch` → 选择 bump 类型
      自动构建 Windows（.msi）、macOS（.dmg）、Linux（.AppImage）并附加到 Release

3. **如果开发者不确认发布** → 结束流程。

---

## 六、其他流程

### 6.1 新增 IPC 命令

1. 在 `src-tauri/src/commands/<domain>.rs` 中添加 `#[tauri::command]`
2. 在 `src-tauri/src/lib.rs` 的 `generate_handler![]` 中注册
3. 在 `src/services/ipc.ts` 中添加 TypeScript 包装函数 + DTO 类型
4. 如需前端缓存，在 `src/hooks/` 中添加 TanStack Query hook

### 6.2 新增数据库迁移

1. 在 `src-tauri/src/db/migrations.rs` 的 `MIGRATIONS` 数组末尾追加 SQL 字符串
2. 版本号自动递增（通过数组索引 + 1）
3. 旧迁移条目**绝不修改或删除**

### 6.3 国际化（i18n）扩充

1. 在 `src/i18n/locales/en/common.json` 中添加英文 key
2. 在 `src/i18n/locales/zh/common.json` 中添加中文翻译
3. 前端代码中使用 `t('section.key')` 引用

### 6.4 代码审查流程

1. 按维度检查：安全性 → 业务逻辑 → 潜在 Bug → 错误处理 → UI 状态覆盖
2. 重点检查：IPC 边界类型一致性、SQL 参数化、FTS5 索引同步、跨平台兼容
3. 记录为结构化报告，修复后再提交

---

## 七、快速参考

### 常用命令

```bash
npm run tauri dev          # 启动 Tauri 开发环境
npm run dev                # 启动 Vite 前端开发服务器
npm run build              # TypeScript 检查 + Vite 生产构建
npm run lint               # ESLint
cd src-tauri && cargo check  # Rust 类型检查（快速）
cd src-tauri && cargo build  # Rust 编译
npm run release:patch      # 发布补丁版本
npm run release:dry        # 发布预览
```

### 关键文件索引

| 文件 | 用途 |
|------|------|
| `CLAUDE.md` | 项目架构、命令、编码约定（**阅读此文件**） |
| `src-tauri/src/lib.rs` | Tauri 命令注册中心（41 个命令） |
| `src-tauri/src/db/migrations.rs` | SQLite 迁移（MIGRATIONS 数组） |
| `src-tauri/src/commands/skills.rs` | Skill CRUD（最复杂的命令模块） |
| `src-tauri/src/commands/deployments.rs` | 部署引擎（symlink/copy） |
| `src-tauri/src/modules/symlink.rs` | 跨平台 symlink 实现 |
| `src-tauri/src/modules/scanner.rs` | AI 工具检测（15 个工具） |
| `src-tauri/tauri.conf.json` | Tauri 配置（窗口、CSP、FS scope、插件） |
| `src/services/ipc.ts` | 所有前端 Tauri 命令包装 + DTO 类型 |
| `src/App.tsx` | 前端路由配置（含懒加载） |
| `src/stores/useAppStore.ts` | 全局应用状态（主题、路径等） |
| `src/stores/useUIStore.ts` | UI 状态（侧栏、模态框、Toast） |
| `src/i18n/locales/en/common.json` | 英文翻译 |
| `src/i18n/locales/zh/common.json` | 中文翻译 |
| `scripts/sync-version.mjs` | 版本号同步脚本 |
| `.release-it.json` | 发布配置 |
| `.github/workflows/release.yml` | 全平台构建 + 发布 |

---

*本文档由 Agent 维护，随项目演进更新。*
