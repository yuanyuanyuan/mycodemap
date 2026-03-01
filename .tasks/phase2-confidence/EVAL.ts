import { expect, test } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const ORCHESTRATOR_DIR = join(process.cwd(), 'src/orchestrator');
const CONFIDENCE_FILE = join(ORCHESTRATOR_DIR, 'confidence.ts');

// Level 0: 项目约定检查
test('[L0] 代码应遵循 TypeScript 严格模式', () => {
  const tsConfig = JSON.parse(readFileSync(join(process.cwd(), 'tsconfig.json'), 'utf-8'));
  expect(tsConfig.compilerOptions?.strict).toBe(true);
});

// Level 1: 存在性检查
test('[L1-1] confidence.ts 文件必须存在', () => {
  expect(existsSync(CONFIDENCE_FILE)).toBe(true);
});

// Level 2: 结构检查
test('[L2-1] IntentType 类型必须定义', () => {
  const content = readFileSync(CONFIDENCE_FILE, 'utf-8');
  expect(content).toMatch(/type\s+IntentType/);
});

test('[L2-2] IntentType 必须包含全部 8 种类型', () => {
  const content = readFileSync(CONFIDENCE_FILE, 'utf-8');
  expect(content).toMatch(/['"]impact['"]/);
  expect(content).toMatch(/['"]dependency['"]/);
  expect(content).toMatch(/['"]search['"]/);
  expect(content).toMatch(/['"]documentation['"]/);
  expect(content).toMatch(/['"]complexity['"]/);
  expect(content).toMatch(/['"]overview['"]/);
  expect(content).toMatch(/['"]refactor['"]/);
  expect(content).toMatch(/['"]reference['"]/);
});

test('[L2-3] ConfidenceResult 接口必须定义', () => {
  const content = readFileSync(CONFIDENCE_FILE, 'utf-8');
  expect(content).toMatch(/interface\s+ConfidenceResult/);
  expect(content).toMatch(/score\s*:\s*number/);
  expect(content).toMatch(/level\s*:\s*['"]high['"]\s*\|\s*['"]medium['"]\s*\|\s*['"]low['"]/);
  expect(content).toMatch(/reasons\s*:\s*string\[\]/);
});

test('[L2-4] CONFIDENCE_THRESHOLDS 常量必须定义', () => {
  const content = readFileSync(CONFIDENCE_FILE, 'utf-8');
  expect(content).toMatch(/const\s+CONFIDENCE_THRESHOLDS/);
  expect(content).toMatch(/high\s*:/);
  expect(content).toMatch(/medium\s*:/);
});

test('[L2-5] calculateConfidence 函数必须导出', () => {
  const content = readFileSync(CONFIDENCE_FILE, 'utf-8');
  expect(content).toMatch(/export\s+function\s+calculateConfidence/);
});

test('[L2-6] getThreshold 辅助函数必须实现', () => {
  const content = readFileSync(CONFIDENCE_FILE, 'utf-8');
  expect(content).toMatch(/function\s+getThreshold/);
});

test('[L2-7] getRelevance 辅助函数必须实现', () => {
  const content = readFileSync(CONFIDENCE_FILE, 'utf-8');
  expect(content).toMatch(/function\s+getRelevance/);
});

test('[L2-8] getMatchCount 辅助函数必须实现', () => {
  const content = readFileSync(CONFIDENCE_FILE, 'utf-8');
  expect(content).toMatch(/function\s+getMatchCount/);
});

test('[L2-9] clamp 辅助函数必须实现', () => {
  const content = readFileSync(CONFIDENCE_FILE, 'utf-8');
  expect(content).toMatch(/function\s+clamp/);
});

// Level 3: 模式检查
test('[L3-1] calculateConfidence 必须接受 SearchResult[] 和 IntentType 参数', () => {
  const content = readFileSync(CONFIDENCE_FILE, 'utf-8');
  expect(content).toMatch(/calculateConfidence\s*\(\s*results\s*:\s*SearchResult\[\]/);
  expect(content).toMatch(/intent\s*:\s*IntentType/);
});

test('[L3-2] 结果数量权重应为 40%', () => {
  const content = readFileSync(CONFIDENCE_FILE, 'utf-8');
  // 检查数量评分计算包含 0.4 或 40%
  expect(content).toMatch(/0\.4|40%|\*\s*0\.4/);
});

test('[L3-3] 结果质量权重应为 40%', () => {
  const content = readFileSync(CONFIDENCE_FILE, 'utf-8');
  expect(content).toMatch(/0\.4|40%/);
});

test('[L3-4] 场景匹配应使用 switch 或条件分支处理不同 intent', () => {
  const content = readFileSync(CONFIDENCE_FILE, 'utf-8');
  expect(content).toMatch(/switch\s*\(\s*intent\s*\)|if\s*\(\s*intent/);
});

test('[L3-5] getRelevance 应兼容多种字段格式', () => {
  const content = readFileSync(CONFIDENCE_FILE, 'utf-8');
  // 检查是否检查 relevance, toolScore, score 字段
  expect(content).toMatch(/relevance/);
  expect(content).toMatch(/toolScore/);
  expect(content).toMatch(/score/);
});

test('[L3-6] 应使用 getThreshold 判断置信度级别', () => {
  const content = readFileSync(CONFIDENCE_FILE, 'utf-8');
  expect(content).toMatch(/getThreshold/);
});

test('[L3-7] reasons 数组应被填充详细说明', () => {
  const content = readFileSync(CONFIDENCE_FILE, 'utf-8');
  // 检查是否向 reasons 数组 push 元素
  expect(content).toMatch(/reasons\.push/);
});

// Level 4: 负面检查
test('[L4-1] 不应出现硬编码的阈值魔法数字', () => {
  const content = readFileSync(CONFIDENCE_FILE, 'utf-8');
  // 排除注释后检查
  const codeWithoutComments = content
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');
  
  // 确保没有直接比较 0.6, 0.7 等数字而不通过 getThreshold
  expect(codeWithoutComments).not.toMatch(/level\s*===?\s*['"]high['"]\s*\)?\s*\{\s*[^}]*[<>]=?\s*0\.[0-9]/);
});

test('[L4-2] 不应使用未定义的 SearchResult 类型', () => {
  const content = readFileSync(CONFIDENCE_FILE, 'utf-8');
  // SearchResult 应该被定义或从 types.ts 导入
  expect(content).toMatch(/import.*SearchResult|interface\s+SearchResult/);
});

test('[L4-3] 不应在 clamp 函数中修改输入值', () => {
  const content = readFileSync(CONFIDENCE_FILE, 'utf-8');
  // clamp 应该是纯函数，不应修改输入
  const codeWithoutComments = content
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');
  
  // 确保没有直接修改 value 参数
  expect(codeWithoutComments).not.toMatch(/value\s*[=\+\-]=/);
});

test('[L4-4] calculateConfidence 不应返回 undefined', () => {
  const content = readFileSync(CONFIDENCE_FILE, 'utf-8');
  // 确保函数始终返回对象
  expect(content).toMatch(/return\s*\{\s*score/);
  expect(content).toMatch(/return\s*\{\s*[^}]*level/);
  expect(content).toMatch(/return\s*\{\s*[^}]*reasons/);
});
