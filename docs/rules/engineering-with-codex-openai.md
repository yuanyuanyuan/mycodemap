# 基于 Codex 的工程落地规则

> 目标：把 OpenAI《Engineering with Codex》里的高信号原则，转成当前 CodeMap 仓库可执行的开发与交付规则。
> 适用范围：本仓库内使用 Codex / Claude / 其他 agent 进行分析、修改、验证、提交流程。

## 1. 先说边界

- 本项目当前主要交付形态是 npm 包与 CLI，不是长期运行的 Web 服务。
- 因此这里强调的是 `CLI` / `CI` 护栏，而不是 preview 环境或部署沙箱。
- 涉及长期稳定知识时，优先写入仓库文档与生成物；不要把关键约束留在聊天记录、口头约定或临时笔记里。

## 2. 核心原则

- 人类掌舵，agent 执行：人类负责定义目标、限制、DoD、依赖和验收；agent 负责检索、实现、验证和补文档。
- 地图优于手册：入口文档保持短小，只做路由；细节下沉到 `ARCHITECTURE.md`、`docs/rules/`、`docs/design-docs/`、`docs/exec-plans/`。
- 仓库是记录系统：规则、设计权衡、执行计划、生成产物、失败复盘都应进入版本控制。
- 检索优先于记忆：优先使用 `node dist/cli/index.js query|analyze|deps|impact` 获取事实，再回退到 `rg`、`find`、直接读文件。
- 规则优先编码：重复出现的评审意见、输出约束、结构边界，优先落为 CLI 子命令、hook、CI 检查或生成契约，而不是停留在 prose。

## 3. 渐进式上下文披露（Harness 规范）

**原则**：不向 AI 提供超过当前任务决策所需的信息，避免注意力稀释。

**上下文层级**（AI 按优先级读取）：

1. **T0-地图层**（始终提供）：架构说明、类型定义、关键约束文件
   - `AGENTS.md`（仓库级强约束）
   - `CLAUDE.md`（执行手册）
   - `src/types/index.ts`（核心类型）

2. **T1-任务相关层**（动态检索）：通过 CodeMap CLI 或文件路径匹配提供
   - 当前修改文件的依赖图谱（直接上下游）
   - 相关测试文件（同名 `.test.ts` 或 `.spec.ts`）
   - 接口定义（如果实现类，提供接口）

3. **T2-按需获取层**（工具调用）：AI 明确请求时才提供
   - 具体业务逻辑实现细节
   - 历史提交记录
   - 第三方库文档

**禁止行为**：不要将整个 `node_modules` 目录或上千行无关代码粘贴给 AI。

## 4. 当前项目的 CLI 护栏

- 仓库内调试与验证优先使用 `node dist/cli/index.js <command>`，因为当前真实 CLI 入口是 `dist/cli/index.js`。
- 需求澄清、影响分析、引用定位优先走 `query`、`analyze`、`deps`、`impact`，不要直接全仓漫游。
- 修改 `analyze`、`query`、`ci`、`workflow` 等高影响命令时，至少验证：
  - `node dist/cli/index.js analyze --help` 与文档示例一致；
  - `find` / `read` / `link` / `show` 中受影响的 public intent 可以在当前仓库运行；
  - 若文档保留 legacy alias 说明，真实输出仍会返回 `warnings[]`；
  - 若涉及机器输出，`--json` 与 `--structured --json` 仍保持纯 JSON 契约。
- 修改 `README.md`、`AI_GUIDE.md`、`docs/ai-guide/OUTPUT.md`、`ARCHITECTURE.md` 这类入口文档时，必须明确区分“目标产品基线”和“当前 CLI 现实”，尤其是 `Server Layer` / `mycodemap server` 的命名边界。
- 修改 `docs/product-specs/*` 现行规格时，必须同步 `docs/product-specs/README.md` 与 `scripts/validate-docs.js` 的高信号断言，避免规格正文和目录索引分叉。
- 若改动会影响 agent 执行手册、README 示例、测试事实或入口路由，先执行 `npm run docs:check`。
- 若希望通过统一 CLI 护栏入口执行同一检查，使用 `node dist/cli/index.js ci check-docs-sync`；该命令会同时执行 docs guardrail 与 `sync-analyze-docs.js --check`。
- `ci check-branch --allow` 支持 `*` 通配；在 CI / PR 环境中，分支识别会回退到 `GITHUB_HEAD_REF` / `GITHUB_REF_NAME`。
- `generate`、`analyze` 与 `ci check-headers -d` 共享 `.gitignore` 感知文件发现模块；没有 `.gitignore` 时回退到统一默认 `exclude`。
- 涉及发布边界时，再补 `npm run build` 与 `npm run validate-pack`；不要把本地临时产物当成发布事实。

## 5. 当前项目的 CI 护栏

- 本地护栏：
  - `.githooks/pre-commit` 会执行变更相关测试、文件头检查，并尝试生成 AI feed。
  - 当变更涉及 README、`docs/`、CLI 入口、测试配置或 CI 配置时，`.githooks/pre-commit` 还会执行 `npm run docs:check`。
  - `.githooks/commit-msg` 会校验 `[TAG] scope: message` 格式与单次 commit 文件数量。
- 服务端护栏：
  - `.github/workflows/ci-gateway.yml` 会执行 `npm run docs:check`、`npm run typecheck`、`npm test`、`npm run build`，并通过 `node dist/cli/index.js ci ...` 执行 `check-docs-sync`（含 docs guardrail + analyze generated block）、`check-commits`、`check-commit-size`、`check-headers`、`assess-risk`、`check-output-contract` 与 AI feed 同步检查。
  - `check-working-tree`、`check-branch`、`check-scripts` 作为共享发布前 gate checks，由本地 `ci` 命令提供，`ship` 的 CHECK 阶段直接复用它们。
  - `.github/workflows/publish.yml` 会在发布前执行 `npm test` 与 `npm run build`。
- 仓库协议仍然禁止通过 `--no-verify`、关闭 hook、放宽阈值、删除检查项来"修复"问题。

## 6. 代码生成红线详细规范（Harness 规范）

AI 生成代码时，以下模式触发**硬性阻断**：

| 红线规则 | 检测方式 | 阻断标准 | 修复策略 |
|---------|---------|---------|---------|
| **敏感信息硬编码** | 正则检测 `"password"`, `"secret"`, `"api_key"`, `"token"` 字面量 | 生产代码中出现明文凭证 | 替换为 `process.env.XXX` 读取 + env 类型声明 |
| **`any` 类型使用** | `tsc --noImplicitAny` + ESLint `@typescript-eslint/no-explicit-any` | 非边界文件使用 `any` | 推导具体类型或使用 `unknown` + 类型守卫 |
| **函数超过 50 行** | 代码行数统计（不含空行和注释） | 单函数 >50 行 | 拆分为子函数，保持单一职责 |
| **未处理 Promise** | ESLint `@typescript-eslint/no-floating-promises` | 异步调用无 `await` 或错误处理 | 添加 `await` 或 `.catch()` 处理 |
| **`console.log` 遗留** | ESLint `no-console` | 非调试代码包含 `console.log` | 使用 `src/cli/runtime-logger.ts` 替代 |
| **未使用 import** | ESLint `@typescript-eslint/no-unused-vars` | 存在未引用 import | 自动删除或标记为使用 |
| **缺少文件头** | `.githooks/pre-commit` 检查 | TS 源文件缺少 `[META]` 或 `[WHY]` | 添加标准文件头注释 |

## 7. 依赖流向规则（Harness 规范）

**第一性原理**：业务逻辑必须与实现细节解耦，确保可测试性和技术栈可替换性。

当前项目采用 **MVP3 分层架构**（从上至下依赖）：

```
┌─────────────────────────────────────────────────────────────┐
│                        CLI Layer                            │
│  src/cli/ - 命令行接口，注册命令、参数解析、用户交互          │
├─────────────────────────────────────────────────────────────┤
│                      Server Layer                           │
│  src/server/ - 内部 Server Layer / transport，Handler 处理    │
├─────────────────────────────────────────────────────────────┤
│                       Domain Layer                          │
│  src/domain/ - 核心业务逻辑，领域实体与服务                   │
│  - entities/: Project, Module, Symbol, Dependency, CodeGraph │
│  - services/: CodeGraphBuilder                              │
│  - events/: DomainEvent                                     │
│  - repositories/: 仓库接口                                  │
├─────────────────────────────────────────────────────────────┤
│                   Infrastructure Layer                      │
│  src/infrastructure/ - 技术实现细节                          │
│  - storage/: FileSystemStorage, MemoryStorage, KuzuDBStorage
│  - parser/: TypeScriptParser, GoParser, PythonParser, ParserRegistry
│  - repositories/: CodeGraphRepositoryImpl                   │
├─────────────────────────────────────────────────────────────┤
│                     Interface Layer                         │
│  src/interface/ - 类型定义与契约，跨层共享的接口              │
│  - types/: 核心类型定义                                     │
│  - config/: 配置接口                                        │
└─────────────────────────────────────────────────────────────┘
```

**分层依赖规则**（严格自上而下）：
- CLI → Server → Domain → Infrastructure → Interface
- **禁止跨层依赖**（如 Domain 层不得导入 CLI 模块）
- 同层内可以相互依赖

**Enforcement 规则**：
1. **Domain 层禁止导入**：CLI、Server 层模块
2. **Infrastructure 层禁止导入**：CLI、Server、Domain 中的具体实现
3. **Server 层禁止导入**：CLI 层模块
4. **跨层调用必须通过接口**，依赖 Interface 层契约

**历史架构说明**：
- MVP3 之前的旧架构（cli→orchestrator→core→parser→generator）已完成迁移
- 原有 `src/orchestrator/` 部分功能已整合到 Server 层和 CLI 层
- 原有 `src/core/`、`src/parser/`、`src/generator/` 已迁移到 Domain/Infrastructure 层

**违规检测**：使用 `dependency-cruiser` 或 CodeMap 自身的 `deps` 命令检查跨层依赖。

**违规示例**：
```typescript
// ❌ 违规：Domain 层直接依赖 Infrastructure 具体实现
// src/domain/services/CodeGraphBuilder.ts
import { FileSystemStorage } from '../infrastructure/storage/FileSystemStorage'; // 错误！

// ✅ 合规：通过 Interface 层契约依赖
// src/domain/services/CodeGraphBuilder.ts
import type { IStorage } from '../interface/types/storage'; // 正确：只依赖接口
```

## 8. 文档与知识落点

- 规则变化：写入 `docs/rules/`
- 设计权衡：写入 `docs/design-docs/`
- 执行计划、复盘、技术债：写入 `docs/exec-plans/`
- 生成物、快照、报告：写入 `docs/generated/`
- 外部资料摘要：写入 `docs/references/`

如果一次任务无法在 1 天内稳定完成，先拆成更小的执行单元；复杂任务的过程信息不要只留在对话里。

## 9. 失败预演

至少预演一个失败模式，而不是只验证 happy path。当前仓库已经出现过两类高信号风险：

- 文档漂移：例如测试规则曾与真实 `vitest.config.ts` 不一致，导致 agent 按旧规则执行错误命令。
- 文档检索盲区：当 `analyze -i show` 无法命中文档概览时，agent 需要立即回退到 `rg` / 直接读文件，并在适用时记录 CodeMap 缺陷，而不是假装"没问题"。

## 10. 最小交付清单（更新版 - Harness 规范）

### 10.1 交付内容

每次 agent 交付至少要说明：

1. **改了什么**：文件清单 + 变更摘要
2. **为什么改**：需求背景 + 设计决策
3. **按什么护栏验证**：执行的检查命令和结果
4. **失败场景或风险模式**：至少一个预演的失败场景
5. **可信度自评**（见 AGENTS.md 5.1 格式）：确定/推测/需验证/风险
6. **文档同步说明**：是否更新了相关文档及原因

### 10.2 必须同步文档的触发条件

以下情况**必须**更新对应文档：

| 你的改动 | 必须更新的文档 |
|---------|--------------|
| 新增/修改 CLI 命令或参数 | `CLAUDE.md`、`docs/rules/engineering-with-codex-openai.md` |
| 新增/修改配置项或 Schema | `README.md`、`docs/SETUP_GUIDE.md`、`docs/AI_ASSISTANT_SETUP.md`、相关配置示例 |
| 修改类型定义/公共接口 | 接口注释、`docs/rules/` 中相关文档 |
| 修改 CI/CD 流程 | `docs/rules/validation.md`、`.github/workflows/` |
| 修改 Git Hooks | `docs/rules/validation.md` |
| 修改测试规则/覆盖率要求 | `docs/rules/testing.md` |
| 修改架构分层或依赖规则 | `ARCHITECTURE.md`、`docs/rules/architecture-guardrails.md` |
| 新增代码质量红线 | `docs/rules/code-quality-redlines.md` |
| 修改提交格式规范 | `AGENTS.md` |
| 发现文档与代码不符 | 立即修复对应文档 |

**原则**：若改动会影响其他开发者或 AI 的行为，就必须更新文档。

## 11. 参考来源

- OpenAI Engineering: https://openai.com/engineering/codex/
- Harness Engineering 方法论：`docs/references/tmp.md`
- 仓库入口协议：`AGENTS.md`
- 最小执行手册：`CLAUDE.md`
- 架构地图：`ARCHITECTURE.md`
- 当前验证规则：`docs/rules/validation.md`
- 当前发布规则：`docs/rules/deployment.md`
- 代码质量红线：`docs/rules/code-quality-redlines.md`
- 架构护栏：`docs/rules/architecture-guardrails.md`
