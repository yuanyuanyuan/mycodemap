# Triad Acceptance Criteria
# 任务ID: group-c-cli-001

## 验收概述

本文档定义CLI命令模块测试任务的最终验收标准。任务完成时，必须满足以下所有验收项。

---

## 验收阶段

### 阶段1: 任务套件验收 (Phase 1-3)

验收对象: Generator生成的任务四件套 + Triad工件

| 验收项 | 验收标准 | 验收方法 |
|--------|----------|----------|
| 文件完整性 | 7个文件全部存在 | `ls -la .kimi/tasks/group-c-cli/` |
| PROMPT.md | 包含所有必需字段 | 人工检查 |
| EVAL.ts | TypeScript语法正确 | `npx tsc --noEmit EVAL.ts` |
| SCORING.md | 总分等于100 | 人工计算验证 |
| 元数据 | YAML格式正确 | `yamllint task-metadata.yaml` |
| 角色定义 | 3个角色定义完整 | 人工检查 |

### 阶段2: 测试生成验收 (Phase 4)

验收对象: Executor生成的8个测试文件

#### 2.1 文件存在性检查

```bash
#!/bin/bash
# 验收脚本: check_files.sh

FILES=(
  "src/cli/commands/__tests__/complexity.test.ts"
  "src/cli/commands/__tests__/cycles.test.ts"
  "src/cli/commands/__tests__/generate.test.ts"
  "src/cli/commands/__tests__/init.test.ts"
  "src/cli/commands/__tests__/query.test.ts"
  "src/cli/commands/__tests__/watch.test.ts"
  "src/cli/commands/__tests__/watch-foreground.test.ts"
  "src/cli/commands/__tests__/workflow.test.ts"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "✓ $file 存在"
  else
    echo "✗ $file 缺失"
    exit 1
  fi
done
```

**验收标准**: 8个文件全部存在

#### 2.2 测试通过性检查

```bash
#!/bin/bash
# 验收脚本: run_tests.sh

npx vitest run src/cli/commands/__tests__/complexity.test.ts
npx vitest run src/cli/commands/__tests__/cycles.test.ts
npx vitest run src/cli/commands/__tests__/generate.test.ts
npx vitest run src/cli/commands/__tests__/init.test.ts
npx vitest run src/cli/commands/__tests__/query.test.ts
npx vitest run src/cli/commands/__tests__/watch.test.ts
npx vitest run src/cli/commands/__tests__/watch-foreground.test.ts
npx vitest run src/cli/commands/__tests__/workflow.test.ts
```

**验收标准**: 所有测试通过，无失败

#### 2.3 覆盖率检查

```bash
#!/bin/bash
# 验收脚本: check_coverage.sh

npx vitest run --coverage src/cli/commands --reporter=json > coverage.json

# 检查覆盖率阈值
node -e "
const coverage = require('./coverage.json');
const files = [
  'src/cli/commands/complexity.ts',
  'src/cli/commands/cycles.ts',
  'src/cli/commands/generate.ts',
  'src/cli/commands/init.ts',
  'src/cli/commands/query.ts',
  'src/cli/commands/watch.ts',
  'src/cli/commands/watch-foreground.ts',
  'src/cli/commands/workflow.ts',
];

let allPassed = true;
for (const file of files) {
  const fileCov = coverage[file];
  if (!fileCov) {
    console.log('✗ ' + file + ' 无覆盖率数据');
    allPassed = false;
    continue;
  }
  
  const checks = [
    { name: '语句', pct: fileCov.statements.pct },
    { name: '分支', pct: fileCov.branches.pct },
    { name: '函数', pct: fileCov.functions.pct },
    { name: '行', pct: fileCov.lines.pct },
  ];
  
  for (const check of checks) {
    if (check.pct < 100) {
      console.log('✗ ' + file + ' ' + check.name + '覆盖率: ' + check.pct + '%');
      allPassed = false;
    }
  }
}

if (allPassed) {
  console.log('✓ 所有文件覆盖率100%');
  process.exit(0);
} else {
  process.exit(1);
}
"
```

**验收标准**: 
- 语句覆盖率: 100%
- 分支覆盖率: 100%
- 函数覆盖率: 100%
- 行覆盖率: 100%

#### 2.4 代码规范检查

```bash
#!/bin/bash
# 验收脚本: check_quality.sh

ERRORS=0

# 检查文件头注释
for file in src/cli/commands/__tests__/*.test.ts; do
  if ! grep -q '\[META\]' "$file"; then
    echo "✗ $file 缺少 [META] 注释"
    ERRORS=$((ERRORS + 1))
  fi
  
  if ! grep -q '\[WHY\]' "$file"; then
    echo "✗ $file 缺少 [WHY] 注释"
    ERRORS=$((ERRORS + 1))
  fi
done

# 检查console mock
for file in src/cli/commands/__tests__/*.test.ts; do
  if ! grep -q 'vi.spyOn(console' "$file"; then
    echo "✗ $file 未mock console"
    ERRORS=$((ERRORS + 1))
  fi
done

# 检查process.exit mock
for file in src/cli/commands/__tests__/*.test.ts; do
  if ! grep -q 'vi.spyOn(process' "$file"; then
    echo "✗ $file 未mock process"
    ERRORS=$((ERRORS + 1))
  fi
done

# 检查vi.mock
for file in src/cli/commands/__tests__/*.test.ts; do
  if ! grep -q 'vi.mock' "$file"; then
    echo "✗ $file 未使用vi.mock"
    ERRORS=$((ERRORS + 1))
  fi
done

# 检查beforeEach/afterEach
for file in src/cli/commands/__tests__/*.test.ts; do
  if ! grep -q 'beforeEach' "$file"; then
    echo "✗ $file 缺少beforeEach"
    ERRORS=$((ERRORS + 1))
  fi
  
  if ! grep -q 'afterEach' "$file"; then
    echo "✗ $file 缺少afterEach"
    ERRORS=$((ERRORS + 1))
  fi
done

if [ $ERRORS -eq 0 ]; then
  echo "✓ 代码规范检查通过"
  exit 0
else
  echo "✗ 发现 $ERRORS 个问题"
  exit 1
fi
```

**验收标准**: 无规范问题

#### 2.5 类型检查

```bash
npx tsc --noEmit
```

**验收标准**: 无类型错误

---

## 验收清单

### 任务套件验收

- [ ] PROMPT.md 存在且完整
- [ ] EVAL.ts 存在且语法正确
- [ ] SCORING.md 存在且总分100
- [ ] task-metadata.yaml 格式正确
- [ ] TRIAD_ROLES.yaml 角色定义完整
- [ ] TRIAD_WORKFLOW.md 流程清晰
- [ ] TRIAD_ACCEPTANCE.md 标准明确

### 测试文件验收

- [ ] complexity.test.ts 创建
- [ ] cycles.test.ts 创建
- [ ] generate.test.ts 创建
- [ ] init.test.ts 创建
- [ ] query.test.ts 创建
- [ ] watch.test.ts 创建
- [ ] watch-foreground.test.ts 创建
- [ ] workflow.test.ts 创建

### 功能验收

- [ ] complexity.test.ts 测试通过
- [ ] cycles.test.ts 测试通过
- [ ] generate.test.ts 测试通过
- [ ] init.test.ts 测试通过
- [ ] query.test.ts 测试通过
- [ ] watch.test.ts 测试通过
- [ ] watch-foreground.test.ts 测试通过
- [ ] workflow.test.ts 测试通过

### 覆盖率验收

- [ ] complexity.ts 覆盖率100%
- [ ] cycles.ts 覆盖率100%
- [ ] generate.ts 覆盖率100%
- [ ] init.ts 覆盖率100%
- [ ] query.ts 覆盖率100%
- [ ] watch.ts 覆盖率100%
- [ ] watch-foreground.ts 覆盖率100%
- [ ] workflow.ts 覆盖率100%

### 规范验收

- [ ] 所有测试文件包含[META]
- [ ] 所有测试文件包含[WHY]
- [ ] 所有测试文件mock console
- [ ] 所有测试文件mock process.exit
- [ ] 所有测试文件使用vi.mock
- [ ] 所有测试文件使用beforeEach
- [ ] 所有测试文件使用afterEach
- [ ] 类型检查通过

---

## 评分标准

根据SCORING.md计算最终得分：

| 维度 | 分值 | 最低要求 |
|------|------|----------|
| 文件结构 | 20分 | 全部文件创建 |
| 覆盖率 | 25分 | 100% |
| 模拟策略 | 15分 | 正确mock |
| 功能测试 | 30分 | 核心功能覆盖 |
| 代码规范 | 10分 | 无规范问题 |
| **总分** | **100分** | **70分通过** |

---

## 验收流程

1. **执行验收脚本**
   ```bash
   cd /data/codemap
   ./.kimi/tasks/group-c-cli/check_files.sh
   ./.kimi/tasks/group-c-cli/run_tests.sh
   ./.kimi/tasks/group-c-cli/check_coverage.sh
   ./.kimi/tasks/group-c-cli/check_quality.sh
   ```

2. **人工抽查**
   - 抽查2-3个测试文件
   - 验证测试逻辑合理性
   - 确认边界条件覆盖

3. **生成验收报告**
   ```markdown
   # 验收报告
   
   ## 基本信息
   - 任务ID: group-c-cli-001
   - 验收日期: [日期]
   - 验收人: [姓名]
   
   ## 验收结果
   - 状态: [通过/不通过]
   - 得分: [分数]/100
   
   ## 详细结果
   - 文件存在性: [通过/不通过]
   - 测试通过性: [通过/不通过]
   - 覆盖率: [百分比]% [通过/不通过]
   - 代码规范: [通过/不通过]
   
   ## 问题记录
   [如有问题，记录详情]
   
   ## 结论
   [验收结论]
   ```

4. **审批决策**
   - 通过: 任务完成，关闭任务
   - 不通过: 记录问题，退回修改

---

## 附录

### 验收命令速查

```bash
# 快速验收
cd /data/codemap

# 1. 文件检查
ls src/cli/commands/__tests__/*.test.ts | wc -l  # 应输出12

# 2. 运行测试
npx vitest run src/cli/commands/__tests__

# 3. 覆盖率检查
npx vitest run --coverage src/cli/commands

# 4. 类型检查
npx tsc --noEmit

# 5. 查看覆盖率报告
cat coverage/coverage-summary.json | jq '.total'
```

### 常见验收失败原因

1. **文件缺失**: 8个测试文件未全部创建
2. **测试失败**: 存在未通过的测试用例
3. **覆盖率不足**: 未达100%覆盖率
4. **规范问题**: 缺少文件头或mock
5. **类型错误**: TypeScript类型检查失败
