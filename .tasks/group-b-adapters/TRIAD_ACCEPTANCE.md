# Triad 验收标准

## 任务ID
group-b-adapters-001

## 验收阶段

### Phase 1: Generator 自验

**执行人**: Generator

**验收项**:
- [ ] PROMPT.md 已生成
- [ ] EVAL.ts 已生成
- [ ] SCORING.md 已生成
- [ ] task-metadata.yaml 已生成
- [ ] TRIAD_ROLES.yaml 已生成
- [ ] TRIAD_WORKFLOW.md 已生成
- [ ] TRIAD_ACCEPTANCE.md 已生成
- [ ] 所有文件位于正确目录
- [ ] SCORING.md 总分等于 100
- [ ] PROMPT.md 包含 retrieval-led 指令

**通过标准**: 所有项勾选

---

### Phase 2: QA 审查

**执行人**: QA Reviewer

#### 2.1 文档完整性审查
- [ ] PROMPT.md 结构完整（背景、初始状态、要求、约束、验收、反例、用户价值）
- [ ] EVAL.ts 包含 Phase 4 检查点定义
- [ ] SCORING.md 包含详细评分项和等级定义
- [ ] task-metadata.yaml 包含完整 workflow 定义
- [ ] TRIAD_ROLES.yaml 定义了三个独立角色
- [ ] TRIAD_WORKFLOW.md 定义了完整工作流

#### 2.2 内容准确性审查
- [ ] PROMPT.md 中的接口定义与源代码一致
- [ ] AstGrepAdapter 方法列表准确
- [ ] CodemapAdapter 方法列表准确
- [ ] ToolOptions 和 UnifiedResult 类型定义准确
- [ ] Mock 策略考虑了所有外部依赖

#### 2.3 检查点可执行性审查
- [ ] CP-1.x 文件存在性检查可执行
- [ ] CP-2.x 覆盖率检查可执行
- [ ] CP-3.x Mock 使用检查可执行
- [ ] CP-4.x 边界条件检查可执行
- [ ] CP-5.x 功能测试检查可执行
- [ ] CP-6.x 代码质量检查可执行

#### 2.4 评分规则合理性审查
- [ ] 总分等于 100
- [ ] 各项权重分配合理
- [ ] 评分等级定义清晰
- [ ] 一票否决项定义明确

**通过标准**: 所有项勾选，或问题已记录并认可

---

### Phase 3: Supervisor 审批

**执行人**: Supervisor

#### 3.1 套件完整性检查
- [ ] 收到完整的任务四件套
- [ ] 收到 QA 审查报告
- [ ] QA 审查通过或问题已解决

#### 3.2 约束条件检查
- [ ] 任务数量 <= 5（本任务数量符合）
- [ ] 三角色是独立 agents
- [ ] 没有跳过 Phase 4
- [ ] 保留了 retrieval-led 指令

#### 3.3 风险评估
- [ ] 任务范围清晰
- [ ] 依赖关系明确
- [ ] 无重大遗漏风险

**决策选项**:
- ✅ **批准** - 任务可以发布
- ⚠️ **有条件批准** - 需要小幅修改
- ❌ **驳回** - 需要重大修改

---

### Phase 4: 执行结果验收

**执行人**: QA Reviewer + Supervisor

#### 4.1 测试文件验收
- [ ] ast-grep-adapter.test.ts 存在
- [ ] codemap-adapter.test.ts 存在
- [ ] index.test.ts 存在
- [ ] 所有测试文件可执行

#### 4.2 覆盖率验收
- [ ] 语句覆盖率 >= 100%
- [ ] 分支覆盖率 >= 100%
- [ ] 函数覆盖率 >= 100%
- [ ] 行覆盖率 >= 100%

#### 4.3 功能测试验收
- [ ] AstGrepAdapter.isAvailable() 被测试
- [ ] AstGrepAdapter.execute() 被测试
- [ ] AstGrepAdapter.search() 被测试
- [ ] CodemapAdapter.isAvailable() 被测试
- [ ] CodemapAdapter.execute() 被测试
- [ ] 三种 intent（impact/dependency/complexity）被测试
- [ ] 工厂函数被测试

#### 4.4 边界条件验收
- [ ] 空输入测试存在
- [ ] 错误处理测试存在
- [ ] 异步测试完整
- [ ] isAvailable 可用/不可用场景都被测试

#### 4.5 Mock 策略验收
- [ ] 使用 vi.mock 模拟外部依赖
- [ ] spawn 事件正确模拟
- [ ] Mock 状态正确重置

#### 4.6 代码质量验收
- [ ] 使用 describe 分组
- [ ] 测试名称语义化
- [ ] TypeScript 类型安全

**通过标准**: 90分以上（优秀等级）

---

## 验收报告模板

```markdown
# 任务验收报告

## 基本信息
- 任务ID: group-b-adapters-001
- 验收日期: YYYY-MM-DD
- 验收人: [姓名]
- 阶段: [QA审查/Supervisor审批/执行结果验收]

## 验收结果
- 总分: XX/100
- 等级: [优秀/良好/及格/不及格]
- 结论: [通过/有条件通过/不通过]

## 详细评分
| 类别 | 得分 | 满分 | 说明 |
|------|------|------|------|
| 文件存在性 | X | 15 | |
| 覆盖率 | X | 20 | |
| Mock策略 | X | 15 | |
| 边界条件 | X | 20 | |
| 功能测试 | X | 20 | |
| 代码质量 | X | 10 | |

## 问题列表
1. [问题描述] - [严重程度] - [建议]

## 改进建议
1. [建议内容]

## 签字
- QA: _______________
- Supervisor: _______________
```

---

## 一票否决项

以下情况直接判定为不通过:

1. **任务套件不完整**
   - 缺少关键文档（PROMPT.md, EVAL.ts, SCORING.md, task-metadata.yaml）
   - 文件位于错误目录

2. **评分规则错误**
   - 总分不等于 100
   - 评分等级定义缺失

3. **检查点不可执行**
   - EVAL.ts 包含语法错误
   - 检查点 validator 无法运行

4. **执行结果不达标**
   - 任何一项覆盖率 < 80%
   - 测试无法执行
   - 关键功能未测试

5. **违反约束**
   - 未使用 vi.mock
   - 直接测试私有方法
   - Mock 状态污染

---

## 附录

### 相关命令

```bash
# 运行测试
npx vitest run

# 生成覆盖率
npx vitest run --coverage

# 运行评估
npx ts-node .kimi/tasks/group-b-adapters/EVAL.ts
```

### 文件清单

```
.kimi/tasks/group-b-adapters/
├── PROMPT.md              # 详细需求
├── EVAL.ts                # 评估检查点
├── SCORING.md             # 评分规则
├── task-metadata.yaml     # 任务元数据
├── TRIAD_ROLES.yaml       # 角色定义
├── TRIAD_WORKFLOW.md      # 工作流说明
└── TRIAD_ACCEPTANCE.md    # 本文件
```
