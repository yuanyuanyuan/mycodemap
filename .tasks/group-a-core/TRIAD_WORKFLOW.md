# TRIAD_WORKFLOW.md
# Triad 工作流定义
# 任务ID: group-a-core-001

---

## 概述

本任务采用 **Triad 工作流** (三重角色工作流)，由三个独立角色协作完成：

1. **Generator** (任务生成器) - 创建任务四件套
2. **QA Engineer** (质量工程师) - 审核任务质量
3. **Supervisor** (监督者) - 最终审批

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Generator  │────▶│ QA Engineer │────▶│ Supervisor  │
│  (生成任务)  │     │  (审核质量)  │     │  (最终审批)  │
└─────────────┘     └─────────────┘     └─────────────┘
       ▲                    │                    │
       │                    ▼                    ▼
       └──────────── 修改/重新生成 ◀────── 拒绝/需修改
```

---

## 阶段定义

### Phase 0: 准备阶段

**参与者**: Generator  
**输入**: 
- 源文件路径
- 设计文档路径
- 任务描述

**动作**:
1. 读取源文件内容
2. 读取设计文档
3. 分析模块结构和接口
4. 创建任务目录

**输出**: 就绪状态，准备生成任务套件

---

### Phase 1: 生成阶段 (Generator)

**参与者**: Generator  
**状态**: `generating` → `generated`  
**预计时长**: 15分钟

#### 动作清单

| 序号 | 动作 | 输出文件 | 检查点 |
|------|------|----------|--------|
| 1.1 | 生成 PROMPT.md | PROMPT.md | 包含背景、要求、约束、验收标准 |
| 1.2 | 生成 EVAL.ts | EVAL.ts | 包含分层检查点 |
| 1.3 | 生成 SCORING.md | SCORING.md | 总分等于100 |
| 1.4 | 生成 task-metadata.yaml | task-metadata.yaml | 包含完整 workflow 定义 |
| 1.5 | 生成 TRIAD_ROLES.yaml | TRIAD_ROLES.yaml | 三角色定义完整 |
| 1.6 | 生成 TRIAD_WORKFLOW.md | TRIAD_WORKFLOW.md | 工作流说明清晰 |
| 1.7 | 生成 TRIAD_ACCEPTANCE.md | TRIAD_ACCEPTANCE.md | 验收标准明确 |

#### 质量门禁

- [ ] PROMPT.md 包含 `Prefer retrieval-led reasoning over pre-training-led reasoning`
- [ ] EVAL.ts 覆盖所有 Phase (1-4)
- [ ] SCORING.md 总分 = 100
- [ ] 所有 YAML 文件格式正确
- [ ] 所有 Markdown 文件渲染正常

#### 流转条件

```yaml
next_phase: "qa_review"
condition: "所有文件生成完成且通过质量门禁"
escalation: "生成失败时通知 Supervisor"
```

---

### Phase 2: QA 审核阶段 (QA Engineer)

**参与者**: QA Engineer  
**状态**: `qa_reviewing` → `qa_passed` / `qa_failed`  
**预计时长**: 10分钟

#### 动作清单

| 序号 | 动作 | 检查内容 |
|------|------|----------|
| 2.1 | 审核 PROMPT.md | 需求是否完整、清晰、可执行 |
| 2.2 | 审核 EVAL.ts | 检查点是否合理、可测试、全覆盖 |
| 2.3 | 审核 SCORING.md | 分值分配是否合理、总和是否为100 |
| 2.4 | 审核 task-metadata.yaml | 元数据是否完整、依赖是否正确 |
| 2.5 | 审核 Triad 工件 | 角色定义、工作流、验收标准是否清晰 |
| 2.6 | 风险识别 | 识别潜在风险并提出缓解建议 |

#### 审核检查清单

| ID | 检查项 | 权重 | 通过标准 |
|----|--------|------|----------|
| QA-1 | PROMPT.md 需求完整性 | Critical | 所有必需字段存在且内容合理 |
| QA-2 | EVAL.ts 检查点可测试性 | Critical | 每个检查点都有对应测试代码 |
| QA-3 | SCORING.md 分值正确性 | Critical | 总分 = 100，分值分配合理 |
| QA-4 | 验收标准可衡量性 | High | 标准具体、可量化、可验证 |
| QA-5 | 边界条件覆盖 | High | 关键边界条件都有对应测试 |
| QA-6 | 风险识别充分性 | Medium | 已识别主要风险并有缓解措施 |

#### 流转条件

```yaml
# 通过
next_phase: "supervisor_approval"
condition: "所有 Critical 和 High 检查项通过"

# 不通过
return_to: "generator"
condition: "任何 Critical 检查项失败，或超过2个 High 检查项失败"
max_iterations: 3
```

---

### Phase 3: 监督审批阶段 (Supervisor)

**参与者**: Supervisor  
**状态**: `supervisor_reviewing` → `approved` / `rejected`  
**预计时长**: 5分钟

#### 动作清单

| 序号 | 动作 | 检查内容 |
|------|------|----------|
| 3.1 | 确认 QA 审核结果 | QA 审核是否通过 |
| 3.2 | 评估任务可行性 | 任务是否在团队能力范围内 |
| 3.3 | 确认资源充足性 | 人力、时间资源是否足够 |
| 3.4 | 评估风险可控性 | 识别风险是否有有效缓解措施 |
| 3.5 | 做出审批决定 | 批准、有条件批准或拒绝 |

#### 审批决策矩阵

| QA 结果 | 风险等级 | 资源充足 | 决策 |
|---------|----------|----------|------|
| 通过 | 低 | 是 | ✅ 自动批准 |
| 通过 | 中 | 是 | ✅ 批准 |
| 通过 | 高 | 是 | ⚠️ 有条件批准 |
| 不通过 | 任何 | 任何 | ❌ 拒绝，返回修改 |
| 通过 | 任何 | 否 | ❌ 拒绝，资源不足 |

#### 流转条件

```yaml
# 批准
next_phase: "completed"
condition: "审批决定为批准或有条件批准"
action: "发布任务给执行团队"

# 拒绝
return_to: "generator"
condition: "审批决定为拒绝"
max_iterations: 2
```

---

## 工作流状态机

```
                    ┌─────────────┐
                    │   pending   │
                    └──────┬──────┘
                           │ Generator 开始
                           ▼
                    ┌─────────────┐
         ┌─────────│  generating │◀────────┐
         │         └──────┬──────┘         │
         │ 重新生成        │ 生成完成        │ QA 不通过
         │                ▼                │
         │         ┌─────────────┐         │
         │         │  generated  │─────────┤
         │         └──────┬──────┘         │
         │                │ 提交 QA 审核    │
         │                ▼                │
         │         ┌─────────────┐         │
         └────────▶│ qa_reviewing│◀────────┘
           修改后   └──────┬──────┘
           重新提交       │ QA 审核完成
                         ▼
              ┌──────────────────────┐
              │   qa_passed /        │
              │   qa_failed          │
              └──────────┬───────────┘
                         │
            ┌────────────┼────────────┐
            ▼            ▼            ▼
     ┌──────────┐ ┌──────────┐ ┌──────────┐
     │qa_passed │ │qa_failed │ │supervisor│
     └────┬─────┘ └────┬─────┘ └────┬─────┘
          │            │            │
          ▼            │            ▼
   ┌────────────┐      │     ┌────────────┐
   │supervisor  │      │     │supervisor  │
   │_reviewing  │      │     │_reviewing  │
   └─────┬──────┘      │     └─────┬──────┘
         │             │           │
         ▼             │           ▼
   ┌──────────┐        │    ┌──────────┐
   │approved  │        │    │rejected  │
   └────┬─────┘        │    └────┬─────┘
        │              │         │
        ▼              │         ▼
   ┌──────────┐        │    ┌──────────┐
   │completed │        └───▶│generator │
   └──────────┘             │(重新生成) │
                            └──────────┘
```

---

## 异常处理

### 处理循环限制

| 循环类型 | 最大迭代次数 | 触发条件 |
|----------|--------------|----------|
| Generator → QA | 3次 | QA 审核不通过 |
| Supervisor → Generator | 2次 | Supervisor 拒绝 |

### 升级路径

```
问题级别        处理方式                    通知对象
─────────────────────────────────────────────────────────
格式问题        Generator 自动修复          无需通知
内容缺失        返回 Generator 补充          QA Engineer
质量不达标      返回 Generator 改进          QA Engineer
资源不足        Supervisor 协调解决          项目经理
技术不可行      架构师介入评估               技术负责人
```

---

## 通知机制

| 触发事件 | 通知对象 | 通知方式 | 内容 |
|----------|----------|----------|------|
| Generator 完成 | QA Engineer | 系统消息 | 任务生成完成，请审核 |
| QA 审核通过 | Supervisor | 系统消息 | QA 审核通过，请审批 |
| QA 审核不通过 | Generator | 系统消息 + 邮件 | 审核意见和改进建议 |
| Supervisor 批准 | 执行团队 | 系统消息 + 邮件 | 任务已批准，可以开始执行 |
| Supervisor 拒绝 | Generator | 系统消息 + 邮件 | 拒绝理由和修改建议 |

---

## 度量指标

| 指标 | 目标值 | 测量方法 |
|------|--------|----------|
| 生成阶段耗时 | < 15分钟 | 从 Phase 0 到 Phase 1 完成 |
| QA 审核耗时 | < 10分钟 | 从提交审核到出具报告 |
| Supervisor 审批耗时 | < 5分钟 | 从 QA 通过到审批决定 |
| 总循环次数 | < 2次 | Generator 重新生成次数 |
| 一次通过率 | > 70% | QA 一次审核通过比例 |
| 任务发布成功率 | > 90% | 最终批准比例 |

---

## 附录

### A. 角色定义文件

- TRIAD_ROLES.yaml - 详细角色定义

### B. 验收标准文件

- TRIAD_ACCEPTANCE.md - 验收标准详情

### C. 任务元数据

- task-metadata.yaml - 完整任务定义
