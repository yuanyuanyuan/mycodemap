# 任务执行模式详解

## 概述

task-executor 支持三种执行模式，适用于不同的任务场景。

---

## 模式一：单任务模式 (Single Task Mode)

### 适用场景
- 独立任务，无外部依赖
- 快速验证单个功能点
- 调试特定任务

### 执行流程
```
验证任务完整性
    ↓
读取 PROMPT.md 理解需求
    ↓
分析项目上下文
    ↓
生成/修改代码
    ↓
运行 EVAL.ts 测试
    ↓
对照 SCORING.md 自评
    ↓
生成报告，更新元数据
```

### 使用示例
```bash
# 通过任务名称
node scripts/execute-task.js --task phase1-unified-result

# 通过路径
node scripts/execute-task.js --path .tasks/phase1-unified-result
```

---

## 模式二：批量模式 (Batch Mode)

### 适用场景
- 多个独立任务需要执行
- 按状态筛选任务（如所有 pending 任务）
- 快速批量验证

### 执行策略

#### 顺序执行（默认）
- 适合有潜在依赖的任务
- 便于调试，出错可及时停止
- 资源占用低

#### 并行执行（--parallel）
- 适合完全独立的任务
- 执行效率高
- 需要更多系统资源

### 使用示例
```bash
# 执行多个指定任务（顺序）
node scripts/batch-executor.js --tasks phase1,phase2,phase3

# 并行执行
node scripts/batch-executor.js --tasks phase1,phase2 --parallel

# 执行所有 pending 状态的任务
node scripts/batch-executor.js --status pending

# 执行所有已审批但未执行的任务
node scripts/batch-executor.js --status approved
```

---

## 模式三：编排模式 (Orchestration Mode)

### 适用场景
- 任务间存在明确的依赖关系
- 需要按特定顺序执行
- 重构项目等多阶段任务

### 依赖解析

任务依赖在 `task-metadata.yaml` 中定义：

```yaml
dependencies:
  requires:
    - phase1-unified-result
    - phase2-confidence
  required_by:
    - phase4-tool-orchestrator
```

### 拓扑排序

编排模式使用 Kahn 算法进行拓扑排序：

```
输入: 任务列表 + 依赖关系
输出: 合法的执行顺序

算法步骤:
1. 计算每个任务的入度（依赖数量）
2. 将入度为 0 的任务加入队列
3. 依次取出任务，将其依赖的任务入度减 1
4. 如果某任务入度变为 0，加入队列
5. 重复直到队列为空
6. 如果输出任务数 < 输入任务数，说明有循环依赖
```

### 使用示例
```bash
# 解析并执行带依赖的任务
node scripts/batch-executor.js --with-dependencies phase4-tool-orchestrator

# 仅查看依赖关系
node scripts/dependency-resolver.js --task phase4-tool-orchestrator

# 列出所有任务及其依赖
node scripts/dependency-resolver.js --list-all
```

---

## 模式选择决策树

```
需要执行几个任务?
├── 1 个 → 单任务模式
└── 多个 → 任务间有依赖?
    ├── 有 → 编排模式 (--with-dependencies)
    └── 无 → 需要快速执行?
        ├── 是 → 批量并行模式 (--parallel)
        └── 否 → 批量顺序模式 (默认)
```

---

## 复杂任务的多 Agent 协作

### 触发条件
- estimated_minutes > 60
- difficulty == "hard"
- 涉及多个文件修改（>5 个）
- 有跨模块依赖

### 协作流程

```
┌─────────────────────────────────────────────┐
│ Phase 1: Executor (task-executor)           │
│   - 分析 PROMPT.md                          │
│   - 制定实施计划                            │
│   - 生成代码                                │
└─────────────────────────────────────────────┘
                    ↓
        ┌───────────┴───────────┐
        ↓                       ↓
┌───────────────┐       ┌───────────────┐
│   Reviewer    │       │   Validator   │
│ (code-reviewer)│       │(task-validator)│
│               │       │               │
│ 代码审查      │       │ 运行测试      │
│ 质量把关      │       │ 验证验收      │
└───────┬───────┘       └───────┬───────┘
        ↓                       ↓
        └───────────┬───────────┘
                    ↓
        ┌───────────┴───────────┐
        ↓                       ↓
    发现问题               全部通过
        ↓                       ↓
    返回 Executor          更新状态
```

---

## 最佳实践

### 1. 执行前准备
- 确保任务四件套完整
- 检查项目环境就绪
- 确认依赖任务已完成

### 2. 执行过程
- 关注控制台输出
- 记录关键决策点
- 遇到问题及时暂停

### 3. 执行后
- 检查生成的报告
- 验证元数据更新
- 必要时人工复核

### 4. 故障排查
- 查看 EXECUTION_REPORT.md
- 检查测试输出日志
- 验证文件权限和路径
