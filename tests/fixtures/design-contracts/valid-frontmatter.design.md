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
# Design Contract: Frontmatter support

## Goal
- 支持 YAML frontmatter rules

## Constraints
- narrative sections 继续可验证

## Acceptance Criteria
- [ ] validate 输出 rules 摘要

## Non-Goals
- 不在本阶段做代码 enforcement
