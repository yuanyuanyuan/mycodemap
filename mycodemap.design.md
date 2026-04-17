---
rules:
  - type: layer_direction
    name: "core 不可依赖 cli"
    from: "src/core/**"
    to: "src/cli/**"
    severity: error
---
# Design Contract: CodeMap executable architecture gate

## Goal
- 把 CodeMap 自身仓库的核心架构边界写成可执行 contract gate
- 让 `mycodemap check` 可以在 PR / CI 中阻断 `src/core/**` 直接依赖 `src/cli/**`

## Constraints
- `design validate` 继续只负责 contract 文件合法性校验，不承担代码 enforcement
- `mycodemap check` 默认输出 JSON，`--human` 只改变渲染，不改变底层 truth
- diff-aware 只能在显式提供 `--base` 或 `--changed-files` 时启用

## Acceptance Criteria
- [ ] `node dist/cli/index.js design validate mycodemap.design.md --json` 返回合法 contract
- [ ] `node dist/cli/index.js check --contract mycodemap.design.md --against src` 可在本仓库执行
- [ ] PR CI 使用显式 base SHA 运行 contract gate

## Non-Goals
- 不在本 phase 引入更多 rule families
- 不在本 phase 加入 Git 历史风险打分
