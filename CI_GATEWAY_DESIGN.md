# CI 门禁护栏详细设计

> 版本: 1.0
> 所属模块: CI/CD - Git 工作流门禁
> 日期: 2026-02-28

---

## 1. 设计目标

建立双层次 CI 门禁护栏，确保代码质量：

1. **本地门禁** (pre-commit hook)：快速反馈，提交前检查
2. **服务端门禁** (GitHub Actions)：最终把关，PR 合并前检查

**极简原则**：
- 总代码量 < 150 行
- 纯文本输出，无 emoji、无颜色（AI 可解析）
- 强制标签化 Commit，回答苏格拉底问题

---

## 2. 门禁检查项

### 2.1 检查项清单

| 层级 | 检查项 | 失败处理 | 实现方式 |
|------|--------|----------|----------|
| **本地** | 测试通过 | ❌ 阻止提交 | `npm test` |
| **本地** | Commit 格式 | ❌ 阻止提交 | commit-msg hook |
| **本地** | 文件头注释 | ❌ 阻止提交 | pre-commit hook |
| **本地** | 生成 AI 饲料 | ⚠️ 警告 | `codemap generate` |
| **服务端** | 测试通过 | ❌ 阻止合并 | `npm test` |
| **服务端** | Commit 格式 | ❌ 阻止合并 | `codemap ci check-commits` |
| **服务端** | 文件头注释 | ❌ 阻止合并 | `codemap ci check-headers` |
| **服务端** | AI 饲料同步 | ❌ 阻止合并 | `git diff --exit-code` |
| **服务端** | 危险置信度 | ❌ 阻止合并 | `codemap ci assess-risk` |
| **服务端** | 输出契约校验 | ❌ 阻止合并 | `codemap ci check-output-contract` |

---

## 3. 本地门禁实现

### 3.1 commit-msg Hook

**文件**: `.git/hooks/commit-msg`

```bash
#!/bin/bash
# commit-msg hook - 验证 Commit 格式
# 总代码量: ~30 行

MSG_FILE=$1
MSG=$(head -1 "$MSG_FILE")

# 极简正则: 必须以大写标签开头
if ! echo "$MSG" | grep -qE "^\[(BUGFIX|FEATURE|REFACTOR|CONFIG|DOCS|DELETE)\]"; then
    echo "ERROR: 提交信息必须以大写标签开头"
    echo ""
    echo "格式: [TAG] scope: message"
    echo ""
    echo "允许的 TAG:"
    echo "  [BUGFIX]   - 修复问题"
    echo "  [FEATURE]  - 新功能"
    echo "  [REFACTOR] - 重构"
    echo "  [CONFIG]   - 配置变更"
    echo "  [DOCS]     - 文档"
    echo "  [DELETE]   - 删除代码"
    echo ""
    echo "示例:"
    echo "  [BUGFIX] git-analyzer: fix risk score calculation"
    echo "  [FEATURE] orchestrator: add confidence scoring"
    exit 1
fi

# 检查 scope 是否存在
if ! echo "$MSG" | grep -qE "^\[(BUGFIX|FEATURE|REFACTOR|CONFIG|DOCS|DELETE)\]\s+[^:]+:"; then
    echo "ERROR: scope 不能为空"
    echo "格式: [TAG] scope: message"
    echo "示例: [FEATURE] git-analyzer: add new feature"
    exit 1
fi

echo "✓ Commit 格式验证通过"
exit 0
```

### 3.2 pre-commit Hook

**文件**: `.git/hooks/pre-commit`

```bash
#!/bin/bash
# pre-commit hook - 运行测试和文件头检查
# 总代码量: ~40 行

echo "Running pre-commit checks..."

# 1. 运行测试
echo "→ Running tests..."
npm test
if [ $? -ne 0 ]; then
    echo "ERROR: 测试未通过，提交被拒绝"
    exit 1
fi
echo "✓ Tests passed"

# 2. 检查文件头注释（只检查修改的 TS 文件）
echo "→ Checking file headers..."

STAGED_TS_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep '\.ts$' | grep -v '\.test\.ts$' | grep -v '\.d\.ts$')

if [ -z "$STAGED_TS_FILES" ]; then
    echo "✓ No TS files to check"
    exit 0
fi

MISSING_HEADERS=0
for file in $STAGED_TS_FILES; do
    if [ -f "$file" ]; then
        # 检查前10行是否包含 [META] 和 [WHY]
        HEAD=$(head -10 "$file")
        
        if ! echo "$HEAD" | grep -q "\[META\]"; then
            echo "ERROR: $file 缺少 [META] 注释"
            MISSING_HEADERS=$((MISSING_HEADERS + 1))
        fi
        
        if ! echo "$HEAD" | grep -q "\[WHY\]"; then
            echo "ERROR: $file 缺少 [WHY] 注释"
            MISSING_HEADERS=$((MISSING_HEADERS + 1))
        fi
    fi
done

if [ $MISSING_HEADERS -gt 0 ]; then
    echo ""
    echo "请在文件顶部添加以下注释:"
    echo "// [META] since:YYYY-MM | owner:team | stable:false"
    echo "// [WHY] 回答为什么存在这个文件"
    echo ""
    exit 1
fi

echo "✓ File headers valid"

# 3. 生成 AI 饲料（可选，异步执行）
echo "→ Generating AI feed..."
npx codemap generate --quiet &

echo "✓ All pre-commit checks passed"
exit 0
```

### 3.3 Husky 集成（推荐）

**安装**: `npm install husky --save-dev`

**package.json**:
```json
{
  "scripts": {
    "prepare": "husky install",
    "test": "vitest run"
  },
  "devDependencies": {
    "husky": "^8.0.0"
  }
}
```

**初始化**:
```bash
npx husky install
npx husky add .husky/commit-msg 'node scripts/verify-commit.js "$1"'
npx husky add .husky/pre-commit 'npm test && node scripts/check-headers.js'
```

---

## 4. 服务端门禁实现

### 4.1 GitHub Actions Workflow

**文件**: `.github/workflows/ci-gateway.yml`

```yaml
name: CI Gateway

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  ci-gateway:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout
      uses: actions/checkout@v4
      with:
        fetch-depth: 0  # 需要完整历史检查 commit
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    # 1. 运行测试
    - name: Run tests
      run: npm test
    
    # 2. 检查 Commit 格式
    - name: Check commit format
      run: npx codemap ci check-commits
    
    # 3. 检查文件头注释
    - name: Check file headers
      run: npx codemap ci check-headers
    
    # 4. 生成 AI 饲料并检查同步
    - name: Generate AI feed
      run: |
        npx codemap generate
        git diff --exit-code .codemap/ai-feed.txt || (echo "AI feed is out of sync. Run 'codemap generate' and commit the changes." && exit 1)
    
    # 5. 评估危险置信度
    - name: Assess risk
      run: npx codemap ci assess-risk --threshold=0.7
```

### 4.2 CI 子命令实现

**文件**: `src/cli/commands/ci.ts`

```typescript
// src/cli/commands/ci.ts
// 极简实现: ~80 行

import { Command } from 'commander';
import { execSync } from 'child_process';
import { GitAnalyzer } from '../../orchestrator/git-analyzer.js';
import { FileHeaderScanner } from '../../orchestrator/file-header-scanner.js';
import { AIFeedGenerator } from '../../orchestrator/ai-feed-generator.js';
import { globby } from 'globby';

const ci = new Command('ci').description('CI gateway commands');

// 检查 Commit 格式
ci.command('check-commits')
  .description('Validate commit message format')
  .action(() => {
    const analyzer = new GitAnalyzer();
    const commits = execSync('git log --format=%s origin/main..HEAD', { encoding: 'utf-8' })
      .split('\n')
      .filter(Boolean);
    
    let errors = 0;
    for (const msg of commits) {
      const tag = analyzer.parseCommitTag(msg);
      if (!tag) {
        console.error(`ERROR: Invalid commit format: "${msg}"`);
        errors++;
      }
    }
    
    if (errors > 0) {
      console.error(`\n${errors} commits failed validation`);
      process.exit(1);
    }
    
    console.log(`✓ ${commits.length} commits validated`);
  });

// 检查文件头注释
ci.command('check-headers')
  .description('Validate file header comments')
  .action(async () => {
    const scanner = new FileHeaderScanner();
    const files = await globby(['src/**/*.ts', '!src/**/*.test.ts']);
    
    let errors = 0;
    for (const file of files) {
      const result = scanner.validate(file);
      if (!result.valid) {
        console.error(`ERROR: ${file} missing: ${result.missing.join(', ')}`);
        errors++;
      }
    }
    
    if (errors > 0) {
      console.error(`\n${errors} files missing required headers`);
      process.exit(1);
    }
    
    console.log(`✓ ${files.length} files validated`);
  });

// 评估危险置信度
ci.command('assess-risk')
  .description('Assess risk level of changes')
  .option('-t, --threshold <n>', 'Risk threshold (0-1)', '0.7')
  .action(async (options) => {
    const generator = new AIFeedGenerator();
    const feed = await generator.generate(process.cwd());
    
    // 获取修改的文件
    const changedFiles = execSync('git diff --name-only origin/main...HEAD', { encoding: 'utf-8' })
      .split('\n')
      .filter(f => f.endsWith('.ts') && !f.endsWith('.test.ts'));
    
    // 计算风险分数
    const changedFeed = feed.filter(f => changedFiles.includes(f.file));
    const highRiskFiles = changedFeed.filter(f => {
      const score = 
        (f.gravity / 20) * 0.3 +
        (Math.min(f.heat.freq30d, 10) / 10) * 0.25 +
        (f.dependents.length / 50) * 0.1 +
        (f.meta.stable ? 0 : 0.15);
      return score > parseFloat(options.threshold);
    });
    
    if (highRiskFiles.length > 0) {
      console.log('ERROR: High risk files detected:');
      for (const f of highRiskFiles) {
        console.log(`  - ${f.file} (HEAT: ${f.heat.freq30d}/${f.heat.lastType})`);
      }
      console.log('\nRisk mitigation notes required. Add explanation to commit body.');
      // 高风险必须阻断
      process.exit(1);
    } else {
      console.log('✓ Risk assessment passed');
    }
  });

// 输出契约校验 (P1-1 新增)
ci.command('check-output-contract')
  .description('Validate output contract (schemaVersion, Top-K, token limit)')
  .option('-s, --schema-version <version>', 'Expected schema version', 'v1.0.0')
  .option('-k, --top-k <number>', 'Expected Top-K limit', '8')
  .option('-t, --max-tokens <number>', 'Max tokens per result', '160')
  .action(async (options) => {
    const schemaVersion = options.schemaVersion || 'v1.0.0';
    const topK = parseInt(options.topK) || 8;
    const maxTokens = parseInt(options.maxTokens) || 160;

    // 运行 analyze 命令获取输出
    const { execSync } = require('child_process');
    let output;
    try {
      output = execSync('npx codemap analyze --intent search --keywords test --json', {
        encoding: 'utf-8',
        timeout: 30000
      });
    } catch (error) {
      // 如果命令失败，尝试其他方式获取输出
      console.error('ERROR: Failed to run analyze command');
      process.exit(1);
    }

    let parsed;
    try {
      parsed = JSON.parse(output);
    } catch {
      console.error('ERROR: Invalid JSON output');
      process.exit(1);
    }

    let errors = 0;

    // 1. 校验 schemaVersion
    if (!parsed.schemaVersion) {
      console.error('ERROR: Missing schemaVersion in output');
      errors++;
    } else if (parsed.schemaVersion !== schemaVersion) {
      console.error(`ERROR: schemaVersion mismatch: expected ${schemaVersion}, got ${parsed.schemaVersion}`);
      errors++;
    }

    // 2. 校验 Top-K
    const resultCount = parsed.results?.length || 0;
    if (resultCount > topK) {
      console.error(`ERROR: Result count ${resultCount} exceeds Top-K limit ${topK}`);
      errors++;
    }

    // 3. 校验 token 限制 (简单估算)
    if (parsed.results) {
      for (const result of parsed.results) {
        const tokenEstimate = result.content?.split(/[\s\u4e00-\u9fa5]/).filter(Boolean).length || 0;
        if (tokenEstimate > maxTokens) {
          console.error(`ERROR: Result token count ${tokenEstimate} exceeds limit ${maxTokens}`);
          errors++;
          break; // 只报告一次
        }
      }
    }

    if (errors > 0) {
      console.error(`\n${errors} output contract violations detected`);
      process.exit(1);
    }

    console.log(`✓ Output contract validated (schema: ${schemaVersion}, topK: ≤${topK}, tokens: ≤${maxTokens})`);
  });

export default ci;
```

---

## 5. 文件头注释模板

### 5.1 自动添加脚本

**文件**: `scripts/add-headers.js`

```javascript
#!/usr/bin/env node
// 自动添加文件头注释模板

import fs from 'fs';
import { globby } from 'globby';

const TEMPLATE = `// [META] since:2024-03 | owner:backend-team | stable:false
// [WHY] TODO: 回答为什么存在这个文件

`;

async function main() {
  const files = await globby(['src/**/*.ts', '!src/**/*.test.ts']);
  
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    
    if (!content.includes('[META]')) {
      const newContent = TEMPLATE + content;
      fs.writeFileSync(file, newContent);
      console.log(`Updated: ${file}`);
    }
  }
  
  console.log(`\nProcessed ${files.length} files`);
  console.log('Please edit [WHY] comments to explain file purpose');
}

main();
```

**使用**:
```bash
node scripts/add-headers.js
```

---

## 6. 迁移指南

### 6.1 现有项目迁移步骤

1. **安装依赖**:
   ```bash
   npm install husky --save-dev
   npm install
   ```

2. **初始化 hooks**:
   ```bash
   npx husky install
   npx husky add .husky/commit-msg 'node scripts/verify-commit.js "$1"'
   npx husky add .husky/pre-commit 'npm test && node scripts/check-headers.js'
   ```

3. **批量添加文件头**:
   ```bash
   node scripts/add-headers.js
   # 然后手动编辑 [WHY] 注释
   ```

4. **更新现有 Commit**（可选）:
   ```bash
   # 修改最后一次 commit
   git commit --amend -m "[REFACTOR] project: add CI gateway and file headers"
   ```

### 6.2 Commit 格式转换示例

| 旧格式 | 新格式 |
|--------|--------|
| `fix: bug in parser` | `[BUGFIX] parser: fix token handling bug` |
| `add new feature` | `[FEATURE] cli: add analyze command` |
| `update docs` | `[DOCS] readme: update installation guide` |
| `refactor cache` | `[REFACTOR] cache: simplify LRU implementation` |

---

## 7. 失败场景处理

### 7.1 本地提交失败

```bash
$ git commit -m "fix bug"
ERROR: 提交信息必须以大写标签开头

格式: [TAG] scope: message

允许的 TAG:
  [BUGFIX]   - 修复问题
  [FEATURE]  - 新功能
  [REFACTOR] - 重构
  [CONFIG]   - 配置变更
  [DOCS]     - 文档
  [DELETE]   - 删除代码

示例:
  [BUGFIX] git-analyzer: fix risk score calculation
```

### 7.2 服务端 PR 失败

GitHub Actions 会显示：
- ❌ Tests failed
- ❌ Invalid commit format
- ❌ Missing file headers
- ⚠️ High risk files detected

---

## 8. 模块依赖

```
CI Gateway
    │
    ├── Git Hooks
    │   ├── commit-msg (验证格式)
    │   └── pre-commit (测试+文件头)
    │
    ├── GitHub Actions
    │   └── .github/workflows/ci-gateway.yml
    │
    ├── CLI Commands (src/cli/commands/ci.ts)
    │   ├── check-commits
    │   ├── check-headers
    │   ├── assess-risk
    │   └── check-output-contract (P1-1 新增)
    │
    └── Dependencies
        ├── GitAnalyzer (解析 commit tag)
        ├── FileHeaderScanner (验证注释)
        └── AIFeedGenerator (评估风险)
```

---

## 11. 工作流集成 (v2.5 规划)

### 11.1 工作流阶段的 CI 验证

在编排层工作流中，CI 门禁作为最后一个阶段自动执行：

```typescript
// 工作流阶段的 CI 集成

const PHASE_CI_CONFIG: Record<WorkflowPhase, CIConfig> = {
  reference: {
    preChecks: [],
    postChecks: [],
    required: false
  },
  impact: {
    preChecks: [],
    postChecks: [],
    required: false
  },
  risk: {
    preChecks: ['assess-risk'],
    postChecks: [],
    required: true
  },
  implementation: {
    preChecks: ['check-headers'],
    postChecks: [],
    required: true
  },
  commit: {
    preChecks: ['check-commits', 'check-headers'],
    postChecks: [],
    required: true
  },
  ci: {
    preChecks: ['check-commits', 'check-headers', 'assess-risk', 'check-output-contract'],
    postChecks: ['npm test'],
    required: true
  }
};
```

### 11.2 工作流 CI 执行器

```typescript
class WorkflowCIExecutor {
  private ciCommands: Map<string, () => Promise<CICheckResult>>;

  /**
   * 在指定阶段执行 CI 检查
   */
  async executePhaseChecks(phase: WorkflowPhase): Promise<CIExecutionResult> {
    const config = PHASE_CI_CONFIG[phase];
    const results: CICheckResult[] = [];

    // 执行预检查
    for (const check of config.preChecks) {
      const executor = this.ciCommands.get(check);
      if (executor) {
        const result = await executor();
        results.push(result);

        if (!result.passed && config.required) {
          return {
            phase,
            passed: false,
            results,
            failedCheck: check
          };
        }
      }
    }

    return {
      phase,
      passed: results.every(r => r.passed),
      results
    };
  }
}
```

---

## 9. 检查项汇总

| 检查项 | 本地 | 服务端 | 工具 |
|--------|------|--------|------|
| 测试通过 | ✅ | ✅ | `npm test` |
| Commit 格式 `[TAG]` | ✅ | ✅ | `commit-msg hook` / `codemap ci check-commits` |
| 文件头 `[META]` | ✅ | ✅ | `pre-commit hook` / `codemap ci check-headers` |
| 文件头 `[WHY]` | ✅ | ✅ | `pre-commit hook` / `codemap ci check-headers` |
| AI 饲料生成 | ⚠️ | ✅ | `codemap generate` |
| 危险置信度评估 | ❌ | ✅ (P0-2) | `codemap ci assess-risk` |
| 输出契约校验 | ❌ | ✅ (P1-1) | `codemap ci check-output-contract` |

---

## 10. 极简实现统计

| 组件 | 代码量 | 文件 |
|------|--------|------|
| commit-msg hook | ~30 行 | `.git/hooks/commit-msg` |
| pre-commit hook | ~40 行 | `.git/hooks/pre-commit` |
| CI 子命令 | ~80 行 | `src/cli/commands/ci.ts` |
| **总计** | **~150 行** | **符合极简原则** |
