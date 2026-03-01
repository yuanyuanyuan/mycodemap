# Group B - 适配器模块测试任务：验收标准

## 验收概览

本文件定义 Group B - 适配器模块测试任务的完整验收标准，供 QA 和 Supervisor 使用。

---

## 一、关键失败项验收 (Critical Failures)

### CF-1: 测试必须导入实际源代码

**验收标准**:
- [ ] PROMPT.md 明确禁止自建模拟类
- [ ] PROMPT.md 提供正确导入示例代码
- [ ] EVAL.ts 检查 L2-1, L2-2 验证正确导入
- [ ] 反例场景明确标识自建模拟类为禁止做法

**验证方法**:
```bash
# 检查 PROMPT.md
grep -A5 "CF-1" PROMPT.md
grep "from '../ast-grep-adapter" PROMPT.md

# 运行 EVAL.ts 检查 L2-1, L2-2
npx tsx EVAL.ts | grep "L2-1\|L2-2"
```

---

### CF-2: 必须创建 index.test.ts

**验收标准**:
- [ ] PROMPT.md 明确要求创建 index.test.ts
- [ ] PROMPT.md 列出必须测试的导出项
- [ ] EVAL.ts 检查 L1-3, L2-5 验证 index.test.ts 存在和内容
- [ ] task-metadata.yaml 包含 index.test.ts 作为期望输出

**必须测试的导出项**:
- AstGrepAdapter 类
- CodemapAdapter 类
- createAstGrepAdapter 工厂函数
- createCodemapAdapter 工厂函数

**验证方法**:
```bash
# 检查 PROMPT.md
grep "index.test.ts" PROMPT.md
grep "createAstGrepAdapter" PROMPT.md

# 运行 EVAL.ts 检查 L1-3, L2-5
npx tsx EVAL.ts | grep "L1-3\|L2-5"
```

---

### CF-3: Mock 策略必须正确

**验收标准**:
- [ ] PROMPT.md 要求使用 `vi.mock('node:child_process')`
- [ ] PROMPT.md 要求使用 `vi.mock('globby')` 而非 `'glob'`
- [ ] PROMPT.md 提供正确的 spawn mock 示例
- [ ] EVAL.ts 检查 L2-3, L2-4 验证 Mock 策略

**正确的 Mock 示例**:
```typescript
// ✅ 正确
vi.mock('node:child_process', () => ({
  spawn: vi.fn()
}));

vi.mock('globby', () => ({
  globby: vi.fn()
}));

// ❌ 错误（禁止）
vi.mock('child_process', ...);  // 缺少 node: 前缀
vi.mock('glob', ...);            // 使用 glob 而非 globby
```

**验证方法**:
```bash
# 检查 PROMPT.md
grep "node:child_process" PROMPT.md
grep "vi.mock('globby')" PROMPT.md

# 运行 EVAL.ts 检查 L2-3, L2-4
npx tsx EVAL.ts | grep "L2-3\|L2-4"
```

---

### CF-4: 行为语义必须匹配源代码

**验收标准**:
- [ ] PROMPT.md 列出具体的行为要求
- [ ] PROMPT.md 包含反例场景
- [ ] EVAL.ts 检查 L3-1 ~ L3-4 验证行为测试

**必须测试的行为**:

| 适配器 | 方法 | 行为 |
|--------|------|------|
| AstGrepAdapter | name | 返回 `'ast-grep'` |
| AstGrepAdapter | weight | 返回 `0.8` |
| AstGrepAdapter | isAvailable() | 调用 `sg --version` |
| AstGrepAdapter | execute() | 空数组返回 `[]` |
| AstGrepAdapter | execute() | 应用 topK 限制 |
| AstGrepAdapter | execute() | 错误返回 `[]` 而非抛出 |
| CodemapAdapter | name | 返回 `'codemap'` |
| CodemapAdapter | weight | 返回 `0.6` |
| CodemapAdapter | execute() | 使用 globby 搜索 |
| CodemapAdapter | execute() | 错误返回 `[]` |

**验证方法**:
```bash
# 检查 PROMPT.md 的行为要求
grep -A20 "必须测试的行为" PROMPT.md

# 运行 EVAL.ts 检查 L3-1 ~ L3-4
npx tsx EVAL.ts | grep "L3-"
```

---

## 二、任务四件套验收

### PROMPT.md 验收

| 检查项 | 标准 | 验证 |
|--------|------|------|
| 背景 | 清晰描述任务目的 | 手动阅读 |
| 目标文件 | 列出所有 4 个目标文件 | grep "src/orchestrator/adapters" |
| CF-1~CF-4 | 每个 CF 都有明确章节 | grep "CF-" PROMPT.md |
| 导入示例 | 提供正确/错误示例 | grep "✅\|❌" PROMPT.md |
| 反例场景 | 包含 4 个反例场景 | grep "场景 [1-4]" PROMPT.md |
| retrieval-led | 包含指令 | grep "retrieval-led" PROMPT.md |

### EVAL.ts 验收

| 检查项 | 标准 | 验证 |
|--------|------|------|
| 可执行 | npx tsx EVAL.ts 成功 | 运行命令 |
| 检查点 | 所有 L1-L4 检查点存在 | grep "L[1-4]-" EVAL.ts |
| 分数计算 | 正确计算总分 | 查看输出 |
| 颜色输出 | 有通过/失败颜色 | 运行查看 |

### SCORING.md 验收

| 检查项 | 标准 | 验证 |
|--------|------|------|
| 总分 | 等于 100 | grep "总分:" SCORING.md |
| 评分等级 | 4 个等级定义 | grep "优秀\|通过\|条件通过\|失败" |
| CF 惩罚 | 明确惩罚机制 | grep "penalty\|违规" SCORING.md |
| 检查点映射 | 每个检查点有分数 | grep "| L" SCORING.md |

### task-metadata.yaml 验收

| 检查项 | 标准 | 验证 |
|--------|------|------|
| task_id | 唯一标识 | grep "task_id:" |
| target_files | 列出 4 个目标文件 | grep "src/orchestrator" |
| expected_outputs | 列出 3 个测试文件 | grep "test.ts" |
| critical_failures | CF-1~CF-4 定义 | grep "cf-[1-4]:" |
| triad | 三角色配置 | grep "generator\|qa\|supervisor" |

---

## 三、Triad 工件验收

### TRIAD_ROLES.yaml 验收

| 检查项 | 标准 | 验证 |
|--------|------|------|
| 3 个角色 | generator, qa, supervisor | grep "name:" |
| 角色职责 | 每个角色有明确职责 | grep "responsibilities:" |
| 输入输出 | 每个角色定义输入输出 | grep "inputs:\|outputs:" |
| 交接关系 | 定义清晰的 handoff_to | grep "handoff_to:" |

### TRIAD_WORKFLOW.md 验收

| 检查项 | 标准 | 验证 |
|--------|------|------|
| 3 个 Phase | Generator, QA, Supervisor | grep "## Phase" |
| 状态图 | 状态转换图 | grep "状态转换\|CREATED" |
| 时间线 | 估计时间 | grep "预计时间" |
| 质量门禁 | 每个阶段有门禁 | grep "### .*门禁" |

### TRIAD_ACCEPTANCE.md 验收

| 检查项 | 标准 | 验证 |
|--------|------|------|
| CF 验收 | 4 个 CF 验收标准 | grep "### CF-" |
| 验证方法 | 每个 CF 有验证命令 | grep "验证方法" |
| 四件套验收 | PROMPT.md 等验收 | grep "### .*验收" |

---

## 四、综合验收

### 文件完整性检查

```bash
#!/bin/bash
cd /data/codemap/.tasks/group-b-adapters-v2

files=(
  "PROMPT.md"
  "EVAL.ts"
  "SCORING.md"
  "task-metadata.yaml"
  "TRIAD_ROLES.yaml"
  "TRIAD_WORKFLOW.md"
  "TRIAD_ACCEPTANCE.md"
)

all_exist=true
for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "✓ $file"
  else
    echo "✗ $file (缺失)"
    all_exist=false
  fi
done

$all_exist && echo "所有文件存在" || echo "有文件缺失"
```

### EVAL.ts 可执行性检查

```bash
cd /data/codemap/.tasks/group-b-adapters-v2
npx tsx EVAL.ts
# 应输出评分结果，不报错
```

### 关键内容检查

```bash
cd /data/codemap/.tasks/group-b-adapters-v2

# 检查 CF-1~CF-4 是否都被提到
echo "=== CF 检查 ==="
for cf in CF-1 CF-2 CF-3 CF-4; do
  count=$(grep -c "$cf" PROMPT.md EVAL.ts SCORING.md task-metadata.yaml 2>/dev/null | awk -F: '{sum+=$2} END {print sum}')
  echo "$cf: 出现 $count 次"
done

# 检查总分
echo ""
echo "=== 总分检查 ==="
grep "总分:" SCORING.md
```

---

## 五、验收决策

### 批准条件
- [ ] 所有 10 个文件存在且完整
- [ ] CF-1~CF-4 在文档中被明确标识
- [ ] EVAL.ts 可执行且不报错
- [ ] SCORING.md 总分 = 100
- [ ] 包含 "Prefer retrieval-led reasoning" 指令

### 有条件批准
- [ ] 核心要求满足（CF-1~CF-4 明确）
- [ ] 轻微文档问题（如格式、错别字）

### 拒绝条件
- [ ] 任何 CF 未被正确标识
- [ ] EVAL.ts 无法执行
- [ ] 总分不等于 100
- [ ] 关键遗漏（如缺少 index.test.ts 要求）

---

## 验收签字

| 角色 | 姓名 | 日期 | 结果 |
|------|------|------|------|
| QA | | | ☐ 通过 ☐ 有条件通过 ☐ 不通过 |
| Supervisor | | | ☐ 批准 ☐ 有条件批准 ☐ 拒绝 |
