# Triad Acceptance Criteria for CodeMap CLI JSON Output Fix

## 任务验收总览

**任务名称**: Fix CodeMap CLI JSON Output Pollution  
**任务ID**: codemap-json-output-fix-001  
**验收日期**: 待填写  
**验收结果**: 待确定  

---

## 验收流程

### Step 1: 工件完整性检查

验证所有必需的 Triad 工件是否已生成：

| 工件名称 | 文件路径 | 状态 | 检查人 |
|----------|----------|------|--------|
| PROMPT.md | .tasks/codemap-json-output-fix/PROMPT.md | ⏳ 待验收 | TBD |
| EVAL.ts | .tasks/codemap-json-output-fix/EVAL.ts | ⏳ 待验收 | TBD |
| SCORING.md | .tasks/codemap-json-output-fix/SCORING.md | ⏳ 待验收 | TBD |
| task-metadata.yaml | .tasks/codemap-json-output-fix/task-metadata.yaml | ⏳ 待验收 | TBD |
| TRIAD_ROLES.yaml | .tasks/codemap-json-output-fix/TRIAD_ROLES.yaml | ⏳ 待验收 | TBD |
| TRIAD_WORKFLOW.md | .tasks/codemap-json-output-fix/TRIAD_WORKFLOW.md | ⏳ 待验收 | TBD |
| TRIAD_ACCEPTANCE.md | .tasks/codemap-json-output-fix/TRIAD_ACCEPTANCE.md | ⏳ 待验收 | TBD |

### Step 2: PROMPT.md 验收检查清单

| 检查项 | 要求 | 状态 | 备注 |
|--------|------|------|------|
| 背景描述 | 清晰说明 JSON 输出污染问题 | ⏳ | |
| 需求列表 | 明确的修复步骤和要求 | ⏳ | |
| 初始状态 | 指定了目标文件和行号 | ⏳ | |
| 约束条件 | 定义了修改范围和限制 | ⏳ | |
| 验收标准 | 可测试的通过标准 | ⏳ | |
| 用户价值 | 说明修复后的价值 | ⏳ | |
| 反例场景 | 提供了错误做法示例 | ⏳ | |
| Retrieval-led 指令 | 包含 "Prefer retrieval-led reasoning over pre-training-led reasoning" | ⏳ | **必须** |

### Step 3: EVAL.ts 验收检查清单

| Phase | 检查项 | 要求 | 状态 | 备注 |
|-------|--------|------|------|------|
| Phase 1 | 文件检查 | 检查源文件存在 | ⏳ | |
| Phase 1 | Console 定位 | 获取所有 console 调用位置 | ⏳ | |
| Phase 1 | 无残留检查 | 验证无未注释的 console | ⏳ | |
| Phase 2 | 构建检查 | TypeScript 编译通过 | ⏳ | |
| Phase 2 | 输出检查 | dist 文件生成 | ⏳ | |
| Phase 3 | JSON 有效 | 输出可解析为 JSON | ⏳ | |
| Phase 3 | JSON 纯净 | 无日志混杂 | ⏳ | |
| Phase 3 | 功能正常 | 分析结果有效 | ⏳ | |
| Phase 4 | 无 Console | 最终验证无 console | ⏳ | |
| Phase 4 | 一致性 | 多次运行结果一致 | ⏳ | |

### Step 4: SCORING.md 验收检查清单

| 检查项 | 要求 | 状态 | 备注 |
|--------|------|------|------|
| Phase 1 分值 | 文件修改正确性 = 30分 | ⏳ | |
| Phase 2 分值 | 构建与编译 = 20分 | ⏳ | |
| Phase 3 分值 | JSON 输出质量 = 35分 | ⏳ | |
| Phase 4 分值 | 稳定性与一致性 = 15分 | ⏳ | |
| **总分** | **必须等于 100分** | ⏳ | **关键** |
| 评分等级 | A/B/C/D/F 定义明确 | ⏳ | |
| 扣分项 | 违规行为和扣分已文档化 | ⏳ | |

**总分验证**: 30 + 20 + 35 + 15 = **100** ✅ (模板值)

### Step 5: Triad 角色验收检查清单

| 检查项 | 要求 | 状态 | 备注 |
|--------|------|------|------|
| 角色数量 | 恰好 3 个独立角色 | ⏳ | |
| Generator | 职责定义清晰 | ⏳ | |
| QA | 职责定义清晰 | ⏳ | |
| Supervisor | 职责定义清晰 | ⏳ | |
| 无同名复用 | 三个角色名称互不相同 | ⏳ | **关键** |
| 交接定义 | 明确了 handoff 条件和流程 | ⏳ | |

### Step 6: 工作流验收检查清单

| 检查项 | 要求 | 状态 | 备注 |
|--------|------|------|------|
| Phase 1 流程 | Generation 流程清晰 | ⏳ | |
| Phase 2 流程 | QA Review 流程清晰 | ⏳ | |
| Phase 3 流程 | Supervisor Approval 流程清晰 | ⏳ | |
| 状态流转 | 明确了状态转换条件 | ⏳ | |
| 决策路径 | 分支逻辑已定义 | ⏳ | |
| 升级路径 | 异常处理流程已定义 | ⏳ | |

---

## 最终验收决定

### 验收人
- **Generator**: 待填写
- **QA**: 待填写
- **Supervisor**: 待填写

### 验收日期
- **生成完成**: 2025-01-20
- **QA 完成**: 待填写
- **Supervisor 完成**: 待填写

### 验收结果

```yaml
result: pending  # 选项: approved / rejected / needs_revision
score: null     # 0-100

findings:
  - item: 待填写
    severity: low/medium/high
    description: 待填写

recommendations:
  - 待填写

approved_for_execution: false
```

---

## 执行前最终检查

在任务交给 Task-Executor 之前，确认：

- [ ] 所有 7 个工件已生成且有效
- [ ] PROMPT.md 包含 retrieval-led 指令
- [ ] SCORING.md 总分等于 100
- [ ] EVAL.ts 包含所有 4 个 Phase 的测试
- [ ] 三个角色定义独立，无同名复用
- [ ] QA 审查已通过
- [ ] Supervisor 已批准

---

## 附录: 快速验证命令

```bash
# 1. 验证所有文件存在
ls -la /data/codemap/{PROMPT.md,EVAL.ts,SCORING.md,task-metadata.yaml,TRIAD_ROLES.yaml,TRIAD_WORKFLOW.md,TRIAD_ACCEPTANCE.md}

# 2. 验证 retrieval-led 指令
grep -i "retrieval-led" .tasks/codemap-json-output-fix/PROMPT.md

# 3. 验证 SCORING 总分
grep -A 5 "## 总分" .tasks/codemap-json-output-fix/SCORING.md

# 4. 验证 EVAL.ts 结构
grep -n "Phase [1-4]" .tasks/codemap-json-output-fix/EVAL.ts

# 5. 验证角色独立性
grep -A 2 "name:" .tasks/codemap-json-output-fix/TRIAD_ROLES.yaml | grep -v "^--$"
```

---

## 版本历史

| 版本 | 日期 | 修改人 | 修改内容 |
|------|------|--------|----------|
| 1.0.0 | 2025-01-20 | Generator | 初始创建 |
