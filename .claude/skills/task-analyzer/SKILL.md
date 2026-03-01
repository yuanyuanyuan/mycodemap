---
name: task-analyzer
description: 任务审计专用技能。扫描存量任务、检测质量问题、生成审计报告和修复计划。触发词：审计任务、分析任务、检查任务质量、task audit。
---

# task-analyzer

## 能力边界

- **本技能只负责审计**已生成的任务（audit flow）
- **不负责**：任务生成（由 task-generator 负责）、任务执行（由 task-executor 负责）
- **必须**：审计后输出明确的修复建议，区分是任务定义问题还是执行问题

## 审计对象

| 对象类型 | 审计内容 | 修复负责方 |
|----------|----------|------------|
| 任务四件套 | 完整性、格式、评分总分 | task-generator |
| Triad 状态 | semantic_review 缺失、agents 配置 | task-generator |
| 执行状态 | 未执行、执行失败、超时 | task-executor |
| 元数据一致性 | 状态与实际不匹配 | 视具体情况 |

## 审计流程

```
┌─────────────────────────────────────────────────────────────┐
│ Phase 0: 扫描与收集                                          │
│   1. 扫描 .tasks/ 目录下所有任务                            │
│   2. 加载每个任务的 task-metadata.yaml                      │
│   3. 收集执行报告（如果有）                                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Phase 1: 分类审计                                            │
│   ├─ 结构审计：四件套完整性、SCORING 总分、章节完整性       │
│   ├─ Triad 审计：agents 配置、semantic_review 状态          │
│   ├─ 执行审计：执行状态、最终得分、失败原因                 │
│   └─ 一致性审计：元数据与实际执行结果是否匹配               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Phase 2: 问题分级                                            │
│   ├─ BLOCKING: 必须立即修复（如总分≠100、关键文件缺失）    │
│   ├─ WARNING: 建议修复（如语义评分偏低、文档不完整）        │
│   └─ INFO: 仅记录（如执行时间过长）                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ Phase 3: 生成报告与修复计划                                  │
│   1. 生成审计报告（ANALYSIS_REPORT.md）                     │
│   2. 生成修复计划（FIX_PLAN.md）                            │
│   3. 路由修复请求到对应技能                                 │
└─────────────────────────────────────────────────────────────┘
```

## 修复路由规则

审计发现的问题必须明确路由到正确的技能修复：

| 问题类型 | 示例 | 路由到 |
|----------|------|--------|
| **任务定义缺陷** | PROMPT.md 缺失章节、SCORING 总分≠100、缺少 EVAL.ts | **task-generator** |
| **Triad 配置缺失** | semantic_review 未完成、agents 定义缺失 | **task-generator** |
| **执行失败** | 测试未通过、验收标准不满足 | **task-executor** |
| **执行过期** | 代码已变更导致任务结果失效 | **task-executor** |
| **元数据不一致** | 状态标记为 completed 但无执行报告 | 视具体情况 |

## 审计模式

### 全量审计

扫描所有任务，生成完整审计报告：

```bash
node .claude/skills/task-analyzer/scripts/analyze-all-tasks.js \
  --tasks-dir .tasks \
  --output ANALYSIS_REPORT.md
```

### 单任务审计

审计指定任务：

```bash
node .claude/skills/task-analyzer/scripts/analyze-task.js \
  --task <task-name> \
  --output TASK_ANALYSIS.md
```

### 增量审计

只审计自上次审计以来变更的任务：

```bash
node .claude/skills/task-analyzer/scripts/analyze-incremental.js \
  --tasks-dir .tasks \
  --since <timestamp> \
  --output INCREMENTAL_ANALYSIS.md
```

## 输出规范

### 审计报告结构

```markdown
# Task Analysis Report

## 执行摘要
- 扫描任务数: {n}
- 通过: {n} | 失败: {n} | 待修复: {n}
- BLOCKING: {n} | WARNING: {n} | INFO: {n}

## 问题清单

### BLOCKING（必须修复）
| 任务 | 问题 | 路由 | 建议操作 |
|------|------|------|----------|
| task-a | SCORING 总分=90 | task-generator | 重新生成任务 |

### WARNING（建议修复）
...

### INFO（仅供参考）
...

## 修复计划
| 优先级 | 任务 | 负责技能 | 预计时间 |
|--------|------|----------|----------|
| P0 | task-a | task-generator | 10min |
| P1 | task-b | task-executor | 30min |

## 路由汇总
- 需 task-generator 修复: {n} 个任务
- 需 task-executor 修复: {n} 个任务
```

### 修复计划格式

```markdown
## Fix Plan

### 阶段1: 修复任务定义问题（task-generator）
- [ ] task-a: 补充缺失的验收标准章节
- [ ] task-b: 修复 SCORING 总分

### 阶段2: 重新执行任务（task-executor）
- [ ] task-c: 测试失败，需重新执行
- [ ] task-d: 执行过期，需重新验证

### 阶段3: 验证修复
- [ ] 重新运行审计确认所有 BLOCKING 已解决
```

## 脚本工具

| 脚本 | 用途 |
|------|------|
| `scripts/analyze-all-tasks.js` | 全量审计所有任务 |
| `scripts/analyze-task.js` | 单任务审计 |
| `scripts/analyze-incremental.js` | 增量审计 |
| `scripts/check-task-structure.js` | 检查任务结构完整性 |
| `scripts/check-triad-status.js` | 检查 Triad 状态 |
| `scripts/check-execution-status.js` | 检查执行状态 |
| `scripts/route-fixes.js` | 路由修复请求到对应技能 |

## 与 task-generator / task-executor 的协作

```
┌────────────────────────────────────────────────────────────────┐
│                      任务实施闭环                               │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌─────────────┐    生成     ┌─────────────┐                  │
│   │   Create    │ ──────────→ │   Execute   │                  │
│   │ task-generator│           │ task-executor│                  │
│   └──────┬──────┘            └──────┬──────┘                  │
│          ↑                           │                         │
│          │    修复任务定义            │  执行失败               │
│          │    (四件套问题)            │  (代码实现问题)         │
│          │                           ↓                         │
│   ┌──────┴─────────────────────────────────┐                  │
│   │           Audit                        │                  │
│   │        task-analyzer                   │                  │
│   │  ┌─────────────────────────────────┐   │                  │
│   │  │ 1. 扫描任务                     │   │                  │
│   │  │ 2. 检测问题                     │   │                  │
│   │  │ 3. 分级分类                     │   │                  │
│   │  │ 4. 路由修复:                    │   │                  │
│   │  │    ├→ 定义问题 → task-generator │   │                  │
│   │  │    └→ 执行问题 → task-executor  │   │                  │
│   │  └─────────────────────────────────┘   │                  │
│   └────────────────────────────────────────┘                  │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

## 质量门禁集成

审计可以在以下时机触发：

| 时机 | 触发方式 | 审计范围 |
|------|----------|----------|
| 生成后 | task-generator 自动调用 | 新生成的任务 |
| 执行前 | task-executor 自动调用 | 待执行的任务 |
| 执行后 | task-executor 自动调用 | 刚完成的任务 |
| 定时 | CI/手动触发 | 全量任务 |
| 代码变更后 | git hook | 受影响任务 |

## 使用示例

### 审计所有任务

```bash
# 全量审计
node .claude/skills/task-analyzer/scripts/analyze-all-tasks.js

# 查看审计报告
cat ANALYSIS_REPORT.md
```

### 审计单个任务

```bash
node .claude/skills/task-analyzer/scripts/analyze-task.js --task phase1-unified-result
```

### 根据审计结果修复

```bash
# 查看需要 task-generator 修复的任务
node .claude/skills/task-analyzer/scripts/route-fixes.js --target task-generator

# 查看需要 task-executor 修复的任务
node .claude/skills/task-analyzer/scripts/route-fixes.js --target task-executor
```
