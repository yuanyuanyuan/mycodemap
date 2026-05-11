# 会话复盘模板

> 时间：{{TIMESTAMP}}  
> 任务：{{TASK_DESCRIPTION}}  
> 状态：{{STATUS}}

---

## 一、问题总览

### 用户原始需求
{{USER_REQUEST}}

### AI 执行结果
{{ACTUAL_RESULT}}

### 偏差描述
{{GAP_DESCRIPTION}}

---

## 二、AI 的困惑与误解

### 1. {{CONFUSION_TITLE_1}}

**现象：**
{{WHAT_HAPPENED}}

**AI 当时的思考：**
{{AI_THOUGHT_PROCESS}}

**实际情况：**
{{REALITY}}

**为什么会产生这个误解：**
{{ROOT_CAUSE}}

### 2. {{CONFUSION_TITLE_2}}
（同上格式，如有多个则继续列出）

---

## 三、效率损失分析

| 阶段 | 预期时间 | 实际时间 | 损失原因 |
|------|----------|----------|----------|
| {{PHASE_1}} | {{EXPECTED}} | {{ACTUAL}} | {{REASON}} |
| {{PHASE_2}} | {{EXPECTED}} | {{ACTUAL}} | {{REASON}} |

---

## 四、根因分析

### 技术层面
- {{TECHNICAL_ROOT_CAUSE}}

### 流程层面
- {{PROCESS_ROOT_CAUSE}}

### 认知层面
- {{COGNITIVE_ROOT_CAUSE}}

---

## 五、正确做法（如果重来）

1. {{CORRECT_STEP_1}}
2. {{CORRECT_STEP_2}}
3. {{CORRECT_STEP_3}}

---

## 六、验证结果

- 主线目标是否完成：{{YES/NO}}
- 是否使用了 `--no-verify` 等绕过手段：{{YES/NO}}
- 所有 pre-commit 检查是否通过：{{YES/NO}}
- commit message 格式是否符合规范：{{YES/NO}}

---

## 七、代码层面的具体错误

### 错误代码
```
{{BAD_CODE}}
```

### 正确代码
```
{{GOOD_CODE}}
```

---

## 八、待改进项

- [ ] {{IMPROVEMENT_1}}
- [ ] {{IMPROVEMENT_2}}

---

*本复盘由 AI 助手在任务完成后自动生成。*
