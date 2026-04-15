# CLAUDE.md - CodeMap 执行清单

本文件提供给 Claude / Codex 一份最小可执行手册；仓库级硬约束以 `AGENTS.md` 为准。

## 1. 先读顺序

### 1.1 必读文档（按优先级）

1. 离目标文件最近的 `AGENTS.md`
2. 根目录 `AGENTS.md`
3. 本文件 `CLAUDE.md`
4. **`AI_GUIDE.md`** - AI 专属快速参考（命令选择决策树、场景映射）
5. `ARCHITECTURE.md`
6. `docs/rules/`、`docs/design-docs/`、`docs/exec-plans/` 中与任务最相关的文档
7. 代码、测试、配置与 Git 事实

### 1.2 AI 专属文档导航

如果你是 AI/Agent，优先查看以下文档：

| 文档 | 用途 | 何时查看 |
|------|------|---------|
| `AI_GUIDE.md` | **AI 主指南** - 命令速查、决策树、提示词模板 | **必读** |
| `docs/ai-guide/QUICKSTART.md` | 快速开始、场景-命令映射 | 首次使用 |
| `docs/ai-guide/COMMANDS.md` | 完整 CLI 命令参数 | 需要具体命令时 |
| `docs/ai-guide/OUTPUT.md` | JSON 输出结构、解析工具 | 解析命令输出时 |
| `docs/ai-guide/PATTERNS.md` | 标准工作流模式 | 实现复杂任务时 |
| `docs/ai-guide/PROMPTS.md` | 即用型提示词模板 | 直接使用或改编 |
| `docs/ai-guide/INTEGRATION.md` | 错误处理、MCP 集成 | 集成到 Agent 系统时 |

**快速入口**: `.cursorrules` | `.github/copilot-instructions.md`

当前主文档结构已落地，但仍有少量操作指南与历史文档保留在 `docs/` 根层；出现路径冲突时，以仓库当前可读文件为准。

## 1.1 任务初始化模板（Harness 规范）

AI 接受任务时，必须输出以下分析框架：

```markdown
## 任务分析
**目标**：[一句话描述]
**类型**：[新增功能/修复 Bug/重构/性能优化/文档更新]
**风险等级**：[L0/L1/L2/L3]
**影响范围**：[列举可能影响的文件/模块]

## 上下文清单
- [x] 已读取 AGENTS.md 架构约束
- [x] 已识别相关类型定义 [链接到类型文件]
- [ ] 待确认：[如有待确认项，标记为阻塞]

## 执行计划（Plan-Build-Verify-Fix）
1. [Plan] 设计接口/类型
2. [Build] 实现核心逻辑 + 单元测试（TDD）
3. [Build] 实现外围层（如需）
4. [Verify] 运行类型检查 + 单元测试 + Lint
5. [Fix] 修复发现的问题（如适用）
6. [Verify] 最终验收（见第 3 章清单）
```

## 2. 开始执行前的 5 步

- 用一句话复述目标、限制、DoD、依赖；若用户已确认，可直接继续。
- 圈定最可能受影响的模块、文件与验证范围。
- 优先使用 CodeMap CLI 做检索与影响分析。
- 先决定最小验证方案，再开始编辑。
- 只读取当前任务需要的事实，避免无边界探索。

## 2.5 GSD 工具强制规则

**当使用 `/gsd:*` 命令或运行 GSD agent 时，代码检索必须优先使用当前项目的 CodeMap CLI：**

| 场景 | 必须使用 | 禁止使用 |
|------|---------|---------|
| 查找符号定义 | `node dist/cli/index.js query -s "<symbol>"` | `Glob` + `Read` 遍历文件 |
| 查找模块依赖 | `node dist/cli/index.js deps -m "<module>"` | `Grep` 搜索 import |
| 分析文件影响 | `node dist/cli/index.js impact -f "<file>"` | 手动追溯依赖链 |
| 代码库侦察 | `node dist/cli/index.js analyze -i find` | 全文件读取后分析 |
| 架构映射 | `node dist/cli/index.js analyze -i link` | 逐层 `Read` 推断关系 |

**为什么这很重要：**
- **避免上下文爆炸**: CodeMap CLI 返回结构化摘要，而非完整文件内容
- **吃自己的狗粮**: 用 CodeMap 分析 CodeMap，验证产品价值
- **精确性**: 符号级查询比文本搜索更准确

**执行检查点：**
- GSD researcher agent 在侦察代码库前，必须先运行 `npm run build` 确保 CLI 可用
- 若 CodeMap CLI 返回结果不足，记录原因后再使用 fallback 工具
- 禁止在 GSD workflow 中直接使用 `Read` 读取大文件（>100行）进行侦察

## 3. 验收清单（Task Completion Checklist - Harness 规范）

AI 完成任务前必须自检并勾选：

```markdown
## 任务完成验收清单
- [ ] **代码实现**：功能完整，符合需求描述
- [ ] **架构合规**：无跨层违规依赖（如 Domain 层导入 CLI 模块）
- [ ] **类型安全**：`npm run typecheck` 无错误
- [ ] **测试覆盖**：新代码覆盖率 >80%，全量测试通过
- [ ] **文档同步**：如修改接口，已更新相关注释/文档
- [ ] **垃圾回收**：无 console.log 调试代码，无未使用 import
- [ ] **安全审查**：无敏感信息泄露，输入已验证
- [ ] **可信度自评**：已提供（见 AGENTS.md 5.1 格式）
```

**提交流程**：
- L0 任务：完成清单后，自动格式代码（`npm run lint -- --fix`），直接提交
- L1 及以上：完成清单后，生成 PR 描述（包含变更摘要和测试证据），暂停等待人类审查

### 3.1 Commit 策略（Harness 规范）

**核心原则**：任务完成即提交，保持提交的原子性。

| 场景 | 策略 |
|------|------|
| **单个任务完成** | 立即 commit，禁止累积多个任务 |
| **多文件变更** | 按逻辑分批 commit |
| **Commit 格式** | `[TAG] scope: message` |

**禁止**：
- ❌ 累积多个任务后才 commit
- ❌ 一个 commit 超过 10 个文件
- ❌ 使用 `--no-verify` 跳过检查

## 4. 检索优先级

### 4.1 代码检索（优先使用 CodeMap CLI）
- 首选：`node dist/cli/index.js query -s "<symbol>"`
- 首选：`node dist/cli/index.js query -m "<module>"`
- 首选：`node dist/cli/index.js deps -m "<module>"`
- 首选：`node dist/cli/index.js impact -f "<file>"`
- 首选：`node dist/cli/index.js analyze -i <find|read|link|show>`
- 设计输入校验：`node dist/cli/index.js design validate [file] --json`
- 设计范围映射：`node dist/cli/index.js design map [file] --json`
- 设计交接打包：`node dist/cli/index.js design handoff [file] --json`
- 设计漂移验证：`node dist/cli/index.js design verify [file] --json`

### 4.2 MVP3 架构层检索（按层次查找）
- **Interface 层**：`src/interface/types/`, `src/interface/config/`
- **Infrastructure 层**：`src/infrastructure/storage/`, `src/infrastructure/parser/`, `src/infrastructure/repositories/`
- **Domain 层**：`src/domain/entities/`, `src/domain/services/`, `src/domain/repositories/`
- **Server 层**：`src/server/`, `src/server/handlers/`, `src/server/routes/`
- **CLI 层**：`src/cli/commands/`, `src/cli/index.ts`

### 4.3 回退方案
- 回退：`rg -n`、`find`、直接读文件

若 CodeMap 失效或结果不足，记录问题并继续任务；不要因为工具问题卡死交付。

## 5. 实际可用命令

- 构建：`npm run build`
- 类型检查：`npm run typecheck`
- 测试：`npm test`
- 代码检查：`npm run lint`
- CLI 入口：`node dist/cli/index.js <command>`
- 全部检查：`npm run check:all`（类型 + 测试 + Lint）
- 发布：`codemap ship`（创建版本提交与 tag，并触发 GitHub Actions 发布）

注意：当前仓库真实输出目录是 `dist/`，不是 `build/`。

## 6. 改动策略

- 先做最小改动，再考虑扩展；优先根因修复。
- 不顺手修无关问题；发现额外问题可记录，但不要混入当前补丁。
- 保持现有风格与命名约定；不要在文档入口重复堆砌细节。
- 修改 TypeScript 非测试文件时，注意 `[META]` 与 `[WHY]` 文件头要求。
- 改动规则、设计、输出契约时，先判断是否需要同步相关 docs。

### 6.1 必须同步文档的触发条件（ checklist ）

修改以下类型代码时，**必须**检查并更新对应文档：

#### 人类用户文档
- [ ] **新增/修改 CLI 命令** → 同步 `CLAUDE.md`、`docs/rules/engineering-with-codex-openai.md`
- [ ] **修改类型定义/接口** → 同步相关注释、API 文档、使用示例
- [ ] **修改 CI/CD 配置** → 同步 `docs/rules/validation.md`
- [ ] **修改 Git Hooks** → 同步 `docs/rules/validation.md`、`docs/rules/engineering-with-codex-openai.md`
- [ ] **修改测试配置/规则** → 同步 `docs/rules/testing.md`
- [ ] **修改架构依赖关系** → 同步 `ARCHITECTURE.md`、`docs/rules/architecture-guardrails.md`
- [ ] **新增代码规范/红线** → 同步 `docs/rules/code-quality-redlines.md`
- [ ] **修改提交规范** → 同步 `AGENTS.md` 或 `docs/rules/engineering-with-codex-openai.md`
- [ ] **发现文档与代码不符** → 立即修复相关文档

#### AI/Agent 专属文档（强制性）
- [ ] **新增/修改 CLI 命令** → 同步 **`AI_GUIDE.md`**、**`docs/ai-guide/COMMANDS.md`**、**`docs/ai-guide/PROMPTS.md`**
- [ ] **修改 JSON 输出格式/契约** → 同步 **`docs/ai-guide/OUTPUT.md`**（TypeScript 接口定义）
- [ ] **新增使用模式** → 同步 **`docs/ai-guide/PATTERNS.md`**
- [ ] **新增典型任务** → 同步 **`docs/ai-guide/PROMPTS.md`**（添加提示词模板）
- [ ] **修改架构分层** → 同步 **`AI_GUIDE.md`**（架构图）

#### AI 友好性检查清单（文档更新时必须自检）
- [ ] **结构清晰**: 文档使用层级标题（## ### ####），便于 AI 解析
- [ ] **决策树**: 复杂流程提供决策树或流程图（文本格式）
- [ ] **速查表**: 命令、选项、场景提供表格形式
- [ ] **代码可复现**: 所有代码块可直接复制执行
- [ ] **类型定义**: JSON 输出提供 TypeScript 接口定义
- [ ] **交叉引用**: 提供相关文档的链接
- [ ] **错误处理**: 包含常见错误及解决方案

**决策原则**：若改动会影响其他开发者或 AI 的行为，就必须更新文档。
**双重标准**：所有文档更新必须同时满足人类阅读和 AI 阅读的需求。

## 7. 验证策略

- 先跑最小相关验证，再扩大到更广的检查。
- 没有验证就不要声称"已解决"；若无法验证，必须说清阻塞点。
- 每次任务至少给出 1 个失败场景或具体风险模式。
- 涉及 CI / hooks / 提交规则时，必须给出失败场景与修复验证证据。
- 严禁通过 `--no-verify`、禁用 hooks、删除检查来规避失败。

## 8. 回复协议

- 每条关键信息用 `[证据]`、`[推论]`、`[假设]`、`[观点]` 标记。
- 仓库事实引用格式：`path:line`。
- 外部事实引用格式：URL。
- 不确定内容只能标 `[假设]`。
- 回答应优先短、准、可执行，避免重复粘贴大段项目百科。

## 9. 交付清单

- 说明修改了哪些文件。
- 说明这样改的原因与边界。
- 说明执行了哪些验证，结果如何。
- 说明尚存风险或未验证项。
- 明确判断是否需要同步 `AGENTS.md`、`CLAUDE.md`、`README.md`、`ARCHITECTURE.md`、相关 `docs/*`。

## 10. 这份文件不该再承载什么

- 不再承载完整项目百科。
- 不再内嵌大段配置样例或问题模板。
- 不再重复 `AGENTS.md` 已经定义的强约束。
- 不再把设计文档、执行计划、产品规格写回入口文件。

当入口文档再次膨胀时，应把知识下沉到 `ARCHITECTURE.md` 或相应 `docs/*`，并把这里恢复为高信号摘要。

## gstack

Use /browse from gstack for all web browsing. Never use mcp__claude-in-chrome__* tools.

Available skills: /office-hours, /plan-ceo-review, /plan-eng-review, /plan-design-review,
/design-consultation, /review, /ship, /land-and-deploy, /canary, /benchmark, /browse,
/qa, /qa-only, /design-review, /setup-browser-cookies, /setup-deploy, /retro,
/investigate, /document-release, /codex, /cso, /autoplan, /careful, /freeze, /guard,
/unfreeze, /gstack-upgrade.

<!-- rtk-instructions v2 -->
# RTK (Rust Token Killer) - Token-Optimized Commands

## Golden Rule

**Always prefix commands with `rtk`**. If RTK has a dedicated filter, it uses it. If not, it passes through unchanged. This means RTK is always safe to use.

**Important**: Even in command chains with `&&`, use `rtk`:
```bash
# ❌ Wrong
git add . && git commit -m "msg" && git push

# ✅ Correct
rtk git add . && rtk git commit -m "msg" && rtk git push
```

## RTK Commands by Workflow

### Build & Compile (80-90% savings)
```bash
rtk cargo build         # Cargo build output
rtk cargo check         # Cargo check output
rtk cargo clippy        # Clippy warnings grouped by file (80%)
rtk tsc                 # TypeScript errors grouped by file/code (83%)
rtk lint                # ESLint/Biome violations grouped (84%)
rtk prettier --check    # Files needing format only (70%)
rtk next build          # Next.js build with route metrics (87%)
```

### Test (90-99% savings)
```bash
rtk cargo test          # Cargo test failures only (90%)
rtk vitest run          # Vitest failures only (99.5%)
rtk playwright test     # Playwright failures only (94%)
rtk test <cmd>          # Generic test wrapper - failures only
```

### Git (59-80% savings)
```bash
rtk git status          # Compact status
rtk git log             # Compact log (works with all git flags)
rtk git diff            # Compact diff (80%)
rtk git show            # Compact show (80%)
rtk git add             # Ultra-compact confirmations (59%)
rtk git commit          # Ultra-compact confirmations (59%)
rtk git push            # Ultra-compact confirmations
rtk git pull            # Ultra-compact confirmations
rtk git branch          # Compact branch list
rtk git fetch           # Compact fetch
rtk git stash           # Compact stash
rtk git worktree        # Compact worktree
```

Note: Git passthrough works for ALL subcommands, even those not explicitly listed.

### GitHub (26-87% savings)
```bash
rtk gh pr view <num>    # Compact PR view (87%)
rtk gh pr checks        # Compact PR checks (79%)
rtk gh run list         # Compact workflow runs (82%)
rtk gh issue list       # Compact issue list (80%)
rtk gh api              # Compact API responses (26%)
```

### JavaScript/TypeScript Tooling (70-90% savings)
```bash
rtk pnpm list           # Compact dependency tree (70%)
rtk pnpm outdated       # Compact outdated packages (80%)
rtk pnpm install        # Compact install output (90%)
rtk npm run <script>    # Compact npm script output
rtk npx <cmd>           # Compact npx command output
rtk prisma              # Prisma without ASCII art (88%)
```

### Files & Search (60-75% savings)
```bash
rtk ls <path>           # Tree format, compact (65%)
rtk read <file>         # Code reading with filtering (60%)
rtk grep <pattern>      # Search grouped by file (75%)
rtk find <pattern>      # Find grouped by directory (70%)
```

### Analysis & Debug (70-90% savings)
```bash
rtk err <cmd>           # Filter errors only from any command
rtk log <file>          # Deduplicated logs with counts
rtk json <file>         # JSON structure without values
rtk deps                # Dependency overview
rtk env                 # Environment variables compact
rtk summary <cmd>       # Smart summary of command output
rtk diff                # Ultra-compact diffs
```

### Infrastructure (85% savings)
```bash
rtk docker ps           # Compact container list
rtk docker images       # Compact image list
rtk docker logs <c>     # Deduplicated logs
rtk kubectl get         # Compact resource list
rtk kubectl logs        # Deduplicated pod logs
```

### Network (65-70% savings)
```bash
rtk curl <url>          # Compact HTTP responses (70%)
rtk wget <url>          # Compact download output (65%)
```

### Meta Commands
```bash
rtk gain                # View token savings statistics
rtk gain --history      # View command history with savings
rtk discover            # Analyze Claude Code sessions for missed RTK usage
rtk proxy <cmd>         # Run command without filtering (for debugging)
rtk init                # Add RTK instructions to CLAUDE.md
rtk init --global       # Add RTK to ~/.claude/CLAUDE.md
```

## Token Savings Overview

| Category | Commands | Typical Savings |
|----------|----------|-----------------|
| Tests | vitest, playwright, cargo test | 90-99% |
| Build | next, tsc, lint, prettier | 70-87% |
| Git | status, log, diff, add, commit | 59-80% |
| GitHub | gh pr, gh run, gh issue | 26-87% |
| Package Managers | pnpm, npm, npx | 70-90% |
| Files | ls, read, grep, find | 60-75% |
| Infrastructure | docker, kubectl | 85% |
| Network | curl, wget | 65-70% |

Overall average: **60-90% token reduction** on common development operations.
<!-- /rtk-instructions -->