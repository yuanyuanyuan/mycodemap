# CI 门禁护栏详细设计

> 版本: 1.3
> 所属模块: CI/CD - Git 工作流门禁
> 日期: 2026-03-04

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
| **本地** | Commit 文件数量 | ❌ 阻止提交 | commit-msg hook / pre-commit hook |
| **本地** | 生成代码地图 | ⚠️ 警告 | `codemap generate` |
| **服务端** | 测试通过 | ❌ 阻止合并 | `npm test` |
| **服务端** | Commit 格式 | ❌ 阻止合并 | `codemap ci check-commits` |
| **服务端** | Commit 文件数量 | ❌ 阻止合并 | `codemap ci check-commit-size` |
| **服务端** | 文件头注释 | ❌ 阻止合并 | `codemap ci check-headers` |
| **服务端** | 代码地图同步 | ❌ 阻止合并 | `git diff --exit-code` |
| **服务端** | 危险置信度 | ❌ 阻止合并 | `codemap ci assess-risk` |
| **服务端** | 输出契约校验 | ❌ 阻止合并 | `codemap ci check-output-contract` |

---

## 3. 本地门禁实现

### 3.1 commit-msg Hook

**文件**: `.git/hooks/commit-msg`

```bash
#!/bin/sh
# Commit-msg hook: 验证 Commit 消息格式和文件数量

MSG_FILE=$1
MSG=$(head -1 "$MSG_FILE")

VALID_TAGS="BUGFIX FEATURE REFACTOR CONFIG DOCS DELETE"

# 1. 检查 commit 格式
if ! echo "$MSG" | grep -qE '^\[(BUGFIX|FEATURE|REFACTOR|CONFIG|DOCS|DELETE)\]'; then
    echo "ERROR: Commit message must start with an uppercase tag."
    echo "Format: [TAG] scope: message"
    echo "Valid tags: $VALID_TAGS"
    exit 1
fi

if ! echo "$MSG" | grep -qE '^\[(BUGFIX|FEATURE|REFACTOR|CONFIG|DOCS|DELETE)\]\s+[^:]+:\s+.+'; then
    echo "ERROR: scope and message are required."
    echo "Format: [TAG] scope: message"
    echo "Example: [FEATURE] cli: add new command"
    exit 1
fi

# 2. 检查 commit 文件数量（初始化 commit 除外）
MAX_FILES_PER_COMMIT=10
COMMIT_FILE_COUNT=$(git diff-tree --no-commit-id --name-only -r HEAD 2>/dev/null | wc -l)

IS_INITIAL_COMMIT=false
if [ -z "$(git rev-parse --verify HEAD 2>/dev/null)" ]; then
    IS_INITIAL_COMMIT=true
fi

if [ "$COMMIT_FILE_COUNT" -gt "$MAX_FILES_PER_COMMIT" ] && [ "$IS_INITIAL_COMMIT" = "false" ]; then
    echo "ERROR: Commit contains $COMMIT_FILE_COUNT files, exceeding limit of $MAX_FILES_PER_COMMIT"
    echo "Please split your changes into smaller, focused commits."
    exit 1
fi

echo "Commit message validated"
exit 0
```

### 3.2 Commit 文件数量检查

**规则**: 单 commit 文件数量不能超过 **10 个**，超过需要合理理由。

**豁免情况**:
- **初始化 commit**: 仓库的第一个 commit 可以超过 10 个文件
- **特殊场景**: 需要提供充分的理由说明（在 commit body 中解释）

**本地检查**:
- pre-commit hook 检查 staged 文件数量
- commit-msg hook 检查最终 commit 的文件数量

**服务端检查**:
- `codemap ci check-commit-size` 检查范围内的所有 commit

**有效例外场景**:
1. 批量依赖更新（包含 lock 文件变更）
2. 自动化代码生成结果
3. 大规模重构（无逻辑变更）

**拆分大型 commit 的方法**:
```bash
# 撤销最后一次 commit（保留改动）
git reset HEAD~1

# 选择性添加文件
git add -p

# 分批次提交
git commit -m "[FEATURE] module-a: add feature X"
git add <more-files>
git commit -m "[FEATURE] module-b: add feature Y"
```

### 3.4 pre-commit Hook

**文件**: `.git/hooks/pre-commit`

```bash
#!/bin/sh
# Pre-commit hook: 运行测试和文件头检查

echo "Running pre-commit checks..."

# 1. 运行与变更相关的测试（失败即阻断）
echo "Running tests for changed files..."
npx vitest run --changed
if [ $? -ne 0 ]; then
    echo "ERROR: Tests failed, commit rejected"
    exit 1
fi

echo "Tests passed"

# 2. 检查 staged 文件数量（初始化 commit 除外）
MAX_FILES_PER_COMMIT=10
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | wc -l)

IS_INITIAL_COMMIT=false
git rev-parse --verify HEAD >/dev/null 2>&1
if [ $? -ne 0 ]; then
    IS_INITIAL_COMMIT=true
fi

if [ "$STAGED_FILES" -gt "$MAX_FILES_PER_COMMIT" ] && [ "$IS_INITIAL_COMMIT" = "false" ]; then
    echo "WARNING: Staged files count ($STAGED_FILES) exceeds limit ($MAX_FILES_PER_COMMIT)"
    echo "Single commit should not contain more than $MAX_FILES_PER_COMMIT files."
    echo "Please consider splitting your changes into smaller, focused commits."
    exit 1
fi

# 3. 检查文件头注释（只检查 staged 的 TS 源文件）
echo "Checking file headers..."
STAGED_TS_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep '\.ts$' | grep -v '\.test\.ts$' | grep -v '\.d\.ts$')

if [ -n "$STAGED_TS_FILES" ]; then
    MISSING_HEADERS=0
    for file in $STAGED_TS_FILES; do
        if [ ! -f "$file" ]; then
            continue
        fi
        HEAD_CONTENT=$(head -10 "$file")
        if ! echo "$HEAD_CONTENT" | grep -q '\[META\]'; then
            echo "ERROR: $file missing [META] comment"
            MISSING_HEADERS=$((MISSING_HEADERS + 1))
        fi
        if ! echo "$HEAD_CONTENT" | grep -q '\[WHY\]'; then
            echo "ERROR: $file missing [WHY] comment"
            MISSING_HEADERS=$((MISSING_HEADERS + 1))
        fi
    done

    if [ $MISSING_HEADERS -gt 0 ]; then
        echo "Add header comments at file top:"
        echo "// [META] since:YYYY-MM | owner:team | stable:false"
        echo "// [WHY] Explain why this file exists"
        exit 1
    fi
fi

echo "File headers passed"

# 4. 生成 AI 饲料（警告级，不阻断）
echo "Generating AI feed..."
npx mycodemap generate --quiet >/dev/null 2>&1 &

echo "Pre-commit checks passed"
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
    
    # 3. 检查 Commit 文件数量
    - name: Check commit size
      run: npx codemap ci check-commit-size
    
    # 4. 检查文件头注释
    - name: Check file headers
      run: npx codemap ci check-headers
    
    # 5. 生成代码地图并检查同步
    - name: Generate code map
      run: |
        npx codemap generate
        git diff --exit-code .mycodemap/ || (echo "Code map is out of sync. Run 'codemap generate' and commit the changes." && exit 1)
    
    # 6. 评估危险置信度
    - name: Assess risk
      run: npx codemap ci assess-risk --threshold=0.7

    # 6. 输出契约检查（machine/json）
    - name: Check output contract
      run: npx codemap ci check-output-contract --schema-version v1.0.0 --top-k 8 --max-tokens 160
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

// 评估危险置信度（简化版，不依赖 AI Feed）
ci.command('assess-risk')
  .description('Assess risk level of changes')
  .option('-t, --threshold <n>', 'Risk threshold (0-1)', '0.7')
  .action(async (options) => {
    const changedFiles = execSync('git diff --name-only origin/main...HEAD', { encoding: 'utf-8' })
      .split('\n')
      .filter(f => f.endsWith('.ts') && !f.endsWith('.test.ts'));
    
    if (changedFiles.length === 0) {
      console.log('✓ No changed TypeScript files');
      return;
    }
    
    // 简化版风险评估：基于文件数量和变更范围
    let riskScore = 0.3; // 基础风险
    
    // 文件数量风险
    if (changedFiles.length > 10) {
      riskScore += 0.2;
    }
    if (changedFiles.length > 20) {
      riskScore += 0.2;
    }
    
    // 核心文件变更风险
    const coreFiles = changedFiles.filter(f => 
      f.includes('/core/') || 
      f.includes('/orchestrator/') ||
      f.endsWith('/index.ts')
    );
    if (coreFiles.length > 0) {
      riskScore += 0.15;
    }
    
    riskScore = Math.min(1, riskScore);
    
    console.log(`Risk assessment: score=${riskScore.toFixed(2)}, threshold=${options.threshold}`);
    
    if (riskScore > parseFloat(options.threshold)) {
      console.log('ERROR: Risk score exceeds threshold');
      console.log(`Changed files: ${changedFiles.length}`);
      console.log('Risk mitigation notes required. Add explanation to commit body.');
      process.exit(1);
    } else {
      console.log('✓ Risk assessment passed');
    }
  });

// 检查 Commit 文件数量
ci.command('check-commit-size')
  .description('Check if commit file count exceeds limit (init commit exempt)')
  .option('-r, --range <range>', 'Git log range to check', 'origin/main..HEAD')
  .option('-m, --max-files <number>', 'Max files per commit', '10')
  .action(async (options) => {
    const maxFiles = parseInt(options.maxFiles, 10);
    const { execSync } = require('child_process');
    
    const range = options.range || 'origin/main..HEAD';
    const commits = execSync(`git log --format=%H ${range}`, { encoding: 'utf-8' })
      .split('\n')
      .filter(Boolean);
    
    let hasErrors = false;
    
    for (const hash of commits) {
      const message = execSync(`git log -1 --format=%s ${hash}`, { encoding: 'utf-8' }).trim();
      const fileCount = parseInt(
        execSync(`git diff-tree --no-commit-id --name-only -r ${hash} | wc -l`, { encoding: 'utf-8' }).trim(),
        10
      );
      
      if (fileCount > maxFiles) {
        console.error(`ERROR: Commit ${hash.substring(0, 7)} has ${fileCount} files (limit: ${maxFiles})`);
        console.error(`  Message: ${message}`);
        hasErrors = true;
      }
    }
    
    if (hasErrors) {
      console.error('\nLarge commits detected. Please split your changes.');
      process.exit(1);
    }
    
    console.log(`All ${commits.length} commits pass file count check`);
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

    // 运行 analyze 命令获取输出（machine 模式必须为纯 JSON）
    const { execSync } = require('child_process');
    let output;
    try {
      output = execSync('npx codemap analyze --intent search --keywords test --output-mode machine --json', {
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
    │   ├── check-commit-size (v1.3 新增)
    │   ├── check-headers
    │   ├── assess-risk (简化版)
    │   └── check-output-contract (P1-1 新增)
    │
    └── Dependencies
        ├── GitAnalyzer (解析 commit tag)
        └── FileHeaderScanner (验证注释)
```

---

## 9. 工作流集成 (v2.5 规划)

### 9.1 工作流阶段的 CI 验证

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

### 9.2 工作流 CI 执行器

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

## 10. 检查项汇总

| 检查项 | 本地 | 服务端 | 工具 |
|--------|------|--------|------|
| 测试通过 | ✅ | ✅ | `npm test` |
| Commit 格式 `[TAG]` | ✅ | ✅ | `commit-msg hook` / `codemap ci check-commits` |
| Commit 文件数量 (≤10) | ✅ | ✅ | `commit-msg hook` / `codemap ci check-commit-size` |
| 文件头 `[META]` | ✅ | ✅ | `pre-commit hook` / `codemap ci check-headers` |
| 文件头 `[WHY]` | ✅ | ✅ | `pre-commit hook` / `codemap ci check-headers` |
| 代码地图生成 | ⚠️ | ✅ | `codemap generate` |
| 危险置信度评估 | ❌ | ✅ (P0-2) | `codemap ci assess-risk` |
| 输出契约校验 | ❌ | ✅ (P1-1) | `codemap ci check-output-contract` |

---

## 11. 极简实现统计

| 组件 | 代码量 | 文件 |
|------|--------|------|
| commit-msg hook | ~50 行 | `.git/hooks/commit-msg` |
| pre-commit hook | ~60 行 | `.git/hooks/pre-commit` |
| CI 子命令 | ~100 行 | `src/cli/commands/ci.ts` |
| **总计** | **~210 行** | **符合极简原则** |

---

## 附录：版本历史

| 版本 | 日期 | 变更 |
|------|------|------|
| 1.0 | 2026-02-28 | 初始版本 |
| 1.1 | 2026-03-01 | 添加输出契约校验 |
| 1.2 | 2026-03-03 | 移除 AI 饲料相关功能，简化风险评估 |
| 1.3 | 2026-03-04 | 添加 commit 文件数量限制检查（≤10 个）|
