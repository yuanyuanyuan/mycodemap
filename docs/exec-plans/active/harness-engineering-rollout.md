# Harness Engineering 方法论落地执行计划

> 目标：将 Harness Engineering 方法论落地到 CodeMap 项目
> 创建日期：2026-03-17
> 状态：已完成

## 1. 计划概述

### 1.1 背景

基于 `docs/references/tmp.md` 中的 Harness Engineering 方法论，结合 CodeMap 项目现有规范体系，进行渐进式增强。

### 1.2 目标

- 建立显式任务分级制度（L0-L3）
- 引入结构化可信度自评机制
- 完善代码质量红线与架构护栏
- 提供 AI 任务执行模板与验收清单

### 1.3 范围

- 更新现有入口文档（AGENTS.md、CLAUDE.md）
- 创建专项规范文档（architecture-guardrails、code-quality-redlines）
- 更新工程规则文档
- 配置工具脚本与 AI 集成

## 2. 执行阶段

### Phase 1: 核心规范文档更新 ✅

| 任务 | 文件 | 状态 | 完成日期 |
|------|------|------|---------|
| 更新 AGENTS.md | `/data/codemap/AGENTS.md` | ✅ 已完成 | 2026-03-17 |
| 更新 CLAUDE.md | `/data/codemap/CLAUDE.md` | ✅ 已完成 | 2026-03-17 |
| 更新工程规则 | `/data/codemap/docs/rules/engineering-with-codex-openai.md` | ✅ 已完成 | 2026-03-17 |

**Phase 1 交付内容**：
- 任务分级制度（L0-L3）定义
- 可信度自评格式规范
- 技术债务标记规范
- 代码生成红线规则
- 任务初始化模板
- 验收清单格式

### Phase 2: 专项规范文档创建 ✅

| 任务 | 文件 | 状态 | 完成日期 |
|------|------|------|---------|
| 创建架构护栏文档 | `/data/codemap/docs/rules/architecture-guardrails.md` | ✅ 已完成 | 2026-03-17 |
| 创建代码质量红线文档 | `/data/codemap/docs/rules/code-quality-redlines.md` | ✅ 已完成 | 2026-03-17 |
| 创建执行跟踪 | `/data/codemap/docs/exec-plans/active/harness-engineering-rollout.md` | ✅ 已完成 | 2026-03-17 |

### Phase 3: 工具配置增强 ✅

| 任务 | 文件 | 状态 | 备注 |
|------|------|------|------|
| 更新 package.json 脚本 | `/data/codemap/package.json` | ✅ 已完成 | 添加 check:all、ai:* 脚本 |
| 创建 Claude 配置 | `/data/codemap/.claude/CLAUDE.md` | ✅ 已完成 | AI 工具集成配置 |

### Phase 4: 验收验证 ✅

| 检查项 | 状态 | 备注 |
|--------|------|------|
| 文档完整性检查 | ✅ 通过 | 所有规划文档已创建 |
| npm run docs:check | ✅ 通过 | 文档护栏通过 |
| npm run typecheck | ✅ 通过 | 类型检查通过 |
| npm test | ✅ 通过 | 全部测试通过 |
| npm run lint | ⚠️ 已知问题 | 缺少 ESLint 配置，记录在 tech-debt |
| 新脚本验证 | ✅ 通过 | check:all、ai:pre-task 可用 |

## 3. 文件变更清单

| 文件路径 | 操作 | 优先级 | 状态 |
|---------|------|--------|------|
| AGENTS.md | 修改 | P0 | ✅ 已完成 |
| CLAUDE.md | 修改 | P0 | ✅ 已完成 |
| docs/rules/engineering-with-codex-openai.md | 修改 | P0 | ✅ 已完成 |
| docs/rules/architecture-guardrails.md | 新增 | P1 | ✅ 已完成 |
| docs/rules/code-quality-redlines.md | 新增 | P1 | ✅ 已完成 |
| docs/exec-plans/active/harness-engineering-rollout.md | 新增 | P1 | ✅ 已完成 |
| package.json | 修改 | P1 | ✅ 已完成 |
| .claude/CLAUDE.md | 新增 | P1 | ✅ 已完成 |

## 4. 风险评估与缓解

| 风险 | 可能性 | 影响 | 缓解策略 | 状态 |
|------|--------|------|---------|------|
| 文档过多导致阅读负担 | 中 | 中 | 保持入口文档短小，细节下沉到子文档 | 已缓解 |
| 与现有规范冲突 | 低 | 高 | 渐进式实施，每步验证兼容性 | 已验证无冲突 |
| 工具依赖缺失 | 中 | 低 | 脚本中提供降级方案 | 已处理 |
| 团队适应成本 | 中 | 中 | 从 L0 任务开始试运行 | 待观察 |

## 5. 验收标准（Definition of Done）

### 5.1 文档完整性 ✅

- [x] AGENTS.md 包含任务分级、可信度自评、技术债务标记
- [x] CLAUDE.md 包含任务初始化模板和执行计划模板
- [x] docs/rules/ 包含架构护栏和代码质量红线文档
- [x] package.json 包含 check:all、ai:pre-task、ai:post-task 脚本
- [x] .claude/CLAUDE.md 配置已创建

### 5.2 验证通过 ✅

- [x] `npm run docs:check` 通过
- [x] `npm run typecheck` 通过
- [x] `npm test` 通过
- [ ] `npm run lint` - 已知问题，记录在 `docs/exec-plans/tech-debt/2026-03-15-lint-guardrail-gap.md`

### 5.3 新功能验证 ✅

- [x] `npm run check:all` 可用（类型 + 测试 + Lint）
- [x] `npm run ai:pre-task` 可用
- [x] `npm run ai:post-task` 可用
- [x] `npm run check:architecture` 已配置（待安装 dependency-cruiser）
- [x] `npm run check:security` 已配置

## 6. 新增脚本使用说明

### 6.1 验证脚本

```bash
# 运行所有检查（类型 + Lint + 测试）
npm run check:all

# 架构检查（需先安装 dependency-cruiser）
npm run check:architecture

# 安全检查
npm run check:security

# 未使用代码检查（需先安装 knip）
npm run check:unused
```

### 6.2 AI 任务钩子

```bash
# 任务前检查
npm run ai:pre-task

# 任务后检查+修复
npm run ai:post-task

# 自动修复
npm run fix:all
```

## 7. 变更日志

### 2026-03-17

- ✅ 创建 Phase 1-4 执行计划
- ✅ 更新 AGENTS.md，添加任务分级、可信度自评、技术债务标记
- ✅ 更新 CLAUDE.md，添加任务初始化模板、验收清单
- ✅ 更新 engineering-with-codex-openai.md，添加上下文披露、红线规则
- ✅ 创建 architecture-guardrails.md
- ✅ 创建 code-quality-redlines.md
- ✅ 更新 package.json，添加 Harness 标准脚本
- ✅ 创建 .claude/CLAUDE.md AI 工具配置
- ✅ 完成验收验证

## 8. 后续建议

1. **试运行**：选择一个 L0 级任务（如文档更新）试用新规范
2. **ESLint 配置**：解决 lint 护栏缺口，参考 `docs/exec-plans/tech-debt/2026-03-15-lint-guardrail-gap.md`
3. **dependency-cruiser**：如需架构依赖检查，安装并配置 `.dependency-cruiser.js`
4. **团队培训**：向团队成员介绍新的 Harness Engineering 规范

## 9. 参考文档

- `docs/references/tmp.md` - Harness Engineering 方法论来源
- `AGENTS.md` - 仓库级强约束（已更新）
- `CLAUDE.md` - 执行清单（已更新）
- `docs/rules/architecture-guardrails.md` - 架构护栏（新增）
- `docs/rules/code-quality-redlines.md` - 代码质量红线（新增）
- `docs/rules/engineering-with-codex-openai.md` - 工程规则（已更新）
- `.claude/CLAUDE.md` - AI 工具配置（新增）

---

**计划状态**：已完成 ✅  
**完成日期**：2026-03-17  
**执行者**：AI Agent  
