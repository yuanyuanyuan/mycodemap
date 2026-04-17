# Design Contract Template

把下面模板复制到仓库根目录并保存为 `mycodemap.design.md`。

> 目标不是写长篇 PRD，而是把 AI 后续执行需要的**目标、限制、验收标准、显式非目标**写成可验证输入。

## Required Sections

| Section | Required | 作用 |
|---------|----------|------|
| `## Goal` | Yes | 定义这次要达成的结果 |
| `## Constraints` | Yes | 约束技术/产品/时间/兼容性边界 |
| `## Acceptance Criteria` | Yes | 写成可以验证的结果，而不是模糊愿景 |
| `## Non-Goals` | Yes | 明确这次不做什么，防止 AI scope drift |
| `## Context` | No | 补充背景、现状、依赖关系 |
| `## Open Questions` | No | 记录需要人类决策的问题 |
| `## Notes` | No | 其他实现前必须知道的信息 |

## Authoring Rules

- 使用清晰 section heading，不要把多个主题揉进同一段。
- `Acceptance Criteria` 尽量写成可检查的 bullet。
- `Non-Goals` 不能为空；它是防止越界实现的第一道护栏。
- 如果某个关键决策尚未确定，写进 `Open Questions`，不要让 AI 自行猜测。

## Frontmatter Rules

把可执行规则写在文件开头的 YAML frontmatter 中。当前 Phase 25 只支持三种规则：

- `layer_direction`
- `forbidden_imports`
- `module_public_api_only`

```yaml
---
rules:
  - type: layer_direction
    name: "core 不可依赖 cli"
    from: "src/core/**"
    to: "src/cli/**"
    severity: error
  - type: forbidden_imports
    name: "parser 禁止直接引用 fs"
    module: "src/infrastructure/parser/**"
    forbidden:
      - fs
      - path
    severity: warn
  - type: module_public_api_only
    name: "domain 模块对外仅暴露 index.ts"
    module: "src/domain/**"
    public_api: "index.ts"
    severity: error
---
```

## Copy-Paste Template

```markdown
---
rules:
  - type: layer_direction
    name: "core 不可依赖 cli"
    from: "src/core/**"
    to: "src/cli/**"
    severity: error
---
# Design Contract: <feature name>

## Goal
- 这个 feature 最终要解决什么问题？
- 用户或团队为什么需要它？

## Constraints
- 必须兼容的现有命令、接口或目录边界
- 不允许改动的模块 / 风险限制 / 时间限制

## Acceptance Criteria
- [ ] 可验证结果 1
- [ ] 可验证结果 2
- [ ] 可验证结果 3

## Non-Goals
- 这次明确不做什么
- 哪些相关问题留到后续 phase

## Context
- 当前实现现状
- 相关文件 / 模块 / 文档

## Open Questions
- 需要人类确认的问题 1

## Notes
- 其他补充信息
```

## Minimal Example

```markdown
---
rules:
  - type: layer_direction
    name: "core 不可依赖 cli"
    from: "src/core/**"
    to: "src/cli/**"
    severity: error
---
# Design Contract: Add design validate command

## Goal
- 为 human-authored design contract 提供正式的 CLI validate 入口

## Constraints
- 不扩写 analyze intent
- 不恢复 workflow 的 commit / ci phases

## Acceptance Criteria
- [ ] `mycodemap design validate mycodemap.design.md --json` 返回机器可读结果
- [ ] 缺失 `Acceptance Criteria` section 时返回 blocker diagnostics
- [ ] README 和 AI docs 能发现该入口

## Non-Goals
- 不做 design-to-code mapping
- 不生成 handoff package
```
