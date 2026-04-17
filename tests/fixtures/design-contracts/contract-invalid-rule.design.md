---
rules:
  - type: unsupported_rule
    name: "未知规则类型"
    module: "src/core/**"
    severity: error
  - type: forbidden_imports
    name: "非法 severity"
    module: "src/infrastructure/parser/**"
    forbidden:
      - fs
    severity: critical
  - type: module_public_api_only
    name: "缺少 public api"
    module: "src/domain/**"
    severity: error
    extra_field: "not-allowed"
---
# Design Contract: Invalid frontmatter rule

## Goal
- frontmatter 失败也要保持结构化 diagnostics

## Constraints
- 不吞掉无效 rule

## Acceptance Criteria
- [ ] 返回 invalid-rule-type / missing-rule-field / invalid-rule-severity

## Non-Goals
- 不在这里执行代码检查
