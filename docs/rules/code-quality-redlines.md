# 代码质量红线

> 代码生成绝对禁止项清单与 Enforcement 策略

## 1. 红线总则

以下代码模式在 CodeMap 仓库中被视为**硬性阻断项**。AI 生成代码时必须主动避免，否则必须在可信度自评中标记风险。

**红线判定标准**：
- 可能导致安全漏洞
- 严重降低代码可维护性
- 破坏类型安全保证
- 违反架构分层原则

## 2. 红线清单

### 2.1 敏感信息硬编码

**禁止模式**：
```typescript
// ❌ 绝对禁止
const API_KEY = "sk-abc123xyz";
const password = "admin123";
const secret = "my-jwt-secret";
```

**合规模式**：
```typescript
// ✅ 使用环境变量
const API_KEY = process.env.OPENAI_API_KEY;
if (!API_KEY) {
  throw new Error('OPENAI_API_KEY is required');
}
```

**检测方式**：
```bash
# 正则检测敏感信息字面量
grep -rn "password.*=.*['\"]" src/ --include="*.ts"
grep -rn "secret.*=.*['\"]" src/ --include="*.ts"
grep -rn "api_key.*=.*['\"]" src/ --include="*.ts"
```

**阻断阈值**：生产代码中出现任何明文凭证

### 2.2 `any` 类型使用

**禁止模式**：
```typescript
// ❌ 非边界文件禁止使用 any
function processData(data: any): any {
  return data.value;
}
```

**合规模式**：
```typescript
// ✅ 使用具体类型或 unknown + 类型守卫
interface DataPayload {
  value: string;
}

function processData(data: unknown): string {
  if (typeof data === 'object' && data !== null && 'value' in data) {
    return (data as DataPayload).value;
  }
  throw new Error('Invalid data format');
}
```

**例外情况**（需标记 TODO-DEBT）：
- 第三方库无类型定义时的临时处理
- 与遗留系统集成的边界

**检测方式**：
```bash
# TypeScript 编译器检查
npx tsc --noImplicitAny --noEmit

# ESLint 检查
npx eslint src --rule '@typescript-eslint/no-explicit-any: error'
```

**阻断阈值**：非边界文件出现 `any` 类型

### 2.3 函数超过 50 行

**计算方式**：函数体实际代码行数（不含空行、注释、类型定义）

**禁止模式**：
```typescript
// ❌ 超过 50 行的函数
function complexFunction(data: Data) {
  // 行 1
  // 行 2
  // ... 50+ 行
  // 行 51
  // 行 52
}
```

**合规模式**：
```typescript
// ✅ 拆分为子函数
function complexFunction(data: Data) {
  const validated = validateData(data);
  const transformed = transformData(validated);
  return persistData(transformed);
}

function validateData(data: Data): ValidatedData { ... }
function transformData(data: ValidatedData): TransformedData { ... }
function persistData(data: TransformedData): Result { ... }
```

**检测方式**：
```bash
# 使用 ESLint 的 max-lines-per-function 规则
npx eslint src --rule 'max-lines-per-function: [error, { max: 50, skipBlankLines: true, skipComments: true }]'
```

**阻断阈值**：单函数超过 50 行代码

### 2.4 未处理 Promise

**禁止模式**：
```typescript
// ❌ 未处理的异步操作
fetchUserData(userId); // 没有 await 或 .catch()
database.query(sql);   // 没有错误处理
```

**合规模式**：
```typescript
// ✅ 正确处理异步操作
try {
  const user = await fetchUserData(userId);
} catch (error) {
  logger.error('Failed to fetch user', error);
  throw new UserFetchError(userId);
}

// 或显式忽略
void fetchUserData(userId).catch(() => {}); // 有意的显式忽略
```

**检测方式**：
```bash
# ESLint 检查
npx eslint src --rule '@typescript-eslint/no-floating-promises: error'
```

**阻断阈值**：未使用 `await` 或未附加错误处理的 Promise

### 2.5 `console.log` 遗留代码

**禁止模式**：
```typescript
// ❌ 生产代码中的调试语句
console.log('Debug:', data);
console.warn('Warning');
```

**合规模式**：
```typescript
// ✅ 使用 runtime-logger
import { runtimeLogger } from '../cli/runtime-logger';
runtimeLogger.debug('Debug:', data);
runtimeLogger.warn('Warning');
```

**例外情况**：
- `src/cli/runtime-logger.ts` 本身
- 临时调试代码（提交前必须删除）

**检测方式**：
```bash
# ESLint 检查
npx eslint src --rule 'no-console: [error, { allow: ["error"] }]'
```

**阻断阈值**：非 logger 模块出现 `console.log`

### 2.6 未使用 Import

**禁止模式**：
```typescript
// ❌ 导入但未使用
import { unusedFunction } from './utils';
import type { UnusedType } from './types';

export function doSomething() {
  // 未使用上面的导入
}
```

**合规模式**：
```typescript
// ✅ 删除未使用的导入
export function doSomething() {
  // 干净的代码
}
```

**检测方式**：
```bash
# TypeScript 检查
npx tsc --noUnusedLocals --noEmit

# ESLint 检查
npx eslint src --rule '@typescript-eslint/no-unused-vars: [error, { argsIgnorePattern: "^_" }]'
```

**阻断阈值**：存在未使用的 import 或变量

### 2.7 缺少文件头注释

**禁止模式**：
```typescript
// ❌ 缺少 META 和 WHY 注释
export function analyze() { ... }
```

**合规模式**：
```typescript
// [META] since:2026-03 | owner:team | stable:false
// [WHY] 分析器主入口，负责协调解析和生成流程
export function analyze() { ... }
```

**检测方式**：
```bash
# pre-commit hook 自动检查
# 或手动检查
grep -L "\[META\]" src/**/*.ts | grep -v ".test.ts" | grep -v ".d.ts"
```

**阻断阈值**：TS 源文件缺少 `[META]` 或 `[WHY]` 注释

## 3. 检测自动化

### 3.1 集成到 CI

```yaml
# .github/workflows/ci-gateway.yml
- name: Check code quality redlines
  run: |
    npx eslint src \
      --rule '@typescript-eslint/no-explicit-any: error' \
      --rule '@typescript-eslint/no-floating-promises: error' \
      --rule 'no-console: [error, { allow: ["error"] }]'
```

### 3.2 本地检查脚本

```json
// package.json
{
  "scripts": {
    "check:redlines": "npm run check:types && npm run check:lint",
    "check:types": "tsc --noImplicitAny --noUnusedLocals --noEmit",
    "check:lint": "eslint src --ext .ts"
  }
}
```

## 4. 自动修复策略

| 红线 | 自动修复 | 修复命令 |
|------|---------|---------|
| `any` 类型 | 部分可行 | 使用类型推导工具（如 TS 语言服务） |
| 未使用 import | 完全可行 | `eslint --fix` |
| `console.log` | 部分可行 | 替换为 logger 引用（需人工确认） |
| 函数长度 | 不可行 | 需人工重构 |
| 未处理 Promise | 部分可行 | 添加 `await` 或 `.catch()`（需人工确认逻辑） |
| 敏感信息 | 不可行 | 需人工替换为环境变量 |
| 缺少文件头 | 部分可行 | 使用代码片段模板 |

## 5. 例外处理

### 5.1 技术债务标记

若因特殊原因必须违反红线，必须标记为技术债务：

```typescript
// TODO-DEBT [L1] [日期:2026-03-17] [作者:AI] [原因:第三方库无类型定义]
// 问题：被迫使用 any 类型处理无类型的第三方库
// 风险：丢失类型安全
// 偿还计划：提交 PR 给第三方库添加类型定义，或使用 @types 包
function handleLegacyAPI(response: any): any {
  return response.data;
}
```

### 5.2 边界文件例外

以下文件类型允许适当的灵活性：
- 测试文件（`.test.ts`）
- 类型声明文件（`.d.ts`）
- 配置文件（如 `vitest.config.ts`）
- 脚本文件（`scripts/` 目录）

## 6. 验收检查清单

提交代码前检查：

- [ ] 无敏感信息硬编码
- [ ] 无 `any` 类型（或已标记 TODO-DEBT）
- [ ] 函数长度 <= 50 行（或已拆分为子函数）
- [ ] 所有 Promise 都有错误处理
- [ ] 无 `console.log` 遗留
- [ ] 无未使用的 import
- [ ] TS 源文件有 `[META]` 和 `[WHY]` 注释
- [ ] `npm run check:redlines` 通过

## 7. 相关文档

- `AGENTS.md` - 任务分级与可信度自评
- `CLAUDE.md` - 执行清单与验收标准
- `docs/rules/engineering-with-codex-openai.md` - 工程规则
- `docs/rules/architecture-guardrails.md` - 架构护栏
