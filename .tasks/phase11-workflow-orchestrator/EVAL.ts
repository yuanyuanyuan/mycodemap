import { expect, test } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const WORKFLOW_DIR = join(process.cwd(), 'src/orchestrator/workflow');
const COMMANDS_DIR = join(process.cwd(), 'src/cli/commands');

// Level 0: 项目约定检查（验证 AI 是否遵循了项目上下文）
test('[L0] 代码应遵循项目的架构约定', () => {
  const typesContent = readFileSync(join(WORKFLOW_DIR, 'types.ts'), 'utf-8');
  
  // 检查是否使用 TypeScript 严格模式类型定义
  expect(typesContent).toMatch(/type\s+WorkflowPhase/);
  expect(typesContent).toMatch(/interface\s+WorkflowContext/);
  expect(typesContent).toMatch(/interface\s+PhaseDefinition/);
});

// Level 0b: 依赖版本检查
test('[L0] 应使用项目现有的依赖，不引入冲突版本', () => {
  const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf-8'));
  
  // 检查是否使用项目中已有的 commander 依赖
  const hasCommander = pkg.dependencies?.['commander'] || pkg.devDependencies?.['commander'];
  expect(hasCommander).toBeTruthy();
});

// Level 1: 存在性检查 - 类型定义文件
test('[L1-1] 类型定义文件应存在', () => {
  expect(existsSync(join(WORKFLOW_DIR, 'types.ts'))).toBe(true);
  expect(existsSync(join(WORKFLOW_DIR, 'workflow-context.ts'))).toBe(true);
});

// Level 1: 存在性检查 - 核心类文件
test('[L1-2] 工作流编排器类文件应存在', () => {
  expect(existsSync(join(WORKFLOW_DIR, 'workflow-orchestrator.ts'))).toBe(true);
  expect(existsSync(join(WORKFLOW_DIR, 'workflow-persistence.ts'))).toBe(true);
  expect(existsSync(join(WORKFLOW_DIR, 'phase-checkpoint.ts'))).toBe(true);
  expect(existsSync(join(WORKFLOW_DIR, 'index.ts'))).toBe(true);
});

// Level 1: 存在性检查 - CLI 命令文件
test('[L1-3] CLI 命令文件应存在', () => {
  expect(existsSync(join(COMMANDS_DIR, 'workflow.ts'))).toBe(true);
});

// Level 2: 结构检查 - 类型定义
test('[L2-1] WorkflowPhase 应为字面量联合类型', () => {
  const content = readFileSync(join(WORKFLOW_DIR, 'types.ts'), 'utf-8');
  
  // 检查是否为字面量联合类型而非 string
  expect(content).toMatch(/type\s+WorkflowPhase\s*=\s*['"]reference['"]\s*\|\s*['"]impact['"]/);
  expect(content).toMatch(/['"]risk['"]\s*\|\s*['"]implementation['"]/);
  expect(content).toMatch(/['"]commit['"]\s*\|\s*['"]ci['"]/);
});

test('[L2-2] PhaseStatus 应包含所有状态', () => {
  const content = readFileSync(join(WORKFLOW_DIR, 'types.ts'), 'utf-8');
  
  expect(content).toMatch(/['"]pending['"]/);
  expect(content).toMatch(/['"]running['"]/);
  expect(content).toMatch(/['"]completed['"]/);
  expect(content).toMatch(/['"]verified['"]/);
  expect(content).toMatch(/['"]skipped['"]/);
});

test('[L2-3] WorkflowContext 应包含关键字段', () => {
  const content = readFileSync(join(WORKFLOW_DIR, 'workflow-context.ts'), 'utf-8');
  
  expect(content).toMatch(/id\s*:\s*string/);
  expect(content).toMatch(/task\s*:\s*string/);
  expect(content).toMatch(/currentPhase\s*:\s*WorkflowPhase/);
  expect(content).toMatch(/phaseStatus\s*:\s*PhaseStatus/);
  expect(content).toMatch(/artifacts\s*:\s*Map/);
});

// Level 2: 结构检查 - 类方法
test('[L2-4] WorkflowOrchestrator 应包含必需方法', () => {
  const content = readFileSync(join(WORKFLOW_DIR, 'workflow-orchestrator.ts'), 'utf-8');
  
  expect(content).toMatch(/start\s*\(\s*task[\s\S]*?\)\s*:\s*Promise<WorkflowContext>/);
  expect(content).toMatch(/executeCurrentPhase/);
  expect(content).toMatch(/proceedToNextPhase/);
  expect(content).toMatch(/getStatus/);
  expect(content).toMatch(/resume/);
  expect(content).toMatch(/checkpoint/);
});

test('[L2-5] WorkflowPersistence 应包含必需方法', () => {
  const content = readFileSync(join(WORKFLOW_DIR, 'workflow-persistence.ts'), 'utf-8');
  
  expect(content).toMatch(/save\s*\(/);
  expect(content).toMatch(/load\s*\(/);
  expect(content).toMatch(/loadActive\s*\(/);
  expect(content).toMatch(/list\s*\(/);
  expect(content).toMatch(/delete\s*\(/);
});

// Level 3: 模式检查 - 状态机逻辑
test('[L3-1] 状态机应正确处理阶段流转', () => {
  const content = readFileSync(join(WORKFLOW_DIR, 'workflow-orchestrator.ts'), 'utf-8');
  
  // 检查是否正确更新状态
  expect(content).toMatch(/phaseStatus\s*=\s*['"]running['"]/);
  expect(content).toMatch(/phaseStatus\s*=\s*['"]completed['"]/);
  expect(content).toMatch(/phaseStatus\s*=\s*['"]verified['"]/);
});

test('[L3-2] 持久化应正确处理 Map/Set 序列化', () => {
  const content = readFileSync(join(WORKFLOW_DIR, 'workflow-persistence.ts'), 'utf-8');
  
  // 检查是否使用 Array.from 处理 Map
  expect(content).toMatch(/Array\.from\s*\(\s*.*\.entries\s*\(\s*\)\s*\)/);
  // 检查是否使用 Array.from 处理 Set
  expect(content).toMatch(/Array\.from\s*\(\s*.*\)\s*/);
  // 检查反序列化时是否重建 Map
  expect(content).toMatch(/new\s+Map\s*\(/);
  // 检查反序列化时是否重建 Set
  expect(content).toMatch(/new\s+Set\s*\(/);
});

test('[L3-3] PhaseCheckpoint 应实现 validate 方法', () => {
  const content = readFileSync(join(WORKFLOW_DIR, 'phase-checkpoint.ts'), 'utf-8');
  
  expect(content).toMatch(/validate\s*\(/);
  expect(content).toMatch(/deliverables/);
});

test('[L3-4] CLI 应实现所有工作流子命令', () => {
  const content = readFileSync(join(COMMANDS_DIR, 'workflow.ts'), 'utf-8');
  
  expect(content).toMatch(/workflow\.command\s*\(\s*['"]start['"]\s*\)/);
  expect(content).toMatch(/workflow\.command\s*\(\s*['"]status['"]\s*\)/);
  expect(content).toMatch(/workflow\.command\s*\(\s*['"]proceed['"]\s*\)/);
  expect(content).toMatch(/workflow\.command\s*\(\s*['"]resume['"]\s*\)/);
  expect(content).toMatch(/workflow\.command\s*\(\s*['"]checkpoint['"]\s*\)/);
});

// Level 4: 负面检查（反例场景验证）
test('[L4-1] 不应将 WorkflowPhase 定义为 string 类型', () => {
  const content = readFileSync(join(WORKFLOW_DIR, 'types.ts'), 'utf-8');
  
  // 确保不是简单的 string 类型
  expect(content).not.toMatch(/type\s+WorkflowPhase\s*=\s*string\s*;?\s*$/m);
});

test('[L4-2] 不应直接 JSON.stringify Map 对象', () => {
  const content = readFileSync(join(WORKFLOW_DIR, 'workflow-persistence.ts'), 'utf-8');
  
  // 确保没有直接序列化 Map
  const hasDirectStringify = /JSON\.stringify\s*\(\s*[^,)]*artifacts/.test(content);
  expect(hasDirectStringify).toBe(false);
});

test('[L4-3] 不应缺少 nextPhase 边界检查', () => {
  const content = readFileSync(join(WORKFLOW_DIR, 'workflow-orchestrator.ts'), 'utf-8');
  
  // 检查是否有 nextPhase 存在性检查
  expect(content).toMatch(/nextPhase\?/);
  expect(content).toMatch(/No next phase/);
});

test('[L4-4] 不应硬编码阶段定义', () => {
  const content = readFileSync(join(WORKFLOW_DIR, 'workflow-orchestrator.ts'), 'utf-8');
  
  // 阶段定义应该在 initializePhaseDefinitions 中，而不是硬编码在方法中
  expect(content).toMatch(/initializePhaseDefinitions/);
});
