---
rules:
  - type: layer_direction
    name: "app 不可依赖 domain barrel"
    from: "src/app/**"
    to: "src/domain/**"
    severity: error
---
# Design Contract: Barrel downstream

## Goal
- 验证 barrel index.ts 变更会扩展到 downstream consumer

## Constraints
- diff-aware 必须显式启用

## Acceptance Criteria
- [ ] 只传 changed barrel 文件也会扫描 consumer

## Non-Goals
- 不测试全量架构规则集合
