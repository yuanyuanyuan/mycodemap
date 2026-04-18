# CLAUDE.md — CodeMap 执行手册

> 本文件只做入口路由；细节下沉到 `docs/rules/*.md`、`ARCHITECTURE.md`、`AI_GUIDE.md`。

## 加载顺序

```text
CLAUDE.md → docs/rules/<最相关 1-2 份> → ARCHITECTURE.md → AI_GUIDE.md → 代码事实
```

## 执行回路

```markdown
## 任务分析
**目标**：[一句话]
**类型**：[新增/修复/重构/性能/文档]
**等级**：[L0/L1/L2/L3]

## 执行计划
1. [Plan] 明确边界 → verify: [最小相关检查]
2. [Build] 落地改动 → verify: [定点测试/命令]
3. [Verify] 扩大验证 → verify: [typecheck/lint/test/docs]
```

## 修改后必须执行

```bash
# repo-local rule control 默认先 report-only
python3 scripts/validate-rules.py code --report-only

# 代码基础检查
npm run typecheck
npm run lint
npm test

# 文档/入口/规则改动
npm run docs:check
node dist/cli/index.js ci check-docs-sync
```

> `python3 scripts/validate-rules.py code --report-only` 是 post-edit 默认验证命令。只有在后续 gate 明确切到 enforce 时，才允许把它当 blocker。

## 路径路由

| 编辑路径 | 先读规则 |
|---|---|
| `src/cli/*` | `docs/rules/code-quality-redlines.md` + `docs/rules/architecture-guardrails.md` |
| `src/domain/*` | `docs/rules/code-quality-redlines.md` + `docs/rules/architecture-guardrails.md` |
| `src/server/*` | `docs/rules/code-quality-redlines.md` + `docs/rules/architecture-guardrails.md` |
| `src/infrastructure/*` | `docs/rules/code-quality-redlines.md` + `docs/rules/architecture-guardrails.md` |
| `src/interface/*` | `docs/rules/architecture-guardrails.md` |
| `*.test.ts` | `docs/rules/testing.md` |
| `docs/*` | `docs/rules/validation.md` |
| `.githooks/*` | `docs/rules/validation.md` + `docs/rules/engineering-with-codex-openai.md` |
| `.github/workflows/*` | `docs/rules/validation.md` + `docs/rules/engineering-with-codex-openai.md` |

## Rule-system 默认值

- 配置文件：`.claude/rule-system.config.json`
- 默认开启：`enabled: true`
- 默认按编辑路径路由：`route_by_edit_path: true`
- 默认 soft gate：`soft_gate.change_analyzer: true`
- 默认 hard gate：`hard_gate.mode: "report-only"`

## CodeMap CLI Dogfood

```bash
node dist/cli/index.js query -s "<symbol>"
node dist/cli/index.js deps -m "<module>"
node dist/cli/index.js impact -f "<file>"
node dist/cli/index.js query -S "<keyword>" -j

# Experimental MCP
node dist/cli/index.js mcp install
node dist/cli/index.js mcp start
```

> 若 CLI 不可用，先运行 `npm run build`。`mcp start` 的 `stdout` 只能用于 MCP 协议，不能混入欢迎信息或 runtime log。

## 交付清单

- [ ] 只改与任务直接相关的文件
- [ ] 改后已执行 `python3 scripts/validate-rules.py code --report-only`
- [ ] 已补最小相关验证，再扩大到 `typecheck/lint/test/docs`
- [ ] 若改入口、规则、契约，已检查 `AI_GUIDE.md`
- [ ] 交付中包含失败场景与可信度自评

**生效标志**：入口文件短、路由明确、验证命令可复制、规则只在一处维护。
