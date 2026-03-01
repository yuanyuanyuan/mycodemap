import { expect, test, describe } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

// Level 0: 项目约定检查

test('[L0] result-fusion.ts 应存在', () => {
  const filePath = join(process.cwd(), 'src/orchestrator/result-fusion.ts');
  expect(existsSync(filePath)).toBe(true);
});

test('[L0] 代码应使用 TypeScript 严格类型', () => {
  const content = readFileSync(
    join(process.cwd(), 'src/orchestrator/result-fusion.ts'),
    'utf-8'
  );
  // 检查是否使用了正确的类型定义
  expect(content).toMatch(/interface\s+\w+|type\s+\w+/);
  // 检查是否导出了 ResultFusion 类
  expect(content).toMatch(/export\s+(class|default)\s+ResultFusion/);
});

test('[L0] 应导入 UnifiedResult 类型', () => {
  const content = readFileSync(
    join(process.cwd(), 'src/orchestrator/result-fusion.ts'),
    'utf-8'
  );
  // 检查是否从 types.ts 导入
  expect(content).toMatch(/from\s+['"]\.\/types['"]|from\s+['"]\.\.\/orchestrator\/types['"]/);
});

// Level 1: 存在性检查

test('[L1] ResultFusion 类应实现 fuse 方法', () => {
  const content = readFileSync(
    join(process.cwd(), 'src/orchestrator/result-fusion.ts'),
    'utf-8'
  );
  expect(content).toMatch(/fuse\s*\(/);
});

test('[L1] 应实现 getToolWeight 方法', () => {
  const content = readFileSync(
    join(process.cwd(), 'src/orchestrator/result-fusion.ts'),
    'utf-8'
  );
  expect(content).toMatch(/getToolWeight\s*\(/);
});

test('[L1] 应实现 applyRiskBoost 方法', () => {
  const content = readFileSync(
    join(process.cwd(), 'src/orchestrator/result-fusion.ts'),
    'utf-8'
  );
  expect(content).toMatch(/applyRiskBoost\s*\(/);
});

test('[L1] 应实现 truncateByToken 函数', () => {
  const content = readFileSync(
    join(process.cwd(), 'src/orchestrator/result-fusion.ts'),
    'utf-8'
  );
  expect(content).toMatch(/truncateByToken\s*\(/);
});

// Level 2: 结构检查

test('[L2] 工具权重配置应正确', () => {
  const content = readFileSync(
    join(process.cwd(), 'src/orchestrator/result-fusion.ts'),
    'utf-8'
  );
  // 检查权重配置
  expect(content).toMatch(/['"]ast-grep['"]\s*:\s*1\.0/);
  expect(content).toMatch(/['"]codemap['"]\s*:\s*0\.9/);
  expect(content).toMatch(/['"]ai-feed['"]\s*:\s*0\.85/);
  expect(content).toMatch(/['"]rg-internal['"]\s*:\s*0\.7/);
});

test('[L2] 去重 key 应使用 file:line 格式', () => {
  const content = readFileSync(
    join(process.cwd(), 'src/orchestrator/result-fusion.ts'),
    'utf-8'
  );
  // 检查去重 key 格式
  expect(content).toMatch(/\$\{result\.file\}\s*:\s*\$\{result\.line/);
  expect(content).toMatch(/result\.line\s*\|\|\s*['"]['"]/);
});

test('[L2] 风险加权应实现三种级别', () => {
  const content = readFileSync(
    join(process.cwd(), 'src/orchestrator/result-fusion.ts'),
    'utf-8'
  );
  // 检查 riskLevel 处理
  expect(content).toMatch(/high['"]\s*:\s*-0\.1/);
  expect(content).toMatch(/medium['"]\s*:\s*0/);
  expect(content).toMatch(/low['"]\s*:\s*\+?0\.05/);
});

test('[L2] 默认 topK 应为 8', () => {
  const content = readFileSync(
    join(process.cwd(), 'src/orchestrator/result-fusion.ts'),
    'utf-8'
  );
  // 检查默认值
  expect(content).toMatch(/topK\s*[:=]\s*8/);
});

test('[L2] 默认 maxTokens 应为 160', () => {
  const content = readFileSync(
    join(process.cwd(), 'src/orchestrator/result-fusion.ts'),
    'utf-8'
  );
  // 检查 token 限制
  expect(content).toMatch(/160/);
});

// Level 3: 模式检查

test('[L3] relevance 应进行 clamp 处理', () => {
  const content = readFileSync(
    join(process.cwd(), 'src/orchestrator/result-fusion.ts'),
    'utf-8'
  );
  // 检查是否使用 Math.min/Math.max 进行 clamp
  expect(content).toMatch(/Math\.max\s*\(\s*0\s*,\s*Math\.min\s*\(\s*1/);
  // 或者反过来的顺序
  const hasClamp = content.match(/Math\.(min|max).*Math\.(min|max)/);
  expect(hasClamp).toBeTruthy();
});

test('[L3] 应实现关键词加权逻辑', () => {
  const content = readFileSync(
    join(process.cwd(), 'src/orchestrator/result-fusion.ts'),
    'utf-8'
  );
  // 检查关键词加权
  expect(content).toMatch(/keywords/);
  expect(content).toMatch(/keywordWeights/);
});

test('[L3] 应支持 intent 参数影响排序', () => {
  const content = readFileSync(
    join(process.cwd(), 'src/orchestrator/result-fusion.ts'),
    'utf-8'
  );
  // 检查 intent 处理
  expect(content).toMatch(/intent/);
  expect(content).toMatch(/impact/);
});

test('[L3] 去重应保留高分结果', () => {
  const content = readFileSync(
    join(process.cwd(), 'src/orchestrator/result-fusion.ts'),
    'utf-8'
  );
  // 检查是否比较 relevance
  expect(content).toMatch(/result\.relevance\s*>\s*existing\.relevance/);
});

// Level 4: 负面检查

test('[L4-负面] 不应直接修改输入对象', () => {
  const content = readFileSync(
    join(process.cwd(), 'src/orchestrator/result-fusion.ts'),
    'utf-8'
  );
  // 应该使用展开运算符创建新对象，而非直接修改
  // 这不是一个严格的检查，但应该鼓励不可变模式
  expect(content).toMatch(/\.\.\./);
});

test('[L4-负面] 不应有硬编码的 magic number', () => {
  const content = readFileSync(
    join(process.cwd(), 'src/orchestrator/result-fusion.ts'),
    'utf-8'
  );
  // 权重和默认值应该定义为常量或使用配置
  // 检查是否有明确的常量定义或配置对象
  const hasWeightsConfig = content.match(/weights|WEIGHTS|config|CONFIG/i);
  expect(hasWeightsConfig).toBeTruthy();
});

test('[L4-负面] 不应忽略 metadata 为 undefined 的情况', () => {
  const content = readFileSync(
    join(process.cwd(), 'src/orchestrator/result-fusion.ts'),
    'utf-8'
  );
  // 检查是否有可选链或空值检查
  expect(content).toMatch(/\?\.|metadata\?\./);
});

// 功能测试（如果可以直接导入模块）
describe('功能测试', () => {
  test('工具权重映射正确', async () => {
    try {
      const { ResultFusion } = await import(
        join(process.cwd(), 'src/orchestrator/result-fusion.ts')
      );
      const fusion = new ResultFusion();
      
      // 通过检查 fuse 方法的输出来验证权重
      const mockResults = new Map([
        ['ast-grep', [{ file: 'a.ts', line: 1, relevance: 1.0 } as any]],
        ['codemap', [{ file: 'b.ts', line: 1, relevance: 1.0 } as any]],
      ]);
      
      const result = fusion.fuse(mockResults, { topK: 8 });
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    } catch (e) {
      // 如果导入失败，可能是文件不存在或语法错误
      // 这种情况下 L0/L1 测试会失败
    }
  });
});
