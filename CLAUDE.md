# CLAUDE.md — CodeMap 执行手册

> 本文件是 Claude Code 执行手册。规则细节按下方路由加载 `docs/rules/*.md`。
> 不与 `AGENTS.md`（Codex 专用）交叉引用。

## 加载顺序

```
本文件 → docs/rules/*.md → ARCHITECTURE.md → AI_GUIDE.md → 代码事实
```

## 渐进加载协议

按 T0→T1→T2 加载，不超出当前决策所需。

| 层级 | 加载时机 | 内容 |
|------|---------|------|
| **T0-契约** | 每会话 | `CLAUDE.md`（本文件）、`RTK.md` |
| **T1-规则** | 任务开始时 | `docs/rules/` 中与当前任务相关的 1-2 个文件 |
| **T2-知识** | 明确需要时 | `ARCHITECTURE.md`、`AI_GUIDE.md`、具体代码/测试 |

> **禁止**：不要一次性加载所有规则文件。每次只加载与当前任务相关的规则。

## 启动模板

AI 接受任务时输出：

```markdown
## 任务分析
**目标**：[一句话]
**类型**：[新增/修复/重构/性能/文档]
**等级**：[L0/L1/L2/L3]

## 执行计划
1. [Plan] 设计接口 → verify: [类型检查]
2. [Build] 核心逻辑 + 测试 → verify: [测试通过]
3. [Verify] 全量检查 → verify: [npm run check:all]
```

## 验证速查

```bash
# 基础检查
npm run typecheck          # TypeScript
npm test                   # 单元测试
npm run lint               # ESLint
npm run check:all          # 全部

# CLI 调试（输出目录是 dist/，不是 build/）
npm run build
node dist/cli/index.js <cmd>

# 文档检查
npm run docs:check
```

## 规则路由

| 你的任务涉及… | 先读这个文件 |
|--------------|-------------|
| 代码质量红线 | `docs/rules/code-quality-redlines.md` |
| 架构分层/依赖 | `docs/rules/architecture-guardrails.md` |
| 测试规则 | `docs/rules/testing.md` |
| CI / hooks / 验证 | `docs/rules/validation.md` |
| 发布/部署 | `docs/rules/deployment.md` |
| Agent 工程规则 | `docs/rules/engineering-with-codex-openai.md` |
| 发布前检查 | `docs/rules/pre-release-checklist.md` |

## CodeMap CLI Dogfood

用 CodeMap CLI 分析 CodeMap 自身：

```bash
# 查找符号定义
node dist/cli/index.js query -s "<symbol>"

# 查找模块依赖
node dist/cli/index.js deps -m "<module>"

# 分析文件影响
node dist/cli/index.js impact -f "<file>"

# 通用搜索
node dist/cli/index.js query -S "<keyword>" -j
```

> 若 CLI 不可用，先运行 `npm run build`。CodeMap 不足时回退到 `rg` / `find`。

## 交付清单

任务完成前自检：

- [ ] 代码实现完整，符合需求
- [ ] 架构合规（无跨层依赖）
- [ ] `npm run typecheck` 通过
- [ ] `npm test` 通过
- [ ] 无 `console.log` / 未使用 import
- [ ] 可信度自评

**提交流程**：L0 → 直接 commit；L1+ → 生成 PR 描述，暂停等待审查。

## 交付格式

```markdown
## 改了什么
- 文件清单 + 变更摘要

## 为什么改
- 需求背景 + 设计决策 + 边界说明

## 验证
- 执行的检查命令及结果

## 失败场景
- 至少一个预演的失败模式

## 可信度自评
- 确定 / 推测 / 需验证 / 风险
```

-- -

**生效标志**：入口文件保持短小，规则只存于一处，知识按需加载。
