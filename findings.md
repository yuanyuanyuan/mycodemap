# CodeMap 重构任务生成 - 研究发现

> 基于设计文档分析的任务生成研究记录

---

## 关键发现

### 1. 模块依赖关系

```
M1 (UnifiedResult) 
  ├── M2 (Confidence)
  ├── M3 (ResultFusion)
  │     └── M6 (AIFeed)
  └── M4 (ToolOrchestrator)
        ├── M5 (TestLinker)
        ├── M6 (GitAnalyzer)
        ├── M7 (CI Gateway)
        └── M8 (WorkflowOrchestrator)
```

### 2. 任务复杂度分布

| 复杂度 | 预估任务数 | 占比 |
|--------|-----------|------|
| L1 基础 | 20 | 22% |
| L2 进阶 | 35 | 39% |
| L3 复杂 | 25 | 28% |
| L4 专家 | 10 | 11% |

### 3. 核心能力维度

1. **类型设计能力** - TypeScript 接口/类型定义
2. **算法实现能力** - 评分计算、排序、加权
3. **错误处理能力** - 超时、回退、降级
4. **系统集成能力** - 多模块协作
5. **CLI 开发能力** - 命令行工具设计
6. **测试设计能力** - 分层检查点设计

### 4. 陷阱场景识别

| 场景 | 描述 | 测试重点 |
|------|------|----------|
| 空结果处理 | 工具返回空结果时的回退 | 回退链触发 |
| 超时处理 | 工具执行超时的优雅降级 | 超时控制 |
| 循环依赖 | 结果融合时的循环引用 | 去重逻辑 |
| 置信度阈值边界 | 恰好等于阈值的边界情况 | 阈值判断 |
| 文件头缺失 | 部分文件缺少 [META]/[WHY] | 验证逻辑 |

### 5. 反例场景设计

- 错误的 Intent 类型传入
- 超出范围的 topK 参数
- 不存在的目标文件路径
- 格式错误的 Commit Message
- 不完整的文件头注释

---

## 设计决策记录

### 决策 1: 任务命名规范

采用 `{模块}-{序号}-{动作}-{目标}` 格式：
- 示例: `M2-005-implement-calculate-confidence`

### 决策 2: 评分标准权重

| 维度 | 权重 | 说明 |
|------|------|------|
| 功能正确性 | 40% | 核心逻辑实现 |
| 边界处理 | 25% | 错误和边界情况 |
| 代码质量 | 20% | TypeScript 类型安全 |
| 测试覆盖 | 15% | 检查点完整性 |

### 决策 3: 依赖关系处理

- 基础类型定义任务优先（L1）
- 核心算法实现其次（L2-L3）
- 集成和高级功能最后（L4）

---

## 参考资源

- [REFACTOR_REQUIREMENTS.md](./docs/REFACTOR_REQUIREMENTS.md) - 需求场景
- [REFACTOR_ARCHITECTURE_OVERVIEW.md](./docs/REFACTOR_ARCHITECTURE_OVERVIEW.md) - 架构概览
- [task-generator skill](./.claude/skills/task-generator/SKILL.md) - 任务生成规范

---

## 2026-03-01 修复发现（task-generator）

1. 现有 skill 规则未限制单次批量数量，导致可绕过质量控制。
2. 现有质量门禁未校验任务生成过程角色分工，只校验文件内容。
3. 将三角色流程写入 metadata 并纳入门禁后，可把“流程质量”转成可验证约束。
4. 历史 90 个任务需要补齐 workflow 字段，否则新门禁会全量失败。

## 2026-03-01 扩展发现（固定化 + 能力拆分）

1. 仅靠 metadata 约束不够，缺少 triad 独立工件会弱化审查可读性。
2. triad 角色定义、工作流、验收清单应拆成独立文件，便于脚本化检查。
3. 任务生成与任务审计属于不同职责，拆成 `task-generator` + `task-analyzer` 后，流程边界更清晰。
4. 新增分析脚本可在不改动任务内容的前提下输出风险报告，满足“只检查不生成”的能力要求。

## 2026-03-01 新发现（三角色 agents + 语义引擎）

1. 仅记录 `agent` 名称不等于“真实三角色执行”；必须校验 `.agents/*.agent.md` 才能防止角色虚设。
2. supervisor 只复核 QA 结论会漏掉语义偏差，需独立语义维度评分与 critical failure 机制。
3. 历史任务若不回填 `semantic_review` 与语义报告，会导致新门禁全量失败，因此需要专门回填脚本。
4. 把语义引擎模板固定到 `.agents/{supervisor}.semantic.prompt.md` 后，可在不同批次保持一致审核口径。

## 2026-03-01 新发现（多运行时适配）

1. 单一 `.claude/skills` 路径无法覆盖 Codex/Kimi，需要独立适配目录与统一同步入口。
2. 自动运行时判断必须做优先级（env > 目录），否则在混合环境会误判。
3. skill 执行阶段如果不自动 init，常见失败是“skill 找不到”和“agent 资产缺失”。
4. Claude 的 agent-teams 应作为可选增强；默认流程仍要可在 subagent 模式下稳定运行。

## 2026-03-01 新发现（初始化资产归档到 `.tasks`）

1. 运行时适配与状态文件属于 skill 配置资产，放在项目根目录会与业务代码混杂，迁移到 `.tasks` 更易治理。
2. `.agents` 更适合作为消费层入口，使用符号链接指向 `.tasks/agents` 可同时满足兼容路径与集中存储。
3. 将运行时 `SKILL.md` 同步从“复制”改为“软链接”后，可避免多份文档漂移。
4. analyzer 报告默认落到 `.tasks`，可保证该 skill 的生成产物都在同一命名空间。

## 2026-03-01 新发现（scripts 目录迁移策略）

1. 将根目录 `scripts` 作为符号链接（`scripts -> .tasks/scripts`）可以保证旧命令兼容，同时满足“初始化资产归档到 `.tasks`”。
2. `generate-tasks.js` 迁移到 `.tasks/scripts` 后，需要用“向上探测项目根目录”的方式避免路径解析偏移。
3. 统一命令入口到 `.tasks/scripts/*` 可减少配置与产物散落在项目根目录的风险。

## 2026-03-01 新发现（初始化脚本健壮性）

1. 若 runtime init 对 `.claude/skills/task-generator` 存在硬编码依赖，在“仅保留 `.tasks`”场景会直接失败。
2. 将 bootstrap 脚本与模板收敛到 `.tasks/scripts/skills` 后，初始化可在无 `.claude` task skill 目录时独立运行。
3. 通过“`.tasks` 主路径 + `.claude` 回退候选”的脚本发现策略，可同时兼容新旧布局。

## 2026-03-01 新发现（仅保留 `.tasks` 场景）

1. `init-runtime-skills` 若依赖 `.claude/skills/task-generator/scripts/bootstrap-triad-agents.js`，在“清理 skill 目录”后会立即失效。
2. bootstrap 必须具备“模板内置或 `.tasks` 本地模板”能力，不能再依赖 `.claude` 资产。
3. `generate-tasks` 的 triad 模板读取也需同步去 `.claude` 依赖，否则后续生成阶段会二次失败。
