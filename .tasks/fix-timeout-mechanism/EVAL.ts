import { expect, test } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const TOOL_ORCHESTRATOR_PATH = join(process.cwd(), 'src/orchestrator/tool-orchestrator.ts');

// Level 0: 项目约定检查（验证 AI 是否遵循了项目上下文）
test('[L0] 代码应遵循项目的架构约定', () => {
  const content = readFileSync(TOOL_ORCHESTRATOR_PATH, 'utf-8');

  // 检查是否使用了项目中定义的模式（TypeScript 严格类型）
  expect(content).toMatch(/signal\?:\s*AbortSignal/);

  // 检查是否避免了训练数据中常见但项目不使用的模式
  expect(content).not.toMatch(/signal:\s*AbortSignal\s*\|/); // 不应该使用联合类型而非可选参数
});

// Level 0b: 依赖版本检查
test('[L0] 应使用项目现有的依赖，不引入冲突版本', () => {
  const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf-8'));

  // AbortController 是 Node.js 内置 API，不需要额外依赖
  // 检查项目目标 Node.js 版本是否 >= 18（支持 AbortController）
  const engines = pkg.engines || {};
  const nodeVersion = engines.node || '';
  expect(nodeVersion.includes('18') || nodeVersion.includes('>=18') || nodeVersion.includes('^18')).toBe(true);
});

// Level 1: 存在性检查 - ToolAdapter 接口更新
test('[L1] ToolAdapter 接口应包含 signal 参数', () => {
  const content = readFileSync(TOOL_ORCHESTRATOR_PATH, 'utf-8');
  
  // 检查 ToolAdapter 接口定义中包含 signal 参数
  expect(content).toMatch(/execute\s*\(\s*intent:\s*CodemapIntent\s*,?\s*signal\?:\s*AbortSignal\s*\)/);
});

// Level 2: 结构检查 - Promise.race 实现
test('[L2] runToolWithTimeout 应使用 Promise.race 实现硬超时', () => {
  const content = readFileSync(TOOL_ORCHESTRATOR_PATH, 'utf-8');
  
  // 检查是否使用 Promise.race
  expect(content).toMatch(/Promise\.race/);
  
  // 检查是否有超时 promise
  expect(content).toMatch(/new\s+Promise[\s\S]*?reject[\s\S]*?AbortError|setTimeout[\s\S]*?reject/);
});

// Level 3: 模式检查 - AbortSignal 传递
test('[L3] adapter.execute 调用应传递 signal 参数', () => {
  const content = readFileSync(TOOL_ORCHESTRATOR_PATH, 'utf-8');
  
  // 检查 execute 调用时传递了 signal
  expect(content).toMatch(/adapter\.execute\s*\(\s*intent\s*,\s*signal\s*\)|adapter\.execute\s*\(\s*intent,\s*controller\.signal\s*\)/);
});

// Level 3b: 模式检查 - 超时后触发回退
test('[L3] 超时后应返回空数组触发回退', () => {
  const content = readFileSync(TOOL_ORCHESTRATOR_PATH, 'utf-8');
  
  // 检查 catch 块中返回空数组
  const catchBlockMatch = content.match(/catch\s*\([^)]*\)\s*\{([^}]*)\}/s);
  if (catchBlockMatch) {
    const catchBlock = catchBlockMatch[1];
    // 检查返回空数组
    expect(catchBlock).toMatch(/return\s*\[\]/);
  }
});

// Level 4: 负面检查（反例场景验证）
test('[L4-负面] 不应该出现 signal 未传递的 adapter.execute 调用', () => {
  const content = readFileSync(TOOL_ORCHESTRATOR_PATH, 'utf-8');
  
  // 不应该有只传 intent 的 execute 调用（在 runToolWithTimeout 中）
  // 注意：其他方法如 runToolSafely 可能间接调用，所以只检查直接调用
  const lines = content.split('\n');
  let inRunToolWithTimeout = false;
  let braceCount = 0;
  
  for (const line of lines) {
    if (line.includes('runToolWithTimeout')) {
      inRunToolWithTimeout = true;
      braceCount = 0;
    }
    if (inRunToolWithTimeout) {
      braceCount += (line.match(/\{/g) || []).length;
      braceCount -= (line.match(/\}/g) || []).length;
      
      // 在 runToolWithTimeout 方法内，不应该有只传 intent 的 execute 调用
      if (line.includes('adapter.execute') && line.includes('intent') && !line.includes('signal') && !line.includes('//')) {
        // 检查是否是 execute(intent) 而不是 execute(intent, signal)
        const executeMatch = line.match(/adapter\.execute\s*\(\s*intent\s*\)/);
        expect(executeMatch).toBeNull();
      }
      
      if (braceCount <= 0 && line.includes('}')) {
        inRunToolWithTimeout = false;
      }
    }
  }
});

test('[L4-负面] 不应该删除 AbortError 的超时识别逻辑', () => {
  const content = readFileSync(TOOL_ORCHESTRATOR_PATH, 'utf-8');
  
  // 检查仍然保留 AbortError 识别
  expect(content).toMatch(/AbortError/);
  expect(content).toMatch(/error\.name/);
});

test('[L4-负面] 不应该使 signal 参数成为必填', () => {
  const content = readFileSync(TOOL_ORCHESTRATOR_PATH, 'utf-8');
  
  // signal 必须是可选参数（使用 ?）
  const signalParamMatch = content.match(/execute\s*\([^)]*signal[^)]*\)/);
  if (signalParamMatch) {
    expect(signalParamMatch[0]).toMatch(/signal\?/);
  }
});
