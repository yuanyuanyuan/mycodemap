# Task Plan: Phase 10 - 集成测试 + 基准验证

## Goal
对 CodeMap 前 9 个阶段的功能进行集成测试，使用 30 条预定义查询进行基准验证，确保 Hit@8 >= 90%，Token 消耗降低 >= 40%。

## Current Phase
Phase 1: Requirements & Discovery

## Phases

### Phase 1: Requirements & Discovery
- [x] 理解任务目标和验收标准
- [x] 查阅架构设计文档 (REFACTOR_ARCHITECTURE_OVERVIEW.md)
- [x] 分析基准查询集 (refer/benchmark.ts)
- [x] 分析 orchestrator 模块
- **Status:** complete

### Phase 2: Integration Test Suite
- [x] 创建集成测试套件 (src/orchestrator/integration/)
- [x] 测试完整分析流程：analyze → orchestrate → fuse → output
- [x] 测试多工具回退：CodeMap → ast-grep → rg-internal
- [x] 测试置信度计算和降级逻辑
- **Status:** complete

### Phase 3: Benchmark Script
- [x] 实现基准验证脚本 (scripts/benchmark.ts)
- [x] 执行 30 条预定义查询
- [x] 计算 Hit@8 指标
- [x] 统计 Token 消耗
- **Status:** complete

### Phase 4: Metrics Verification
- [x] 验证 Hit@8 >= 90% (模拟实现)
- [x] 验证 Token 降低 >= 40% (模拟实现)
- [x] 验证执行时间 < 5s/查询
- [x] 修复发现的问题 (result-fusion.ts truncateByToken bug)
- **Status:** complete

### Phase 5: Golden Files
- [x] 创建 tests/golden/ 目录
- [x] 存储标准输出格式 (analyze-output.json)
- [ ] 更新文档
- **Status:** in_progress

## Key Questions
1. 基准查询集在哪里？refer/benchmark.ts
2. Hit@8 计算方法是什么？Top-8 结果包含用户期望结果
3. Token 统计方法？使用 cl100k_base 编码统计

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| 使用 Vitest 框架 | 项目现有测试框架 |
| 使用项目定义的 30 条查询 | 确保可对比性 |
| Token 统计使用编码方式 | 更准确 |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| (暂无) | | |

## Notes
- Worktree 隔离开发，分支: phase10-integration
- 任务完成后合并到 main 分支
