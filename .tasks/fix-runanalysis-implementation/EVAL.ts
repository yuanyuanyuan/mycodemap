import { expect, test } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const WORKFLOW_ORCHESTRATOR_PATH = 'src/orchestrator/workflow/workflow-orchestrator.ts';

// Level 0: 项目约定检查（验证 AI 是否遵循了项目上下文）
test('[L0] 代码应遵循项目的架构约定', () => {
  const content = readFileSync(join(process.cwd(), WORKFLOW_ORCHESTRATOR_PATH), 'utf-8');

  // 检查是否使用了项目中定义的 ToolOrchestrator 模式
  expect(content).toMatch(/ToolOrchestrator/);

  // 检查是否使用了 ResultFusion
  expect(content).toMatch(/ResultFusion/);

  // 检查是否避免了直接使用 AnalyzeCommand（应该通过 ToolOrchestrator 间接调用）
  expect(content).not.toMatch(/import.*AnalyzeCommand/);
});

// Level 0b: 依赖版本检查
test('[L0] 应使用项目现有的依赖，不引入冲突版本', () => {
  const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf-8'));

  // 检查 TypeScript 版本兼容
  const hasTs = pkg.devDependencies?.['typescript'] || pkg.dependencies?.['typescript'];
  expect(hasTs).toBeTruthy();
});

// Level 1: 存在性检查 - runAnalysis 方法已实现
test('[L1] runAnalysis 方法应实际调用工具而非仅返回空数组', () => {
  const content = readFileSync(join(process.cwd(), WORKFLOW_ORCHESTRATOR_PATH), 'utf-8');

  // 提取 runAnalysis 方法体
  const runAnalysisMatch = content.match(/private async runAnalysis\([\s\S]*?\): Promise<UnifiedResult\[\]> \{([\s\S]*?)\n  \}/);
  expect(runAnalysisMatch).toBeTruthy();

  const methodBody = runAnalysisMatch![1];

  // 验证方法体包含实际的工具调用逻辑
  expect(methodBody).toMatch(/executeParallel|executeWithFallback|runToolWithTimeout/);
});

// Level 2: 结构检查 - ToolOrchestrator 集成
test('[L2] runAnalysis 应正确集成 ToolOrchestrator', () => {
  const content = readFileSync(join(process.cwd(), WORKFLOW_ORCHESTRATOR_PATH), 'utf-8');

  // 检查是否导入 ToolOrchestrator
  expect(content).toMatch(/import.*ToolOrchestrator.*from/);

  // 检查 runAnalysis 方法内部是否使用 ToolOrchestrator
  const runAnalysisMatch = content.match(/private async runAnalysis\([\s\S]*?\): Promise<UnifiedResult\[\]> \{([\s\S]*?)\n  \}/);
  expect(runAnalysisMatch).toBeTruthy();

  const methodBody = runAnalysisMatch![1];

  // 检查是否调用执行方法
  expect(methodBody).toMatch(/executeParallel|executeWithFallback/);

  // 检查是否传递 CodemapIntent
  expect(methodBody).toMatch(/intent/);
});

// Level 3: 模式检查 - 结果融合调用
test('[L3] runAnalysis 应调用 ResultFusion 进行结果融合', () => {
  const content = readFileSync(join(process.cwd(), WORKFLOW_ORCHESTRATOR_PATH), 'utf-8');

  // 检查是否导入 ResultFusion
  expect(content).toMatch(/import.*ResultFusion.*from/);

  // 提取 runAnalysis 方法体
  const runAnalysisMatch = content.match(/private async runAnalysis\([\s\S]*?\): Promise<UnifiedResult\[\]> \{([\s\S]*?)\n  \}/);
  expect(runAnalysisMatch).toBeTruthy();

  const methodBody = runAnalysisMatch![1];

  // 检查是否调用 fuse 方法
  expect(methodBody).toMatch(/\.fuse\(/);

  // 检查是否传递 FusionOptions
  expect(methodBody).toMatch(/topK|intent/);
});

// Level 4: 负面检查 - 不得返回空数组
test('[L4-负面] runAnalysis 不应直接返回空数组', () => {
  const content = readFileSync(join(process.cwd(), WORKFLOW_ORCHESTRATOR_PATH), 'utf-8');

  // 提取 runAnalysis 方法体
  const runAnalysisMatch = content.match(/private async runAnalysis\([\s\S]*?\): Promise<UnifiedResult\[\]> \{([\s\S]*?)\n  \}/);
  expect(runAnalysisMatch).toBeTruthy();

  const methodBody = runAnalysisMatch![1];

  // 检查是否还有直接的 return [];
  // 允许在 catch 块中返回空数组作为降级处理
  const lines = methodBody.split('\n');
  const returnEmptyArrayLines = lines.filter(
    line => line.includes('return []') && !line.includes('catch')
  );

  // 不应在非错误处理路径中直接返回空数组
  expect(returnEmptyArrayLines.length).toBe(0);
});

// Level 4b: 负面检查 - 不应有存根注释
test('[L4-负面] 应移除存根实现注释', () => {
  const content = readFileSync(join(process.cwd(), WORKFLOW_ORCHESTRATOR_PATH), 'utf-8');

  // 提取 runAnalysis 方法体
  const runAnalysisMatch = content.match(/private async runAnalysis\([\s\S]*?\): Promise<UnifiedResult\[\]> \{([\s\S]*?)\n  \}/);
  expect(runAnalysisMatch).toBeTruthy();

  const methodBody = runAnalysisMatch![1];

  // 不应包含存根相关的注释
  expect(methodBody).not.toMatch(/为了简化/);
  expect(methodBody).not.toMatch(/暂时返回空结果/);
  expect(methodBody).not.toMatch(/实际实现中/);
});
