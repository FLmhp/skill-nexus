# Skill Nexus — Agent Workflow Reference

本文档为在 Skill Nexus 项目中工作的 AI Agent（Claude Code、Codex、OpenCode、Cursor、Gemini CLI 等）提供标准化工作流程。

---

## 工作流程总览

```
需求边界确定 → 工程代码编写 → 代码安全性审查 → Git提交与Push → 询问版本发布
```

---

## 一、需求边界确定

### 1.1 项目上下文读取

Agent 启动后应首先阅读以下文件以获取项目上下文：

- `AGENTS.md` — 本文档，Agent 工作流规范
- `CLAUDE.md` — 项目特定指令（如存在）
- `package.json` — 前端依赖和脚本
- `src-tauri/Cargo.toml` — Rust 后端依赖

### 1.2 需求分类

| 类别 | 说明 | 示例 |
|------|------|------|
| Bug Fix | 修复已知缺陷 | 修复 Skill 解析器对空 YAML 处理的 panic |
| Feature Dev | 新功能开发 | 添加 Skill 依赖关系自动检测 |
| Code Review | 代码审查 | 审查 PR 中的安全扫描逻辑 |
| Refactor | 重构优化 | 将扫描引擎从 walkdir 迁移到 ignore |
| Config / Build | 配置和构建变更 | 更新 Tauri CSP 策略，升级 Rust edition |

### 1.3 边界确认清单

在开始编写代码前，必须与开发者确认：

- [ ] **需求范围**：具体要做什么？不做什么边界在哪？
- [ ] **影响范围**：会触碰哪些模块/文件？
- [ ] **验收标准**：什么算"完成"？
- [ ] **时间约束**：是否有紧急性要求？
- [ ] **向后兼容**：是否会影响现有功能？
- [ ] **数据迁移**：是否需要数据库迁移？

### 1.4 复杂任务处理原则

1. **分解原则**：将复杂任务分解为独立可验证的子任务
2. **渐进交付**：每个子任务完成后提交一次，便于回溯
3. **优先确认**：不确定的设计决策先与开发者确认再动手
4. **文档先行**：涉及架构变更时，先在 AGENTS.md 更新对应章节

---

## 二、工程代码编写

### 2.1 技术栈

| 层面 | 技术 |
|------|------|
| 前端框架 | React 19 + TypeScript |
| 状态管理 | Zustand 5 |
| 路由 | React Router v7 |
| 样式 | Tailwind CSS v3 |
| UI 组件 | Radix UI |
| 可视化 | Cytoscape.js |
| 编辑器 | Monaco Editor (planned) |
| 桌面框架 | Tauri 2 |
| 后端语言 | Rust (edition 2021) |
| 数据库 | SQLite (WAL 模式) |
| 构建 | Vite + Cargo |

### 2.2 后端架构约定

```
src-tauri/src/
├── commands/        # Tauri 命令（IPC 接口层）
│   ├── mod.rs
│   ├── skills.rs    # Skill 扫描/CRUD 命令
│   ├── security.rs  # 安全扫描命令
│   ├── sync.rs      # 多 Agent 同步命令
│   └── mcp.rs       # MCP Server 配置命令
├── services/        # 业务逻辑层
│   ├── mod.rs
│   ├── scanner.rs   # Skill 扫描引擎
│   ├── security.rs  # 安全扫描引擎
│   ├── syncer.rs    # 多 Agent 同步引擎
│   └── marketplace.rs # 在线市场集成
├── db/              # 数据库层
│   ├── mod.rs
│   └── migrations.rs
├── models/          # 数据模型
│   └── mod.rs
├── lib.rs           # Tauri 命令注册入口
└── main.rs          # 应用入口
```

**设计原则**：
- `commands/` 仅处理参数反序列化、权限校验、结果序列化，不包含业务逻辑
- `services/` 包含所有业务逻辑，可被 commands/ 和内部调用
- `models/` 定义共享数据结构（serde Serialize/Deserialize）
- `db/` 封装所有数据库操作，对外暴露异步接口

### 2.3 前端架构约定

```
src/
├── api/             # Tauri invoke 调用封装层
│   ├── skills.ts    # Skill 相关 API
│   ├── security.ts  # 安全扫描 API
│   ├── sync.ts      # 同步 API
│   └── marketplace.ts # 市场 API
├── stores/          # Zustand 状态管理
│   ├── skillStore.ts
│   ├── securityStore.ts
│   ├── syncStore.ts
│   └── uiStore.ts
├── components/      # 组件
│   ├── ui/          # 通用 UI 组件（shadcn/ui 风格）
│   ├── skills/      # Skill 相关组件
│   ├── security/    # 安全相关组件
│   ├── graph/       # 图谱可视化组件
│   ├── mcp/         # MCP 配置组件
│   ├── agents/      # Agent 管理组件
│   ├── marketplace/ # 市场组件
│   └── layout/      # 布局组件
├── pages/           # 路由页面
│   ├── Graph.tsx    # 可视化图谱页
│   ├── Skills.tsx   # Skill 列表页
│   ├── Security.tsx # 安全扫描页
│   └── Settings.tsx # 设置页
├── hooks/           # 自定义 Hooks
├── types/           # TypeScript 类型定义
├── i18n/            # 国际化
│   ├── index.ts
│   ├── en.ts
│   └── zh.ts
├── lib/             # 工具函数
│   └── utils.ts
├── main.tsx         # 应用入口
└── index.css        # 全局样式 + Tailwind
```

### 2.4 Rust 编码规范

**错误处理**：
- 服务层函数返回 `Result<T, String>`，使用 `.map_err(|e| e.to_string())?` 传播错误
- Tauri 命令返回 `Result<T, String>` 以自动转义为前端可读错误
- 禁止在 Rust 端 `unwrap()` 或 `expect()`（除非逻辑上不可能出错）
- 使用 `anyhow::Result` 或自定义错误类型时务必保持一致

**Tauri 命令注册**：
- 命令函数定义在 `commands/` 模块中
- 在 `lib.rs` 中通过 `.invoke_handler(tauri::generate_handler![...])` 注册
- 命令名称使用 snake_case，前端调用时也使用 snake_case

**路径验证**：
- 所有接收路径参数的命令必须验证路径在允许范围内
- 使用 `std::path::Path::canonicalize()` 解析符号链接
- 防止目录穿越攻击：检查规范化后的路径是否以允许的根目录为前缀

**并发安全**：
- 同步 I/O 操作（如文件扫描）使用 `tokio::task::spawn_blocking` 包装
- 跨线程共享数据使用 `Arc<Mutex<T>>` 或 `Arc<RwLock<T>>`
- SQLite 连接通过 `rusqlite::Connection` 在 blocking task 中使用

### 2.5 TypeScript 编码规范

**Zustand Store 规范**：
```typescript
import { create } from 'zustand';

interface SkillStore {
  skills: Skill[];
  loading: boolean;
  error: string | null;
  fetchSkills: () => Promise<void>;
  addSkill: (path: string) => Promise<void>;
}

export const useSkillStore = create<SkillStore>((set, get) => ({
  skills: [],
  loading: false,
  error: null,
  fetchSkills: async () => {
    set({ loading: true, error: null });
    try {
      const skills = await api.getSkills();
      set({ skills, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },
  addSkill: async (path) => {
    // ...
  },
}));
```

**API 封装规范**：
- 所有 Tauri 调用通过 `src/api/` 下的模块封装，不在组件中直接调用 `invoke`
- API 函数签名明确参数和返回类型
- API 函数使用 `async/await` 并返回 `Promise<T>`

**错误处理**：
- 所有 API 调用须有 try/catch，错误信息展示给用户
- 捕获后使用 `console.error` 记录，使用 store 的 error 状态展示

**状态展示规范**：
- 每个数据驱动组件必须处理三种状态：**loading**（加载骨架屏/Spinner）、**empty**（空状态提示）、**error**（错误信息 + 重试按钮）
- 使用 Suspense + ErrorBoundary 作为兜底方案

### 2.6 常见陷阱

| 陷阱 | 说明 | 解决方案 |
|------|------|----------|
| **Tauri CSP** | CSP 策略过严导致资源加载失败 | 在 `tauri.conf.json` 的 `app.security.csp` 中配置白名单 |
| **Windows 符号链接** | Windows 上创建符号链接需要管理员权限或开发者模式 | 使用 junction 或避免 symlink |
| **Cytoscape 性能** | 大量节点/边时渲染卡顿 | 节点数 > 500 时启用虚拟化；使用 `cytoscape-cose-bilkent` 布局 |
| **SQLite 并发** | 多个 Tauri 命令同时写 SQLite 导致 `SQLITE_BUSY` | 使用 WAL 模式；启用 `rusqlite` 的 `bundled` feature |
| **Tauri 文件权限** | `plugin-fs` 需要正确配置 scope | 在 `tauri.conf.json` 的 `plugins.fs.scope` 中声明允许的目录 |
| **热重载失效** | Rust 代码修改后前端不自动刷新 | 使用 `tauri dev` 而非 `vite` 启动，或手动重启 |

---

## 三、代码安全性审查

### 3.1 安全检查清单

#### 路径和文件操作
- [ ] 所有文件路径操作前已规范化（`canonicalize` / `resolve`）
- [ ] 已验证路径在允许的目录范围内
- [ ] 已防止目录穿越攻击（`../` 注入）
- [ ] 不允许访问系统敏感路径（`/etc/passwd`、`C:\Windows\System32` 等）

#### 用户输入验证
- [ ] 所有外部输入已校验类型和范围
- [ ] Git 分支名 / 标签名使用正则白名单校验：`^[a-zA-Z0-9._/-]+$`
- [ ] 空字符串、null、undefined 已处理
- [ ] 数组/集合大小上限已设置，防止 DoS

#### Token / 凭据管理
- [ ] API Token、密钥等凭据不使用硬编码
- [ ] 使用环境变量或系统凭据管理器存储
- [ ] 日志和错误信息中不输出 Token
- [ ] Git 提交中不包含凭据文件

#### CSP 检查
- [ ] 确认 `tauri.conf.json` 中 `csp` 配置正确
- [ ] 新增外部资源（CDN、API 域名）已加入 CSP 白名单
- [ ] 避免使用 `'unsafe-eval'`，除非第三方库必须

#### 错误处理
- [ ] catch 块不为空（至少 `console.error`）
- [ ] 错误信息对用户友好，不暴露内部实现细节
- [ ] Rust `unwrap()` / `expect()` 已替换为 `?` 或 `match`

#### 并发安全
- [ ] 文件 I/O 操作使用 `spawn_blocking`
- [ ] 共享状态使用 `Arc<Mutex<T>>` 保护
- [ ] 多线程访问 SQLite 使用正确的连接池或串行化

### 3.2 审查后操作

1. 发现问题时在代码中标注 `// SAFETY: <说明>`
2. 严重安全问题立即通知开发者
3. 审查完成后在提交信息中使用 `security:` 类型

---

## 四、Git 提交与 Push

### 4.1 分支策略

```
main          ← 合并目标（受保护，仅通过 PR / merge 进入）
feature/*     ← 功能开发分支（如 feature/skill-search）
fix/*         ← 缺陷修复分支（如 fix/scanner-panic）
```

### 4.2 🔴 禁止操作（绝对不可执行）

| 操作 | 原因 |
|------|------|
| `git push --force` | 覆盖远程历史，破坏协作 |
| `git reset --hard <remote>` | 丢失本地未推送的工作 |
| `git commit --amend` (已推送的提交) | 重写历史导致冲突 |
| `git rebase` (共享分支) | 破坏他人的基准提交 |
| `git clean -fd` | 不可逆删除未跟踪文件 |
| `git branch -D` (未确认的分支) | 无法恢复已删除分支 |

### 4.3 ⚠️ 需确认操作

执行以下操作前必须向开发者确认并说明后果：

| 操作 | 风险 |
|------|------|
| `git reset --soft HEAD~N` | 取消最近 N 次提交但保留更改 |
| `git rebase` (个人分支) | 整理提交历史，需注意冲突 |
| `git push --delete <branch>` | 删除远程分支 |
| `git revert <commit>` | 新增反向提交，不删除历史 |

### 4.4 安全操作指南

- 始终先 `git status` 和 `git log --oneline -10` 了解当前状态
- `git pull --rebase` 替代 `git pull`（避免多余的 merge 提交）
- 提交前 `git diff --staged` 确认变更内容
- 使用 `git stash` 暂存未完成工作而非临时提交

### 4.5 提交格式

```
<type>: <description>
```

**类型**：

| Type | 说明 |
|------|------|
| `feat` | 新功能 |
| `fix` | 缺陷修复 |
| `security` | 安全相关修复 |
| `refactor` | 代码重构（无功能变更） |
| `perf` | 性能优化 |
| `i18n` | 国际化翻译 |
| `chore` | 构建、依赖、工具链维护 |
| `docs` | 文档更新 |

**示例**：
```
feat: add skill dependency graph export to PNG
fix: handle empty YAML frontmatter in scanner
security: validate directory path before scan
i18n: add German translation for skill detail page
```

### 4.6 Push 前检查清单

- [ ] `cargo check --manifest-path src-tauri/Cargo.toml` 通过
- [ ] `cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings` 通过
- [ ] `tsc --noEmit` 通过
- [ ] `npm run lint` 通过
- [ ] `npm test` 通过
- [ ] `vite build` 通过
- [ ] 安全性审查已完成
- [ ] 当前不在 `main` 分支上直接提交
- [ ] 不包含 `--force` 参数

### 4.7 Push 命令

```bash
git push origin <current-branch>
```

---

## 五、版本发布流程

### 5.1 语义化版本

遵循 [Semantic Versioning](https://semver.org/) 规范：`MAJOR.MINOR.PATCH`

- **MAJOR**：不兼容的 API 变更
- **MINOR**：向后兼容的新功能
- **PATCH**：向后兼容的缺陷修复

### 5.2 发布步骤

1. **询问开发者**：
   > "是否使用 GitHub Actions 构建下一个版本发布？"

2. **开发者确认后**：

   a. **确定版本号**：根据变更内容确定 `major` / `minor` / `patch`

   b. **更新 CHANGELOG.md**：
      - 遵循 [Keep a Changelog](https://keepachangelog.com/) 格式
      - 添加 `## [X.Y.Z] - YYYY-MM-DD` 条目
      - 按 `Added` / `Changed` / `Deprecated` / `Removed` / `Fixed` / `Security` 分类

   c. **执行版本升级**：
      ```bash
      npm run version -- <version>
      ```
      此命令会更新 `package.json`、`tauri.conf.json`、`Cargo.toml` 中的版本号，并创建 git tag

   d. **推送触发 CI**：
      ```bash
      git push origin main && git push origin v<version>
      ```

   e. **GitHub Actions 自动构建**：
      - 构建 Windows（`.exe` / `.msi`）、macOS（`.dmg`）、Linux（`.deb` / `.AppImage`）
      - 创建 GitHub Release 并上传构建产物

   f. **通知开发者**：提供 Release URL 和构建状态

### 5.3 GitHub Actions 注意事项

- Release 工作流需等待 CI 工作流通过后执行
- 构建产物命名格式：`Skill-Nexus_{version}_{platform}.{ext}`
- Alpha/Beta/RC 版本标记为 `prerelease: true`
- 工作流失败时检查 Action 日志，常见原因：
  - `tauri-action` 版本不兼容
  - 系统依赖缺失（如 Linux 的 `libwebkit2gtk`）
  - `GITHUB_TOKEN` 权限不足

---

## 六、其他流程

### 6.1 i18n 扩展

添加新语言（以德语为例）：

1. 在 `src/i18n/` 下创建 `de.ts`
2. 从 `en.ts` 复制所有 key，翻译 value
3. 在 `src/i18n/index.ts` 中注册 `de` 语言选项
4. 确保所有新增 key 同时在 `en.ts` 和 `zh.ts` 中添加
5. 提交使用 `i18n:` 前缀

### 6.2 Tauri 命令注册流程

添加新的 Tauri 命令：

1. 在 `src-tauri/src/commands/` 对应文件中实现命令函数
2. 确保函数签名符合 Tauri 命令规范：`#[tauri::command]` + 参数实现 `serde::Deserialize`
3. 在 `src-tauri/src/lib.rs` 的 `.invoke_handler()` 中注册命令
4. 在 `src/api/` 对应文件中封装 `invoke()` 调用
5. 在 `src/types/` 中定义请求/响应 TypeScript 类型

### 6.3 添加 Rust Service

添加新的业务逻辑模块：

1. 在 `src-tauri/src/services/` 下创建新文件
2. 在 `src-tauri/src/services/mod.rs` 中声明 `pub mod <name>;`
3. 创建对应的 `src-tauri/src/commands/<name>.rs` 作为命令桥接层
4. 在 `src-tauri/src/lib.rs` 中注册服务模块和命令
5. 服务层的公共 API 返回 `Result<T, String>`

### 6.4 Code Review 流程

1. **自审**：提交前用 `git diff` 自查变更
2. **CI 通过**：确保所有 CI 检查（lint、typecheck、test、build、clippy）通过
3. **创建 PR**：使用 GitHub PR 模板，填写变更说明
4. **审查要点**：
   - 逻辑正确性：边界条件是否处理？
   - 安全性：路径校验、输入验证？
   - 性能：是否有不必要的重复计算或 I/O？
   - 代码风格：是否符合本文档规范？
5. **合并方式**：优先使用 Squash and Merge 保持 main 历史整洁

---

## 七、快速参考

### 7.1 常用命令

| 命令 | 用途 |
|------|------|
| `npm run dev` | 启动 Vite 开发服务器（仅前端） |
| `npm run tauri:dev` | 启动 Tauri 开发模式（前端 + 后端） |
| `npm run build` | 类型检查 + 构建前端 |
| `npm run lint` | ESLint 代码检查 |
| `npm run typecheck` | TypeScript 类型检查 |
| `npm run test` | 运行前端测试 |
| `npm run test:watch` | 监听模式运行测试 |
| `npm run format` | Prettier 格式化代码 |
| `npm run version -- <ver>` | 升级版本号并打 tag |
| `cargo check --manifest-path src-tauri/Cargo.toml` | Rust 类型检查 |
| `cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings` | Rust Lint 检查（严格模式） |
| `cargo test --manifest-path src-tauri/Cargo.toml` | 运行 Rust 测试 |

### 7.2 关键文件索引

| 文件 | 用途 |
|------|------|
| `src-tauri/src/lib.rs` | Tauri 命令注册入口 |
| `src-tauri/src/main.rs` | Rust 应用入口 |
| `src-tauri/src/services/scanner.rs` | Skill 扫描引擎 |
| `src-tauri/src/services/security.rs` | 安全扫描引擎 |
| `src-tauri/src/services/syncer.rs` | 多 Agent 同步引擎 |
| `src-tauri/src/commands/mod.rs` | Tauri 命令模块管理 |
| `src-tauri/src/models/mod.rs` | 共享数据模型 |
| `src-tauri/Cargo.toml` | Rust 依赖配置 |
| `src-tauri/tauri.conf.json` | Tauri 应用配置（窗口、CSP、插件、打包） |
| `src/api/skills.ts` | 前端 Tauri 调用封装 |
| `src/stores/skillStore.ts` | Skill 状态管理 |
| `src/pages/Graph.tsx` | 可视化图谱页 |
| `src/main.tsx` | React 应用入口 |
| `src/i18n/en.ts` | 英文翻译 |
| `src/i18n/zh.ts` | 中文翻译 |
| `package.json` | 前端依赖和脚本 |
| `tsconfig.json` | TypeScript 配置 |
| `vite.config.ts` | Vite 构建配置 |
| `tailwind.config.ts` | Tailwind CSS 配置 |
| `CHANGELOG.md` | 版本变更日志 |
| `.github/workflows/ci.yml` | 持续集成流水线 |
| `.github/workflows/release.yml` | 发布构建流水线 |
| `scripts/bump-version.mjs` | 版本号升级脚本 |
| `AGENTS.md` | 本文档，Agent 工作流规范 |

---

*本文档由 Agent 维护，随项目演进更新。*
