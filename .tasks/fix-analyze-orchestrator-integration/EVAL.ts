import { expect, test } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const ANALYZE_FILE = join(process.cwd(), 'src/cli/commands/analyze.ts');

// Level 0: 项目约定检查（验证 AI 是否遵循了项目上下文）
test('[L0] 代码应遵循项目的架构约定', () => {
  const content = readFileSync(ANALYZE_FILE, 'utf-8');

  // 检查是否使用了项目中定义的模式 - 使用 ToolOrchestrator
  expect(content).toMatch(/ToolOrchestrator/);
  
  // 检查是否使用了 ResultFusion
  expect(content).toMatch(/ResultFusion/);

  // 检查是否从 orchestrator 模块导入
  expect(content).toMatch(/from\s+['"]\.\.\/..\/orchestrator/);
});

// Level 0b: 依赖版本检查
test('[L0] 应使用项目现有的依赖，不引入冲突版本', () => {
  const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf-8'));

  // 检查项目中是否有 chalk（analyze.ts 中使用）
  const hasChalk = pkg.dependencies?.['chalk'] || pkg.devDependencies?.['chalk'];
  expect(hasChalk).toBeTruthy();
});

// Level 1: ToolOrchestrator 集成检查
test('[L1] AnalyzeCommand 应集成 ToolOrchestrator', () => {
  const content = readFileSync(ANALYZE_FILE, 'utf-8');
  
  // 检查是否实例化 ToolOrchestrator
  expect(content).toMatch(/new\s+ToolOrchestrator/);
  
  // 检查是否调用 executeWithFallback 或 executeParallel
  expect(content).toMatch(/executeWithFallback|executeParallel/);
  
  // 检查是否有 orchestrator 类成员
  expect(content).toMatch(/private\s+orchestrator|orchestrator\s*:\s*ToolOrchestrator/);
});

// Level 2: ResultFusion 调用检查
test('[L2] 应使用 ResultFusion 进行多工具结果融合', () => {
  const content = readFileSync(ANALYZE_FILE, 'utf-8');
  
  // 检查是否实例化 ResultFusion
  expect(content).toMatch(/new\s+ResultFusion/);
  
  // 检查是否调用 fuse 方法
  expect(content).toMatch(/\.fuse\s*\(/);
  
  // 检查是否有 fusion 类成员
  expect(content).toMatch(/private\s+fusion|fusion\s*:\s*ResultFusion/);
});

// Level 3: 8 个 intent 支持检查
test('[L3] 应支持所有 8 个 intent 类型', () => {
  const content = readFileSync(ANALYZE_FILE, 'utf-8');
  
  const requiredIntents = [
    'impact',
    'dependency', 
    'complexity',
    'search',
    'overview',
    'documentation',
    'refactor',
    'reference'
  ];
  
  // 检查是否处理所有 8 个 intent
  for (const intent of requiredIntents) {
    expect(content).toMatch(new RegExp(`['"]${intent}['"]`));
  }
  
  // 检查是否有 intent 路由逻辑（switch、if/else 或 router）
  expect(content).toMatch(/switch\s*\(|if\s*\(\s*intent|routeIntent|intentRouter/i);
});

// Level 3b: 特定 intent 实现检查
test('[L3b] 新 intent (search/overview/documentation/refactor/reference) 应通过 ToolOrchestrator 执行', () => {
  const content = readFileSync(ANALYZE_FILE, 'utf-8');
  
  // 检查新 intent 的实现是否使用了 orchestrator
  // 通过查找 executeWithFallback 调用附近的 intent 检查
  expect(content).toMatch(/case\s+['"]search['"]\s*:/);
  expect(content).toMatch(/case\s+['"]overview['"]\s*:/);
  expect(content).toMatch(/case\s+['"]documentation['"]\s*:/);
  expect(content).toMatch(/case\s+['"]refactor['"]\s*:/);
  expect(content).toMatch(/case\s+['"]reference['"]\s*:/);
});

// Level 4: 负面检查（反例场景验证）
test('[L4-负面] 不应存在硬编码的直接命令调用（仅保留向后兼容的增强模式）', () => {
  const content = readFileSync(ANALYZE_FILE, 'utf-8');
  
  // 检查旧的硬编码 switch 模式是否已被重构
  // 允许保留 executeImpact/executeDeps/executeComplexity 作为包装方法
  // 但应该使用 orchestrator 进行实际执行
  
  // 不应有直接的 new ImpactCommand().run() 调用（应使用 runEnhanced 或 orchestrator）
  const directRunPattern = /new\s+ImpactCommand\s*\(\s*\)\s*\.\s*run\s*\(/;
  const hasDirectRun = directRunPattern.test(content);
  
  // 如果存在直接调用，检查是否包裹在 orchestrator 调用中
  if (hasDirectRun) {
    // 检查是否有 orchestrator 调用
    expect(content).toMatch(/orchestrator\./);
  }
});

// Level 4b: 向后兼容性检查
test('[L4b] 应保持向后兼容性', () => {
  const content = readFileSync(ANALYZE_FILE, 'utf-8');
  
  // 检查是否保留原有错误码
  expect(content).toMatch(/E0001_INVALID_INTENT/);
  expect(content).toMatch(/E0005_EXECUTION_FAILED/);
  
  // 检查是否保留 VALID_INTENTS 数组
  expect(content).toMatch(/VALID_INTENTS/);
  
  // 检查 CLI 参数解析是否保持不变
  expect(content).toMatch(/parseAnalyzeArgs/);
  expect(content).toMatch(/parseArgs/);
});

// Level 4c: 代码质量检查
test('[L4c] 代码应遵循 TypeScript 严格模式', () => {
  const content = readFileSync(ANALYZE_FILE, 'utf-8');
  
  // 检查是否使用 TypeScript 类型注解
  expect(content).toMatch(/:\s*Promise<.*>/);
  expect(content).toMatch(/:\s*AnalyzeArgs/);
  
  // 检查是否使用 private/public 访问修饰符
  expect(content).toMatch(/private\s+\w+/);
});
