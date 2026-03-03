# 依赖路径扩展名修复计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 修复 `codemap deps` 命令显示 `.js` 扩展名而非源代码 `.ts` 扩展名的问题

**Architecture:** 在 fast-parser 中添加路径规范化逻辑，将构建路径转换为源代码路径

**Tech Stack:** TypeScript, Node.js, 正则表达式

---

## 问题分析

当前 `codemap deps` 输出示例：
```
⬇️  直接依赖 (dependencies):
   • ../types/index.js [source]
   • ./interfaces/IParser.js [source]
```

期望输出：
```
⬇️  直接依赖 (dependencies):
   • ../types/index.ts [source]
   • ./interfaces/IParser.ts [source]
```

**根源位置:** `src/parser/implementations/fast-parser.ts:141`
- 直接使用 import 语句中的原始路径
- 未将 `.js` 后缀转换为 `.ts` 后缀

---

## 任务 1: 添加路径规范化函数

**Files:**
- Modify: `src/parser/implementations/fast-parser.ts`

**Step 1: 添加规范化函数**

在 `fast-parser.ts` 文件末尾添加路径规范化函数：

```typescript
/**
 * 将构建路径转换为源代码路径
 * 例如: ../types/index.js -> ../types/index.ts
 */
function normalizeSourcePath(depPath: string): string {
  // 已经是 .ts 或 .tsx 的不需要转换
  if (depPath.endsWith('.ts') || depPath.endsWith('.tsx')) {
    return depPath;
  }

  // 替换 .js/.jsx 后缀为 .ts/.tsx
  return depPath.replace(/\.js$/i, '.ts').replace(/\.jsx$/i, '.tsx');
}
```

**Step 2: 在 extractImportsSimple 中使用**

找到第 140-145 行，修改 import 路径处理：

```typescript
// 原代码
imports.push({
  source: match[4],  // <-- 直接使用原始路径
  sourceType: match[4].startsWith('.') ? 'relative' : 'alias',
  specifiers: specifiers.map(s => ({ name: s, isTypeOnly: false })) as any,
  isTypeOnly: false
});

// 修改为
imports.push({
  source: normalizeSourcePath(match[4]),  // <-- 使用规范化路径
  sourceType: match[4].startsWith('.') ? 'relative' : 'alias',
  specifiers: specifiers.map(s => ({ name: s, isTypeOnly: false })) as any,
  isTypeOnly: false
});
```

**Step 3: 构建并测试**

```bash
npm run build
node dist/cli/index.js deps -m "src/parser"
```

预期输出应显示 `.ts` 扩展名。

**Step 4: 提交**

```bash
git add src/parser/implementations/fast-parser.ts
git commit -m "fix: normalize .js to .ts in dependency paths"
```

---

## 任务 2: 验证影响分析命令

**Files:**
- Test: 运行 `node dist/cli/index.js impact -f src/cache/lru-cache.ts`

**Step 1: 验证 impact 命令**

impact 命令也使用相同的 codemap.json 数据，路径问题应该已自动修复。

**Step 2: 提交**

```bash
git commit -m "test: verify impact command uses normalized paths"
```

---

## 任务 3: 添加回归测试

**Files:**
- Modify: `src/parser/__tests__/fast-parser.test.ts`

**Step 1: 添加测试用例**

```typescript
describe('normalizeSourcePath', () => {
  it('should convert .js to .ts', () => {
    expect(normalizeSourcePath('../types/index.js')).toBe('../types/index.ts');
  });

  it('should keep .ts unchanged', () => {
    expect(normalizeSourcePath('../types/index.ts')).toBe('../types/index.ts');
  });

  it('should handle nested paths', () => {
    expect(normalizeSourcePath('./foo/bar.js')).toBe('./foo/bar.ts');
  });
});
```

**Step 2: 运行测试**

```bash
npm test -- --run src/parser/__tests__/fast-parser.test.ts
```

**Step 3: 提交**

```bash
git add src/parser/__tests__/fast-parser.test.ts
git commit -m "test: add path normalization tests"
```

---

## 验证命令

修复完成后运行以下命令验证：

```bash
# 1. 依赖分析
node dist/cli/index.js deps -m "src/parser"
# 期望: 显示 .ts 而非 .js

# 2. 影响分析
node dist/cli/index.js impact -f src/cache/lru-cache.ts --transitive
# 期望: 显示 .ts 而非 .js

# 3. 构建
npm run build
# 期望: 无错误

# 4. 测试
npm test -- --run
# 期望: 713+ 通过
```

---

## 回滚计划

如果修复导致问题：

```bash
git revert HEAD
git push
```
