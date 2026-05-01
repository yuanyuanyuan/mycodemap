---
status: complete
phase: 43-codemap-doctor
source: 43-01-SUMMARY.md
started: 2026-05-01T00:00:00Z
updated: 2026-05-01T00:00:00Z
---

## Current Test

[testing complete]

## Tests

### 1. 运行 codemap doctor 命令（TTY 表格输出）
expected: 终端输出彩色表格，展示 4 类诊断结果（install, config, runtime, agent），包含类别、严重程度、ID 和描述
result: pass

### 2. JSON 输出模式
expected: 运行 `codemap doctor --json`，输出有效的 JSON 数组，每个元素包含 category、severity、id、message、remediation 字段
result: pass

### 3. Ghost 命令检测
expected: 诊断结果中检测到 package.json 中的 echo stub 命令（如 check:architecture 和 check:unused），标记为 error 或 warn
result: pass

### 4. Native 依赖检测
expected: 诊断结果显示 tree-sitter 和 better-sqlite3 的加载状态（可用或不可用）
result: pass

### 5. Workspace Drift 检测
expected: 诊断结果检查 .mycodemap/ 工作区与 init-last.json 收据的差异
result: pass

### 6. Agent / MCP 检测
expected: 诊断结果验证 contract schema 和 MCP 服务器可用性
result: pass

### 7. 退出码行为
expected: 有 error 级诊断时退出码为 1；仅 warn 时为 2；全部通过时为 0
result: pass

### 8. 单元测试通过
expected: 运行测试命令，23 个测试全部通过（doctor-ghost, doctor-native-deps, doctor-workspace-drift, doctor-agent, doctor-integration）
result: pass

## Summary

total: 8
passed: 8
issues: 0
pending: 0
skipped: 0

## Gaps

[none yet]
